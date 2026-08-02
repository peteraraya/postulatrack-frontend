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
        // Mock data
        setTimeout(() => {
          this.questions.set([
            {
              question: 'Háblame de ti. ¿Quién eres profesionalmente?',
              advice: 'Las empresas quieren un resumen rápido de tu trayectoria y tu valor actual, no toda tu vida.',
              answer: 'Soy un desarrollador de software con experiencia enfocada en construir aplicaciones escalables y resolver problemas complejos. Me apasiona aprender nuevas tecnologías y en mis últimos proyectos he logrado optimizar procesos clave trabajando en equipo.'
            },
            {
              question: '¿Cuál consideras que es tu mayor fortaleza?',
              advice: 'Relaciona tu fortaleza directamente con el tipo de trabajo al que postulas.',
              answer: 'Mi mayor fortaleza es la adaptabilidad y el aprendizaje rápido. Dado que en tecnología las herramientas cambian constantemente, me he acostumbrado a leer documentación y dominar nuevos frameworks en tiempo récord para aportar al equipo desde la primera semana.'
            },
            {
              question: '¿Por qué deberíamos contratarte a ti y no a otros?',
              advice: 'Destaca aquello que te hace único según las habilidades de tu perfil.',
              answer: 'Porque mi combinación de habilidades técnicas y mi nivel de experiencia me permiten no solo escribir código de calidad, sino también entender las necesidades del negocio. Además, mi capacidad de comunicación facilita la colaboración con otros departamentos.'
            },
            {
              question: '¿Dónde te ves en 5 años?',
              advice: 'Muestra ambición pero también estabilidad y compromiso con la carrera profesional.',
              answer: 'En 5 años me veo asumiendo un rol de mayor liderazgo técnico o especialización, ayudando a mentorizar a desarrolladores más junior y tomando decisiones de arquitectura importantes en productos que impacten a miles de usuarios.'
            }
          ]);
          this.loading.set(false);
        }, 1500);
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
