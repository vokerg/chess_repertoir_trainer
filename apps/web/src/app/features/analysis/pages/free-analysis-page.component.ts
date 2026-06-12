import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  inject,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs';
import { AnalysisWorkbenchComponent } from '../../../shared/analysis-workbench/analysis-workbench.component';
import { FreeAnalysisApiService } from '../data-access/free-analysis-api.service';
import { FreeAnalysisStore } from '../state/free-analysis.store';

@Component({
  selector: 'app-free-analysis-page',
  standalone: true,
  imports: [RouterLink, AnalysisWorkbenchComponent],
  providers: [FreeAnalysisStore, FreeAnalysisApiService],
  templateUrl: './free-analysis-page.component.html',
  styleUrl: './free-analysis-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FreeAnalysisPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly store = inject(FreeAnalysisStore);

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(
        map((query) => ({
          fen: query.get('fen'),
          gameId: parsePositiveNumber(query.get('gameId')),
          ply: parsePositiveNumber(query.get('ply')),
        })),
        distinctUntilChanged(
          (previous, current) =>
            previous.fen === current.fen &&
            previous.gameId === current.gameId &&
            previous.ply === current.ply,
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((input) => this.store.initialize(input));
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

function parsePositiveNumber(value: string | null): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
