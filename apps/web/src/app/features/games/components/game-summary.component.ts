import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';
import { ImportedGameAnalysisProgress } from '../data-access/imported-game-analysis.service';
import {
  ImportedGameAnalysisRun,
  ImportedGameDetail,
  ImportedGameTag,
} from '../data-access/games.models';
import { accuracyLabel, colorLabel, playerLabel, resultLabel, timeControlLabel } from '../helpers/game-detail-labels';

const POSITIVE_TAG_CODES = new Set<number>([
  1,
  3,
  5,
  103,
  115,
  118,
  121,
  133,
  134,
  129,
]);

const NEGATIVE_TAG_CODES = new Set<number>([
  2,
  4,
  6,
  102,
  104,
  105,
  108,
  113,
  114,
  119,
  120,
]);

type SummaryFact = {
  label: string;
  value: string;
};

type AccuracyRow = {
  label: string;
  value: string;
};

type SideAnalysisRow = {
  side: 'WHITE' | 'BLACK';
  label: string;
  accuracy: string;
  acpl: string;
  critical: number;
  issues: string;
};

@Component({
  selector: 'app-game-summary',
  standalone: true,
  imports: [PanelComponent],
  templateUrl: './game-summary.component.html',
  styleUrl: './game-summary.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameSummaryComponent {
  readonly game = input.required<ImportedGameDetail>();
  readonly analysisRun = input<ImportedGameAnalysisRun | null>(null);
  readonly analysisProgress = input.required<ImportedGameAnalysisProgress>();
  readonly analysisStatus = input.required<string>();
  readonly analysisSummary = input.required<string>();

  protected readonly result = computed(() => resultLabel(this.game().resultForUser));
  protected readonly color = computed(() => colorLabel(this.game().userColor));
  protected readonly opponent = computed(() => {
    const game = this.game();
    if (game.userColor === 'WHITE') return game.black;
    if (game.userColor === 'BLACK') return game.white;
    return game.opponentUsername ? { username: game.opponentUsername, rating: null } : null;
  });
  protected readonly opponentLabel = computed(() => {
    const opponent = this.opponent();
    if (!opponent) return 'Opponent unavailable';
    return playerLabel(opponent);
  });
  protected readonly opponentUrl = computed(() => {
    const username = this.opponent()?.username?.trim();
    if (!username) return null;
    if (this.game().provider === 'LICHESS') return `https://lichess.org/@/${encodeURIComponent(username)}`;
    if (this.game().provider === 'CHESS_COM') return `https://www.chess.com/member/${encodeURIComponent(username)}`;
    return null;
  });
  protected readonly speedLabel = computed(() => {
    const speed = this.game().speedCategory;
    return speed ? speed.charAt(0).toUpperCase() + speed.slice(1) : 'Unknown speed';
  });
  protected readonly timeControl = computed(() => this.game().timeControl.raw || timeControlLabel(this.game()));
  protected readonly ratedLabel = computed(() => {
    const rated = this.game().rated;
    if (rated === true) return 'Rated';
    if (rated === false) return 'Unrated';
    return 'Rated unknown';
  });
  protected readonly userAccuracyValue = computed(() => this.analysisRun()?.[this.userAccuracyField()] ?? this.game().analysis.userAccuracy ?? null);
  protected readonly whiteAccuracyValue = computed(() => this.analysisRun()?.whiteAccuracy ?? this.game().analysis.whiteAccuracy ?? null);
  protected readonly blackAccuracyValue = computed(() => this.analysisRun()?.blackAccuracy ?? this.game().analysis.blackAccuracy ?? null);
  protected readonly userAccuracy = computed(() => accuracyLabel(this.userAccuracyValue()));
  protected readonly whiteAccuracy = computed(() => accuracyLabel(this.whiteAccuracyValue()));
  protected readonly blackAccuracy = computed(() => accuracyLabel(this.blackAccuracyValue()));
  protected readonly resultTone = computed(() => {
    const result = this.game().resultForUser;
    if (result === 'WIN') return 'win';
    if (result === 'LOSS') return 'loss';
    if (result === 'DRAW') return 'draw';
    return 'unknown';
  });
  protected readonly accuracyRows = computed<AccuracyRow[]>(() => {
    const userColor = this.game().userColor;
    const white: AccuracyRow = {
      label: userColor === 'WHITE' ? 'White (you)' : 'White',
      value: this.whiteAccuracy(),
    };
    const black: AccuracyRow = {
      label: userColor === 'BLACK' ? 'Black (you)' : 'Black',
      value: this.blackAccuracy(),
    };
    return userColor === 'BLACK' ? [black, white] : [white, black];
  });
  protected readonly analysisFacts = computed<SummaryFact[]>(() => {
    const run = this.analysisRun();
    if (!run) return [];
    return [
      { label: 'Moves', value: String(run.moves.length) },
      { label: 'Critical', value: String(run.criticalMoves.length) },
      { label: 'Depth', value: this.numericStat(run.depth) },
    ];
  });
  protected readonly analysisMessage = computed(() => {
    const progress = this.analysisProgress();
    const run = this.analysisRun();
    if (progress.error) return progress.error;
    if (progress.running) {
      const counts = progress.totalPlies ? ` (${progress.currentPly}/${progress.totalPlies})` : '';
      return `${progress.message || 'Analysis running'}${counts}`;
    }
    if (this.analysisStatus() === 'Failed') return run?.error || progress.message || 'Analysis failed';
    return null;
  });
  protected readonly analysisMessageIsError = computed(() =>
    Boolean(this.analysisProgress().error || this.analysisStatus() === 'Failed'),
  );
  protected readonly sideAnalysisRows = computed<SideAnalysisRow[]>(() => {
    const run = this.analysisRun();
    const userColor = this.game().userColor;
    if (!run) return [];

    const rows: SideAnalysisRow[] = [
      {
        side: 'WHITE',
        label: userColor === 'WHITE' ? 'White (you)' : 'White',
        accuracy: this.whiteAccuracy(),
        acpl: this.numericStat(run.whiteAverageCentipawnLoss),
        critical: run.criticalMoves.filter((move) => move.side === 'WHITE').length,
        issues: this.issueSummary('WHITE'),
      },
      {
        side: 'BLACK',
        label: userColor === 'BLACK' ? 'Black (you)' : 'Black',
        accuracy: this.blackAccuracy(),
        acpl: this.numericStat(run.blackAverageCentipawnLoss),
        critical: run.criticalMoves.filter((move) => move.side === 'BLACK').length,
        issues: this.issueSummary('BLACK'),
      },
    ];

    return userColor === 'BLACK' ? rows.reverse() : rows;
  });

  protected tagTone(tag: ImportedGameTag): 'positive' | 'negative' | 'neutral' {
    if (POSITIVE_TAG_CODES.has(tag.code)) return 'positive';
    if (NEGATIVE_TAG_CODES.has(tag.code)) return 'negative';
    return 'neutral';
  }

  protected tagLabel(tag: ImportedGameTag): string {
    return tag.name
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private userAccuracyField(): 'whiteAccuracy' | 'blackAccuracy' {
    return this.game().userColor === 'BLACK' ? 'blackAccuracy' : 'whiteAccuracy';
  }

  private issueSummary(side: 'WHITE' | 'BLACK'): string {
    const moves = this.analysisRun()?.moves.filter((move) => move.side === side) ?? [];
    const counts = new Map<string, number>();
    for (const move of moves) {
      const key = (move.classification || '').toUpperCase();
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    const parts = [
      this.countLabel(counts.get('INACCURACY') || 0, 'inaccuracy', 'inaccuracies'),
      this.countLabel(counts.get('MISTAKE') || 0, 'mistake', 'mistakes'),
      this.countLabel(counts.get('BLUNDER') || 0, 'blunder', 'blunders'),
      this.countLabel(counts.get('MISS') || 0, 'miss', 'misses'),
    ].filter((part): part is string => Boolean(part));

    return parts.length ? parts.join(' · ') : 'No flagged issues';
  }

  private countLabel(count: number, singular: string, plural: string): string | null {
    if (!count) return null;
    return `${count} ${count === 1 ? singular : plural}`;
  }

  private numericStat(value: number | null | undefined): string {
    return typeof value === 'number' ? String(value) : '—';
  }
}
