import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { PerformanceByRatingReportComponent } from '../components/performance-by-rating-report.component';

@Component({
  selector: 'app-performance-by-rating-page',
  standalone: true,
  imports: [PageHeaderComponent, PerformanceByRatingReportComponent],
  templateUrl: './performance-by-rating-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerformanceByRatingPageComponent {}
