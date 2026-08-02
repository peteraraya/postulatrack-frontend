import { Component, ChangeDetectionStrategy, inject, signal, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { FormsModule } from '@angular/forms';
import { FilterService } from '../../core/services/filter.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-job-offers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './job-offers.component.html'
})
export class JobOffersComponent implements OnInit {
  private http = inject(HttpClient);
  public filterService = inject(FilterService);
  private toastService = inject(ToastService);

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

        // Simular persistencia de favoritos si el backend aún no envía 'isFavorite'
        const savedFavs = JSON.parse(localStorage.getItem('mock_favs') || '[]');
        newData = newData.map((o: any) => ({
          ...o,
          isFavorite: o.isFavorite !== undefined ? o.isFavorite : savedFavs.includes(o.id)
        }));

        // Simular filtro local si el backend aún no soporta ?favorites=true
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
        // Mock data
        const savedFavs = JSON.parse(localStorage.getItem('mock_favs') || '[]');
        let mocks = [
          { id: '1', title: 'Frontend Developer', company: 'Google', isRemote: true, skills: ['Angular', 'TypeScript'], isFavorite: savedFavs.includes('1') },
          { id: '2', title: 'Backend Engineer', company: 'Amazon', location: 'Santiago', skills: ['NestJS', 'Node.js'], isFavorite: savedFavs.includes('2') }
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
    offer.isFavorite = !offer.isFavorite;
    this.offers.update(apps => [...apps]);

    let savedFavs = JSON.parse(localStorage.getItem('mock_favs') || '[]');
    if (offer.isFavorite) {
      if (!savedFavs.includes(offer.id)) savedFavs.push(offer.id);
    } else {
      savedFavs = savedFavs.filter((id: string) => id !== offer.id);
    }
    localStorage.setItem('mock_favs', JSON.stringify(savedFavs));

    if (offer.isFavorite) {
      this.http.post(`${environment.apiUrl}/job-offers/${offer.id}/favorite`, {}).subscribe({
        error: () => {
          console.log('Mock: Favorito agregado (backend no listo)');
        }
      });
    } else {
      this.http.delete(`${environment.apiUrl}/job-offers/${offer.id}/favorite`).subscribe({
        error: () => {
          console.log('Mock: Favorito eliminado (backend no listo)');
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
        // Mock result
        setTimeout(() => {
          const mockHTML = `
            <p class="mb-2">Basado en tu perfil, tienes un excelente match (85%) con esta oferta porque compartes la experiencia en <strong class="text-indigo-700 dark:text-indigo-400">Angular y TypeScript</strong>.</p>
            <p class="font-semibold text-gray-800 dark:text-gray-200 mt-2 mb-1">Palabras clave faltantes en tu CV (ATS):</p>
            <div class="flex flex-wrap gap-1">
              <span class="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-1.5 py-0.5 rounded text-[10px] border border-red-200 dark:border-red-800">RxJS</span>
              <span class="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-1.5 py-0.5 rounded text-[10px] border border-red-200 dark:border-red-800">Jest</span>
              <span class="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-1.5 py-0.5 rounded text-[10px] border border-red-200 dark:border-red-800">CI/CD</span>
            </div>
            <p class="mt-2 italic text-gray-600 dark:text-gray-400 text-[10px]">Añade estas palabras a tu perfil para pasar los filtros automáticos.</p>
          `;
          this.aiAnalysisResult.update(prev => ({ ...prev, [offer.id]: mockHTML }));
          this.analyzingOffer.set(null);
        }, 1500);
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
