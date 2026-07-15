import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import {
  type PageHeaderAction,
  PageHeaderComponent,
} from '../../../shared/ui/page-header/page-header.component';

@Component({
  selector: 'app-lab-experiment-page-header',
  standalone: true,
  imports: [PageHeaderComponent],
  template: `
    <app-page-header
      [title]="title()"
      [subtitle]="subtitle()"
      [actions]="actions"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LabExperimentPageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input.required<string>();

  protected readonly actions: readonly PageHeaderAction[] = [
    {
      id: 'all-experiments',
      label: 'All experiments',
      link: '/lab',
    },
  ];
}
