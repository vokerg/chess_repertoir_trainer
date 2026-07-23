import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import type { AiGameReviewResponse } from '@chess-trainer/contracts/ai';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';
import type { UiShellAction } from '../../../shared/ui/ui-shell.model';
import type { GameTacticalFinding } from '../data-access/game-tactical-findings-api.service';
import { GameAiReviewWidgetComponent } from './game-ai-review-widget.component';
import { GameTacticalFindingsComponent } from './game-tactical-findings.component';

type GameInsightTab = 'TACTICS' | 'AI_REVIEW';

@Component({
  selector: 'app-game-insights',
  standalone: true,
  imports: [GameAiReviewWidgetComponent, GameTacticalFindingsComponent, PanelComponent],
  templateUrl: './game-insights.component.html',
  styleUrl: './game-insights.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameInsightsComponent {
  readonly gameId = input.required<number>();
  readonly findings = input<readonly GameTacticalFinding[]>([]);
  readonly findingsLoading = input(false);
  readonly findingsError = input<string | null>(null);
  readonly review = input<AiGameReviewResponse | null>(null);
  readonly selectedPlyNumber = input<number | null>(null);

  readonly retryFindings = output<void>();
  readonly moveSelected = output<number>();

  protected readonly collapsed = signal(false);
  protected readonly activeTab = signal<GameInsightTab>('TACTICS');
  protected readonly hasTactics = computed(
    () => this.findingsLoading() || this.findingsError() !== null || this.findings().length > 0,
  );
  protected readonly hasReview = computed(() => this.review() !== null);
  protected readonly visible = computed(() => this.hasTactics() || this.hasReview());
  protected readonly hasTabs = computed(() => this.hasTactics() && this.hasReview());
  protected readonly title = computed(() => {
    if (this.hasTabs()) return 'Game insights';
    return this.hasTactics() ? 'Tactical findings' : 'AI game review';
  });
  protected readonly panelActions = computed<readonly UiShellAction[]>(() => [{
    id: 'toggle-insights',
    label: this.collapsed() ? 'Expand' : 'Collapse',
    kind: 'toggle',
    pressed: this.collapsed(),
    run: () => this.collapsed.update((collapsed) => !collapsed),
  }]);

  constructor() {
    effect(() => {
      if (this.activeTab() === 'TACTICS' && !this.hasTactics() && this.hasReview()) {
        this.activeTab.set('AI_REVIEW');
      } else if (this.activeTab() === 'AI_REVIEW' && !this.hasReview() && this.hasTactics()) {
        this.activeTab.set('TACTICS');
      }
    });
  }

  protected selectTab(tab: GameInsightTab): void {
    this.activeTab.set(tab);
  }
}
