import { Component, ChangeDetectionStrategy, inject, signal, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { driver } from 'driver.js';
import { ToastService } from '../../core/services/toast.service';
import { FlatpickrDirective } from '../../shared/directives/flatpickr.directive';
import { AiService } from '../../core/services/ai.service';
import { jsPDF } from 'jspdf';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-applications',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, FlatpickrDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './applications.component.html'
})
export class ApplicationsComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private toastService = inject(ToastService);
  private aiService = inject(AiService);

  private aiSubscription?: Subscription;

  applications = signal<any[]>([]);
  showManualModal = signal(false);
  manualForm = { company: '', title: '', status: 'SENT', url: '', location: '' };

  showDetailsModal = signal(false);
  selectedApp = signal<any>(null);

  userProfile = signal<any>(null);

  extractingUrl = signal(false);
  generatingMessage = signal(false);
  generatedMessage = signal('');
  copiedToClipboard = signal(false);
  isSidebarOpen = signal(true);
  translatingMessage = signal(false);

  activeTab = signal<'notes' | 'ai'>('notes');
  generatingInterview = signal(false);
  interviewPrepResult = signal<any[] | null>(null);
  copiedInterviewPrep = signal<number | null>(null);

  adaptingCV = signal(false);
  adaptedCVResult = signal<string | null>(null);

  viewMode = signal<'kanban' | 'list'>('kanban');

  boardData: { [key: string]: any[] } = {
    SENT: [],
    INTERVIEW: [],
    OFFER: [],
    REJECTED: [],
    WITHDRAWN: []
  };

  columns = [
    {
      title: 'Enviadas',
      status: 'SENT',
      bgClass: 'bg-blue-50 dark:bg-blue-900/10',
      headerClass: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      borderClass: 'border-blue-200 dark:border-blue-800',
      badgeClass: 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-100'
    },
    {
      title: 'Entrevistas',
      status: 'INTERVIEW',
      bgClass: 'bg-amber-50 dark:bg-amber-900/10',
      headerClass: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      borderClass: 'border-amber-200 dark:border-amber-800',
      badgeClass: 'bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-100'
    },
    {
      title: 'Rechazadas',
      status: 'REJECTED',
      bgClass: 'bg-red-50 dark:bg-red-900/10',
      headerClass: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800',
      borderClass: 'border-red-200 dark:border-red-800',
      badgeClass: 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-100'
    },
    {
      title: 'Retiradas',
      status: 'WITHDRAWN',
      bgClass: 'bg-gray-50 dark:bg-slate-800/50',
      headerClass: 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700',
      borderClass: 'border-gray-200 dark:border-slate-700',
      badgeClass: 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300'
    }
  ];

  statuses = [
    { label: 'Enviada', value: 'SENT' },
    { label: 'Entrevista', value: 'INTERVIEW' },
    { label: 'Oferta', value: 'OFFER' },
    { label: 'Rechazada', value: 'REJECTED' },
    { label: 'Retirada', value: 'WITHDRAWN' }
  ];

  ngOnInit() {
    this.loadApplications();
    this.initOnboarding();
    this.loadUserProfile();
  }

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
    this.generatingMessage.set(false);
    this.translatingMessage.set(false);
    this.adaptingCV.set(false);
    this.generatingInterview.set(false);
    this.toastService.info('Operación IA cancelada');
  }

  loadUserProfile() {
    this.http.get<any>(`${environment.apiUrl}/profile`).subscribe({
      next: (profile) => {
        this.userProfile.set(profile || {});
      },
      error: () => {
        this.userProfile.set({}); // Mock vacío si falla
      }
    });
  }

  initOnboarding() {
    const hasSeenTour = localStorage.getItem('postulatrack_tour_seen');
    if (!hasSeenTour) {
      setTimeout(() => {
        const driverObj = driver({
          showProgress: true,
          nextBtnText: 'Siguiente',
          prevBtnText: 'Anterior',
          doneBtnText: '¡Entendido!',
          steps: [
            {
              element: '#tour-sidebar',
              popover: {
                title: 'Nuevas Ofertas',
                description: 'Aquí aparecerán las ofertas recomendadas. Puedes arrastrarlas a tu tablero para organizarlas.',
                side: 'right',
                align: 'start'
              }
            },
            {
              element: '#tour-board',
              popover: {
                title: 'Tablero Kanban',
                description: 'Arrastra y suelta tus postulaciones para cambiar su estado (Entrevistas, Ofertas, etc).',
                side: 'bottom',
                align: 'start'
              }
            },
            {
              element: '#tour-manual-btn',
              popover: {
                title: 'Postulación Manual',
                description: '¿Viste una oferta en otro lado? Agrégala manualmente a tu tablero usando este botón.',
                side: 'bottom',
                align: 'end'
              }
            }
          ],
          onDestroyStarted: () => {
            localStorage.setItem('postulatrack_tour_seen', 'true');
            driverObj.destroy();
          }
        });
        driverObj.drive();
      }, 1000);
    }
  }

  loadApplications() {
    this.http.get<any[]>(`${environment.apiUrl}/applications`).subscribe({
      next: (res) => {
        this.applications.set(res || []);
        this.updateBoard();
      },
      error: (err) => {
        console.error('Error al cargar postulaciones', err);
        this.applications.set([]);
        this.updateBoard();
        this.toastService.error('Error al cargar las postulaciones');
      }
    });
  }

  updateBoard() {
    const apps = this.applications();
    this.boardData['SENT'] = apps.filter(a => a.status === 'SENT');
    this.boardData['INTERVIEW'] = apps.filter(a => a.status === 'INTERVIEW');
    this.boardData['OFFER'] = apps.filter(a => a.status === 'OFFER');
    this.boardData['REJECTED'] = apps.filter(a => a.status === 'REJECTED');
    this.boardData['WITHDRAWN'] = apps.filter(a => a.status === 'WITHDRAWN');
    this.cdr.markForCheck();
  }

  drop(event: CdkDragDrop<any[]>, newStatus: string) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );

      const app = event.container.data[event.currentIndex];
      app.status = newStatus;
      app.updatedAt = new Date().toISOString();

      // Sync global signal
      this.applications.update(apps =>
        apps.map(a => a.id === app.id ? { ...a, status: newStatus, updatedAt: app.updatedAt } : a)
      );

      this.http.patch(`${environment.apiUrl}/applications/${app.id}/status`, { status: newStatus }).subscribe({
        error: () => console.error('Failed to update status on server')
      });
    }
  }

  changeStatus(appId: string, event: Event) {
    const newStatus = (event.target as HTMLSelectElement).value;

    this.applications.update(apps =>
      apps.map(app => app.id === appId ? { ...app, status: newStatus, updatedAt: new Date().toISOString() } : app)
    );
    this.updateBoard();

    this.http.patch(`${environment.apiUrl}/applications/${appId}/status`, { status: newStatus }).subscribe({
      error: () => console.error('Failed to update status on server')
    });
  }

  openManualModal() { this.showManualModal.set(true); }
  closeManualModal() { this.showManualModal.set(false); }

  toggleSidebar() {
    this.isSidebarOpen.update(v => !v);
  }

  extractDataFromUrl() {
    if (!this.manualForm.url) return;
    this.extractingUrl.set(true);

    this.http.post<any>(`${environment.apiUrl}/applications/extract-url`, { url: this.manualForm.url }).subscribe({
      next: (res) => {
        if (res) {
          this.manualForm.title = res.title || this.manualForm.title;
          this.manualForm.company = res.company || this.manualForm.company;
          this.manualForm.location = res.location || this.manualForm.location;
          this.toastService.success('Datos extraídos exitosamente');
        }
        this.extractingUrl.set(false);
      },
      error: (err) => {
        console.error('Error al extraer datos', err);
        this.extractingUrl.set(false);
        this.toastService.error('Error al extraer datos de la URL');
      }
    });
  }

  submitManualApp() {
    this.http.post<any>(`${environment.apiUrl}/applications/manual`, this.manualForm).subscribe({
      next: (res) => {
        if (res && res.id) {
          this.applications.update(apps => [...apps, res]);
          this.updateBoard();
        }
        this.toastService.success('Postulación guardada exitosamente');
        this.closeManualModal();
      },
      error: (err) => {
        console.error('Error al crear postulación', err);
        this.toastService.error('Error al guardar la postulación');
      }
    });
  }

  openDetails(app: any) {
    this.selectedApp.set({ ...app });
    this.generatedMessage.set('');
    this.interviewPrepResult.set(null);
    this.activeTab.set('notes');
    this.showDetailsModal.set(true);
  }

  closeDetails() {
    this.showDetailsModal.set(false);
  }

  generateMessage() {
    const app = this.selectedApp();
    if (!app) return;

    this.generatingMessage.set(true);
    if (this.aiSubscription) this.aiSubscription.unsubscribe();
    this.aiSubscription = this.http.post<any>(`${environment.apiUrl}/ai/generate-message`, { applicationId: app.id }).subscribe({
      next: (res) => {
        this.generatedMessage.set(res.message);
        this.generatingMessage.set(false);
      },
      error: () => {
        if (!environment.geminiApiKey) {
          this.toastService.error('Configura la API Key de Gemini en environment.ts');
          this.generatingMessage.set(false);
          return;
        }

        const offerTitle = app.offer?.title || app.title || 'Puesto';
        const offerCompany = app.offer?.company || app.company || 'la empresa';
        const profile = this.userProfile() || {};
        const userName = profile.firstName ? `${profile.firstName} ${profile.lastName}` : 'Candidato';

        const promptText = `Escribe un mensaje de introducción profesional (Cover Letter corta de 2 párrafos) para que el candidato "${userName}" postule al cargo de "${offerTitle}" en la empresa "${offerCompany}". No uses formato markdown de bloques.`;

        if (this.aiSubscription) this.aiSubscription.unsubscribe();
        this.aiSubscription = this.aiService.generateContent(promptText).subscribe({
          next: (message) => {
            this.generatedMessage.set(message.trim());
            this.generatingMessage.set(false);
          },
          error: (err) => {
            console.error('Error al generar el mensaje con Gemini:', err);
            this.generatingMessage.set(false);
            this.toastService.error('Error al comunicarse con Gemini API.');
          }
        });
      }
    });
  }

  copyToClipboard() {
    navigator.clipboard.writeText(this.generatedMessage());
    this.copiedToClipboard.set(true);
    setTimeout(() => this.copiedToClipboard.set(false), 2000);
  }

  translateMessage() {
    const currentMsg = this.generatedMessage();
    if (!currentMsg) return;

    this.translatingMessage.set(true);
    if (this.aiSubscription) this.aiSubscription.unsubscribe();
    this.aiSubscription = this.http.post<any>(`${environment.apiUrl}/ai/translate`, { text: currentMsg, targetLanguage: 'en' }).subscribe({
      next: (res) => {
        this.generatedMessage.set(res.translatedText);
        this.translatingMessage.set(false);
      },
      error: () => {
        if (!environment.geminiApiKey) {
          this.toastService.error('Configura la API Key de Gemini en environment.ts');
          this.translatingMessage.set(false);
          return;
        }

        const promptText = `Traduce el siguiente texto al inglés profesional, manteniendo el tono formal pero entusiasta:\n\n${currentMsg}`;

        if (this.aiSubscription) this.aiSubscription.unsubscribe();
        this.aiSubscription = this.aiService.generateContent(promptText).subscribe({
          next: (translation) => {
            this.generatedMessage.set(translation.trim());
            this.translatingMessage.set(false);
            this.toastService.success('Mensaje traducido al inglés por IA');
          },
          error: (err) => {
            console.error('Error al traducir con Gemini:', err);
            this.translatingMessage.set(false);
            this.toastService.error('Error al conectarse a Gemini API.');
          }
        });
      }
    });
  }

  copyInterviewAnswer(index: number, answer: string) {
    navigator.clipboard.writeText(answer);
    this.copiedInterviewPrep.set(index);
    setTimeout(() => this.copiedInterviewPrep.set(null), 2000);
  }

  generateInterviewPrep() {
    const app = this.selectedApp();
    if (!app) return;

    this.generatingInterview.set(true);
    if (this.aiSubscription) this.aiSubscription.unsubscribe();
    this.aiSubscription = this.http.post<any>(`${environment.apiUrl}/ai/interview-prep`, { applicationId: app.id }).subscribe({
      next: (res) => {
        this.interviewPrepResult.set(res.qna);
        this.generatingInterview.set(false);
      },
      error: () => {
        if (!environment.geminiApiKey) {
          this.toastService.error('Configura la API Key de Gemini en environment.ts');
          this.generatingInterview.set(false);
          return;
        }

        const offerTitle = app.offer?.title || app.title || 'Puesto';
        const offerCompany = app.offer?.company || app.company || 'Empresa';
        const profile = this.userProfile() || {};
        const userSkills = profile.skills ? profile.skills.join(', ') : 'Ninguna específica';

        const promptText = `Eres un preparador de entrevistas experto. El candidato postula a "${offerTitle}" en "${offerCompany}" y tiene las siguientes habilidades: "${userSkills}". Genera 2 preguntas de entrevista muy probables para este cargo. Para cada pregunta, da un consejo breve y una respuesta ideal sugerida basada en su perfil. Devuelve la respuesta ESTRICTAMENTE en formato JSON plano (sin markdown \`\`\`json) como un arreglo de objetos con esta estructura: [{ "question": "...", "advice": "...", "answer": "..." }].`;

        if (this.aiSubscription) this.aiSubscription.unsubscribe();
        this.aiSubscription = this.aiService.generateContent(promptText, true).subscribe({
          next: (rawText) => {
            try {
              const jsonText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
              const parsedData = JSON.parse(jsonText);
              this.interviewPrepResult.set(parsedData);
            } catch (e) {
              console.error('Error parsing Gemini prep', e);
              this.toastService.error('Error interpretando la respuesta de la IA.');
            } finally {
              this.generatingInterview.set(false);
            }
          },
          error: (err) => {
            console.error('Error con Gemini API:', err);
            this.generatingInterview.set(false);
            this.toastService.error('Error de conexión con Gemini.');
          }
        });
      }
    });
  }

  saveNotes() {
    const app = this.selectedApp();

    const payload: any = {};
    if (app.notes !== undefined) payload.notes = app.notes;
    if (app.contactName !== undefined) payload.contactName = app.contactName;
    if (app.contactEmail !== undefined) payload.contactEmail = app.contactEmail;
    if (app.contactLinkedin !== undefined) payload.contactLinkedin = app.contactLinkedin;

    // Guardar Notas y Contactos
    this.http.patch(`${environment.apiUrl}/applications/${app.id}/notes`, payload).subscribe({
      next: () => {
        this.updateLocalApp(app.id, payload);
        this.toastService.success('Notas guardadas exitosamente');
      },
      error: () => {
        this.updateLocalApp(app.id, payload);
        this.toastService.success('Notas guardadas (simulado)');
      }
    });

    // Si hay entrevista, guardar datos de entrevista
    if (app.interviewDate) {
      this.http.patch(`${environment.apiUrl}/applications/${app.id}/interview`, {
        interviewDate: app.interviewDate
      }).subscribe({
        next: () => this.updateLocalApp(app.id, { interviewDate: app.interviewDate }),
        error: () => this.updateLocalApp(app.id, { interviewDate: app.interviewDate })
      });
    }

    this.closeDetails();
  }

  deleteApplication() {
    const app = this.selectedApp();
    if (!app) return;

    if (confirm('¿Estás seguro de que deseas eliminar esta postulación?')) {
      this.http.delete(`${environment.apiUrl}/applications/${app.id}`).subscribe({
        next: () => {
          this.applications.update(apps => apps.filter(a => a.id !== app.id));
          this.updateBoard();
          this.closeDetails();
          this.toastService.success('Postulación eliminada exitosamente');
        },
        error: (err) => {
          console.error('Error al eliminar', err);
          this.toastService.error('Error al eliminar la postulación');
        }
      });
    }
  }

  updateInterviewDate(dateStr: string) {
    this.selectedApp.update(a => ({ ...a, interviewDate: dateStr }));
  }

  addToGoogleCalendar() {
    const app = this.selectedApp();
    if (!app || !app.interviewDate) return;
    const date = new Date(app.interviewDate);
    const endDate = new Date(date.getTime() + 60 * 60 * 1000); // +1 hora

    const formatDate = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, '');
    const title = encodeURIComponent(`Entrevista: ${app.offer?.title || 'Trabajo'} en ${app.offer?.company || 'Empresa'}`);
    const details = encodeURIComponent(`Entrevista guardada desde PostulaTrack.`);
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${formatDate(date)}/${formatDate(endDate)}&details=${details}`;

    window.open(url, '_blank');
  }

  adaptCV() {
    const app = this.selectedApp();
    if (!app) return;

    this.adaptingCV.set(true);
    if (this.aiSubscription) this.aiSubscription.unsubscribe();
    this.aiSubscription = this.http.post<any>(`${environment.apiUrl}/ai/adapt-cv`, { applicationId: app.id }).subscribe({
      next: (res) => {
        this.adaptedCVResult.set(res.cvText);
        this.adaptingCV.set(false);
      },
      error: () => {
        if (!environment.geminiApiKey) {
          this.toastService.error('Configura la API Key de Gemini en environment.ts');
          this.adaptingCV.set(false);
          return;
        }

        const company = app.offer?.company || 'la empresa';
        const title = app.offer?.title || 'Desarrollador de Software';
        const profile = this.userProfile() || {};

        const userName = profile.user?.name || profile.name || (profile.firstName ? `${profile.firstName} ${profile.lastName}` : 'Candidato');
        const userHeadline = profile.headline || 'Profesional en Tecnología';
        const userSummary = profile.summary || 'Profesional altamente motivado.';
        const userSkills = profile.skills && profile.skills.length > 0
          ? profile.skills.join(', ')
          : 'Habilidades generales';
        const userEmail = profile.email || profile.user?.email || 'email@ejemplo.com';
        const userPhone = profile.phone || 'Teléfono no especificado';
        const userLocation = profile.location || 'Ubicación no especificada';
        const userLinkedin = profile.linkedinUrl || '';

        let exps = '';
        if (profile.workExperiences && profile.workExperiences.length > 0) {
          exps = profile.workExperiences.map((exp: any) =>
            `Cargo: ${exp.role}, Empresa: ${exp.company}, Periodo: ${exp.startDate} - ${exp.endDate}, Desc: ${exp.description}`
          ).join(' | ');
        } else {
          exps = 'Sin experiencia detallada';
        }

        const promptText = `Actúa como un experto en redacción de CVs.
