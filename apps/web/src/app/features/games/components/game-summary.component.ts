import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';
import {
  ImportedGameAnalysisRun,
  ImportedGameDetail,
  ImportedGamePlayer,
} from '../data-access/games.models';
import { accuracyLabel, resultLabel } from '../helpers/game-detail-labels';
import { gameTagLabel, gameTagTone } from '../../../shared/games/game-tag-display';

type AccuracyRow = {
  label: string;
  value: string;
};

type SideAnalysisRow = {
  side: 'WHITE' | 'BLACK';
  label: string;
  acpl: string;
  issues: string;
};

type PlayerRow = {
  label: string;
  username: string;
  url: string | null;
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
  readonly analysisStatus = input.required<string>();
  readonly analysisSummary = input.required<string>();

  protected readonly result = computed(() => resultLabel(this.game().resultForUser));
  protected readonly players = computed<PlayerRow[]>(() => {
    const game = this.game();
    return [
      this.playerRow('White', game.white, game.userColor === 'WHITE'),
      this.playerRow('Black', game.black, game.userColor === 'BLACK'),
    ];
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
  protected readonly analysisMessage = computed(() => {
    const run = this.analysisRun();
    if (this.analysisStatus() === 'Failed') return run?.error || 'Analysis failed';
    return null;
  });
  protected readonly analysisMessageIsError = computed(() =>
    this.analysisStatus() === 'Failed',
  );
  protected readonly sideAnalysisRows = computed<SideAnalysisRow[]>(() => {
    const run = this.analysisRun();
    const userColor = this.game().userColor;
    if (!run) return [];

    const rows: SideAnalysisRow[] = [
      {
        side: 'WHITE',
        label: userColor === 'WHITE' ? 'White (you)' : 'White',
        acpl: this.numericStat(run.whiteAverageCentipawnLoss),
        issues: this.issueSummary('WHITE'),
      },
      {
        side: 'BLACK',
        label: userColor === 'BLACK' ? 'Black (you)' : 'Black',
        acpl: this.numericStat(run.blackAverageCentipawnLoss),
        issues: this.issueSummary('BLACK'),
      },
    ];

    return userColor === 'BLACK' ? rows.reverse() : rows;
  });

  protected readonly tagTone = gameTagTone;
  protected readonly tagLabel = gameTagLabel;

  private playerRow(label: string, player: ImportedGamePlayer | null, isUser: boolean): PlayerRow {
    const username = player?.username?.trim() || 'Unknown';
    return {
      label: `${label}${isUser ? ' (you)' : ''}`,
      username,
      url: this.playerUrl(player?.username),
    };
  }

  private playerUrl(username?: string | null): string | null {
    const normalizedUsername = username?.trim();
    if (!normalizedUsername) return null;
    if (this.game().provider === 'LICHESS') return `https://lichess.org/@/${encodeURIComponent(normalizedUsername)}`;
    if (this.game().provider === 'CHESS_COM') return `https://www.chess.com/member/${encodeURIComponent(normalizedUsername)}`;
    return null;
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
