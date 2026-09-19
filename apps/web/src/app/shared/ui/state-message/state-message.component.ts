import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type UiStateMessageTone = 'loading' | 'empty' | 'error';

@Component({
  selector: 'app-state-message',
  standalone: true,
  templateUrl: './state-message.component.html',
  styleUrl: './state-message.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StateMessageComponent {
  readonly message = input.required<string>();
  readonly tone = input<UiStateMessageTone>('empty');

  protected readonly semanticRole = computed<'alert' | 'status' | null>(() => {
    if (this.tone() === 'error') return 'alert';
    if (this.tone() === 'loading') return 'status';
    return null;
  });
  protected readonly liveMode = computed<'assertive' | 'polite' | null>(() => {
    if (this.tone() === 'error') return 'assertive';
    if (this.tone() === 'loading') return 'polite';
    return null;
  });
}
