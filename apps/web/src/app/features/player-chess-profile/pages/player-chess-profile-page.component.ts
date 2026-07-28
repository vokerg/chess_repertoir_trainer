import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import {
  PageHeaderComponent,
  type PageHeaderAction,
  type PageHeaderStat,
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

  protected readonly headerStats = computed<readonly PageHeaderStat[]>(() => {
    const profile = this.store.response();
    if (!profile) return [];
    return [
      { id: 'games', label: 'Games', value: profile.coverage.totalGames },
      {
        id: 'analysis',
        label: 'Analysed',
        value: profile.coverage.analysisPercent === null
          ? '—'
          : `${profile.coverage.analysisPercent}%`,
      },
      {
        id: 'classification',
        label: 'Profiled',
        value: profile.coverage.classifiedOpeningGames,
      },
    ];
  });

  protected readonly headerActions = computed<readonly PageHeaderAction[]>(() => [
    {
      id: 'repertoire-start',
      label: 'Use as repertoire starting point · planned',
      disabled: true,
      run: () => undefined,
    },
  ]);

  protected readonly selectedConclusionIndex = computed(() => {
    const selection = this.store.evidenceSelection();
    return selection?.kind === 'CONCLUSION' ? selection.index : null;
  });

  ngOnInit(): void {
    void this.store.initialize();
  }
}
