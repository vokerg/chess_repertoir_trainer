import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-move-notes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section *ngIf="node?.node?.id && node.node.id !== 0" style="margin-top:12px;border:1px solid #ddd;padding:10px;max-width:520px;background:#fff;">
      <h3 style="margin-top:0;">Move notes</h3>
      <div style="display:grid;gap:8px;">
        <label>
          Branch label
          <input [(ngModel)]="branchLabel" placeholder="Main line, rare reply, trap..." style="width:100%;" />
        </label>
        <label>
          Comment
          <textarea [(ngModel)]="comment" rows="3" placeholder="Why this move matters" style="width:100%;"></textarea>
        </label>
        <label>
          Annotation
          <input [(ngModel)]="annotation" placeholder="!, ?, +=, practical note..." style="width:100%;" />
        </label>
        <div style="display:flex;gap:8px;align-items:center;">
          <button type="button" (click)="save()" [disabled]="saving">{{ saving ? 'Saving...' : 'Save notes' }}</button>
          <span *ngIf="saved" style="color:green;">Saved</span>
          <span *ngIf="error" style="color:#b00020;">{{ error }}</span>
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
