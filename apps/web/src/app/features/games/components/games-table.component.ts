import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ImportedGameJobStore } from '../../../core/jobs/imported-game-job.store';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';
import { type UiShellAction } from '../../../shared/ui/ui-shell.model';
import { ImportedGamePageInfo, ImportedGameSearchItem } from '../data-access/games.models';
import {
  accuracyLabel,
  colorLabel,
  displayTimeControl,
  gameDateLabel,
  playerLabel,
  profileUrl,
  providerClass,
  providerLabel,
  resultClass,
  resultLabel,
  timeClassLabel,
} from '../helpers/games-table-display';
import { GameActionMenuComponent } from './game-action-menu.component';

@Component({
  selector: 'app-games-table',
  standalone: true,
  imports: [RouterLink, PanelComponent, GameActionMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './games-table.component.html',
  styleUrl: './games-table.component.css',
})
export class GamesTableComponent {
  private readonly jobs = inject(ImportedGameJobStore);

  readonly games = input.required<ImportedGameSearchItem[]>();
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly tableSubtitle = input('No games loaded');
  readonly pageInfo = input.required<ImportedGamePageInfo>();
  readonly refresh = output<void>();
  readonly loadMore = output<void>();
  readonly analyse = output<ImportedGameSearchItem>();
  readonly forceReanalyse = output<ImportedGameSearchItem>();
  readonly indexPlies = output<ImportedGameSearchItem>();

  protected readonly activeActionMenuGameId = signal<number | null>(null);
  protected readonly accuracyLabel = accuracyLabel;
  protected readonly colorLabel = colorLabel;
  protected readonly displayTimeControl = displayTimeControl;
  protected readonly gameDateLabel = gameDateLabel;
  protected readonly playerLabel = playerLabel;
  protected readonly profileUrl = profileUrl;
  protected readonly providerClass = providerClass;
  protected readonly providerLabel = providerLabel;
  protected readonly resultClass = resultClass;
  protected readonly resultLabel = resultLabel;
  protected readonly timeClassLabel = timeClassLabel;
  protected readonly tableActions = computed<readonly UiShellAction[]>(() => [
    {
      id: 'refresh',
      label: 'Refresh',
      disabled: this.loading(),
      run: () => this.refresh.emit(),
    },
  ]);

  @HostListener('document:click', ['$event'])
  protected handleDocumentClick(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Element) || target.closest('.games-action-menu')) return;
    this.closeActionMenu();
  }

  @HostListener('document:keydown.escape')
  protected handleEscapeKey(): void {
    this.closeActionMenu();
  }

  protected toggleActionMenu(gameId: number, event: Event): void {
    event.stopPropagation();
    this.activeActionMenuGameId.update((activeId) => (activeId === gameId ? null : gameId));
  }

  protected closeActionMenu(): void {
    this.activeActionMenuGameId.set(null);
  }

  protected analyseGame(game: ImportedGameSearchItem): void {
    this.closeActionMenu();
    this.analyse.emit(game);
  }

  protected forceReanalyseGame(game: ImportedGameSearchItem): void {
    this.closeActionMenu();
    this.forceReanalyse.emit(game);
  }

  protected indexGamePlies(game: ImportedGameSearchItem): void {
    this.closeActionMenu();
    this.indexPlies.emit(game);
  }

  protected isAnalysing(game: ImportedGameSearchItem): boolean {
    return this.jobs.isGameActive(game.id, ['ANALYSE_GAMES', 'PROCESS_GAMES']);
  }

  protected isIndexing(game: ImportedGameSearchItem): boolean {
    return this.jobs.isGameActive(game.id, ['INDEX_GAMES', 'PROCESS_GAMES']);
  }

  protected analysisStatusLabel(game: ImportedGameSearchItem): string {
    const active = this.jobs.activeRunForGame(game.id, ['ANALYSE_GAMES', 'PROCESS_GAMES']);
    if (active?.kind === 'PROCESS_GAMES') {
      return active.status === 'QUEUED' ? 'Processing queued' : 'Processing...';
    }
    if (active) return active.status === 'QUEUED' ? 'Analysis queued' : 'Analysing...';
    if (game.analysis?.status === 'RUNNING') return 'Analysing...';
    if (game.analysis?.status === 'COMPLETED') return 'Analysed';
    if (game.analysis?.status === 'FAILED') return 'Analysis failed';
    return 'Not analysed';
  }

  protected plyIndexStatusLabel(game: ImportedGameSearchItem): string {
    const active = this.jobs.activeRunForGame(game.id, ['INDEX_GAMES', 'PROCESS_GAMES']);
    if (active?.kind === 'PROCESS_GAMES') return 'Included in full processing';
    if (active) return active.status === 'QUEUED' ? 'Index queued' : 'Indexing...';
    if (game.plyIndex?.status === 'INDEXED') return 'Indexed';
    if (game.plyIndex?.status === 'FAILED') return 'Index failed';
    return 'Not indexed';
  }

  protected ratedLabel(game: ImportedGameSearchItem): string {
    if (game.rated === true) return 'Rated';
    if (game.rated === false) return 'Casual';
    return 'Rating unknown';
  }
}
