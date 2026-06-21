import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface StudyScopeItem {
  id: number;
  title: string;
  description: string;
  meta: string;
}

@Component({
  selector: 'app-study-scope-list',
  standalone: true,
  templateUrl: './study-scope-list.component.html',
  styleUrl: './study-scope-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudyScopeListComponent {
  readonly title = input.required<string>();
  readonly items = input.required<StudyScopeItem[]>();
  readonly selectedId = input<number | null>(null);
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly emptyText = input('Nothing to show.');
  readonly selectItem = output<number>();
}
