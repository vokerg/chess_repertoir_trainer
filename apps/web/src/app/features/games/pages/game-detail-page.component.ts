import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  inject,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs';
import { GameDetailHeaderComponent } from '../components/game-detail-header.component';
import { GameSummaryComponent } from '../components/game-summary.component';
import { GameWorkbenchComponent } from '../components/game-workbench.component';
import { GameDetailStore } from '../state/game-detail.store';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';

@Component({
  selector: 'app-game-detail-page',
  standalone: true,
  imports: [
    GameDetailHeaderComponent,
    GameSummaryComponent,
    GameWorkbenchComponent,
    PanelComponent,
  ],
  providers: [GameDetailStore],
  templateUrl: './game-detail-page.component.html',
  styleUrl: './game-detail-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly store = inject(GameDetailStore);

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        map((params) => Number(params.get('gameId'))),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((gameId) => this.store.initialize(gameId));
  }

  @HostListener('window:keydown', ['$event'])
  protected onKeyDown(event: KeyboardEvent): void {
    this.store.handleKeyboard(event);
  }

  protected confirmDeleteSelectedSubtree(): void {
    const message = this.store.deleteConfirmationText();
    if (!message || !window.confirm(message)) return;
    this.store.deleteSelectedSubtree();
  }
}
