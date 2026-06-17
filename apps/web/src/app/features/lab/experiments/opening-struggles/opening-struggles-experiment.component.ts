import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CopyableLineComponent } from '../../../../shared/ui/copyable-line/copyable-line.component';
import { GameFilterPanelComponent } from '../../../../shared/game-filters/game-filter-panel.component';
import { OpeningStrugglesApiService } from './data-access/opening-struggles-api.service';
import {
  OpeningStrugglesEvalMetric,
  OpeningStrugglesResultMetric,
} from './data-access/opening-struggles.models';
import { analysisQueryParams, evalLabel, lineLabel, percentLabel, userColorLabel, wdlLabel } from './helpers/opening-struggles-labels';
import { OpeningStrugglesStore } from './state/opening-struggles.store';

@Component({
  selector: 'app-lab-opening-struggles',
  standalone: true,
  imports: [GameFilterPanelComponent, CopyableLineComponent],
  providers: [OpeningStrugglesApiService, OpeningStrugglesStore],
  templateUrl: './opening-struggles-experiment.component.html',
  styleUrl: './opening-struggles-experiment.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpeningStrugglesExperimentComponent implements OnInit {
  protected readonly store = inject(OpeningStrugglesStore);
  protected readonly lineLabel = lineLabel;
  protected readonly wdlLabel = wdlLabel;
  protected readonly userColorLabel = userColorLabel;
  protected readonly percentLabel = percentLabel;
  protected readonly evalLabel = evalLabel;
  protected readonly analysisQueryParams = analysisQueryParams;

  ngOnInit(): void { void this.store.initialize(); }

  protected numberValue(event: Event): number {
    return Number((event.target as HTMLInputElement).value);
  }

  protected resultMetricValue(event: Event): OpeningStrugglesResultMetric {
    return (event.target as HTMLSelectElement).value as OpeningStrugglesResultMetric;
  }

  protected evalMetricValue(event: Event): OpeningStrugglesEvalMetric {
    return (event.target as HTMLSelectElement).value as OpeningStrugglesEvalMetric;
  }
}
