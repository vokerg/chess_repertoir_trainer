import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import type {
  PerformanceByRatingRow,
  PerformanceReportType,
  PerformanceWdl,
} from '@chess-trainer/contracts/lab';
import { PerformanceByRatingApiService } from './data-access/performance-by-rating-api.service';
import {
  PerformanceByRatingStore,
  PerformanceColumnId,
  PERFORMANCE_REPORT_TYPES,
} from './state/performance-by-rating.store';

interface ColumnDefinition {
  id: PerformanceColumnId;
  label: string;
  shortLabel: string;
  description: string;
}

interface ColumnGroup {
  id: 'results' | 'opening' | 'position' | 'clock' | 'shape' | 'quality';
  label: string;
  columns: readonly ColumnDefinition[];
}

@Component({
  selector: 'app-lab-performance-by-rating',
  standalone: true,
  providers: [PerformanceByRatingApiService, PerformanceByRatingStore],
  templateUrl: './performance-by-rating-experiment.component.html',
  styleUrl: './performance-by-rating-experiment.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerformanceByRatingExperimentComponent implements OnInit {
  protected readonly store = inject(PerformanceByRatingStore);
  protected readonly reportTypes = PERFORMANCE_REPORT_TYPES;
  protected readonly columnGroups: readonly ColumnGroup[] = [
    {
      id: 'results',
      label: 'Results',
      columns: [
        { id: 'games', label: 'Games', shortLabel: 'Games', description: 'Scored games in this provider, speed and opponent-rating band.' },
        { id: 'wdl', label: 'WDL', shortLabel: 'WDL', description: 'Wins, draws and losses.' },
        { id: 'score', label: 'Score', shortLabel: 'Score', description: 'Chess score percentage: wins plus half of draws.' },
        { id: 'whiteWdl', label: 'White WDL', shortLabel: 'White WDL', description: 'Wins, draws and losses when you played White.' },
        { id: 'blackWdl', label: 'Black WDL', shortLabel: 'Black WDL', description: 'Wins, draws and losses when you played Black.' },
      ],
    },
    {
      id: 'opening',
      label: 'Opening',
      columns: [
        { id: 'openingSuccess', label: 'Opening success', shortLabel: 'Opening +', description: 'Analysed games tagged Opening advantage or Opening success. Each game counts once.' },
        { id: 'openingTrouble', label: 'Opening trouble', shortLabel: 'Opening −', description: 'Analysed games tagged Opening trouble or Opening disaster. Each game counts once.' },
      ],
    },
    {
      id: 'position',
      label: 'Position',
      columns: [
        { id: 'wasWinningAndLost', label: 'Was winning and lost', shortLabel: 'Winning → loss', description: 'Losses where you were much better or winning during the game.' },
        { id: 'wasLosingAndWon', label: 'Was losing and won', shortLabel: 'Losing → win', description: 'Wins where you were much worse or lost during the game.' },
      ],
    },
    {
      id: 'clock',
      label: 'Clock',
      columns: [
        { id: 'flaggedInWinningPosition', label: 'Flagged while winning', shortLabel: 'Flagged +', description: 'Games lost on time while the final analysed position was winning for you.' },
        { id: 'opponentFlaggedInWinningPosition', label: 'Opponent flagged while winning', shortLabel: 'Opp. flagged +', description: 'Games won on time while the final analysed position was winning for the opponent.' },
      ],
    },
    {
      id: 'shape',
      label: 'Game shape',
      columns: [
        { id: 'slowBleedLosses', label: 'Slow bleed losses', shortLabel: 'Slow loss', description: 'Losses caused by several meaningful inaccuracies rather than one decisive mistake.' },
        { id: 'slowBleedWins', label: 'Slow bleed wins', shortLabel: 'Slow win', description: 'Wins where the opponent accumulated several meaningful inaccuracies.' },
      ],
    },
    {
      id: 'quality',
      label: 'Quality',
      columns: [
        { id: 'averageAccuracy', label: 'Average accuracy', shortLabel: 'Avg accuracy', description: 'Average stored accuracy for your side. Games without accuracy are excluded.' },
        { id: 'analysisCoverage', label: 'Analysis coverage', shortLabel: 'Coverage', description: 'Games with a completed stored analysis divided by all games in the row.' },
      ],
    },
  ];

  ngOnInit(): void {
    void this.store.initialize();
  }

  protected textValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected typeLabel(type: PerformanceReportType): string {
    if (type === 'LICHESS_BULLET') return 'Lichess Bullet';
    if (type === 'LICHESS_BLITZ') return 'Lichess Blitz';
    if (type === 'LICHESS_RAPID') return 'Lichess Rapid';
    if (type === 'CHESS_COM_BULLET') return 'Chess.com Bullet';
    if (type === 'CHESS_COM_BLITZ') return 'Chess.com Blitz';
    return 'Chess.com Rapid';
  }

  protected ratingLabel(row: PerformanceByRatingRow): string {
    return `${row.ratingFrom}–${row.ratingTo}`;
  }

  protected wdlLabel(wdl: PerformanceWdl): string {
    return `${wdl.wins}–${wdl.draws}–${wdl.losses}`;
  }

  protected percentLabel(value: number | null): string {
    return value === null ? '—' : `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
  }

  protected accuracyLabel(row: PerformanceByRatingRow): string {
    if (row.averageAccuracy === null) return '—';
    return `${row.averageAccuracy.toFixed(1)}% (${row.accuracyGames})`;
  }

  protected coverageLabel(row: PerformanceByRatingRow): string {
    if (row.games === 0) return '—';
    return `${row.analysedGames}/${row.games} · ${Math.round((row.analysedGames / row.games) * 100)}%`;
  }

  protected storyMetricLabel(count: number, row: PerformanceByRatingRow): string {
    if (row.analysedGames === 0) return count ? String(count) : '—';
    return `${count} · ${Math.round((count / row.analysedGames) * 100)}%`;
  }

  protected visibleCount(group: ColumnGroup): number {
    return group.columns.filter((column) => this.store.isColumnVisible(column.id)).length;
  }
}
