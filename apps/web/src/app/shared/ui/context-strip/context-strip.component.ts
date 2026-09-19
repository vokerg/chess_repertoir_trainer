import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface UiContextItem {
  id: string;
  label: string;
  value: string | number;
  marker?: string;
  mono?: boolean;
}

export type ContextStripPresentation = 'cards' | 'segments';

@Component({
  selector: 'app-context-strip',
  standalone: true,
  templateUrl: './context-strip.component.html',
  styleUrl: './context-strip.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContextStripComponent {
  readonly items = input.required<readonly UiContextItem[]>();
  readonly ariaLabel = input('Current context');
  readonly presentation = input<ContextStripPresentation>('cards');
}
