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
import {
  FactGridComponent,
  type UiFactItem,
} from '../../../shared/ui/fact-grid/fact-grid.component';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';
import { type UiShellAction } from '../../../shared/ui/ui-shell.model';
import { ImportedGamePageInfo, ImportedGameSearchItem } from '../data-access/games.models';
import {
  accuracyLabel,
  colorLabel,
  displayTimeControl,
  gameDateLabel,
  gameStatusLabel,
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
  imports: [RouterLink, PanelComponent, FactGridComponent, GameActionMenuComponent],
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
  protected readonly gameStatusLabel = gameStatusLabel;
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

  protected mobileFacts(game: ImportedGameSearchItem): readonly UiFactItem[] {
    return [
      {
        id: 'control',
        label: 'Control',
        value: `${this.timeClassLabel(game.speedCategory)} · ${this.displayTimeControl(game)}`,
      },
      {
        id: 'accuracy',
        label: 'Accuracy',
        value: this.accuracyLabel(game.analysis?.userAccuracy),
        mono: true,
      },
      {
        id: 'status',
        label: 'Status',
        value: this.gameStatusLabel(game),
      },
    ];
  }

  protected ratedLabel(game: ImportedGameSearchItem): string {
    if (game.rated === true) return 'Rated';
    if (game.rated === false) return 'Casual';
    return 'Rating unknown';
  }
}
