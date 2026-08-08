import { Component, ChangeDetectionStrategy, inject, signal, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormBuilder, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { FlatpickrDirective } from '../../shared/directives/flatpickr.directive';
import { AiService } from '../../core/services/ai.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, FlatpickrDirective],
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
  private aiService = inject(AiService);

  private aiSubscription?: Subscription;

  loading = signal(false);
  userInfo = this.authService.getUserInfo();

  isExtractingCV = signal(false);
  selectedDocument = signal<File | null>(null);
  documentPreviewUrl = signal<SafeResourceUrl | null>(null);
  documentType = signal<'pdf' | 'word' | null>(null);
  existingDocumentUrl = signal<string | null>(null);
  googleDocsPreviewUrl = signal<SafeResourceUrl | null>(null);

  suggestedSkills = signal<string[]>([]);
  isDragging = signal(false);

  profileForm = this.fb.group({
    firstName: [''],
    lastName: [''],
    email: [''],
    phone: [''],
    headline: [''],
    experienceLevel: [''], // Was 'experience'
    summary: [''],
    skills: [[] as string[]],
    location: [''], // City/Country
    availability: [''],
    portfolioUrl: [''],
    linkedinUrl: [''],
    githubUrl: [''],
    languages: [[] as string[]],
    hobbies: [[] as string[]],
    workExperiences: this.fb.array([])
  });

  get workExperiences() {
    return this.profileForm.get('workExperiences') as any;
  }

  addWorkExperience() {
    const expForm = this.fb.group({
      company: [''],
      role: [''],
      startDate: [''],
      endDate: [''],
      description: ['']
    });
    this.workExperiences.push(expForm);
    this.cdr.markForCheck();
  }

  removeWorkExperience(index: number) {
    this.workExperiences.removeAt(index);
    this.cdr.markForCheck();
  }

  skillInput = '';

  get skillsArray(): string[] {
    return this.profileForm.get('skills')?.value || [];
  }

  get profileCompleteness(): number {
    let score = 0;
    const val = this.profileForm.value as any;
    if (val.firstName && val.lastName) score += 10;
    if (val.email && val.phone) score += 10;
    if (val.headline) score += 10;
    if (val.summary && val.summary.length > 10) score += 10;
    if (val.skills && val.skills.length > 0) score += 15;
    if (val.workExperiences && val.workExperiences.length > 0) score += 20;
    if (val.location) score += 5;
    if (val.linkedinUrl) score += 10;
    if (this.selectedDocument() || this.existingDocumentUrl()) score += 10;
    return Math.min(score, 100);
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

  // Idiomas
  languageInput = '';
  get languagesArray(): string[] { return this.profileForm.get('languages')?.value || []; }

  addLanguage(event: Event) {
    event.preventDefault();
    const item = this.languageInput.trim();
    if (item && !this.languagesArray.includes(item)) {
      this.profileForm.patchValue({ languages: [...this.languagesArray, item] });
    }
    this.languageInput = '';
  }
  removeLanguage(item: string) {
    this.profileForm.patchValue({ languages: this.languagesArray.filter(s => s !== item) });
  }
  removeLastLanguage(event: Event) {
    if (this.languageInput === '' && this.languagesArray.length > 0) {
      const current = [...this.languagesArray];
      current.pop();
      this.profileForm.patchValue({ languages: current });
    }
  }

  // Hobbies
  hobbyInput = '';
  get hobbiesArray(): string[] { return this.profileForm.get('hobbies')?.value || []; }

  addHobby(event: Event) {
    event.preventDefault();
    const item = this.hobbyInput.trim();
    if (item && !this.hobbiesArray.includes(item)) {
      this.profileForm.patchValue({ hobbies: [...this.hobbiesArray, item] });
    }
    this.hobbyInput = '';
  }
  removeHobby(item: string) {
    this.profileForm.patchValue({ hobbies: this.hobbiesArray.filter(s => s !== item) });
  }
  removeLastHobby(event: Event) {
    if (this.hobbyInput === '' && this.hobbiesArray.length > 0) {
      const current = [...this.hobbiesArray];
      current.pop();
      this.profileForm.patchValue({ hobbies: current });
    }
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
    this.isExtractingCV.set(false);
    this.toastService.info('Operación IA cancelada');
  }

  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/profile`).subscribe({
      next: (profile) => {
        if (profile) {
          if (profile.user) {
            this.userInfo = { ...this.userInfo, ...profile.user };
          }

          // Clear existing array
          while (this.workExperiences.length !== 0) {
            this.workExperiences.removeAt(0);
          }

          if (profile.workExperiences && profile.workExperiences.length > 0) {
            profile.workExperiences.forEach((exp: any) => {
              this.workExperiences.push(this.fb.group({
                company: [exp.company || ''],
                role: [exp.role || ''],
                startDate: [exp.startDate || ''],
                endDate: [exp.endDate || ''],
                description: [exp.description || '']
              }));
            });
          } else {
            // Default 1 empty experience
            this.addWorkExperience();
          }

          this.profileForm.patchValue({
            firstName: profile.firstName || this.userInfo?.name?.split(' ')[0] || '',
            lastName: profile.lastName || this.userInfo?.name?.split(' ').slice(1).join(' ') || '',
            email: profile.email || this.userInfo?.email || '',
            phone: profile.phone || '',
            headline: profile.headline || '',
            experienceLevel: profile.experienceLevel || profile.experience || '',
            summary: profile.summary || '',
            skills: profile.skills || [],
            location: profile.location || '',
            availability: profile.availability || '',
            portfolioUrl: profile.portfolioUrl || '',
            linkedinUrl: profile.linkedinUrl || '',
            githubUrl: profile.githubUrl || '',
            languages: profile.languages || [],
            hobbies: profile.hobbies || []
          });
          if (profile.cvDocumentUrl) {
            const fullUrl = this.getFullUrl(profile.cvDocumentUrl);
            this.existingDocumentUrl.set(fullUrl);

            const isWord = fullUrl.toLowerCase().includes('.doc') || fullUrl.toLowerCase().includes('.docx');
            const isPdf = fullUrl.toLowerCase().includes('.pdf');

            if (isWord && fullUrl.startsWith('http')) {
              // Visor de Google Docs solo para Word (ya que los navegadores no los leen nativamente)
              const url = `https://docs.google.com/gview?url=${encodeURIComponent(fullUrl)}&embedded=true`;
              this.documentType.set('word');
              this.googleDocsPreviewUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
            } else if (!isWord && !isPdf && fullUrl.includes('cloudinary.com') && fullUrl.includes('/raw/')) {
              // Salvaguarda: Si el link es de Cloudinary 'raw' pero no tiene la extensión .pdf en la URL,
              // el servidor fuerza la descarga (Content-Disposition: attachment).
              // No lo ponemos en el iframe para evitar la descarga automática en bucle.
              this.documentType.set(null);
            } else {
              // Si es PDF, usamos el visor nativo del navegador (mucho más rápido y nítido).
              // Cloudinary renderiza PDFs nativamente si se suben con resource_type: 'image'.
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

  extractDataFromCV() {
    if (!this.selectedDocument()) {
      this.toastService.error('Debes adjuntar un documento nuevo para extraer datos.');
      return;
    }

    this.isExtractingCV.set(true);
    this.toastService.info('Analizando tu CV con Gemini 1.5 Flash...', 2000);

    const processBase64 = (base64Data: string) => {
      // Para Gemini que acepta base64:
      // Como Groq no soporta extracción directa de PDF por base64 (a menos que usemos OCR/vision),
      // Para la extracción de CV vamos a seguir usando solo Gemini o lanzar error si falla.
      // Modificamos el ai.service para soportar payloads mixtos o hacemos la llamada aquí directo.

      // Mantenemos la llamada directa a Gemini aquí porque la API de Groq no soporta PDF mimeType base64
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${environment.geminiApiKey}`;

      if (!environment.geminiApiKey) {
        this.toastService.error('Falta configurar Gemini API Key en environment.ts');
        this.isExtractingCV.set(false);
        return;
      }

      const payload = {
        contents: [{
          parts: [
            { text: "Eres un asistente experto en Recursos Humanos. Extrae la siguiente información del currículum adjunto y devuélvela ESTRICTAMENTE en formato JSON válido (sin markdown ni etiquetas ```json, solo el JSON puro). Las propiedades esperadas son:\n- firstName (string)\n- lastName (string)\n- email (string)\n- phone (string)\n- location (string)\n- headline (string)\n- experienceLevel (string, ej. 'Junior', 'Mid', 'Senior')\n- summary (string)\n- skills (array of strings)\n- languages (string)\n- hobbies (string)\n- workExperiences (array of objects con: company, role, startDate, endDate, description)\nSi falta algún dato, déjalo vacío." },
            { inlineData: { mimeType: "application/pdf", data: base64Data } }
          ]
        }]
      };

      if (this.aiSubscription) this.aiSubscription.unsubscribe();
      this.aiSubscription = this.http.post<any>(url, payload).subscribe({
        next: (res) => {
          try {
            const rawText = res.candidates[0].content.parts[0].text;
            // Limpiar posible markdown inyectado por Gemini
            const jsonText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
            const parsedData = JSON.parse(jsonText);

            // Borramos experiencias vacías
            while (this.workExperiences.length !== 0) {
              this.workExperiences.removeAt(0);
            }

            if (parsedData.workExperiences && parsedData.workExperiences.length > 0) {
              parsedData.workExperiences.forEach((exp: any) => {
                this.workExperiences.push(this.fb.group({
                  company: [exp.company || ''],
                  role: [exp.role || ''],
                  startDate: [exp.startDate || ''],
                  endDate: [exp.endDate || ''],
                  description: [exp.description || '']
                }));
              });
            } else {
              this.addWorkExperience();
            }

            // Autocompletamos el resto del formulario
            this.profileForm.patchValue({
              firstName: parsedData.firstName || '',
              lastName: parsedData.lastName || '',
              email: parsedData.email || '',
              phone: parsedData.phone || '',
              headline: parsedData.headline || '',
              experienceLevel: parsedData.experienceLevel || '',
              summary: parsedData.summary || '',
              skills: parsedData.skills || [],
            location: parsedData.location || '',
            languages: parsedData.languages || [],
            hobbies: parsedData.hobbies || []
          });

            this.isExtractingCV.set(false);
            this.toastService.success('¡Magia! Tu perfil ha sido autocompletado desde tu CV real.');
            this.cdr.markForCheck();
          } catch (e) {
            console.error('Error parsing Gemini JSON', e);
            this.isExtractingCV.set(false);
            this.toastService.error('Error al interpretar el CV. Intenta de nuevo.');
          }
        },
        error: (err) => {
          console.error(err);
          this.isExtractingCV.set(false);
          this.toastService.error('Error de conexión con Gemini. Verifica tu API Key.');
        }
      });
    };

    const file = this.selectedDocument();
    if (file) {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        this.toastService.error('Gemini solo soporta extracción desde archivos PDF.');
        this.isExtractingCV.set(false);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64Data = result.split(',')[1];
        processBase64(base64Data);
      };
      reader.readAsDataURL(file);
    } else {
      this.toastService.error('Por favor, selecciona de nuevo tu archivo localmente para analizarlo.');
      this.isExtractingCV.set(false);
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

  isGeneratingCV = signal(false);

  generateMyCV() {
    const profile = this.profileForm.value as any;
    const userName = (profile.firstName || profile.lastName)
      ? `${profile.firstName} ${profile.lastName}`.trim()
      : (this.userInfo?.name || 'Candidato');

    this.isGeneratingCV.set(true);
    this.toastService.info('Generando PDF, por favor espera...');

    this.http.get(`${environment.apiUrl}/profile/export/pdf`, {
      responseType: 'blob'
    }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `CV_${userName.replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();

        this.isGeneratingCV.set(false);
        this.toastService.success('¡Tu CV en PDF ha sido generado y descargado!');
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error descargando el CV:', err);
        this.isGeneratingCV.set(false);
        this.toastService.error('Error al generar el PDF del CV.');
        this.cdr.markForCheck();
      }
    });
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
        error: (err) => {
          console.error('Error al guardar perfil', err);
          this.loading.set(false);
          this.toastService.error('Error al guardar el perfil en el servidor');
        }
      });
    }
  }
}
