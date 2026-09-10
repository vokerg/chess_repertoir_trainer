import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { PerformanceByRatingReportComponent } from '../components/performance-by-rating-report.component';

@Component({
  selector: 'app-performance-by-rating-page',
  standalone: true,
  imports: [PageHeaderComponent, PerformanceByRatingReportComponent],
  template: `
    <section class="stack">
      <app-page-header
        title="Performance by rating"
        subtitle="Compare results across opponent rating bands, providers, and speeds."
      />
      <app-performance-by-rating-report />
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerformanceByRatingPageComponent {}
