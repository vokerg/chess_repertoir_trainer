import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PlayerChessProfilePageComponent } from '../../player-chess-profile';

@Component({
  selector: 'app-progress-entry-page',
  standalone: true,
  imports: [PlayerChessProfilePageComponent],
  template: '<app-player-chess-profile-page />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressEntryPageComponent {}
