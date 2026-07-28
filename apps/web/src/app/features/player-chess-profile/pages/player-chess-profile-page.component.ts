import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import {
  PageHeaderComponent,
  type PageHeaderAction,
} from '../../../shared/ui/page-header/page-header.component';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';
import { PlayerChessProfileBreakdownComponent } from '../components/player-chess-profile-breakdown.component';
import { PlayerChessProfileConclusionsComponent } from '../components/player-chess-profile-conclusions.component';
import { PlayerChessProfileCoverageComponent } from '../components/player-chess-profile-coverage.component';
import { PlayerChessProfileEvidenceComponent } from '../components/player-chess-profile-evidence.component';
import { PlayerChessProfileFilterBarComponent } from '../components/player-chess-profile-filter-bar.component';
import { PlayerChessProfileApiService } from '../data-access/player-chess-profile-api.service';
import { PlayerChessProfileStore } from '../state/player-chess-profile.store';

@Component({
  selector: 'app-player-chess-profile-page',
  standalone: true,
  imports: [
    PageHeaderComponent,
    PanelComponent,
    PlayerChessProfileBreakdownComponent,
    PlayerChessProfileConclusionsComponent,
    PlayerChessProfileCoverageComponent,
    PlayerChessProfileEvidenceComponent,
    PlayerChessProfileFilterBarComponent,
  ],
  providers: [PlayerChessProfileApiService, PlayerChessProfileStore],
  templateUrl: './player-chess-profile-page.component.html',
  styleUrl: './player-chess-profile-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerChessProfilePageComponent implements OnInit {
  protected readonly store = inject(PlayerChessProfileStore);

  protected readonly headerActions: readonly PageHeaderAction[] = [
    {
      id: 'repertoire-start',
      label: 'Use as repertoire starting point · planned',
      disabled: true,
      run: () => undefined,
    },
  ];

  ngOnInit(): void {
    void this.store.initialize();
  }
}
