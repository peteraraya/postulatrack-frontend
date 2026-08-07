import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { FilterService } from '../../core/services/filter.service';
import { ThemeService } from '../../core/services/theme.service';
import { ToastService } from '../../core/services/toast.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.component.html'
})
export class ShellComponent {
  private authService = inject(AuthService);
  private http = inject(HttpClient);
  public filterService = inject(FilterService);
  public themeService = inject(ThemeService);
  public toastService = inject(ToastService);

  userInfo: any = this.authService.getUserInfo() || {};
  skillInput = '';
  isMobileMenuOpen = false;
  isProfileComplete = true; // Por defecto true para no bloquear mientras carga

  private router = inject(Router);

  constructor() {
    // Attempt to enrich userInfo from backend if token payload is missing details
    this.http.get<any>(`${environment.apiUrl}/profile`).subscribe({
      next: (profile) => {
        if (profile) {
          const hasName = !!(profile.firstName && profile.firstName.trim().length > 0) || !!(profile.user?.name);
          // Consideramos completo si tiene firstName guardado. Si no, false.
          // Wait, si el login con Google da nombre, profile.user.name existe?
          // Para forzar que completen en la vista perfil, revisamos profile.firstName directamente.
          const isComplete = !!(profile.firstName && profile.firstName.trim().length > 0);
          this.isProfileComplete = isComplete;

          if (!isComplete && this.router.url !== '/profile') {
            this.router.navigate(['/profile']);
            this.toastService.info('Para usar la app, debes completar tu nombre en el perfil.');
          }

          if (profile.user) {
            this.userInfo = { ...this.userInfo, ...profile.user };
          } else if (profile.name || profile.picture) {
            this.userInfo = {
              ...this.userInfo,
              name: profile.name || this.userInfo.name,
              picture: profile.picture || this.userInfo.picture
            };
          }
        } else {
          // Si el perfil es null, entonces tampoco está completo.
          this.isProfileComplete = false;
          if (this.router.url !== '/profile') {
            this.router.navigate(['/profile']);
            this.toastService.info('Para usar la app, debes completar tu nombre en el perfil.');
          }
        }
      },
      error: () => {
        this.isProfileComplete = false;
        if (this.router.url !== '/profile') {
          this.router.navigate(['/profile']);
        }
      }
    });
  }

  logout() {
    this.authService.logout();
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

  getActiveFiltersCount(): number {
    const f = this.filterService.filters();
    let count = 0;
    if (f.title) count++;
    if (f.company) count++;
    if (f.location) count++;
    if (f.country) count++;
    if (f.experience) count++;
    if (f.salaryMin) count++;
    if (f.workModel) count++;
    if (f.skills && f.skills.length > 0) count += f.skills.length;
    return count;
  }

  getActiveFilterBadges(): {key: string, value: string}[] {
    const f = this.filterService.filters();
    const badges: {key: string, value: string}[] = [];
    if (f.title) badges.push({key: 'title', value: f.title});
    if (f.company) badges.push({key: 'company', value: f.company});
    if (f.location) badges.push({key: 'location', value: f.location});
    if (f.workModel) badges.push({key: 'workModel', value: f.workModel});
    if (f.skills) {
      f.skills.forEach(s => badges.push({key: 'skill', value: s}));
    }
    return badges;
  }

  removeFilterBadge(badge: {key: string, value: string}) {
    const f = this.filterService.filters();
    if (badge.key === 'title') this.filterService.updateFilters({title: ''});
    if (badge.key === 'company') this.filterService.updateFilters({company: ''});
    if (badge.key === 'location') this.filterService.updateFilters({location: ''});
    if (badge.key === 'workModel') this.filterService.updateFilters({workModel: ''});
    if (badge.key === 'skill') {
      this.filterService.updateFilters({skills: f.skills.filter(s => s !== badge.value)});
    }
    this.filterService.applyFilters();
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu() {
    this.isMobileMenuOpen = false;
  }
}
