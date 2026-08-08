import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, catchError, map, switchMap, throwError, of } from 'rxjs';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root'
})
export class AiService {
  private http = inject(HttpClient);
  private toastService = inject(ToastService);

  /**
   * Envía un prompt a la IA. Primero intenta con Gemini.
   * Si falla (ej. 429 Too Many Requests), intenta automáticamente con Groq si está configurado.
   */
  generateContent(prompt: string, useJsonFormat: boolean = false): Observable<string> {
    if (!environment.geminiApiKey) {
      this.toastService.error('Falta configurar Gemini API Key en environment.ts');
      return throwError(() => new Error('No Gemini API Key'));
    }

    return this.callGemini(prompt).pipe(
      catchError(err => {
        console.warn('Error con Gemini API (posible 429). Intentando con Groq...', err);

        if (!environment.groqApiKey) {
          this.toastService.error('Gemini alcanzó su límite y no hay API Key de Groq configurada para el fallback.');
          return throwError(() => err);
        }

        this.toastService.info('Usando Groq como respaldo por alta demanda...', 2000);
        return this.callGroq(prompt, useJsonFormat);
      })
    );
  }

  private callGemini(prompt: string): Observable<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${environment.geminiApiKey}`;
    const payload = {
      contents: [{
        parts: [{ text: prompt }]
      }]
    };

    return this.http.post<any>(url, payload).pipe(
      map(res => res.candidates[0].content.parts[0].text)
    );
  }

  private callGroq(prompt: string, useJsonFormat: boolean): Observable<string> {
    const url = 'https://api.groq.com/openai/v1/chat/completions';

    // Groq usa formato compatible con OpenAI
    const payload: any = {
      model: 'llama3-70b-8192', // Llama 3 70B es rápido y excelente
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    };

    if (useJsonFormat) {
      // Para modelos que soportan json_object, Llama 3 en Groq lo soporta pero requiere que el prompt mencione "JSON"
      payload.response_format = { type: 'json_object' };
    }

    return this.http.post<any>(url, payload, {
      headers: {
        'Authorization': `Bearer ${environment.groqApiKey}`,
        'Content-Type': 'application/json'
      }
    }).pipe(
      map(res => res.choices[0].message.content)
    );
  }
}
