import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, combineLatest, map, of, startWith, switchMap } from 'rxjs';
import { BoardImageApiService, BoardImagePov, BoardImageTurn } from './board-image-api.service';

type BoardImageState =
  | { status: 'loading' }
  | { status: 'loaded'; url: string }
  | { status: 'error' };

@Component({
  selector: 'app-board-image',
  standalone: true,
  templateUrl: './board-image.component.html',
  styleUrl: './board-image.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardImageComponent {
  readonly fen = input.required<string>();
  readonly pov = input<BoardImagePov>('white');
  readonly turn = input<BoardImageTurn>('none');
  readonly alt = input('Chess position');
  private readonly api = inject(BoardImageApiService);

  protected readonly state = toSignal(
    combineLatest([toObservable(this.fen), toObservable(this.pov), toObservable(this.turn)]).pipe(
      switchMap(([fen, pov, turn]) =>
        this.api.getUrl(fen, pov, turn).pipe(
          map(({ url }): BoardImageState => ({ status: 'loaded', url })),
          catchError(() => of<BoardImageState>({ status: 'error' })),
          startWith<BoardImageState>({ status: 'loading' }),
        ),
      ),
    ),
    { initialValue: { status: 'loading' } as BoardImageState },
  );
}
