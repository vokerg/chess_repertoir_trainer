import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  AccountPerformanceGameHighlight,
  AccountPerformanceRecentGame,
  AccountPerformanceStatsResponse,
} from '../data-access/accounts.models';

type EvidenceTab = 'recent' | 'victories' | 'defeats';

@Component({
  selector: 'app-account-profile-evidence',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './account-profile-evidence.component.html',
  styleUrl: './account-profile-evidence.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountProfileEvidenceComponent {
  readonly stats = input<AccountPerformanceStatsResponse | null>(null);
  readonly loading = input(false);
  readonly error = input<string | null>(null);

  protected readonly tab = signal<EvidenceTab>('recent');
  protected readonly recentGames = computed(() => this.stats()?.recentGames ?? []);
  protected readonly victories = computed(() => this.stats()?.bestVictories ?? []);
  protected readonly defeats = computed(() => this.stats()?.mostEmbarrassingDefeats ?? []);

  protected selectTab(tab: EvidenceTab): void {
    this.tab.set(tab);
  }

  protected onTabKeydown(event: KeyboardEvent, currentTab: EvidenceTab): void {
    const tabOrder: readonly EvidenceTab[] = ['recent', 'victories', 'defeats'];
    const currentIndex = tabOrder.indexOf(currentTab);
    let nextIndex: number | null = null;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % tabOrder.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + tabOrder.length) % tabOrder.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = tabOrder.length - 1;
    }

    if (nextIndex === null) return;

    event.preventDefault();
    const nextTab = tabOrder[nextIndex];
    this.selectTab(nextTab);
    const tabList = (event.currentTarget as HTMLElement).closest('[role="tablist"]');
    tabList?.querySelector<HTMLButtonElement>(`#profile-evidence-tab-${nextTab}`)?.focus();
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(value));
  }

  protected opponentName(game: AccountPerformanceGameHighlight): string {
    return game.opponentUsername ? `vs ${game.opponentUsername}` : 'Unknown opponent';
  }

  protected ratingLabel(value: number | null): string {
    return value === null ? '' : ` (${value.toLocaleString()})`;
  }

  protected resultClass(game: AccountPerformanceRecentGame): string {
    return game.resultForUser.toLowerCase();
  }
}
