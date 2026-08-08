import { Component, ChangeDetectionStrategy, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../core/services/toast.service';
import { AiService } from '../../core/services/ai.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-interview-prep',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './interview-prep.component.html'
})
export class InterviewPrepComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private toastService = inject(ToastService);
  private aiService = inject(AiService);

  private aiSubscription?: Subscription;

  loading = signal(false);
  evaluatingAnswer = signal(false);
  questions = signal<any[]>([]);
  copiedIndex = signal<number | null>(null);

  ngOnDestroy() {
    if (this.aiSubscription) {
      this.aiSubscription.unsubscribe();
    }
  }

  cancelAiTask() {
    if (this.aiSubscription) {
      this.aiSubscription.unsubscribe();
      this.aiSubscription = undefined;
    }
    this.loading.set(false);
    this.evaluatingAnswer.set(false);
    this.toastService.info('Operación IA cancelada');
  }

  ngOnInit() {
    this.generateGeneralPrep();
  }

  generateGeneralPrep() {
    this.loading.set(true);

    this.http.get<any>(`${environment.apiUrl}/profile`).subscribe({
      next: (profile) => {
        const userSkills = profile?.skills ? profile.skills.join(', ') : 'Habilidades generales';
        const userHeadline = profile?.headline || 'Profesional';

        const promptText = `Eres un preparador de entrevistas experto del año 2026. El candidato tiene este titular: "${userHeadline}" y estas habilidades: "${userSkills}".
Genera 5 preguntas de entrevista desafiantes, modernas y muy probables para su perfil.
Asegúrate de incluir obligatoriamente:
1. Una pregunta sobre proyectos reales en los que ha trabajado y cómo aplicó sus conocimientos en la práctica.
2. Una pregunta situacional enfocada en su nivel de inglés o cómo se comunicaría en un entorno internacional/bilingüe.
3. Tres preguntas adicionales clásicas o modernas de resolución de problemas/habilidades blandas adaptadas a su rol.

Para cada pregunta, da un consejo breve y una respuesta ideal sugerida basada en su perfil. Devuelve la respuesta ESTRICTAMENTE en formato JSON plano (sin usar bloques de código ni markdown) como un arreglo de objetos con esta estructura: [{ "question": "...", "advice": "...", "answer": "..." }].`;

        if (this.aiSubscription) this.aiSubscription.unsubscribe();
        this.aiSubscription = this.aiService.generateContent(promptText, true).subscribe({
          next: (rawText) => {
            try {
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

  copyAnswer(index: number, answer: string) {
    navigator.clipboard.writeText(answer);
    this.copiedIndex.set(index);
    setTimeout(() => this.copiedIndex.set(null), 2000);
    this.toastService.success('Respuesta copiada al portapapeles');
  }

  evaluateAnswer(index: number) {
    const qna = this.questions()[index];
    if (!qna.userAnswer || qna.userAnswer.trim().length < 10) {
      this.toastService.error('Escribe una respuesta un poco más larga para poder evaluarla.');
      return;
    }

    this.evaluatingAnswer.set(true);
    const currentQuestions = [...this.questions()];
    currentQuestions[index] = { ...currentQuestions[index], evaluating: true };
    this.questions.set(currentQuestions);

    const promptText = `Actúa como un reclutador experto. Te haré una evaluación de una respuesta a una entrevista.
Pregunta: "${qna.question}"
Respuesta del candidato: "${qna.userAnswer}"

Evalúa la respuesta del candidato. Dame tu respuesta ESTRICTAMENTE en formato JSON plano (sin markdown) con la siguiente estructura:
{
  "score": número del 1 al 10,
  "feedback": "Texto con tu opinión sobre lo que hizo bien y lo que debe mejorar de forma constructiva y profesional."
}`;

    if (this.aiSubscription) this.aiSubscription.unsubscribe();
    this.aiSubscription = this.aiService.generateContent(promptText, true).subscribe({
      next: (rawText) => {
        try {
          const jsonText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
          const parsedData = JSON.parse(jsonText);

          const updated = [...this.questions()];
          updated[index] = {
            ...updated[index],
            evaluating: false,
            score: parsedData.score,
            feedback: parsedData.feedback
          };
          this.questions.set(updated);
          this.toastService.success('¡Respuesta evaluada!');
        } catch (e) {
          console.error('Error parsing Gemini evaluation', e);
          this.toastService.error('Error al interpretar la evaluación.');
          const updated = [...this.questions()];
          updated[index].evaluating = false;
          this.questions.set(updated);
        } finally {
          this.evaluatingAnswer.set(false);
        }
      },
      error: (err) => {
        console.error('Error Gemini evaluation:', err);
        this.toastService.error('Error de conexión al evaluar.');
        const updated = [...this.questions()];
        updated[index].evaluating = false;
        this.questions.set(updated);
        this.evaluatingAnswer.set(false);
      }
    });
  }
}
