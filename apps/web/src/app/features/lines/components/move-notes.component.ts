import { ChangeDetectionStrategy, Component, effect, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LineTreeNode, UpdateLineNodePayload } from '../data-access/lines.models';

@Component({
  selector: 'app-move-notes',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './move-notes.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MoveNotesComponent {
  readonly node = input<LineTreeNode | null>(null);
  readonly saving = input(false);
  readonly saved = input(false);
  readonly error = input<string | null>(null);
  readonly saveNotes = output<UpdateLineNodePayload>();

  protected branchLabel = '';
  protected comment = '';
  protected annotation = '';

  constructor() {
    effect(() => {
      const node = this.node()?.node ?? null;
      this.branchLabel = node?.branchLabel ?? '';
      this.comment = node?.comment ?? '';
      this.annotation = node?.annotation ?? '';
    });
  }

  protected submit(): void {
    this.saveNotes.emit({
      branchLabel: this.branchLabel.trim() || null,
      comment: this.comment.trim() || null,
      annotation: this.annotation.trim() || null,
    });
  }
}
