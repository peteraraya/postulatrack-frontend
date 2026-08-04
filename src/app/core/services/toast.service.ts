import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  actionLabel?: string;
  actionFn?: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  toasts = signal<Toast[]>([]);

  show(message: string, type: 'success' | 'error' | 'info' = 'info', duration: number = 3000, actionLabel?: string, actionFn?: () => void) {
    const id = Math.random().toString(36).substring(2, 9);
    this.toasts.update(t => [...t, { id, message, type, actionLabel, actionFn }]);

    setTimeout(() => {
      this.remove(id);
    }, duration);
  }

  showWithAction(message: string, actionLabel: string, actionFn: () => void, type: 'success' | 'error' | 'info' = 'info', duration: number = 5000) {
    this.show(message, type, duration, actionLabel, actionFn);
  }

  success(message: string, duration?: number) {
    this.show(message, 'success', duration);
  }

  error(message: string, duration?: number) {
    this.show(message, 'error', duration);
  }

  info(message: string, duration?: number) {
    this.show(message, 'info', duration);
  }

  remove(id: string) {
    this.toasts.update(t => t.filter(toast => toast.id !== id));
  }
}
