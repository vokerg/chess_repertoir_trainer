import { Injectable, signal } from '@angular/core';
import { ConfirmDialogRequest } from './confirm-dialog.models';

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private readonly activeRequestSignal = signal<ConfirmDialogRequest | null>(null);
  private pendingResolve: ((confirmed: boolean) => void) | null = null;

  readonly activeRequest = this.activeRequestSignal.asReadonly();

  ['confirm'](request: ConfirmDialogRequest): Promise<boolean> {
    this.close(false);
    this.activeRequestSignal.set(request);

    return new Promise<boolean>((resolve) => {
      this.pendingResolve = resolve;
    });
  }

  confirmActive(): void {
    this.close(true);
  }

  cancelActive(): void {
    this.close(false);
  }

  private close(confirmed: boolean): void {
    const resolve = this.pendingResolve;
    this.pendingResolve = null;
    this.activeRequestSignal.set(null);
    resolve?.(confirmed);
  }
}
