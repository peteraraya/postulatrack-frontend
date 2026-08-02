import { Injectable, signal } from '@angular/core';

export interface GlobalFilters {
  title: string;
  company: string;
  location: string;
  country?: string;
  skills: string[];
  experience: string;
  salaryMin: number | null;
  workModel: string;
}

@Injectable({
  providedIn: 'root'
})
export class FilterService {
  isFilterMenuOpen = signal(false);

  filters = signal<GlobalFilters>({
    title: '',
    company: '',
    location: '',
    country: '',
    skills: [],
    experience: '',
    salaryMin: null,
    workModel: ''
  });

  // Emit un valor cuando se aplica el filtro para que las vistas puedan recargar
  filtersApplied = signal<number>(0);

  constructor() {
    this.loadFilters();
  }

  private loadFilters() {
    const saved = localStorage.getItem('global_filters');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.filters.set({ ...this.filters(), ...parsed });
      } catch (e) {
        console.error('Error parsing saved filters', e);
      }
    }
  }

  private saveFilters() {
    localStorage.setItem('global_filters', JSON.stringify(this.filters()));
  }

  toggleMenu() {
    this.isFilterMenuOpen.update(v => !v);
  }

  closeMenu() {
    this.isFilterMenuOpen.set(false);
  }

  updateFilters(newFilters: Partial<GlobalFilters>) {
    this.filters.update(f => ({ ...f, ...newFilters }));
  }

  applyFilters() {
    this.saveFilters();
    this.filtersApplied.update(v => v + 1);
    this.closeMenu();
  }

  buildQueryParams(): URLSearchParams {
    const current = this.filters();
    let params = new URLSearchParams();
    if (current.title) params.append('title', current.title);
    if (current.company) params.append('company', current.company);
    if (current.location) params.append('location', current.location);
    if (current.country) params.append('country', current.country);
    if (current.experience) params.append('experience', current.experience);
    if (current.salaryMin) params.append('salaryMin', current.salaryMin.toString());
    if (current.workModel) params.append('workModel', current.workModel);
    if (current.skills && current.skills.length > 0) {
      current.skills.forEach(s => params.append('skills', s));
    }
    return params;
  }
}
