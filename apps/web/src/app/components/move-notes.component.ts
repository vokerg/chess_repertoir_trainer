import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-move-notes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section *ngIf="node?.node?.id && node.node.id !== 0" class="workbench-panel move-notes-card">
      <div>
        <h3 class="workbench-panel-title">Notes</h3>
        <p class="workbench-panel-subtitle">Capture why this move belongs in the line.</p>
      </div>

      <div class="move-notes-form">
        <label class="form-field">
          <span class="metric-label">Branch label</span>
          <input [(ngModel)]="branchLabel" placeholder="Main line, rare reply, trap..." />
        </label>
        <label class="form-field">
          <span class="metric-label">Comment</span>
          <textarea [(ngModel)]="comment" rows="3" placeholder="Why this move matters"></textarea>
        </label>
        <label class="form-field">
          <span class="metric-label">Annotation</span>
          <input [(ngModel)]="annotation" placeholder="!, ?, +=, practical note..." />
        </label>
        <div class="move-notes-actions">
          <button type="button" (click)="save()" [disabled]="saving">{{ saving ? 'Saving...' : 'Save notes' }}</button>
          <span *ngIf="saved" class="save-state">Saved</span>
          <span *ngIf="error" class="save-state error">{{ error }}</span>
        </div>
      </div>
    </section>
  `,
})
export class MoveNotesComponent implements OnChanges {
  @Input() node: any;
  @Output() savedNode = new EventEmitter<any>();

  branchLabel: string | null = null;
  comment: string | null = null;
  annotation: string | null = null;
  saving = false;
  saved = false;
  error: string | null = null;

  constructor(private api: ApiService) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['node']) {
      this.branchLabel = this.node?.node?.branchLabel ?? null;
      this.comment = this.node?.node?.comment ?? null;
      this.annotation = this.node?.node?.annotation ?? null;
      this.saving = false;
      this.saved = false;
      this.error = null;
    }
  }

  save() {
    if (!this.node?.node?.id) return;
    this.saving = true;
    this.saved = false;
    this.error = null;
    this.api.patch<any>(`/nodes/${this.node.node.id}`, {
      branchLabel: this.branchLabel || null,
      comment: this.comment || null,
      annotation: this.annotation || null,
    }).subscribe({
      next: (updated) => {
        this.saving = false;
        this.saved = true;
        this.savedNode.emit(updated);
      },
      error: (err) => {
        this.saving = false;
        this.error = err?.error?.message || err?.error?.error || 'Could not save notes.';
      },
    });
  }
}