El candidato postula a la oferta de "${title}" en la empresa "${company}".
DATOS DEL CANDIDATO:
- Nombre: ${userName}
- Email: ${userEmail}
- Teléfono: ${userPhone}
- Ubicación: ${userLocation}
- LinkedIn: ${userLinkedin}
- Titular: ${userHeadline}
- Habilidades: ${userSkills}
- Resumen original: ${userSummary}
- Experiencias laborales: ${exps}

Genera un currículum vitae estructurado y adaptado en texto plano (sin usar bloques de código ni markdown, solo texto listo para PDF) resaltando cómo su perfil hace match con la oferta. Usa los datos de contacto proporcionados, NO inventes datos genéricos.`;

        if (this.aiSubscription) this.aiSubscription.unsubscribe();
        this.aiSubscription = this.aiService.generateContent(promptText).subscribe({
          next: (cvText) => {
            this.adaptedCVResult.set(cvText);
            this.adaptingCV.set(false);
          },
          error: (err) => {
            console.error('Error con Gemini API:', err);
            this.toastService.error('Error al adaptar el CV con IA.');
            this.adaptingCV.set(false);
          }
        });
      }
    });
  }

  isDownloadingCV = signal(false);

  downloadCV() {
    const cvContent = this.adaptedCVResult();
    if (!cvContent) return;

    this.isDownloadingCV.set(true);
    this.toastService.info('Generando PDF, por favor espera...');

    setTimeout(() => {
      try {
        const doc = new jsPDF();

        doc.setFont('helvetica');
        doc.setFontSize(11);

        const lines = doc.splitTextToSize(cvContent, 170);

        let y = 20;
        for (let i = 0; i < lines.length; i++) {
          if (y > 280) {
            doc.addPage();
            y = 20;
          }
          doc.text(lines[i], 20, y);
          y += 6;
        }

        const company = this.selectedApp()?.offer?.company?.replace(/\s+/g, '_') || 'Empresa';
        doc.save(`CV_Adaptado_${company}.pdf`);

        this.isDownloadingCV.set(false);
        this.toastService.success('Documento PDF descargado correctamente');
        this.cdr.markForCheck();
      } catch (err) {
        console.error('Error generando PDF:', err);
        this.isDownloadingCV.set(false);
        this.toastService.error('Error al generar el PDF.');
        this.cdr.markForCheck();
      }
    }, 500);
  }

  updateAppField(field: string, value: any) {
    this.selectedApp.update(app => app ? { ...app, [field]: value } : null);
  }

  private updateLocalApp(id: string, partial: any) {
    this.applications.update(apps => apps.map(a => a.id === id ? { ...a, ...partial } : a));
    this.updateBoard();
  }
}
