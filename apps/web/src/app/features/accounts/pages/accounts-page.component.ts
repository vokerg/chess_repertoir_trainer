import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent } from '../../../components/page-header.component';
import { AccountsApiService } from '../data-access/accounts-api.service';
import { dateLabel, providerClass, providerLabel, syncStatusLabel } from '../helpers/account-labels';
import { AccountsStore } from '../state/accounts.store';

@Component({
  selector: 'app-accounts-page',
  standalone: true,
  imports: [NgClass, FormsModule, PageHeaderComponent],
  providers: [AccountsApiService, AccountsStore],
  templateUrl: './accounts-page.component.html',
  styleUrl: './accounts-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountsPageComponent implements OnInit {
  protected readonly store = inject(AccountsStore);
  protected readonly providerLabel = providerLabel;
  protected readonly providerClass = providerClass;
  protected readonly syncStatusLabel = syncStatusLabel;
  protected readonly dateLabel = dateLabel;

  ngOnInit(): void {
    void this.store.loadAccounts();
  }
}
