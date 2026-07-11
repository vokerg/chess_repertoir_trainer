import { Injectable, OnDestroy, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Chess } from 'chess.js';
import { firstValueFrom } from 'rxjs';
import { emptyImportedGameFacets, ImportedGameFacetsResponse } from '../../../shared/games/game.models';
import { GameFilters } from '../../../shared/games/filters/game-filter.model';
import { PositionGameMovesApiService } from '../../../shared/games/position-moves/position-game-moves-api.service';
import { buildOpeningAnalysisQuery, defaultOpeningFilters } from '../../../shared/games/position-moves/position-game-moves.helpers';
import {
  OpeningAnalysisResponse,
  OpeningAnalysisGame,
  OpeningPositionPerformance,
  OpeningNextMove,
  OpeningWdl,
  PlayedMove,
  UserColor,
} from '../../../shared/games/position-moves/position-game-moves.models';
import {
  PositionAnalysisCacheService,
} from '../../../shared/chess/engine/position-analysis-cache.service';
import { engineBestMoveForFen } from '../../../shared/chess/engine/engine-best-move.helper';
import { EngineAnalysis } from '../../../shared/chess/engine/stockfish-analysis.service';

const EMPTY_WDL: OpeningWdl = { total: 0, wins: 0, draws: 0, losses: 0, scorePct: null };
const EMPTY_ENGINE: EngineAnalysis = {
  fen: '',
  running: false,
  ready: false,
  error: null,
  bestMove: null,
  lines: [],
};

interface ChessMove {
  from: string;
  to: string;
  san: string;
  promotion?: string;
}

@Injectable()
export class OpeningAnalysisStore implements OnDestroy {
  private readonly api = inject(PositionGameMovesApiService);
  private readonly positionAnalysis = inject(PositionAnalysisCacheService);

  readonly facets = signal<ImportedGameFacetsResponse>(emptyImportedGameFacets());
  readonly filters = signal<GameFilters>(defaultOpeningFilters());
  readonly analysis = signal<OpeningAnalysisResponse | null>(null);
  readonly performance = signal<OpeningPositionPerformance | null>(null);
  readonly topGames = signal<OpeningAnalysisGame[]>([]);
  readonly loading = signal(false);
  readonly performanceLoading = signal(false);
  readonly topGamesLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly performanceError = signal<string | null>(null);
  readonly topGamesError = signal<string | null>(null);
  readonly boardPositionVersion = signal(0);
  readonly lastMove = signal<{ from: string; to: string } | null>(null);
  readonly history = signal<PlayedMove[]>([]);
  readonly currentFen = signal(new Chess().fen());
  readonly engine = toSignal(this.positionAnalysis.state$, { initialValue: EMPTY_ENGINE });

  readonly wdl = computed(() => this.analysis()?.games ?? EMPTY_WDL);
  readonly boardSide = computed<UserColor>(() => (this.filters().userColor === 'BLACK' ? 'BLACK' : 'WHITE'));
  readonly blackPerspective = computed(() => this.boardSide() === 'BLACK');
  readonly sideToMove = computed<UserColor>(() => (this.chess.turn() === 'w' ? 'WHITE' : 'BLACK'));
  readonly userTurn = computed(() => this.sideToMove() === this.filters().userColor);
  readonly turnOwnerLabel = computed(() => (this.userTurn() ? 'Your move' : 'Opponent move'));
  readonly perspectiveHelpText = computed(() =>
    this.filters().userColor === 'BLACK'
      ? 'Black perspective'
      : 'White perspective',
  );
  readonly lineLabel = computed(() =>
    this.history().length ? this.history().map((move) => move.san || move.uci).join(' ') : 'Start position',
  );
  readonly analysisArrows = computed(() => {
    const move = engineBestMoveForFen(this.engine(), this.currentFen());
    if (!move) return [];
    return [{ from: move.substring(0, 2), to: move.substring(2, 4), brush: 'green' }];
  });

