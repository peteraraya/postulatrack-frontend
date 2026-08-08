import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, catchError, map, throwError, of } from 'rxjs';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root'
})
export class AiService {
  private http = inject(HttpClient);
  private toastService = inject(ToastService);

  /**
   * Envía un prompt a la IA a través del Backend Proxy.
   * - Si es texto normal, intenta con Groq -> Gemini -> OpenRouter.
   * - Si incluye un PDF (base64Data), intenta solo con Gemini (el único multimodal).
   */
  generateContent(prompt: string, useJsonFormat: boolean = false, base64Data?: string): Observable<string> {
    const systemPrompt = useJsonFormat
      ? 'Responde ESTRICTAMENTE con JSON plano, sin usar bloques markdown (```json).'
      : undefined;

    if (base64Data) {
      // Si hay archivo, vamos directo a Gemini y si falla, mostramos error
      return this.callGemini(prompt, systemPrompt, base64Data).pipe(
        catchError(err => {
          console.error('Error con Gemini API extrayendo PDF:', err);
          return throwError(() => err);
        })
      );
    }

    // Flujo normal de texto: Groq -> Gemini -> OpenRouter
    return this.callGroq(prompt, systemPrompt).pipe(
      catchError(errGroq => {
        console.warn('Groq falló. Intentando con Gemini como respaldo...', errGroq);

        return this.callGemini(prompt, systemPrompt).pipe(
          catchError(errGemini => {
            console.warn('Gemini falló. Intentando con OpenRouter como último recurso...', errGemini);

            return this.callOpenRouter(prompt, systemPrompt).pipe(
              catchError(errOpenRouter => {
                console.error('Todas las IAs de respaldo fallaron.', errOpenRouter);
                return throwError(() => new Error('Error: Todas las IAs fallaron.'));
              })
            );
          })
        );
      })
    );
  }

  private callGroq(prompt: string, systemPrompt?: string): Observable<string> {
    const url = `${environment.apiUrl}/ai/chat/groq`;
    const payload: any = { prompt };
    if (systemPrompt) payload.systemPrompt = systemPrompt;

    return this.http.post<any>(url, payload).pipe(
      map(res => res.response)
    );
  }

  private callGemini(prompt: string, systemPrompt?: string, base64Data?: string): Observable<string> {
    const url = `${environment.apiUrl}/ai/chat/gemini`;
    const payload: any = { prompt };
    if (systemPrompt) payload.systemPrompt = systemPrompt;

    if (base64Data) {
      payload.fileBase64 = base64Data;
      payload.fileMimeType = 'application/pdf';
    }

    return this.http.post<any>(url, payload).pipe(
      map(res => res.response)
    );
  }

  private callOpenRouter(prompt: string, systemPrompt?: string): Observable<string> {
    const url = `${environment.apiUrl}/ai/chat/openrouter`;
    const payload: any = { prompt };
    if (systemPrompt) payload.systemPrompt = systemPrompt;

    return this.http.post<any>(url, payload).pipe(
      map(res => res.response)
    );
  }
}
