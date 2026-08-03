import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { PanelComponent } from '../../../../shared/ui/panel/panel.component';
import { type UiShellAction } from '../../../../shared/ui/ui-shell.model';
import { TopOpponentsApiService } from './data-access/top-opponents-api.service';
import { TopOpponentsStore } from './state/top-opponents.store';

@Component({
  selector: 'app-lab-top-opponents',
  standalone: true,
  imports: [PanelComponent],
  providers: [TopOpponentsApiService, TopOpponentsStore],
  templateUrl: './top-opponents-experiment.component.html',
  styleUrl: './top-opponents-experiment.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopOpponentsExperimentComponent implements OnInit {
  protected readonly store = inject(TopOpponentsStore);

  protected readonly actions = computed<readonly UiShellAction[]>(() => [
    {
      id: 'refresh-top-opponents',
      label: this.store.loading() ? 'Loading…' : 'Refresh',
      disabled: this.store.loading(),
      run: () => void this.store.load(),
    },
  ]);

  ngOnInit(): void {
    void this.store.load();
  }
}
