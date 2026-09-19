import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ConfirmDialogRequest } from './confirm-dialog.models';
import { ConfirmDialogService } from './confirm-dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogComponent implements AfterViewInit, OnDestroy {
  private readonly service = inject(ConfirmDialogService);
  private previousFocus: HTMLElement | null = null;
  private viewReady = false;

  @ViewChild('dialog') private dialogRef?: ElementRef<HTMLDialogElement>;
  @ViewChild('typedInput') private typedInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('cancelButton') private cancelButtonRef?: ElementRef<HTMLButtonElement>;

  protected readonly request = this.service.activeRequest;
  protected readonly confirmationControl = new FormControl('', { nonNullable: true });
  protected readonly dialogTitleId = 'confirm-dialog-title';
  protected readonly dialogDescriptionId = 'confirm-dialog-description';
  protected readonly typedValue = signal('');
  protected readonly tone = computed(() => this.request()?.tone ?? 'default');
  protected readonly confirmLabel = computed(() => this.request()?.confirmLabel ?? 'Confirm');
  protected readonly cancelLabel = computed(() => this.request()?.cancelLabel ?? 'Cancel');
  protected readonly typedConfirmation = computed(() => this.request()?.requireTypedConfirmation?.trim() ?? '');
  protected readonly hasTypedConfirmation = computed(() => this.typedConfirmation().length > 0);
  protected readonly canConfirm = computed(() => !this.hasTypedConfirmation() || this.typedValue() === this.typedConfirmation());

  constructor() {
    this.confirmationControl.valueChanges.subscribe((value) => this.typedValue.set(value));

    effect(() => {
      const request = this.request();
      this.confirmationControl.setValue('', { emitEvent: true });
      queueMicrotask(() => this.syncDialog(request));
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.syncDialog(this.request());
  }

  ngOnDestroy(): void {
    this.service.cancelActive();
  }

  protected onConfirmSubmit(event: Event): void {
    event.preventDefault();
    if (!this.canConfirm()) return;
    this.service.confirmActive();
  }

  protected cancel(): void {
    this.service.cancelActive();
  }

  protected onCancel(event: Event): void {
    event.preventDefault();
    this.cancel();
  }

  protected onBackdropPointerDown(event: MouseEvent): void {
    if (event.target === this.dialogRef?.nativeElement) {
      this.cancel();
    }
  }

  private syncDialog(request: ConfirmDialogRequest | null): void {
    if (!this.viewReady) return;
    const dialog = this.dialogRef?.nativeElement;
    if (!dialog) return;

    if (request) {
      if (!dialog.open) {
        this.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        dialog.showModal();
      }
      queueMicrotask(() => this.focusInitialControl());
      return;
    }

    if (dialog.open) dialog.close();
    setTimeout(() => this.restoreFocus());
  }

  private focusInitialControl(): void {
    const target = this.hasTypedConfirmation()
      ? this.typedInputRef?.nativeElement
      : this.cancelButtonRef?.nativeElement;
    target?.focus();
  }

  private restoreFocus(): void {
    const target = this.previousFocus;
    this.previousFocus = null;
    if (target?.isConnected) target.focus();
  }
}
