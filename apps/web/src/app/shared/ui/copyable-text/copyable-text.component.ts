import { ChangeDetectionStrategy, Component, OnDestroy, input, signal } from '@angular/core';

@Component({
  selector: 'app-copyable-text',
  standalone: true,
  templateUrl: './copyable-text.component.html',
  styleUrl: './copyable-text.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CopyableTextComponent implements OnDestroy {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly accessibleName = input<string | null>(null);
  protected readonly copyState = signal<'idle' | 'copied' | 'error'>('idle');
  private resetTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnDestroy(): void {
    if (this.resetTimer) clearTimeout(this.resetTimer);
  }

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.value());
      this.setCopyState('copied');
    } catch {
      this.setCopyState('error');
    }
  }

  protected copyButtonLabel(): string {
    if (this.copyState() === 'copied') return 'Copied';
    if (this.copyState() === 'error') return 'Copy failed';
    return `Copy ${this.label()}`;
  }

  private setCopyState(state: 'idle' | 'copied' | 'error'): void {
    this.copyState.set(state);
    if (this.resetTimer) clearTimeout(this.resetTimer);
    if (state !== 'idle') {
      this.resetTimer = setTimeout(() => {
        this.copyState.set('idle');
        this.resetTimer = null;
      }, 1800);
    }
  }
}
