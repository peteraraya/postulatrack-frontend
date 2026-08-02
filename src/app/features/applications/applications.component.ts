import { Component, ChangeDetectionStrategy, inject, signal, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Directive, ElementRef, OnDestroy, Input, Output, EventEmitter, AfterViewInit } from '@angular/core';
import flatpickr from 'flatpickr';
import { driver } from 'driver.js';
import { ToastService } from '../../core/services/toast.service';

@Directive({
  selector: '[appFlatpickr]',
  standalone: true
})
export class FlatpickrDirective implements AfterViewInit, OnDestroy {
  @Input() appFlatpickr: any;
  @Output() dateChange = new EventEmitter<string>();
  private fp: any;

  constructor(private el: ElementRef) {}

  ngAfterViewInit() {
    this.fp = flatpickr(this.el.nativeElement, {
      enableTime: true,
      dateFormat: "Y-m-d\\TH:i",
      defaultDate: this.appFlatpickr || null,
      onChange: (selectedDates, dateStr) => {
        this.dateChange.emit(dateStr);
      }
    });
  }

  ngOnDestroy() {
    if (this.fp) {
      this.fp.destroy();
    }
  }
}

@Component({
  selector: 'app-applications',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, FlatpickrDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './applications.component.html'
})
export class ApplicationsComponent implements OnInit {
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private toastService = inject(ToastService);

  applications = signal<any[]>([]);
  showManualModal = signal(false);
  manualForm = { company: '', title: '', status: 'SENT', url: '', location: '' };

  showDetailsModal = signal(false);
  selectedApp = signal<any>(null);

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
      error: () => {
        // Mock data
        this.applications.set([
          { id: '1', status: 'SENT', updatedAt: new Date().toISOString(), offer: { title: 'Backend Dev', company: 'Startup Inc' } },
          { id: '2', status: 'INTERVIEW', updatedAt: new Date().toISOString(), offer: { title: 'Fullstack Engineer', company: 'BigCorp' } },
          { id: '3', status: 'OFFER', updatedAt: new Date().toISOString(), offer: { title: 'Senior Developer', company: 'Tech Giants' }, notes: 'Ofrecen $5000' },
        ]);
        this.updateBoard();
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
      error: () => {
        // Mock extraction
        setTimeout(() => {
          if (this.manualForm.url.includes('linkedin')) {
            this.manualForm.title = 'Software Engineer (Extracted)';
            this.manualForm.company = 'LinkedIn Corp';
          } else {
            this.manualForm.title = 'Frontend Developer (Extracted)';
            this.manualForm.company = 'Tech Company';
          }
          this.extractingUrl.set(false);
          this.toastService.success('Datos extraídos exitosamente (simulado)');
        }, 1500);
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
      error: () => {
        const newApp = {
          id: Math.random().toString(),
          status: this.manualForm.status,
          updatedAt: new Date().toISOString(),
          offer: { title: this.manualForm.title, company: this.manualForm.company, location: this.manualForm.location, url: this.manualForm.url }
        };
        this.applications.update(apps => [...apps, newApp]);
        this.updateBoard();
        this.toastService.success('Postulación manual añadida (simulado)');
        this.closeManualModal();
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
    this.http.post<any>(`${environment.apiUrl}/ai/generate-message`, { applicationId: app.id }).subscribe({
      next: (res) => {
        this.generatedMessage.set(res.message);
        this.generatingMessage.set(false);
      },
      error: () => {
        // Mock AI Generation
        setTimeout(() => {
          this.generatedMessage.set(`Hola equipo de ${app.offer?.company || 'la empresa'},\n\nHe visto su vacante para el puesto de ${app.offer?.title || 'desarrollador'} y creo que mi perfil hace un excelente match con lo que buscan. Tengo experiencia trabajando con tecnologías modernas y me encantaría aportar valor a su equipo.\n\nQuedo atento a sus comentarios.\n\nSaludos.`);
          this.generatingMessage.set(false);
        }, 1500);
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
    this.http.post<any>(`${environment.apiUrl}/ai/translate`, { text: currentMsg, targetLanguage: 'en' }).subscribe({
      next: (res) => {
        this.generatedMessage.set(res.translatedText);
        this.translatingMessage.set(false);
      },
      error: () => {
        // Mock translation
        setTimeout(() => {
          this.generatedMessage.set(`Hello team,\n\nI have seen your vacancy for the developer position and I think my profile makes an excellent match with what you are looking for. I have experience working with modern technologies and would love to add value to your team.\n\nI look forward to hearing from you.\n\nBest regards.`);
          this.translatingMessage.set(false);
          this.toastService.success('Mensaje traducido al inglés (simulado)');
        }, 1500);
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
    this.http.post<any>(`${environment.apiUrl}/ai/interview-prep`, { applicationId: app.id }).subscribe({
      next: (res) => {
        this.interviewPrepResult.set(res.qna);
        this.generatingInterview.set(false);
      },
      error: () => {
        // Mock AI Generation for Interview Prep
        setTimeout(() => {
          this.interviewPrepResult.set([
            {
              question: '¿Por qué te interesa trabajar con nosotros en este puesto?',
              advice: 'Las empresas buscan pasión y que conozcas sobre ellos.',
              answer: `(Sugerencia basada en tu CV) He estado siguiendo el crecimiento de su empresa y me impresiona su enfoque en tecnología escalable. Mi experiencia previa con arquitecturas similares y mi dominio de las herramientas requeridas hacen que este puesto se alinee perfectamente con mi visión profesional.`
            },
            {
              question: 'Cuéntanos de un desafío técnico difícil que hayas superado.',
              advice: 'Utiliza el método STAR (Situación, Tarea, Acción, Resultado).',
              answer: `(Sugerencia basada en tu CV) En mi último rol, tuvimos problemas de rendimiento en el frontend. Lideré la migración a un nuevo framework optimizando el bundle en un 40%, lo que redujo los tiempos de carga drásticamente y mejoró la experiencia del usuario.`
            }
          ]);
          this.generatingInterview.set(false);
        }, 2000);
      }
    });
  }

  saveNotes() {
    const app = this.selectedApp();

    const payload = {
      notes: app.notes,
      contactName: app.contactName,
      contactEmail: app.contactEmail,
      contactLinkedin: app.contactLinkedin
    };

    // Guardar Notas y Contactos
    this.http.patch(`${environment.apiUrl}/applications/${app.id}/notes`, payload).subscribe({
      next: () => this.updateLocalApp(app.id, payload),
      error: () => this.updateLocalApp(app.id, payload)
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

    if (confirm('¿Estás seguro de que deseas eliminar esta postulación? Esta acción no se puede deshacer.')) {
      this.http.delete(`${environment.apiUrl}/applications/${app.id}`).subscribe({
        next: () => {
          this.applications.update(apps => apps.filter(a => a.id !== app.id));
          this.updateBoard();
          this.closeDetails();
        },
        error: () => {
          // Mock delete
          this.applications.update(apps => apps.filter(a => a.id !== app.id));
          this.updateBoard();
          this.closeDetails();
        }
      });
    }
  }

  updateInterviewDate(dateStr: string) {
    this.selectedApp.update(a => ({ ...a, interviewDate: dateStr }));
  }

  private updateLocalApp(id: string, partial: any) {
    this.applications.update(apps => apps.map(a => a.id === id ? { ...a, ...partial } : a));
    this.updateBoard();
  }
}
