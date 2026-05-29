import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../services/api.service';

type Provider = 'LICHESS' | 'CHESS_COM';

interface ExternalAccount {
  id: number;
  provider: Provider;
  username: string;
  displayName?: string | null;
  isActive: boolean;
  lastSyncAt?: string | null;
  syncCursorTime?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface ImportRunSummary {
  importRunId: number;
  status: string;
  gamesSeen: number;
  gamesImported: number;
  gamesUpdated: number;
  gamesSkipped?: number;
  gamesFailed: number;
  syncSince?: string | null;
  syncUntil?: string | null;
  archivesFetched?: number | null;
}

interface AccountForm {
  provider: Provider;
  username: string;
  displayName: string;
}

@Component({
  selector: 'app-accounts-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <section class="accounts-page stack">
      <section class="section-card accounts-hero">
        <div>
          <span class="eyebrow">Game imports</span>
          <h2 class="page-heading page-heading-library">External accounts</h2>
          <p class="page-subtitle">
            Add Lichess and Chess.com usernames, then sync each account independently into your imported games library.
          </p>
        </div>
        <div class="accounts-hero-actions">
          <a routerLink="/games" class="accounts-link-button">Open games explorer</a>
          <button type="button" class="secondary" (click)="loadAccounts()" [disabled]="loading">
            {{ loading ? 'Refreshing...' : 'Refresh accounts' }}
          </button>
        </div>
      </section>

      <section class="section-card accounts-grid-card">
        <div>
          <span class="eyebrow">New account</span>
          <h3 class="accounts-section-title">Add import source</h3>
          <p class="accounts-muted">
            Use the public username. The app keeps accounts provider-aware, so the same username can exist on both providers.
          </p>
        </div>

        <form class="account-form" (ngSubmit)="createAccount()">
          <label class="account-field">
            <span>Provider</span>
            <select [(ngModel)]="form.provider" name="provider">
              <option value="LICHESS">Lichess</option>
              <option value="CHESS_COM">Chess.com</option>
            </select>
          </label>

          <label class="account-field">
            <span>Username</span>
            <input [(ngModel)]="form.username" name="username" placeholder="e.g. magnuscarlsen" required />
          </label>

          <label class="account-field">
            <span>Display name</span>
            <input [(ngModel)]="form.displayName" name="displayName" placeholder="Optional label" />
          </label>

          <div class="account-form-actions">
            <button type="submit" [disabled]="saving || !form.username.trim()">
              {{ saving ? 'Adding...' : 'Add account' }}
            </button>
            <button type="button" class="secondary" (click)="resetForm()" [disabled]="saving">Clear</button>
          </div>
        </form>
      </section>

      <section class="section-card accounts-list-card">
        <div class="accounts-list-header">
          <div>
            <span class="eyebrow">Configured accounts</span>
            <h3 class="accounts-section-title">Sync games by account</h3>
            <p class="accounts-muted">
              Sync is deliberately per-account so a large archive import does not block every other source.
            </p>
          </div>
          <div class="metric-card accounts-mini-card">
            <p class="metric-label">Accounts</p>
            <p class="metric-value">{{ accounts.length }}</p>
          </div>
        </div>

        <p *ngIf="error" class="status-error">{{ error }}</p>
        <p *ngIf="notice" class="status-note">{{ notice }}</p>
        <p *ngIf="loading && accounts.length === 0" class="status-note">Loading accounts...</p>

        <div *ngIf="!loading && accounts.length === 0" class="empty-state accounts-empty">
          No accounts configured yet. Add a Lichess or Chess.com username above, then press Sync on the account card.
        </div>

        <div class="accounts-list" *ngIf="accounts.length > 0">
          <article class="account-card" *ngFor="let account of accounts">
            <div class="account-card-main">
              <div class="account-title-row">
                <span class="provider-pill" [ngClass]="providerClass(account.provider)">{{ providerLabel(account.provider) }}</span>
                <span class="account-state-pill" [class.account-state-inactive]="!account.isActive">
                  {{ account.isActive ? 'Active' : 'Inactive' }}
                </span>
              </div>

              <h4 class="account-title">{{ account.displayName || account.username }}</h4>
              <p class="accounts-muted account-username">@{{ account.username }}</p>

              <div class="account-meta-grid">
                <div>
                  <span>Last sync</span>
                  <strong>{{ dateLabel(account.lastSyncAt) }}</strong>
                </div>
                <div>
                  <span>Import cursor</span>
                  <strong>{{ dateLabel(account.syncCursorTime) }}</strong>
                </div>
                <div>
                  <span>Created</span>
                  <strong>{{ dateLabel(account.createdAt) }}</strong>
                </div>
              </div>

              <div *ngIf="syncResults[account.id] as result" class="sync-result">
                <strong>{{ syncStatusLabel(result.status) }}</strong>
                <span>
                  Seen {{ result.gamesSeen }}, imported {{ result.gamesImported }}, updated {{ result.gamesUpdated }}, skipped {{ result.gamesSkipped || 0 }}, failed {{ result.gamesFailed }}.
                </span>
                <span *ngIf="result.archivesFetched !== null && result.archivesFetched !== undefined">
                  Archives fetched: {{ result.archivesFetched }}.
                </span>
              </div>
            </div>

            <div class="account-card-actions">
              <button
                type="button"
                (click)="syncAccount(account)"
                [disabled]="syncingAccountId === account.id || !account.isActive"
              >
                {{ syncingAccountId === account.id ? 'Syncing...' : 'Sync' }}
              </button>
              <button type="button" class="secondary" (click)="toggleActive(account)" [disabled]="syncingAccountId === account.id">
                {{ account.isActive ? 'Disable' : 'Enable' }}
              </button>
              <a routerLink="/games" class="accounts-link-button secondary-link">View games</a>
            </div>
          </article>
        </div>
      </section>
    </section>
  `,
  styles: [
    `
      .accounts-page { gap: 1rem; }
      .accounts-hero,
      .accounts-list-header {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;
        align-items: end;
      }
      .accounts-hero-actions,
      .account-form-actions,
      .account-card-actions {
        display: flex;
        gap: 0.65rem;
        flex-wrap: wrap;
        align-items: center;
      }
      .accounts-grid-card,
      .accounts-list-card {
        display: grid;
        gap: 1rem;
      }
      .accounts-section-title {
        margin: 0.25rem 0 0;
        font-size: 1.35rem;
        letter-spacing: -0.03em;
      }
      .accounts-muted {
        margin: 0.35rem 0 0;
        color: var(--muted);
        line-height: 1.45;
      }
      .account-form {
        display: grid;
        grid-template-columns: minmax(160px, 0.8fr) minmax(220px, 1fr) minmax(220px, 1fr) auto;
        gap: 0.85rem;
        align-items: end;
      }
      .account-field {
        display: grid;
        gap: 0.35rem;
        color: var(--muted-strong);
        font-weight: 800;
        font-size: 0.82rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .account-field input,
      .account-field select {
        text-transform: none;
        letter-spacing: 0;
        font-weight: 600;
      }
      .accounts-mini-card {
        min-width: 130px;
        padding: 0.9rem;
      }
      .accounts-mini-card .metric-value {
        font-size: 1.55rem;
      }
      .accounts-empty {
        border: 1px dashed var(--border-strong);
        border-radius: 24px;
        padding: 1.4rem;
        color: var(--muted);
      }
      .accounts-list {
        display: grid;
        gap: 0.85rem;
      }
      .account-card {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;
        padding: 1rem;
        border: 1px solid var(--border);
        border-radius: 24px;
        background: rgba(255, 252, 247, 0.72);
      }
      .account-card-main {
        display: grid;
        gap: 0.7rem;
        min-width: min(100%, 520px);
      }
      .account-title-row {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        align-items: center;
      }
      .account-title {
        margin: 0;
        font-size: 1.25rem;
        letter-spacing: -0.02em;
      }
      .account-username {
        margin-top: -0.55rem;
        font-weight: 700;
      }
      .provider-pill,
      .account-state-pill {
        display: inline-flex;
        align-items: center;
        white-space: nowrap;
        border-radius: 999px;
        padding: 0.32rem 0.6rem;
        font-size: 0.76rem;
        font-weight: 900;
      }
      .provider-lichess { background: rgba(35, 27, 21, 0.08); color: var(--text); }
      .provider-chess-com { background: var(--success-soft); color: var(--success); }
      .account-state-pill { background: var(--accent-soft); color: var(--accent-strong); }
      .account-state-inactive { background: rgba(35, 27, 21, 0.08); color: var(--muted-strong); }
      .account-meta-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(140px, 1fr));
        gap: 0.75rem;
      }
      .account-meta-grid div {
        display: grid;
        gap: 0.2rem;
        padding: 0.75rem;
        border-radius: 18px;
        background: rgba(35, 27, 21, 0.045);
      }
      .account-meta-grid span {
        color: var(--muted-strong);
        font-size: 0.72rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .account-meta-grid strong {
        color: var(--text);
      }
      .sync-result {
        display: grid;
        gap: 0.25rem;
        border-left: 4px solid var(--accent);
        padding: 0.75rem 0.85rem;
        border-radius: 14px;
        background: var(--accent-soft);
        color: var(--text);
      }
      .account-card-actions {
        align-content: flex-start;
        justify-content: flex-end;
      }
      .account-card-actions button,
      .accounts-link-button {
        min-height: 40px;
        padding: 0.65rem 0.9rem;
      }
      .accounts-link-button {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        text-decoration: none;
        background: var(--accent-soft);
        color: var(--accent-strong);
        font-weight: 800;
      }
      .secondary-link {
        background: rgba(35, 27, 21, 0.08);
        color: var(--text);
      }
      .status-error { color: var(--danger); font-weight: 800; }
      .status-note { color: var(--muted); font-weight: 700; }
      @media (max-width: 980px) {
        .account-form { grid-template-columns: repeat(2, minmax(180px, 1fr)); }
        .account-meta-grid { grid-template-columns: repeat(2, minmax(140px, 1fr)); }
      }
      @media (max-width: 640px) {
        .account-form,
        .account-meta-grid { grid-template-columns: 1fr; }
        .account-card-actions { justify-content: flex-start; }
      }
    `,
  ],
})
export class AccountsPageComponent implements OnInit {
  accounts: ExternalAccount[] = [];
  loading = false;
  saving = false;
  syncingAccountId: number | null = null;
  error: string | null = null;
  notice: string | null = null;
  syncResults: Record<number, ImportRunSummary> = {};

  form: AccountForm = this.defaultForm();

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadAccounts();
  }

  loadAccounts() {
    this.loading = true;
    this.error = null;
    this.api.get<ExternalAccount[]>('/me/accounts').subscribe({
      next: (accounts) => {
        this.accounts = accounts || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = this.apiError(err, 'Could not load accounts.');
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  createAccount() {
    const username = this.form.username.trim();
    if (!username) return;

    this.saving = true;
    this.error = null;
    this.notice = null;

    const body = {
      provider: this.form.provider,
      username,
      ...(this.form.displayName.trim() ? { displayName: this.form.displayName.trim() } : {}),
    };

    this.api.post<ExternalAccount>('/me/accounts', body).subscribe({
      next: (account) => {
        this.accounts = [account, ...this.accounts.filter((item) => item.id !== account.id)]
          .sort((a, b) => this.providerLabel(a.provider).localeCompare(this.providerLabel(b.provider)) || a.username.localeCompare(b.username));
        this.notice = `Account ${account.username} is ready to sync.`;
        this.saving = false;
        this.resetForm();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = this.apiError(err, 'Could not add account.');
        this.saving = false;
        this.cdr.detectChanges();
      },
    });
  }

  syncAccount(account: ExternalAccount) {
    this.syncingAccountId = account.id;
    this.error = null;
    this.notice = null;

    this.api.post<ImportRunSummary>(`/me/accounts/${account.id}/sync`, {}).subscribe({
      next: (result) => {
        this.syncResults = { ...this.syncResults, [account.id]: result };
        this.notice = `${this.providerLabel(account.provider)} account ${account.username} synced.`;
        this.syncingAccountId = null;
        this.loadAccounts();
      },
      error: (err) => {
        this.error = this.apiError(err, `Could not sync ${account.username}.`);
        this.syncingAccountId = null;
        this.cdr.detectChanges();
      },
    });
  }

  toggleActive(account: ExternalAccount) {
    this.error = null;
    this.notice = null;

    this.api.patch<ExternalAccount>(`/me/accounts/${account.id}`, { isActive: !account.isActive }).subscribe({
      next: (updated) => {
        this.accounts = this.accounts.map((item) => (item.id === updated.id ? updated : item));
        this.notice = `${updated.username} is now ${updated.isActive ? 'active' : 'inactive'}.`;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = this.apiError(err, 'Could not update account.');
        this.cdr.detectChanges();
      },
    });
  }

  resetForm() {
    this.form = this.defaultForm();
  }

  defaultForm(): AccountForm {
    return { provider: 'LICHESS', username: '', displayName: '' };
  }

  providerLabel(provider?: Provider | null): string {
    if (provider === 'CHESS_COM') return 'Chess.com';
    if (provider === 'LICHESS') return 'Lichess';
    return 'Provider';
  }

  providerClass(provider?: Provider | null): string {
    return provider === 'CHESS_COM' ? 'provider-chess-com' : 'provider-lichess';
  }

  syncStatusLabel(status: string): string {
    if (status === 'COMPLETED') return 'Sync completed';
    if (status === 'FAILED') return 'Sync failed';
    if (status === 'RUNNING') return 'Sync running';
    return status || 'Sync result';
  }

  dateLabel(value?: string | null): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  }

  apiError(err: any, fallback: string): string {
    const payload = err?.error;
    if (typeof payload === 'string') return payload;
    if (payload?.message) return payload.message;
    if (payload?.error) return Array.isArray(payload.error) ? payload.error.map((item: any) => item?.message || String(item)).join(', ') : payload.error;
    return fallback;
  }
}
