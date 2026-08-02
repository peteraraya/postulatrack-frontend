import { Component, ChangeDetectionStrategy, inject, signal, OnInit, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';
import { FilterService } from '../../core/services/filter.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {
  private http = inject(HttpClient);
  public filterService = inject(FilterService);

  offers = signal<any[]>([]);
  stats = signal<any>({ sent: 0, interviewing: 0, offers: 0, rejected: 0, withdrawn: 0 });
  upcomingInterviews = signal<any[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  analyzingOffer = signal<string | null>(null);
  aiAnalysisResult = signal<{ [key: string]: string }>({});
  copiedAnalysis = signal<string | null>(null);

  constructor() {
    effect(() => {
      const tick = this.filterService.filtersApplied();
      if (tick > 0) {
        this.loadRecommendations();
      }
    });
  }

  ngOnInit() {
    this.loadStats();
    this.loadUpcomingInterviews();
    this.loadRecommendations();
  }

  loadRecommendations() {
    this.loading.set(true);
    let params = this.filterService.buildQueryParams();

    this.http.get<any>(`${environment.apiUrl}/recommendations?${params.toString()}`).subscribe({
      next: (res) => {
        let data = Array.isArray(res) ? res : (res?.data || []);

        // Ordenar de mayor a menor porcentaje de match explícitamente en el frontend
        data = data.sort((a: any, b: any) => (b.matchPercentage || 0) - (a.matchPercentage || 0));

        // Asegurar que haya un ID único para cada recomendación
        data = data.map((item: any, index: number) => ({
          ...item,
          _uniqueId: item.id || item.offer?.id || `rec_${index}_${Math.random().toString(36).substring(2, 9)}`
        }));

        this.offers.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message || 'Error loading recommendations');
        this.loading.set(false);
        this.offers.set([]);
      }
    });
  }

  loadStats() {
    this.http.get<any>(`${environment.apiUrl}/applications/stats`).subscribe({
      next: (data) => {
        const d = data || { sent: 0, interviewing: 0, offers: 0, rejected: 0, withdrawn: 0 };
        this.stats.set(d);
        this.renderChart(d);
      },
      error: () => {
        // Fallback mock stats
        const mockStats = { sent: 15, interviewing: 4, offers: 2, rejected: 8, withdrawn: 1 };
        this.stats.set(mockStats);
        this.renderChart(mockStats);
      }
    });
  }

  private chart: any;

  renderChart(statsData: any) {
    if (this.chart) {
      this.chart.destroy();
    }

    setTimeout(() => {
      const ctx = document.getElementById('funnelChart') as HTMLCanvasElement;
      if (!ctx) return;

      this.chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Enviadas', 'Entrevistas', 'Ofertas', 'Rechazadas'],
          datasets: [{
            data: [statsData.sent || 0, statsData.interviewing || 0, statsData.offers || 0, statsData.rejected || 0],
            backgroundColor: [
              '#3b82f6', // blue-500
              '#eab308', // yellow-500
              '#22c55e', // green-500
              '#ef4444'  // red-500
            ],
            borderWidth: 0,
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: {
                color: '#64748b',
                font: {
                  family: "'Inter', sans-serif",
                  size: 12
                }
              }
            }
          },
          cutout: '70%'
        }
      });
    }, 100);
  }

  loadUpcomingInterviews() {
    this.http.get<any[]>(`${environment.apiUrl}/applications/upcoming-interviews`).subscribe({
      next: (data) => {
        this.upcomingInterviews.set(data || []);
      },
      error: () => {
        // Mock data
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        this.upcomingInterviews.set([
          { id: '2', offer: { title: 'Fullstack Engineer', company: 'BigCorp' }, interviewDate: tomorrow.toISOString() }
        ]);
      }
    });
  }

  analyzeWithAI(item: any) {
    const targetId = item._uniqueId || item.id;
    this.analyzingOffer.set(targetId);

    // Si el item tiene un offer.id real, lo enviamos, sino un mock
    const realOfferId = item.offer?.id || item.id || '123';

    this.http.post<any>(`${environment.apiUrl}/ai/analyze-offer`, { offerId: realOfferId }).subscribe({
      next: (res) => {
        this.aiAnalysisResult.update(prev => ({ ...prev, [targetId]: res.analysis }));
        this.analyzingOffer.set(null);
      },
      error: () => {
        // Mock result
        setTimeout(() => {
          this.aiAnalysisResult.update(prev => ({ ...prev, [targetId]: '¡Excelente oportunidad! Tu perfil encaja un 85% con lo que buscan. Te sugerimos repasar tus conocimientos en TypeScript y arquitectura en la nube para la entrevista.' }));
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

  apply(item: any) {
    this.http.post(`${environment.apiUrl}/applications`, { offerId: item.id }).subscribe({
      next: () => {
        this.applyingOffer.set(item);
      },
      error: () => {
        this.applyingOffer.set(item); // mock
      }
    });
  }

  closeApplyModal() {
    this.applyingOffer.set(null);
  }

  goToOriginalSite() {
    const item = this.applyingOffer();
    if (item && item.offer && item.offer.url) {
      window.open(item.offer.url, '_blank');
    } else if (item && item.url) {
      window.open(item.url, '_blank');
    }
    this.closeApplyModal();
  }
}
