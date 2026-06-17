import { ChangeDetectionStrategy, Component, OnDestroy, input, signal } from '@angular/core';

@Component({
  selector: 'app-copy-button',
  standalone: true,
  templateUrl: './copy-button.component.html',
  styleUrl: './copy-button.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CopyButtonComponent implements OnDestroy {
  readonly value = input.required<string>();
  readonly label = input('Copy');
  readonly ariaLabel = input<string | null>(null);
  readonly showFeedback = input(true);
  readonly buttonClass = input('secondary');

  protected readonly state = signal<'idle' | 'copied' | 'error'>('idle');
  private resetTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnDestroy(): void {
    if (this.resetTimer) clearTimeout(this.resetTimer);
  }

  protected async copy(event: MouseEvent): Promise<void> {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(this.value());
      this.setFeedback('copied');
    } catch {
      this.setFeedback('error');
    }
  }

  protected buttonLabel(): string {
    if (this.showFeedback()) {
      if (this.state() === 'copied') return 'Copied';
      if (this.state() === 'error') return 'Error';
    }
    return this.label();
  }

  private setFeedback(state: 'idle' | 'copied' | 'error'): void {
    if (!this.showFeedback()) return;
    this.state.set(state);
    if (this.resetTimer) clearTimeout(this.resetTimer);
    this.resetTimer = setTimeout(() => {
      this.state.set('idle');
      this.resetTimer = null;
    }, 1800);
  }
}
