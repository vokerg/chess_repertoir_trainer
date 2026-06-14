import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../../components/page-header.component';
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
  ngOnInit(): void { void this.store.load(); }
}
