import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GameFilterPanelComponent } from '../../../../shared/games/filters/game-filter-panel.component';
import { PanelComponent } from '../../../../shared/ui/panel/panel.component';
import {
  SelectMenuComponent,
  type UiSelectMenuOption,
} from '../../../../shared/ui/select-menu/select-menu.component';
import { type UiShellAction, type UiShellStat } from '../../../../shared/ui/ui-shell.model';
import { TacticalDetectionsApiService } from './data-access/tactical-detections-api.service';
import {
  TacticalDetectionItem,
  TacticalDetectionKindFilter,
} from './data-access/tactical-detections.models';
import { TacticalDetectionsStore } from './state/tactical-detections.store';

const RESULT_LIMIT_MIN = 1;
const RESULT_LIMIT_MAX = 500;

const KIND_OPTIONS = [
  {
    value: 'ALL',
    label: 'All findings',
    caption: 'Missed shots, punished blunders, and my blunders',
    marker: 'neutral',
  },
  {
    value: 'MISSED_SHOT',
    label: 'Missed shots',
    caption: 'Winning tactical chances that were not played',
    marker: 'warning',
  },
  {
    value: 'PUNISHED_OPPONENT_BLUNDER',
    label: 'Punished blunders',
    caption: 'Opponent mistakes that were converted',
    marker: 'success',
  },
  {
    value: 'USER_BLUNDER',
    label: 'My blunders',
    caption: 'Moves that allowed a tactical punishment',
    marker: 'danger',
  },
] as const satisfies readonly UiSelectMenuOption[];

@Component({
  selector: 'app-lab-tactical-detections',
  standalone: true,
  imports: [GameFilterPanelComponent, PanelComponent, RouterLink, SelectMenuComponent],
  providers: [TacticalDetectionsApiService, TacticalDetectionsStore],
  templateUrl: './tactical-detections-experiment.component.html',
  styleUrl: './tactical-detections-experiment.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TacticalDetectionsExperimentComponent implements OnInit {
  protected readonly store = inject(TacticalDetectionsStore);
  protected readonly kindOptions = KIND_OPTIONS;
  protected readonly resultLimitMin = RESULT_LIMIT_MIN;
  protected readonly resultLimitMax = RESULT_LIMIT_MAX;
  protected readonly controlsDisabled = computed(() => this.store.loading() || this.store.running());
  protected readonly detectionRangeLabel = computed(() => {
    const { from, to } = this.store.gameFilters();
    if (!from && !to) return 'All imported games';
    if (from && to) return from === to ? from : `${from} to ${to}`;
    if (from) return `From ${from}`;
    return `Through ${to}`;
  });

  protected readonly actions = computed<readonly UiShellAction[]>(() => [
    {
      id: 'run-tactical-detection',
      label: this.store.running() ? 'Running…' : 'Run detection',
      disabled: this.controlsDisabled(),
      run: () => void this.store.runDetection(),
    },
  ]);

  protected readonly stats = computed<readonly UiShellStat[]>(() => {
    if (!this.store.loaded()) return [];

    return [
      { id: 'findings-shown', label: 'Shown', value: this.store.items().length },
      { id: 'missed-shots', label: 'Missed', value: this.store.missedShots() },
      {
        id: 'punished-blunders',
        label: 'Punished',
        value: this.store.punishedOpponentBlunders(),
      },
      { id: 'user-blunders', label: 'My blunders', value: this.store.userBlunders() },
    ];
  });

  ngOnInit(): void {
    void this.store.initialize();
  }

  protected checkedValue(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }

  protected changeLimit(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!Number.isFinite(input.valueAsNumber)) {
      input.value = String(this.store.limit());
      return;
    }

    const limit = Math.min(
      RESULT_LIMIT_MAX,
      Math.max(RESULT_LIMIT_MIN, Math.trunc(input.valueAsNumber)),
    );
    this.store.limit.set(limit);
    input.value = String(limit);
  }

  protected changeKindFilter(value: string): void {
    this.store.setKindFilter(value as TacticalDetectionKindFilter);
  }

  protected kindLabel(kind: TacticalDetectionItem['kind']): string {
    if (kind === 'MISSED_SHOT') return 'Missed shot';
    if (kind === 'PUNISHED_OPPONENT_BLUNDER') return 'Punished blunder';
    return 'My blunder';
  }

  protected kindClass(kind: TacticalDetectionItem['kind']): string {
    if (kind === 'MISSED_SHOT') return 'kind-pill kind-pill--missed';
    if (kind === 'PUNISHED_OPPONENT_BLUNDER') return 'kind-pill kind-pill--punished';
    return 'kind-pill kind-pill--blunder';
  }

  protected dateLabel(value: string | null): string {
    if (!value) return 'Unknown';
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
  }

  protected evalLabel(value: number | null): string {
    if (value === null) return '—';
    return value > 0 ? `+${value}` : String(value);
  }

  protected swingLabel(value: number | null): string {
    if (value === null) return '—';
    return `${value} cp`;
  }

  protected moveNumberLabel(item: TacticalDetectionItem): string {
    return String(Math.ceil(item.triggerPlyNumber / 2));
  }

  protected gameLabel(item: TacticalDetectionItem): string {
    return item.opponentUsername ? `vs ${item.opponentUsername}` : `Game ${item.importedGameId}`;
  }

  protected gameQueryParams(item: TacticalDetectionItem) {
    return { ply: item.triggerPlyNumber, findingId: item.id };
  }

  protected trainingRoute(item: TacticalDetectionItem): string | null {
    if (item.kind === 'MISSED_SHOT') return '/scenario-training/tactical-missed-shot';
    if (item.kind === 'USER_BLUNDER') return '/scenario-training/tactical-blunder';
    return null;
  }
}
