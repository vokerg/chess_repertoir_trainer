import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UpdateLineNodePayload } from '../data-access/lines.models';

@Component({
  selector: 'app-line-notes-editor',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './line-notes-editor.component.html',
  styleUrl: './line-notes-editor.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LineNotesEditorComponent implements OnChanges {
  @Input() nodeId: number | null = null;
  @Input() branchLabelValue: string | null | undefined = null;
  @Input() commentValue: string | null | undefined = null;
  @Input() annotationValue: string | null | undefined = null;
  @Input() saving = false;
  @Input() saved = false;
  @Input() error: string | null = null;
  @Output() saveNotes = new EventEmitter<UpdateLineNodePayload>();

  branchLabel = '';
  comment = '';
  annotation = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['nodeId'] || changes['branchLabelValue'] || changes['commentValue'] || changes['annotationValue']) {
      this.branchLabel = this.branchLabelValue || '';
      this.comment = this.commentValue || '';
      this.annotation = this.annotationValue || '';
    }
  }

  submit(): void {
    this.saveNotes.emit({
      branchLabel: this.branchLabel.trim() || null,
      comment: this.comment.trim() || null,
      annotation: this.annotation.trim() || null,
    });
  }
}
