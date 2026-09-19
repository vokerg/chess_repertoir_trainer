import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface UiFactItem {
  id: string;
  label: string;
  value: string | number;
  mono?: boolean;
}

@Component({
  selector: 'app-fact-grid',
  standalone: true,
  templateUrl: './fact-grid.component.html',
  styleUrl: './fact-grid.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FactGridComponent {
  readonly items = input.required<readonly UiFactItem[]>();
  readonly ariaLabel = input('Facts');
  readonly columns = input(2);
  readonly compactColumns = input(2);
  readonly highlighted = input(false);
}
