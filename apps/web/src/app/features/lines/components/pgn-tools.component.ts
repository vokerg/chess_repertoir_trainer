import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LinesApiService, readLinesError } from '../data-access/lines-api.service';
import { ImportLinePgnPayload, LineSummary, RepertoireColor } from '../data-access/lines.models';

@Component({
  selector: 'app-pgn-tools',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './pgn-tools.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PgnToolsComponent {
  private readonly linesApi = inject(LinesApiService);

  readonly chapterId = input<number | null>(null);
  readonly lines = input<readonly LineSummary[]>([]);
  readonly changed = output<void>();

  protected exportLineId: number | null = null;
  protected exportedPgn = signal('');
  protected exporting = signal(false);

  protected importName = '';
  protected importSide: RepertoireColor = 'WHITE';
  protected importStartingFen = 'startpos';
  protected importPgnText = '';
  protected importing = signal(false);

  protected message = signal<string | null>(null);
  protected error = signal<string | null>(null);

  protected exportPgn(): void {
    if (!this.exportLineId) return;
    this.exporting.set(true);
    this.message.set(null);
    this.error.set(null);
    this.linesApi.exportLinePgn(this.exportLineId).subscribe({
      next: (res) => {
        this.exportedPgn.set(res.pgn);
        this.exporting.set(false);
        this.message.set('PGN exported below.');
      },
      error: (error) => {
        this.exporting.set(false);
        this.error.set(readLinesError(error, 'Could not export PGN.'));
      },
    });
  }

  protected importPgn(): void {
    const chapterId = this.chapterId();
    if (!chapterId) return;
    this.importing.set(true);
    this.message.set(null);
    this.error.set(null);

    const payload: ImportLinePgnPayload = {
      name: this.importName,
      sideToTrain: this.importSide,
      startingFen: this.importStartingFen || 'startpos',
      pgn: this.importPgnText,
    };
    this.linesApi.importLinePgn(chapterId, payload).subscribe({
      next: () => {
        this.importing.set(false);
        this.importName = '';
        this.importPgnText = '';
        this.message.set('PGN imported as a new line.');
        this.changed.emit();
      },
      error: (error) => {
        this.importing.set(false);
        this.error.set(readLinesError(error, 'Could not import PGN.'));
      },
    });
  }
}
