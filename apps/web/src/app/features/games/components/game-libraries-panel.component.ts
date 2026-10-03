import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { GameLibrary } from '@chess-trainer/contracts/imported-games';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';

@Component({
  selector: 'app-game-libraries-panel',
  standalone: true,
  imports: [FormsModule, RouterLink, PanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './game-libraries-panel.component.html',
  styleUrl: './game-libraries-panel.component.css',
})
export class GameLibrariesPanelComponent {
  readonly libraries = input<readonly GameLibrary[]>([]);
  readonly loading = input(false);
  readonly busy = input(false);
  readonly selectedId = input<number>();
  readonly save = output<{ name: string; id?: number }>();
  readonly remove = output<GameLibrary>();
  protected readonly name = signal('');
  protected readonly editingId = signal<number | undefined>(undefined);

  protected edit(library: GameLibrary): void {
    this.editingId.set(library.id);
    this.name.set(library.name);
  }

  resetForm(): void {
    this.editingId.set(undefined);
    this.name.set('');
  }
}
