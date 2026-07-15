import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { GameFilterPanelComponent } from '../../../shared/games/filters/game-filter-panel.component';
import { CopyableLineComponent } from '../../../shared/ui/copyable-line/copyable-line.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { OpeningStrugglesApiService } from '../data-access/opening-struggles-api.service';
import { OpeningStrugglesMode } from '../data-access/opening-struggles.models';
import {
  analysisQueryParams,
  evalLabel,
  lineLabel,
  percentLabel,
  positionBeforeMoveLabel,
  repeatedMoveLabel,
  userColorLabel,
  wdlLabel,
} from '../helpers/opening-struggles-labels';
import { OpeningStrugglesStore } from '../state/opening-struggles.store';

@Component({
  selector: 'app-opening-struggles-page',
  standalone: true,
  imports: [PageHeaderComponent, GameFilterPanelComponent, CopyableLineComponent],
  providers: [OpeningStrugglesApiService, OpeningStrugglesStore],
  templateUrl: './opening-struggles-page.component.html',
  styleUrl: './opening-struggles-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpeningStrugglesPageComponent implements OnInit {
  protected readonly store = inject(OpeningStrugglesStore);
  protected readonly lineLabel = lineLabel;
  protected readonly wdlLabel = wdlLabel;
  protected readonly userColorLabel = userColorLabel;
  protected readonly percentLabel = percentLabel;
  protected readonly evalLabel = evalLabel;
  protected readonly positionBeforeMoveLabel = positionBeforeMoveLabel;
  protected readonly repeatedMoveLabel = repeatedMoveLabel;
  protected readonly analysisQueryParams = analysisQueryParams;

  ngOnInit(): void { void this.store.initialize(); }

  protected numberValue(event: Event): number {
    return Number((event.target as HTMLInputElement).value);
  }

  protected modeValue(event: Event): OpeningStrugglesMode {
    return (event.target as HTMLInputElement).value as OpeningStrugglesMode;
  }
}
