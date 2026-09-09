import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  inject,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService, type ReverificationChallengeState } from './auth.service';

@Component({
  selector: 'app-reverification-dialog',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './reverification-dialog.component.html',
  styleUrl: './reverification-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReverificationDialogComponent implements AfterViewInit, OnDestroy {
  protected readonly auth = inject(AuthService);
  protected readonly challenge = this.auth.reverificationChallenge;
  protected readonly credentialControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });

  private previousFocus: HTMLElement | null = null;
  private viewReady = false;
  private selectedFactorId: string | null = null;

  @ViewChild('dialog') private dialogRef?: ElementRef<HTMLDialogElement>;
  @ViewChild('credentialInput') private credentialInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('cancelButton') private cancelButtonRef?: ElementRef<HTMLButtonElement>;

  constructor() {
    effect(() => {
      const challenge = this.challenge();
      const nextFactorId = challenge?.selectedFactor?.id ?? null;
      if (nextFactorId !== this.selectedFactorId) {
        this.selectedFactorId = nextFactorId;
        this.credentialControl.setValue('');
      }
      queueMicrotask(() => this.syncDialog(challenge));
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.syncDialog(this.challenge());
  }

  ngOnDestroy(): void {
    this.auth.cancelReverification();
  }

  protected selectFactor(factorId: string): void {
    void this.auth.selectReverificationFactor(factorId);
  }

  protected submit(event: Event): void {
    event.preventDefault();
    if (this.credentialControl.invalid) return;
    void this.auth.submitReverification(this.credentialControl.value);
  }

  protected cancel(): void {
    this.auth.cancelReverification();
  }

  protected onCancel(event: Event): void {
    event.preventDefault();
    this.cancel();
  }

  protected onBackdropPointerDown(event: MouseEvent): void {
    if (event.target === this.dialogRef?.nativeElement) this.cancel();
  }

  private syncDialog(challenge: ReverificationChallengeState | null): void {
    if (!this.viewReady) return;
    const dialog = this.dialogRef?.nativeElement;
    if (!dialog) return;

    if (challenge) {
      if (!dialog.open) {
        this.previousFocus =
          document.activeElement instanceof HTMLElement ? document.activeElement : null;
        dialog.showModal();
      }
      queueMicrotask(() => this.focusInitialControl(challenge));
      return;
    }

    if (dialog.open) dialog.close();
    setTimeout(() => this.restoreFocus());
  }

  private focusInitialControl(challenge: ReverificationChallengeState): void {
    if (challenge.selectedFactor) {
      this.credentialInputRef?.nativeElement.focus();
    } else {
      this.cancelButtonRef?.nativeElement.focus();
    }
  }

  private restoreFocus(): void {
    const target = this.previousFocus;
    this.previousFocus = null;
    if (target?.isConnected) target.focus();
  }
}
