import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import type { AiGameReviewResponse } from '@chess-trainer/contracts/ai';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';

@Component({
  selector: 'app-game-ai-review-widget',
  standalone: true,
  imports: [PanelComponent],
  templateUrl: './game-ai-review-widget.component.html',
  styleUrl: './game-ai-review-widget.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameAiReviewWidgetComponent {
  readonly review = input<AiGameReviewResponse | null>(null);
  readonly selectedPlyNumber = input<number | null>(null);
  readonly moveSelected = output<number>();

  protected warningLabel(warning: string): string {
    if (warning === 'INCOMPLETE_MOVE_DATA') return 'Only part of this long game was sent for review.';
    if (warning === 'LIMITED_ENGINE_DATA') return 'Some moves had limited engine data.';
    if (warning === 'OPENING_NOT_IDENTIFIED') return 'No opening name was available.';
    return warning;
  }
}
