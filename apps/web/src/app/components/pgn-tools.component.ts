import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';

interface LineSummary {
  id: number;
  name: string;
  sideToTrain: 'WHITE' | 'BLACK';
}

@Component({
  selector: 'app-pgn-tools',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="stack" style="border-top:1px solid var(--border);padding-top:1rem;">
      <div>
        <span class="eyebrow">PGN</span>
        <h3 class="collection-title" style="font-size:1.35rem;">Import / export</h3>
        <p class="page-subtitle" style="font-size:0.92rem;">
          Import one PGN into a new line, or export an existing line as PGN with basic variations.
        </p>
      </div>

      <div class="stack" style="gap:0.55rem;">
        <label class="metric-label">Export line</label>
        <select [(ngModel)]="exportLineId">
          <option [ngValue]="null">Choose a line…</option>
          <option *ngFor="let line of lines" [ngValue]="line.id">{{ line.name }}</option>
        </select>
        <button type="button" class="secondary" (click)="exportPgn()" [disabled]="!exportLineId || exporting">
          {{ exporting ? 'Exporting...' : 'Export PGN' }}
        </button>
      </div>

      <textarea *ngIf="exportedPgn" [(ngModel)]="exportedPgn" rows="7" style="width:100%;font-family:monospace;"></textarea>

      <div class="stack" style="gap:0.55rem;">
        <label class="metric-label">Import PGN as new line</label>
        <input [(ngModel)]="importName" placeholder="Imported line name" />
        <select [(ngModel)]="importSide">
          <option value="WHITE">Train White</option>
          <option value="BLACK">Train Black</option>
        </select>
        <input [(ngModel)]="importStartingFen" placeholder="startpos" />
        <textarea [(ngModel)]="importPgnText" rows="8" placeholder="Paste PGN here" style="width:100%;font-family:monospace;"></textarea>
        <button type="button" (click)="importPgn()" [disabled]="importing || !chapterId || !importName || !importPgnText">
          {{ importing ? 'Importing...' : 'Import PGN' }}
        </button>
      </div>

      <p *ngIf="message" style="color:green;">{{ message }}</p>
      <p *ngIf="error" class="status-error">{{ error }}</p>
    </section>
  `,
})
export class PgnToolsComponent {
  @Input() chapterId!: number;
  @Input() lines: LineSummary[] = [];
  @Output() changed = new EventEmitter<void>();

  exportLineId: number | null = null;
  exportedPgn = '';
  exporting = false;

  importName = '';
  importSide: 'WHITE' | 'BLACK' = 'WHITE';
  importStartingFen = 'startpos';
  importPgnText = '';
  importing = false;

  message: string | null = null;
  error: string | null = null;

  constructor(private api: ApiService) {}

  exportPgn() {
    if (!this.exportLineId) return;
    this.exporting = true;
    this.message = null;
    this.error = null;
    this.api.get<{ pgn: string }>(`/lines/${this.exportLineId}/export-pgn`).subscribe({
      next: (res) => {
        this.exportedPgn = res.pgn;
        this.exporting = false;
        this.message = 'PGN exported below.';
      },
      error: (err) => {
        this.exporting = false;
        this.error = err?.error?.message || err?.error?.error || 'Could not export PGN.';
      },
    });
  }

  importPgn() {
    if (!this.chapterId) return;
    this.importing = true;
    this.message = null;
    this.error = null;
    this.api.post<any>(`/chapters/${this.chapterId}/lines/import-pgn`, {
      name: this.importName,
      sideToTrain: this.importSide,
      startingFen: this.importStartingFen || 'startpos',
      pgn: this.importPgnText,
    }).subscribe({
      next: () => {
        this.importing = false;
        this.importName = '';
        this.importPgnText = '';
        this.message = 'PGN imported as a new line.';
        this.changed.emit();
      },
      error: (err) => {
        this.importing = false;
        this.error = err?.error?.message || err?.error?.error || 'Could not import PGN.';
      },
    });
  }
}
