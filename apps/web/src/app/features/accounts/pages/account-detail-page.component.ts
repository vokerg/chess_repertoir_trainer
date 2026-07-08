import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';
import { AccountPerformanceStatsComponent } from '../components/account-performance-stats.component';
import { AccountRatingStatsComponent } from '../components/account-rating-stats.component';
import { AccountYearlyHighsComponent } from '../components/account-yearly-highs.component';
import { RatingHistoryChartComponent } from '../components/rating-history-chart.component';
import { AccountsApiService } from '../data-access/accounts-api.service';
import {
  AccountPerformanceStatsResponse,
  AccountRatingHistoryResponse,
  AccountRatingStatsResponse,
  ExternalAccount,
  RatingRangeKey,
  RatingSpeed,
  RatingSpeedFilter,
} from '../data-access/accounts.models';
import { providerLabel } from '../helpers/account-labels';
import { getRatingHistoryRangeQuery } from '../helpers/rating-history-ranges';

@Component({
  selector: 'app-account-detail-page',
  standalone: true,
  imports: [
    PageHeaderComponent,
    PanelComponent,
    AccountRatingStatsComponent,
    AccountYearlyHighsComponent,
    AccountPerformanceStatsComponent,
    RatingHistoryChartComponent,
  ],
  providers: [AccountsApiService],
  templateUrl: './account-detail-page.component.html',
  styleUrl: './account-detail-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly accountsApi = inject(AccountsApiService);
  private requestId = 0;
  private ratingStatsRequestId = 0;
  private performanceStatsRequestId = 0;

  protected readonly accountId = signal<number | null>(null);
  protected readonly accounts = signal<ExternalAccount[]>([]);
  protected readonly accountsLoading = signal(false);
  protected readonly accountsError = signal<string | null>(null);
  protected readonly account = signal<ExternalAccount | null>(null);
  protected readonly accountLoading = signal(false);
  protected readonly accountError = signal<string | null>(null);
  protected readonly ratingStats = signal<AccountRatingStatsResponse | null>(null);
  protected readonly ratingStatsLoading = signal(false);
  protected readonly ratingStatsError = signal<string | null>(null);
  protected readonly performanceStats = signal<AccountPerformanceStatsResponse | null>(null);
  protected readonly performanceStatsLoading = signal(false);
  protected readonly performanceStatsError = signal<string | null>(null);
  protected readonly history = signal<AccountRatingHistoryResponse | null>(null);
  protected readonly historyLoading = signal(false);
  protected readonly historyError = signal<string | null>(null);
  protected readonly selectedRange = signal<RatingRangeKey>('1Y');
  protected readonly selectedSpeed = signal<RatingSpeedFilter>('all');
  protected readonly pageTitle = computed(() => {
    const account = this.account();
    return account ? account.displayName || account.username : 'Account';
  });
  protected readonly pageSubtitle = computed(() => {
    const account = this.account();
    return account ? `${providerLabel(account.provider)} @${account.username}` : 'Loading account details.';
  });
  protected readonly accountOptions = computed(() =>
    [...this.accounts()].sort(
      (left, right) =>
        Number(Boolean(right.isDefaultProgressAccount)) - Number(Boolean(left.isDefaultProgressAccount)) ||
        providerLabel(left.provider).localeCompare(providerLabel(right.provider)) ||
        left.username.localeCompare(right.username),
    ),
  );
  protected readonly headerActions = computed<readonly PageHeaderAction[]>(() => [
    {
      id: 'back-to-accounts',
      label: 'Back to accounts',
      link: '/settings/accounts',
    },
  ]);

  ngOnInit(): void {
    void this.loadAccounts();

    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = Number(params.get('accountId'));
      if (!Number.isInteger(id) || id <= 0) {
        this.accountId.set(null);
        this.account.set(null);
        this.ratingStats.set(null);
        this.performanceStats.set(null);
        this.history.set(null);
        this.accountError.set('Invalid account id.');
        return;
      }

      this.accountId.set(id);
      void this.loadAccount(id);
      void this.loadRatingStats(id);
      void this.loadPerformanceStats(id);
      void this.loadHistory(id);
    });
  }

  protected onSelectedRangeChange(range: RatingRangeKey): void {
    this.selectedRange.set(range);
    const id = this.accountId();
    if (id) {
      void this.loadPerformanceStats(id);
      void this.loadHistory(id);
    }
  }

  protected onSelectedSpeedChange(speed: RatingSpeedFilter): void {
    this.selectedSpeed.set(speed);
    const id = this.accountId();
    if (id) {
      void this.loadPerformanceStats(id);
      void this.loadHistory(id);
    }
  }

  protected accountOptionLabel(account: ExternalAccount): string {
    const label = `${providerLabel(account.provider)} @${account.username}`;
    return account.isDefaultProgressAccount ? `${label} (default)` : label;
  }

  protected onAccountSelectionChange(value: string): void {
    const id = Number(value);
    if (Number.isInteger(id) && id > 0 && id !== this.accountId()) {
      void this.router.navigate(['/progress/accounts', id]);
    }
  }

  private async loadAccounts(): Promise<void> {
    this.accountsLoading.set(true);
    this.accountsError.set(null);

    try {
      this.accounts.set(await firstValueFrom(this.accountsApi.getAccounts()));
    } catch (error) {
      this.accounts.set([]);
      this.accountsError.set(this.errorMessage(error, 'Unable to load accounts.'));
    } finally {
      this.accountsLoading.set(false);
    }
  }

  private async loadAccount(accountId: number): Promise<void> {
    this.accountLoading.set(true);
    this.accountError.set(null);

    try {
      this.account.set(await firstValueFrom(this.accountsApi.getAccount(accountId)));
    } catch (error) {
      this.account.set(null);
      this.accountError.set(this.errorMessage(error, 'Unable to load account.'));
    } finally {
      this.accountLoading.set(false);
    }
  }

  private async loadRatingStats(accountId: number): Promise<void> {
    const currentRequest = ++this.ratingStatsRequestId;
    this.ratingStatsLoading.set(true);
    this.ratingStatsError.set(null);

    try {
      const stats = await firstValueFrom(this.accountsApi.getRatingStats(accountId));
      if (currentRequest === this.ratingStatsRequestId) this.ratingStats.set(stats);
    } catch (error) {
      if (currentRequest === this.ratingStatsRequestId) {
        this.ratingStats.set(null);
        this.ratingStatsError.set(this.errorMessage(error, 'Unable to load rating stats.'));
      }
    } finally {
      if (currentRequest === this.ratingStatsRequestId) this.ratingStatsLoading.set(false);
    }
  }

  private async loadPerformanceStats(accountId: number): Promise<void> {
    const currentRequest = ++this.performanceStatsRequestId;
    this.performanceStatsLoading.set(true);
    this.performanceStatsError.set(null);

    try {
      const stats = await firstValueFrom(this.accountsApi.getPerformanceStats(accountId, this.ratingQuery()));
      if (currentRequest === this.performanceStatsRequestId) this.performanceStats.set(stats);
    } catch (error) {
      if (currentRequest === this.performanceStatsRequestId) {
        this.performanceStats.set(null);
        this.performanceStatsError.set(this.errorMessage(error, 'Unable to load performance stats.'));
      }
    } finally {
      if (currentRequest === this.performanceStatsRequestId) this.performanceStatsLoading.set(false);
    }
  }

  private async loadHistory(accountId: number): Promise<void> {
    const currentRequest = ++this.requestId;
    this.historyLoading.set(true);
    this.historyError.set(null);

    try {
      const history = await firstValueFrom(this.accountsApi.getRatingHistory(accountId, this.ratingQuery()));
      if (currentRequest === this.requestId) this.history.set(history);
    } catch (error) {
      if (currentRequest === this.requestId) {
        this.history.set(null);
        this.historyError.set(this.errorMessage(error, 'Unable to load rating history.'));
      }
    } finally {
      if (currentRequest === this.requestId) this.historyLoading.set(false);
    }
  }

  private ratingQuery() {
    return {
      ...getRatingHistoryRangeQuery(this.selectedRange()),
      speeds: this.selectedSpeed() === 'all' ? undefined : [this.selectedSpeed() as RatingSpeed],
    };
  }

  private errorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const message = error.error?.message || error.error?.error;
      return typeof message === 'string' ? message : fallback;
    }
    return fallback;
  }
}
