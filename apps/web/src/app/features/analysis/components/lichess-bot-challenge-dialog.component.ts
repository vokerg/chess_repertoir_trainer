import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FreeAnalysisStore } from '../state/free-analysis.store';

@Component({
  selector: 'app-lichess-bot-challenge-dialog',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './lichess-bot-challenge-dialog.component.html',
  styleUrl: './lichess-bot-challenge-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LichessBotChallengeDialogComponent {
  protected readonly store = inject(FreeAnalysisStore);
}
