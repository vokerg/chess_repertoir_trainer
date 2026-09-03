import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { OnboardingAction, OnboardingActionCode } from '@chess-trainer/contracts/onboarding';
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

  protected progressLabel(settled: number, total: number): string {
    return `${settled} of ${total}`;
  }

  protected providerLabel(provider: string): string {
    return provider === 'CHESS_COM' ? 'Chess.com' : provider === 'LICHESS' ? 'Lichess' : provider;
  }
}