  private chess = new Chess();
  private refreshRequestSeq = 0;
  private performanceRequestSeq = 0;
  private topGamesRequestSeq = 0;
  private initialized = false;

  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;
    void this.loadFacets();
    void this.refresh();
  }

  ngOnDestroy(): void {
    this.positionAnalysis.stop();
  }

  async refresh(): Promise<void> {
    const requestId = ++this.refreshRequestSeq;
    const query = buildOpeningAnalysisQuery(this.currentFen(), this.filters());
    this.performance.set(null);
    this.topGames.set([]);
    void this.refreshPerformance(query);
    void this.refreshTopGames(query);
    this.loading.set(true);
    this.error.set(null);
    try {
      const analysis = await firstValueFrom(this.api.getAnalysis(query));
      if (requestId !== this.refreshRequestSeq) return;
      this.analysis.set(analysis);
      this.loading.set(false);
      this.positionAnalysis.analyzeInteractiveRichPosition(this.currentFen());
    } catch (error) {
      if (requestId !== this.refreshRequestSeq) return;
      this.error.set(readError(error, 'Could not load opening analysis.'));
      this.loading.set(false);
    }
  }

  private async refreshPerformance(query: string): Promise<void> {
    const requestId = ++this.performanceRequestSeq;
    this.performanceLoading.set(true);
    this.performanceError.set(null);
    try {
      const response = await firstValueFrom(this.api.getPerformance(query));
      if (requestId !== this.performanceRequestSeq) return;
      this.performance.set(response.performance);
    } catch (error) {
      if (requestId !== this.performanceRequestSeq) return;
      this.performance.set(null);
      this.performanceError.set(readError(error, 'Could not load position performance.'));
    } finally {
      if (requestId === this.performanceRequestSeq) this.performanceLoading.set(false);
    }
  }

  private async refreshTopGames(query: string): Promise<void> {
    const requestId = ++this.topGamesRequestSeq;
    this.topGamesLoading.set(true);
    this.topGamesError.set(null);
    try {
      const response = await firstValueFrom(this.api.getTopGames(query));
      if (requestId !== this.topGamesRequestSeq) return;
      this.topGames.set(response.topGames);
    } catch (error) {
      if (requestId !== this.topGamesRequestSeq) return;
      this.topGames.set([]);
      this.topGamesError.set(readError(error, 'Could not load top games.'));
    } finally {
      if (requestId === this.topGamesRequestSeq) this.topGamesLoading.set(false);
    }
  }

  setFilters(filters: GameFilters): void {
    const perspectiveChanged = this.filters().userColor !== filters.userColor;
    this.filters.set(filters);
    if (perspectiveChanged) this.resetBoard();
  }

  resetFilters(): void {
    this.filters.set(defaultOpeningFilters());
    this.resetBoard();
  }

  playBoardMove(uci: string): void {
    const move = this.tryPlayUci(uci);
    if (!move) {
      this.boardPositionVersion.update((version) => version + 1);
      return;
    }
    this.commitPlayedMove(move);
  }

  playNextMove(nextMove: OpeningNextMove): void {
    const move = this.tryPlayUci(nextMove.moveUci);
    if (move) this.commitPlayedMove(move, nextMove.moveSan || undefined);
  }

  goBack(): void {
    if (!this.chess.undo()) return;
    this.history.update((history) => history.slice(0, -1));
    const previous = this.history().at(-1);
    this.lastMove.set(previous ? { from: previous.from, to: previous.to } : null);
    this.syncBoardState();
  }

  resetBoard(): void {
    this.chess = new Chess();
    this.history.set([]);
    this.lastMove.set(null);
    this.syncBoardState();
  }

  rerunAnalysis(): void {
    this.positionAnalysis.analyzeInteractiveRichPosition(this.currentFen());
  }

  private async loadFacets(): Promise<void> {
    try {
      this.facets.set(await firstValueFrom(this.api.getFacets()));
    } catch {
      this.facets.set(emptyImportedGameFacets());
    }
  }

  private tryPlayUci(uci: string): ChessMove | null {
    try {
      return this.chess.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.slice(4, 5) || undefined,
      }) as ChessMove | null;
    } catch {
      return null;
    }
  }

  private commitPlayedMove(move: ChessMove, sanOverride?: string): void {
    const uci = `${move.from}${move.to}${move.promotion ?? ''}`;
    const played: PlayedMove = {
      san: sanOverride || move.san || uci,
      uci,
      from: move.from,
      to: move.to,
      fenAfter: this.chess.fen(),
    };
    this.history.update((history) => [...history, played]);
    this.lastMove.set({ from: move.from, to: move.to });
    this.syncBoardState();
  }

  private syncBoardState(): void {
    this.currentFen.set(this.chess.fen());
    this.boardPositionVersion.update((version) => version + 1);
    this.positionAnalysis.stop();
    void this.refresh();
  }
}

function readError(error: unknown, fallback: string): string {
  const response = error as { error?: { error?: string; message?: string } };
  return response?.error?.error || response?.error?.message || fallback;
}
