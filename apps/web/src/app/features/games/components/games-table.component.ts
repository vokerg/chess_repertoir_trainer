import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';
import { type UiShellAction } from '../../../shared/ui/ui-shell.model';
import { ImportedGameListItem, ImportedGamePageInfo } from '../data-access/games.models';
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
  readonly games = input.required<ImportedGameListItem[]>();
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly tableSubtitle = input('No games loaded');
  readonly pageInfo = input.required<ImportedGamePageInfo>();
  readonly analysingGameId = input<number | null>(null);
  readonly indexingPlyGameId = input<number | null>(null);
  readonly refresh = output<void>();
  readonly loadMore = output<void>();
  readonly analyse = output<ImportedGameListItem>();
  readonly forceReanalyse = output<ImportedGameListItem>();
  readonly indexPlies = output<ImportedGameListItem>();

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

  protected analyseGame(game: ImportedGameListItem): void {
    this.closeActionMenu();
    this.analyse.emit(game);
  }

  protected forceReanalyseGame(game: ImportedGameListItem): void {
    this.closeActionMenu();
    this.forceReanalyse.emit(game);
  }

  protected indexGamePlies(game: ImportedGameListItem): void {
    this.closeActionMenu();
    this.indexPlies.emit(game);
  }

  protected analysisStatusLabel(game: ImportedGameListItem): string {
    if (this.analysingGameId() === game.id || game.analysis?.status === 'RUNNING')
      return 'Analysing...';
    if (game.analysis?.status === 'COMPLETED') return 'Analysed';
    return 'Not analysed';
  }

  protected plyIndexStatusLabel(game: ImportedGameListItem): string {
    if (this.indexingPlyGameId() === game.id) return 'Indexing...';
    if (game.plyIndex?.status === 'INDEXED') return 'Indexed';
    return 'Not indexed';
  }
}
