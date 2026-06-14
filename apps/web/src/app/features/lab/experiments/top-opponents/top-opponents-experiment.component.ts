import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { TopOpponentsApiService } from './data-access/top-opponents-api.service';
import { TopOpponentsStore } from './state/top-opponents.store';

@Component({
  selector: 'app-lab-top-opponents',
  standalone: true,
  providers: [TopOpponentsApiService, TopOpponentsStore],
  templateUrl: './top-opponents-experiment.component.html',
  styleUrl: './top-opponents-experiment.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopOpponentsExperimentComponent implements OnInit {
  protected readonly store = inject(TopOpponentsStore);
  ngOnInit(): void { void this.store.load(); }
}
