import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs';
import { GameDetailStore, gameDateLabel, playerLabel, providerLabel, timeControlLabel } from '../game-detail/game-detail.store';
import { GameSummaryComponent } from '../game-detail/game-summary.component';
import { GameWorkbenchComponent } from '../game-detail/game-workbench.component';

@Component({
  selector: 'app-game-detail-page',
  standalone: true,
  imports: [RouterLink, GameSummaryComponent, GameWorkbenchComponent],
  providers: [GameDetailStore],
  templateUrl: './game-detail-page.component.html',
  styleUrl: './game-detail-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly store = inject(GameDetailStore);

  protected readonly providerLabel = providerLabel;
  protected readonly playerLabel = playerLabel;
  protected readonly gameDateLabel = gameDateLabel;
  protected readonly timeControlLabel = timeControlLabel;

  ngOnInit(): void {
    this.route.paramMap.pipe(
      map((params) => Number(params.get('gameId'))),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((gameId) => this.store.initialize(gameId));
  }

  @HostListener('window:keydown', ['$event'])
  protected onKeyDown(event: KeyboardEvent): void {
    this.store.handleKeyboard(event);
  }
}

