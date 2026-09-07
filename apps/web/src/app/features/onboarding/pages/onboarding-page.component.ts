import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import type {
  OnboardingAction,
  OnboardingActionCode,
  OnboardingAttentionCode,
  OnboardingReadinessResponse,
} from '@chess-trainer/contracts/onboarding';
import { AccountsApiService } from '../../accounts/data-access/accounts-api.service';
import { OnboardingApiService } from '../data-access/onboarding-api.service';
import { OnboardingStore } from '../state/onboarding.store';

const MUTATING_ACTIONS = new Set<OnboardingActionCode>([
  'RESUME_PREPARATION',
  'PAUSE_PREPARATION',
  'CANCEL_PREPARATION',
  'RETRY_PREPARATION',
  'RESTART_PREPARATION',
  'FINISH_ONBOARDING',
]);

const ACTION_LABELS: Partial<Record<OnboardingActionCode, string>> = {
  VIEW_HOME: 'Go to Home',
  VIEW_GAMES: 'View recent games',
  VIEW_OPENING_ANALYSIS: 'Explore openings',
  VIEW_ANALYSIS: 'Open analysis board',
  RESUME_PREPARATION: 'Resume preparation',
  PAUSE_PREPARATION: 'Pause preparation',
  CANCEL_PREPARATION: 'Stop preparation',
  RETRY_PREPARATION: 'Retry preparation',
  RESTART_PREPARATION: 'Start recovery',
  FINISH_ONBOARDING: 'Finish onboarding',
};

const ATTENTION_LABELS: Record<OnboardingAttentionCode, string> = {
  NO_RECENT_GAMES: 'No recent games found',
  ALL_INDEXING_FAILED: 'Opening preparation could not settle',
  IMPORT_PAUSED: 'Game import is paused',
  IMPORT_RETRY_AVAILABLE: 'Game import can be retried',
  IMPORT_RATE_LIMITED: 'Provider rate limit is delaying import',
  RECONCILE_DUE_WARNING: 'Preparation is taking longer to reconcile',
  RECONCILE_DUE_CRITICAL: 'Preparation reconciliation has stalled',
  PREPARATION_TASK_START_DELAY: 'Preparation tasks are waiting to start',
  INDEX_NO_SETTLEMENT_WARNING: 'Opening preparation has stalled',
  ANALYSIS_NO_SETTLEMENT_WARNING: 'Analysis has stalled',
  INDEXING_PARTIAL: 'Some openings are still being prepared',
  ANALYSIS_PARTIAL: 'Some analysis is still pending',
  PREPARATION_PAUSE_REQUESTED: 'Preparation is pausing',
  PREPARATION_PAUSED: 'Preparation is paused',
  PREPARATION_CANCEL_REQUESTED: 'Preparation is stopping',
  PREPARATION_CANCELLED: 'Preparation stopped',
  PREPARATION_FAILED: 'Preparation needs recovery',
  PREPARATION_NEEDS_ATTENTION: 'Preparation needs attention',
};

@Component({
  selector: 'app-onboarding-page',
  standalone: true,
  imports: [RouterLink],
  providers: [AccountsApiService, OnboardingApiService, OnboardingStore],
  templateUrl: './onboarding-page.component.html',
  styleUrl: './onboarding-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingPageComponent implements OnInit {
  protected readonly store = inject(OnboardingStore);

  ngOnInit(): void {
    void this.store.initialize();
  }

  protected handleAction(action: OnboardingAction): void {
    if (MUTATING_ACTIONS.has(action.code)) {
      void this.store.runAction(action.code);
    }
  }

  protected isMutatingAction(code: OnboardingActionCode): boolean {
    return MUTATING_ACTIONS.has(code);
  }

  protected actionLabel(code: OnboardingActionCode): string {
    return ACTION_LABELS[code] ?? code.replaceAll('_', ' ').toLowerCase();
  }

  protected stateLabel(readiness: OnboardingReadinessResponse): string {
    switch (readiness.presentationState) {
      case 'NOT_STARTED':
        return 'Ready to prepare your recent chess';
      case 'PREPARING': {
        const milestones = readiness.preparation?.milestones;
        if (!milestones?.firstImportedAt) return 'Finding your recent games';
        if (!milestones.firstIndexedAt) return 'Preparing opening evidence';
        if (!milestones.firstAnalysedAt) return 'Analysing a first sample';
        return 'Preparing more of your recent chess';
      }
      case 'PAUSE_REQUESTED':
        return 'Pausing preparation';
      case 'PAUSED':
        return 'Preparation paused';
      case 'NEEDS_ATTENTION':
        return 'Preparation needs attention';
      case 'CANCEL_REQUESTED':
        return 'Stopping preparation safely';
      case 'CANCELLED':
        return 'Preparation stopped';
      case 'FAILED':
        return 'Preparation needs recovery';
      case 'CORE_READY':
        return 'Recent chess is ready to use';
      case 'COMPLETE':
        return 'Preparation complete';
      case 'SKIPPED':
        return 'Onboarding guidance skipped';
    }
  }

  protected attentionLabel(code: OnboardingAttentionCode): string {
    return ATTENTION_LABELS[code];
  }

  protected progressLabel(settled: number, total: number): string {
    return `${settled} of ${total}`;
  }

  protected providerLabel(provider: string): string {
    return provider === 'CHESS_COM' ? 'Chess.com' : provider === 'LICHESS' ? 'Lichess' : provider;
  }
}
