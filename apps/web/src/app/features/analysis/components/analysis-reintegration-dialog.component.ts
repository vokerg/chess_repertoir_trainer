import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnalysisReintegrationCandidate, RepertoireColor } from '../data-access/analysis-reintegration.models';
import { AnalysisReintegrationStore, candidateKey } from '../state/analysis-reintegration.store';

@Component({ selector: 'app-analysis-reintegration-dialog', standalone: true,
  imports: [CommonModule, FormsModule], templateUrl: './analysis-reintegration-dialog.component.html',
  styleUrl: './analysis-reintegration-dialog.component.css', changeDetection: ChangeDetectionStrategy.OnPush })
export class AnalysisReintegrationDialogComponent {
  readonly store = inject(AnalysisReintegrationStore);
  protected candidateKey(candidate: AnalysisReintegrationCandidate): string { return candidateKey(candidate); }
  protected selectCourse(value: string): void { void this.store.selectCourse(value); }
  protected selectChapter(value: string): void { void this.store.selectChapter(value); }
  protected selectSide(value: string): void { if (value === 'WHITE' || value === 'BLACK') this.store.setNewLineSideToTrain(value as RepertoireColor); }
}
