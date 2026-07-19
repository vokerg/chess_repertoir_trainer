import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { AiCapabilitiesService } from '../../../core/ai/ai-capabilities.service';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';
import type { UiShellAction } from '../../../shared/ui/ui-shell.model';
import { GameAiReviewStore } from '../state/game-ai-review.store';

@Component({
  selector: 'app-game-ai-review-widget',
  standalone: true,
  imports: [PanelComponent],
  providers: [GameAiReviewStore],
  templateUrl: './game-ai-review-widget.component.html',
  styleUrl: './game-ai-review-widget.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameAiReviewWidgetComponent {
  private readonly capabilities = inject(AiCapabilitiesService);
  protected readonly store = inject(GameAiReviewStore);

  readonly gameId = input.required<number>();
  readonly analysisReady = input(false);

  protected readonly available = toSignal(
    this.capabilities.getCapabilities().pipe(map((response) => response.widgets.gameReview)),
    { initialValue: false },
  );

  protected readonly actions = computed<readonly UiShellAction[]>(() => {
    if (!this.available()) return [];
    const status = this.store.status();
    return [{
      id: 'generate-ai-game-review',
      label: status === 'READY' || status === 'ERROR' ? 'Regenerate' : 'Generate AI review',
      disabled: !this.analysisReady() || status === 'GENERATING',
      run: () => this.generate(),
    }];
  });

  protected generate(): void {
    if (!this.analysisReady()) return;
    void this.store.generate(this.gameId());
  }

  protected warningLabel(warning: string): string {
    if (warning === 'INCOMPLETE_MOVE_DATA') return 'Only part of this long game was sent for review.';
    if (warning === 'LIMITED_ENGINE_DATA') return 'Some moves had limited engine data.';
    if (warning === 'OPENING_NOT_IDENTIFIED') return 'No opening name was available.';
    return warning;
  }
}
