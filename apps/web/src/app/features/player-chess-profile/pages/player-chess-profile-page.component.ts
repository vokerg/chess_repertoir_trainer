import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  PageHeaderComponent,
  type PageHeaderAction,
} from '../../../shared/ui/page-header/page-header.component';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';
import {
  buildRepertoireBuilderProfileLaunchQueryParams,
  buildRepertoireBuilderProfileSuggestions,
  type RepertoireBuilderProfileSuggestion,
} from '../../repertoire-builder/profile-launch';
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
  private readonly router = inject(Router);
  protected readonly store = inject(PlayerChessProfileStore);

  protected readonly repertoireSuggestions = computed(() => {
    const response = this.store.response();
    return response ? buildRepertoireBuilderProfileSuggestions(response) : [];
  });

  protected readonly headerActions = computed<readonly PageHeaderAction[]>(() => (
    buildPlayerChessProfileBuilderActions(
      this.repertoireSuggestions(),
      (suggestion) => void this.launchBuilder(suggestion),
    )
  ));

  ngOnInit(): void {
    void this.store.initialize();
  }

  private async launchBuilder(suggestion: RepertoireBuilderProfileSuggestion): Promise<void> {
    await this.router.navigate(['/builder'], {
      queryParams: buildRepertoireBuilderProfileLaunchQueryParams(suggestion),
    });
  }
}

export function buildPlayerChessProfileBuilderActions(
  suggestions: readonly RepertoireBuilderProfileSuggestion[],
  launch: (suggestion: RepertoireBuilderProfileSuggestion) => void,
): readonly PageHeaderAction[] {
  return suggestions.map((suggestion) => ({
    id: `repertoire-start-${suggestion.side.toLowerCase()}`,
    label: `Build ${suggestion.side === 'WHITE' ? 'White' : 'Black'} repertoire · ${personaLabel(suggestion)}`,
    run: () => launch(suggestion),
  }));
}

function personaLabel(suggestion: RepertoireBuilderProfileSuggestion): string {
  return suggestion.setup.persona.toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
}
