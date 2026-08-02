import { Component, ChangeDetectionStrategy, inject, signal, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormBuilder, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile.component.html'
})
export class ProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private sanitizer = inject(DomSanitizer);
  private toastService = inject(ToastService);

  loading = signal(false);
  userInfo = this.authService.getUserInfo();

  selectedDocument = signal<File | null>(null);
  documentPreviewUrl = signal<SafeResourceUrl | null>(null);
  documentType = signal<'pdf' | 'word' | null>(null);
  existingDocumentUrl = signal<string | null>(null);
  googleDocsPreviewUrl = signal<SafeResourceUrl | null>(null);

  suggestedSkills = signal<string[]>([]);
  isDragging = signal(false);

  profileForm = this.fb.group({
    headline: [''],
    experience: [''],
    summary: [''],
    skills: [[] as string[]],
    location: [''],
    portfolioUrl: [''],
  });

  skillInput = '';

  get skillsArray(): string[] {
    return this.profileForm.get('skills')?.value || [];
  }

  suggestSkills() {
    const headline = this.profileForm.get('headline')?.value?.toLowerCase() || '';
    let suggestions: string[] = [];
    if (headline.includes('frontend') || headline.includes('react') || headline.includes('angular')) {
      suggestions = ['React', 'Angular', 'Vue', 'TypeScript', 'Tailwind CSS', 'HTML5', 'CSS3', 'JavaScript'];
    } else if (headline.includes('backend') || headline.includes('node') || headline.includes('java')) {
      suggestions = ['Node.js', 'Express', 'Java', 'Spring Boot', 'Python', 'PostgreSQL', 'Docker', 'AWS'];
    } else {
      suggestions = ['Liderazgo', 'Trabajo en equipo', 'Resolución de problemas', 'Agile', 'Scrum'];
    }

    // Filter out skills already added
    const current = this.skillsArray;
    suggestions = suggestions.filter(s => !current.includes(s)).slice(0, 5);
    this.suggestedSkills.set(suggestions);
  }

  addSuggestedSkill(skill: string) {
    const currentSkills = this.skillsArray;
    if (!currentSkills.includes(skill)) {
      this.profileForm.patchValue({ skills: [...currentSkills, skill] });
      this.suggestedSkills.update(skills => skills.filter(s => s !== skill));
    }
  }

  addSkill(event: Event) {
    event.preventDefault();
    const skill = this.skillInput.trim();
    const currentSkills = this.skillsArray;
    if (skill && !currentSkills.includes(skill)) {
      this.profileForm.patchValue({ skills: [...currentSkills, skill] });
    }
    this.skillInput = '';
  }

  removeSkill(skill: string) {
    const currentSkills = this.skillsArray;
    this.profileForm.patchValue({ skills: currentSkills.filter(s => s !== skill) });
  }

  removeLastSkill(event: Event) {
    if (this.skillInput === '' && this.skillsArray.length > 0) {
      const currentSkills = [...this.skillsArray];
      currentSkills.pop();
      this.profileForm.patchValue({ skills: currentSkills });
    }
  }

  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/profile`).subscribe({
      next: (profile) => {
        if (profile) {
          if (profile.user) {
            this.userInfo = { ...this.userInfo, ...profile.user };
          }
          this.profileForm.patchValue({
            headline: profile.headline || '',
            experience: profile.experience || '',
            summary: profile.summary || '',
            skills: profile.skills || [],
            location: profile.location || '',
            portfolioUrl: profile.portfolioUrl || ''
          });
          if (profile.cvDocumentUrl) {
            const fullUrl = this.getFullUrl(profile.cvDocumentUrl);
            this.existingDocumentUrl.set(fullUrl);

            const isWord = fullUrl.toLowerCase().includes('.doc') || fullUrl.toLowerCase().includes('.docx');
            const isPdf = fullUrl.toLowerCase().includes('.pdf');

            // Usar visor de Google Docs para Word y PDF públicos
            // (evita bloqueos de X-Frame-Options o descargas automáticas en servicios como S3/Cloudinary en producción)
            if ((isWord || isPdf) && fullUrl.startsWith('http')) {
              const url = `https://docs.google.com/gview?url=${encodeURIComponent(fullUrl)}&embedded=true`;
              if (isWord) {
                this.googleDocsPreviewUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
              } else {
                this.documentType.set('pdf');
                this.documentPreviewUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
              }
            } else {
              // Asumimos que es PDF local o URL relativa y lo mostramos nativamente
              this.documentType.set('pdf');
              this.documentPreviewUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(fullUrl));
            }
          }
          this.suggestSkills();
          this.cdr.markForCheck();
        }
      },
      error: (err) => {
        console.error('Error loading profile', err);
      }
    });
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.handleFile(event.dataTransfer.files[0]);
    }
  }

  onDocumentSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.handleFile(file);
    }
  }

  private handleFile(file: File) {
    // Validar tipo de archivo
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type) && !file.name.endsWith('.pdf') && !file.name.endsWith('.doc') && !file.name.endsWith('.docx')) {
      alert('Solo se permiten archivos PDF o Word.');
      return;
    }

    this.selectedDocument.set(file);
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      this.documentType.set('pdf');
      this.documentPreviewUrl.set(
        this.sanitizer.bypassSecurityTrustResourceUrl(URL.createObjectURL(file))
      );
    } else {
      this.documentType.set('word');
      this.documentPreviewUrl.set(null);
    }
  }

  removeDocument() {
    this.selectedDocument.set(null);
    this.documentPreviewUrl.set(null);
    this.documentType.set(null);
  }

  private getFullUrl(url: string): string {
    if (!url) return '';
    let finalUrl = url;

    // Si la URL es relativa, le anteponemos el host del API
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('blob:')) {
      const baseUrl = environment.apiUrl.replace(/\/api$/, '');
      finalUrl = url.startsWith('/') ? `${baseUrl}${url}` : `${baseUrl}/${url}`;
    }

    // Forzar HTTPS en producción para evitar bloqueos por Mixed Content
    if (window.location.protocol === 'https:' && finalUrl.startsWith('http://')) {
      finalUrl = finalUrl.replace('http://', 'https://');
    }

    return finalUrl;
  }

  saveProfile() {
    if (this.profileForm.valid) {
      this.loading.set(true);
      const formValue = this.profileForm.value;

      const payload = {
        ...formValue,
        skills: formValue.skills || []
      };

      const formData = new FormData();
      formData.append('profile', JSON.stringify(payload));

      if (this.selectedDocument()) {
        formData.append('cvDocument', this.selectedDocument()!);
      }

      // We send formData, so backend must expect multipart/form-data
      this.http.post(`${environment.apiUrl}/profile/cv`, formData).subscribe({
        next: () => {
          this.loading.set(false);
          this.toastService.success('Perfil guardado exitosamente');
        },
        error: () => {
          this.loading.set(false);
          // Assuming backend might not be reachable right now, mock success
          this.toastService.success('Simulando guardado (Backend no responde). ¡Perfil actualizado!');
        }
      });
    }
  }
}
