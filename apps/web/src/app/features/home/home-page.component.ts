import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AccountsApiService } from '../accounts/data-access/accounts-api.service';
import { ActivityFeedApiService } from '../activity-feed';
import { LibraryApiService } from '../library/data-access/library-api.service';
import { TodayActivityCardComponent } from './components/today-activity-card.component';
import { HomeDashboardStore } from './home-dashboard.store';

interface HomeShortcut {
  label: string;
  description: string;
  link: string;
  marker: string;
}

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [RouterLink, TodayActivityCardComponent],
  providers: [
    AccountsApiService,
    ActivityFeedApiService,
    LibraryApiService,
    HomeDashboardStore,
  ],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent implements OnInit {
  protected readonly store = inject(HomeDashboardStore);
  protected readonly shortcuts: readonly HomeShortcut[] = [
    { label: 'Study', description: 'Train repertoire lines', link: '/library', marker: '01' },
    { label: 'Games', description: 'Review imported games', link: '/games', marker: '02' },
    { label: 'Openings', description: 'Explore positions', link: '/opening-analysis', marker: '03' },
    { label: 'Courses', description: 'Build your repertoire', link: '/courses', marker: '04' },
    { label: 'Analysis', description: 'Open the free board', link: '/analysis', marker: '05' },
    { label: 'Progress', description: 'Inspect performance', link: '/progress', marker: '06' },
  ];

  ngOnInit(): void {
    void this.store.load();
  }

  protected reload(): void {
    void this.store.reload();
  }

  protected reloadActivity(): void {
    void this.store.loadActivity();
  }
}
