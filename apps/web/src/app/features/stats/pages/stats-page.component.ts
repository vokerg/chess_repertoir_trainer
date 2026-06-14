import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent, PageHeaderStat } from '../../../components/page-header.component';
import { StatsApiService } from '../data-access/stats-api.service';
import { StatsStore } from '../state/stats.store';

@Component({
  selector: 'app-stats-page',
  standalone: true,
  imports: [DecimalPipe, RouterLink, PageHeaderComponent],
  providers: [StatsApiService, StatsStore],
  templateUrl: './stats-page.component.html',
  styleUrl: './stats-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatsPageComponent implements OnInit {
  protected readonly store = inject(StatsStore);
  protected readonly headerStats = computed<readonly PageHeaderStat[]>(() => {
    const summary = this.store.summary();
    return summary
      ? [
          { id: 'courses', label: 'Courses', value: summary.totalCourses },
          { id: 'lines', label: 'Lines', value: summary.totalLines },
          { id: 'sessions', label: 'Sessions', value: summary.totalTrainingSessions },
          { id: 'pressure-points', label: 'Pressure points', value: summary.weakestLines.length },
        ]
      : [];
  });
  ngOnInit(): void { void this.store.load(); }
}
