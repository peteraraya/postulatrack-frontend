import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../core/services/toast.service';

export interface JobAnalysis {
  compatibilityScore: number;
  verdict: string;
  extractedData: {
    company: string;
    role: string;
    modality: string;
    salary: string;
  };
  matches: { skill: string; evidenceInCV: string }[];
  gaps: { skill: string; severity: 'high' | 'medium' | 'low' }[];
  strategicRecommendations: string[];
}

@Component({
  selector: 'app-analyzer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './analyzer.component.html'
})
export class AnalyzerComponent {
  private http = inject(HttpClient);
  private toastService = inject(ToastService);

  jobDescription = signal('');
  isAnalyzing = signal(false);
  result = signal<JobAnalysis | null>(null);

  // Intentamos obtener el perfil del usuario para cruzar datos
  userProfile = signal<any>(null);

  constructor() {
    this.http.get<any>(`${environment.apiUrl}/profile`).subscribe({
      next: (profile) => this.userProfile.set(profile || {}),
      error: () => this.userProfile.set({})
    });
  }

  handleAnalyze() {
    if (!this.jobDescription().trim()) return;

    if (!environment.geminiApiKey) {
      this.toastService.error('Falta configurar Gemini API Key en environment.ts');
      return;
    }

    this.isAnalyzing.set(true);
    this.result.set(null);

    const profile = this.userProfile() || {};
    const userSkills = profile.skills ? profile.skills.join(', ') : 'Ninguna';
    const userHeadline = profile.headline || 'Profesional';
    const userSummary = profile.summary || '';

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${environment.geminiApiKey}`;

    const prompt = `
      Eres un experto evaluador de reclutamiento (ATS y AI analyzer).
      A continuación te entrego el perfil de un candidato y la descripción de una oferta de empleo.

      PERFIL DEL CANDIDATO:
      Titular: ${userHeadline}
      Resumen: ${userSummary}
      Habilidades: ${userSkills}

      DESCRIPCIÓN DE LA OFERTA:
      ${this.jobDescription()}

      Realiza un análisis exhaustivo de compatibilidad y devuélvelo ESTRICTAMENTE en formato JSON plano (sin markdown ni etiquetas \`\`\`json).
      La estructura exacta que debes devolver es:
      {
        "compatibilityScore": número del 0 al 100 indicando % de match,
        "verdict": "Un párrafo breve y amigable (1 o 2 oraciones) resumiendo qué tan apto es el candidato y su principal fortaleza para este rol",
        "extractedData": {
          "company": "Nombre de empresa extraído (o 'No especificada')",
          "role": "Rol/Cargo extraído (o 'No especificado')",
          "modality": "Remoto, Híbrido o Presencial (infiéretlo o 'No especificada')",
          "salary": "Rango salarial extraído (o 'No especificado')"
        },
        "matches": [
          { "skill": "Habilidad requerida que el candidato SÍ tiene", "evidenceInCV": "Por qué sabemos que la tiene (ej. 'Mencionada en tu perfil')" }
        ],
        "gaps": [
          { "skill": "Habilidad requerida que el candidato NO tiene", "severity": "high" o "medium" o "low" }
        ],
        "strategicRecommendations": [
          "Recomendación 1 para mejorar el CV o prepararse para la entrevista de esta oferta",
          "Recomendación 2...",
          "Recomendación 3..."
        ]
      }
    `;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }]
    };

    this.http.post<any>(url, payload).subscribe({
      next: (res) => {
        try {
          const rawText = res.candidates[0].content.parts[0].text;
          const jsonText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
          const parsedData = JSON.parse(jsonText);

          this.result.set(parsedData);
          this.toastService.success('¡Análisis completado exitosamente!');
        } catch (e) {
          console.error('Error parsing Gemini JSON', e);
          this.toastService.error('Error al interpretar los datos. Intenta de nuevo.');
        } finally {
          this.isAnalyzing.set(false);
        }
      },
      error: (err) => {
        console.error('Gemini error:', err);
        this.toastService.error('Error al analizar la oferta con IA.');
        this.isAnalyzing.set(false);
      }
    });
  }

  clear() {
    this.jobDescription.set('');
    this.result.set(null);
  }
}
