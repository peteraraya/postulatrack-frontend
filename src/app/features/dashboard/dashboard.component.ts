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
      error: (err) => {
        console.error('Error al cargar stats', err);
        const emptyStats = { sent: 0, interviewing: 0, offers: 0, rejected: 0, withdrawn: 0 };
        this.stats.set(emptyStats);
        this.renderChart(emptyStats);
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
      error: (err) => {
        console.error('Error al cargar entrevistas', err);
        this.upcomingInterviews.set([]);
      }
    });
  }

  analyzeWithAI(item: any) {
    const targetId = item._uniqueId || item.id;
    this.analyzingOffer.set(targetId);

    if (!environment.geminiApiKey) {
      alert('Falta configurar Gemini API Key en environment.ts');
      this.analyzingOffer.set(null);
      return;
    }

    const offerTitle = item.offer?.title || item.title || 'Trabajo';
    const offerCompany = item.offer?.company || item.company || 'Empresa';

    // Obtenemos el perfil local para tener contexto
    this.http.get<any>(`${environment.apiUrl}/profile`).subscribe({
      next: (profile) => {
        const userSkills = profile?.skills ? profile.skills.join(', ') : 'Habilidades generales';
        const userHeadline = profile?.headline || 'Profesional';

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${environment.geminiApiKey}`;
        const payload = {
          contents: [{
            parts: [{ text: `Actúa como un reclutador experto. El candidato tiene este titular: "${userHeadline}" y estas habilidades: "${userSkills}". La oferta es para el puesto de "${offerTitle}" en la empresa "${offerCompany}". Escribe un párrafo muy breve y directo (máximo 3 líneas) indicando por qué hace buen match y qué 1 concepto clave debería estudiar o repasar para la entrevista. No uses formato markdown de bloques.` }]
          }]
        };

        this.http.post<any>(url, payload).subscribe({
          next: (res) => {
            const analysis = res.candidates[0].content.parts[0].text;
            this.aiAnalysisResult.update(prev => ({ ...prev, [targetId]: analysis }));
            this.analyzingOffer.set(null);
          },
          error: (err) => {
            console.error('Error con Gemini API:', err);
            this.analyzingOffer.set(null);
          }
        });
      },
      error: () => {
        this.analyzingOffer.set(null);
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
      error: (err) => {
        console.error('Error al aplicar', err);
        alert('Error al postularse a esta oferta.');
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
