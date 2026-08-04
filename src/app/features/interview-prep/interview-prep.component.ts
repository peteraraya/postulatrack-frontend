import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-interview-prep',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './interview-prep.component.html'
})
export class InterviewPrepComponent implements OnInit {
  private http = inject(HttpClient);
  private toastService = inject(ToastService);

  loading = signal(false);
  questions = signal<any[]>([]);
  copiedIndex = signal<number | null>(null);

  ngOnInit() {
    this.generateGeneralPrep();
  }

  generateGeneralPrep() {
    this.loading.set(true);
    this.http.get<any>(`${environment.apiUrl}/ai/general-interview-prep`).subscribe({
      next: (res) => {
        this.questions.set(res.qna || []);
        this.loading.set(false);
      },
      error: () => {
        if (!environment.geminiApiKey) {
          this.toastService.error('Falta configurar Gemini API Key en environment.ts');
          this.loading.set(false);
          return;
        }

        this.http.get<any>(`${environment.apiUrl}/profile`).subscribe({
          next: (profile) => {
            const userSkills = profile?.skills ? profile.skills.join(', ') : 'Habilidades generales';
            const userHeadline = profile?.headline || 'Profesional';

            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${environment.geminiApiKey}`;
            const payload = {
              contents: [{
                parts: [{ text: `Eres un preparador de entrevistas experto. El candidato tiene este titular: "${userHeadline}" y estas habilidades: "${userSkills}". Genera 4 preguntas de entrevista muy probables de forma general para su perfil. Para cada pregunta, da un consejo breve y una respuesta ideal sugerida basada en su perfil. Devuelve la respuesta ESTRICTAMENTE en formato JSON plano (sin usar bloques de código ni markdown) como un arreglo de objetos con esta estructura: [{ "question": "...", "advice": "...", "answer": "..." }].` }]
              }]
            };

            this.http.post<any>(url, payload).subscribe({
              next: (res) => {
                try {
                  const rawText = res.candidates[0].content.parts[0].text;
                  const jsonText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
                  const parsedData = JSON.parse(jsonText);
                  this.questions.set(parsedData);
                } catch (e) {
                  console.error('Error parsing Gemini prep', e);
                  this.toastService.error('Error interpretando la respuesta de la IA.');
                } finally {
                  this.loading.set(false);
                }
              },
              error: (err) => {
                console.error('Error con Gemini API:', err);
                this.toastService.error('Error de conexión con Gemini.');
                this.loading.set(false);
              }
            });
          },
          error: () => {
            this.toastService.error('No se pudo obtener el perfil del usuario.');
            this.loading.set(false);
          }
        });
      }
    });
  }

  copyAnswer(index: number, answer: string) {
    navigator.clipboard.writeText(answer);
    this.copiedIndex.set(index);
    setTimeout(() => this.copiedIndex.set(null), 2000);
    this.toastService.success('Respuesta copiada al portapapeles');
  }
}
