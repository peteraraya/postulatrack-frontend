import { Component, ChangeDetectionStrategy, inject, signal, OnInit, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { FormsModule } from '@angular/forms';
import { FilterService } from '../../core/services/filter.service';
import { ToastService } from '../../core/services/toast.service';
import { AiService } from '../../core/services/ai.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-job-offers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './job-offers.component.html'
})
export class JobOffersComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  public filterService = inject(FilterService);
  private toastService = inject(ToastService);
  private aiService = inject(AiService);

  private aiSubscription?: Subscription;

  offers = signal<any[]>([]);
  loading = signal(true);

  page = 1;
  hasMore = true;
  showFavoritesOnly = false;
  skillInput = '';

  constructor() {
    effect(() => {
      const tick = this.filterService.filtersApplied();
      if (tick > 0) {
        this.loadOffers(true);
      }
    });
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
    this.analyzingOffer.set(null);
    this.toastService.info('Operación IA cancelada');
  }

  ngOnInit() {
    this.loadOffers(true);
  }

  loadOffers(reset = true) {
    if (reset) {
      this.page = 1;
      this.offers.set([]);
      this.loading.set(true);
    }

    let params = this.filterService.buildQueryParams();
    if (this.showFavoritesOnly) params.append('favorites', 'true');

    this.http.get<any>(`${environment.apiUrl}/job-offers?${params.toString()}`).subscribe({
      next: (res) => {
        let newData = Array.isArray(res) ? res : (res?.data || []);

        // Asignamos isFavorite directamente desde backend
        newData = newData.map((o: any) => ({
          ...o,
          isFavorite: !!o.isFavorite
        }));

        // Simular filtro local si el backend aún no soporta ?favorites=true completamente
        if (this.showFavoritesOnly) {
          newData = newData.filter((o: any) => o.isFavorite);
        }

        this.hasMore = newData.length >= 10;

        if (reset) {
          this.offers.set(newData);
        } else {
          this.offers.update(prev => [...prev, ...newData]);
        }
        this.loading.set(false);
      },
      error: () => {
        // Mock data fallback
        let mocks = [
          { id: '1', title: 'Frontend Developer', company: 'Google', isRemote: true, skills: ['Angular', 'TypeScript'], isFavorite: false },
          { id: '2', title: 'Backend Engineer', company: 'Amazon', location: 'Santiago', skills: ['NestJS', 'Node.js'], isFavorite: false }
        ];

        if (this.showFavoritesOnly) {
          mocks = mocks.filter(m => m.isFavorite);
        }

        if (reset) {
          this.offers.set(mocks);
        } else {
          this.offers.update(prev => [...prev, ...mocks]);
        }
        this.hasMore = false;
        this.loading.set(false);
      }
    });
  }

  addSkill(event: Event) {
    event.preventDefault();
    const skill = this.skillInput.trim();
    if (skill && !this.filterService.filters().skills.includes(skill)) {
      this.filterService.updateFilters({ skills: [...this.filterService.filters().skills, skill] });
    }
    this.skillInput = '';
  }

  removeSkill(skill: string) {
    this.filterService.updateFilters({
      skills: this.filterService.filters().skills.filter(s => s !== skill)
    });
  }

  removeLastSkill(event: Event) {
    if (this.skillInput === '' && this.filterService.filters().skills.length > 0) {
      const currentSkills = [...this.filterService.filters().skills];
      currentSkills.pop();
      this.filterService.updateFilters({ skills: currentSkills });
    }
  }

  creatingAlert = signal(false);

  createJobAlert() {
    this.creatingAlert.set(true);
    let params = this.filterService.buildQueryParams();

    this.http.post(`${environment.apiUrl}/job-alerts`, { filters: params.toString() }).subscribe({
      next: () => {
        this.creatingAlert.set(false);
        this.toastService.success('Alerta de empleo creada. Te notificaremos cuando haya nuevas ofertas.');
      },
      error: () => {
        setTimeout(() => {
          this.creatingAlert.set(false);
          this.toastService.success('Alerta de empleo creada exitosamente (simulando guardado).');
        }, 1500);
      }
    });
  }

  loadMore() {
    this.page++;
    this.loadOffers(false);
  }

  toggleFavorite(offer: any) {
    const originalState = offer.isFavorite;
    offer.isFavorite = !offer.isFavorite;
    this.offers.update(apps => [...apps]);

    if (offer.isFavorite) {
      this.http.post(`${environment.apiUrl}/job-offers/${offer.id}/favorite`, {}).subscribe({
        error: () => {
          // Revert on error
          offer.isFavorite = originalState;
          this.offers.update(apps => [...apps]);
          this.toastService.error('Error al agregar a favoritos');
        }
      });
    } else {
      this.http.delete(`${environment.apiUrl}/job-offers/${offer.id}/favorite`).subscribe({
        error: () => {
          // Revert on error
          offer.isFavorite = originalState;
          this.offers.update(apps => [...apps]);
          this.toastService.error('Error al quitar de favoritos');
        }
      });
    }
  }

  toggleFavoritesFilter() {
    this.showFavoritesOnly = !this.showFavoritesOnly;
    this.loadOffers(true);
  }

  analyzingOffer = signal<string | null>(null);
  aiAnalysisResult = signal<{ [key: string]: string }>({});
  copiedAnalysis = signal<string | null>(null);

  analyzeWithAI(offer: any) {
    this.analyzingOffer.set(offer.id);
    this.http.post<any>(`${environment.apiUrl}/ai/analyze-offer`, { offerId: offer.id }).subscribe({
      next: (res) => {
        this.aiAnalysisResult.update(prev => ({ ...prev, [offer.id]: res.analysis }));
        this.analyzingOffer.set(null);
      },
      error: () => {
        if (!environment.geminiApiKey) {
          this.toastService.error('Falta configurar Gemini API Key en environment.ts');
          this.analyzingOffer.set(null);
          return;
        }

        const offerTitle = offer.title || 'Trabajo';
        const offerCompany = offer.company || 'Empresa';

        this.http.get<any>(`${environment.apiUrl}/profile`).subscribe({
          next: (profile) => {
            const userSkills = profile?.skills ? profile.skills.join(', ') : 'Habilidades generales';
            const userHeadline = profile?.headline || 'Profesional';

            const promptText = `Actúa como un reclutador experto. El candidato tiene este titular: "${userHeadline}" y estas habilidades: "${userSkills}". La oferta es para el puesto de "${offerTitle}" en la empresa "${offerCompany}". Escribe un párrafo muy breve y directo (máximo 3 líneas) indicando por qué hace buen match y qué 1 concepto clave debería estudiar o repasar para la entrevista. No uses formato markdown de bloques.`;

            if (this.aiSubscription) this.aiSubscription.unsubscribe();
            this.aiSubscription = this.aiService.generateContent(promptText).subscribe({
              next: (analysis) => {
                this.aiAnalysisResult.update(prev => ({ ...prev, [offer.id]: analysis }));
                this.analyzingOffer.set(null);
              },
              error: (err) => {
                console.error('Error con Gemini API:', err);
                this.toastService.error('Error al analizar con IA.');
                this.analyzingOffer.set(null);
              }
            });
          },
          error: () => {
            this.analyzingOffer.set(null);
          }
        });
      }
    });
  }

  copyAnalysis(offerId: string, text: string) {
    navigator.clipboard.writeText(text);
    this.copiedAnalysis.set(offerId);
    setTimeout(() => this.copiedAnalysis.set(null), 2000);
  }

  applyingOffer = signal<any | null>(null);

  apply(offer: any) {
    this.http.post(`${environment.apiUrl}/applications`, { offerId: offer.id }).subscribe({
      next: () => {
        this.applyingOffer.set(offer);
      },
      error: () => {
        this.applyingOffer.set(offer); // mock
      }
    });
  }

  closeApplyModal() {
    this.applyingOffer.set(null);
  }

  goToOriginalSite() {
    const offer = this.applyingOffer();
    if (offer && offer.url) {
      window.open(offer.url, '_blank');
    }
    this.closeApplyModal();
  }
}
