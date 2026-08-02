import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
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

  constructor() {
    // Attempt to enrich userInfo from backend if token payload is missing details
    this.http.get<any>(`${environment.apiUrl}/profile`).subscribe({
      next: (profile) => {
        if (profile) {
          if (profile.user) {
            this.userInfo = { ...this.userInfo, ...profile.user };
          } else if (profile.name || profile.picture) {
            this.userInfo = {
              ...this.userInfo,
              name: profile.name || this.userInfo.name,
              picture: profile.picture || this.userInfo.picture
            };
          }
        }
      },
      error: () => {}
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
}
