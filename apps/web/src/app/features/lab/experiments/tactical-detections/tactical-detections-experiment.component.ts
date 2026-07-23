import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GameFilterPanelComponent } from '../../../../shared/games/filters/game-filter-panel.component';
import { TacticalDetectionsApiService } from './data-access/tactical-detections-api.service';
import {
  TacticalDetectionItem,
  TacticalDetectionKindFilter,
} from './data-access/tactical-detections.models';
import { TacticalDetectionsStore } from './state/tactical-detections.store';

@Component({
  selector: 'app-lab-tactical-detections',
  standalone: true,
  imports: [GameFilterPanelComponent, RouterLink],
  providers: [TacticalDetectionsApiService, TacticalDetectionsStore],
  templateUrl: './tactical-detections-experiment.component.html',
  styleUrl: './tactical-detections-experiment.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TacticalDetectionsExperimentComponent implements OnInit {
  protected readonly store = inject(TacticalDetectionsStore);

  ngOnInit(): void {
    void this.store.initialize();
  }

  protected checkedValue(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }

  protected numberValue(event: Event): number {
    return Number((event.target as HTMLInputElement).value);
  }

  protected filterValue(event: Event): TacticalDetectionKindFilter {
    return (event.target as HTMLSelectElement).value as TacticalDetectionKindFilter;
  }

  protected kindLabel(kind: TacticalDetectionItem['kind']): string {
    if (kind === 'MISSED_SHOT') return 'Missed shot';
    if (kind === 'PUNISHED_OPPONENT_BLUNDER') return 'Punished blunder';
    return 'My blunder';
  }

  protected dateLabel(value: string | null): string {
    if (!value) return 'Unknown';
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
  }

  protected evalLabel(value: number | null): string {
    if (value === null) return '-';
    return value > 0 ? `+${value}` : String(value);
  }

  protected swingLabel(value: number | null): string {
    if (value === null) return '-';
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
