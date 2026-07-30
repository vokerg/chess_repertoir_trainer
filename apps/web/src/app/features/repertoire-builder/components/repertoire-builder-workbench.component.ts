import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import type { AiBuilderCandidateExplanationResponse } from '@chess-trainer/contracts/ai';
import type {
  CandidateDecisionCandidate,
  CandidateDecisionResponse,
} from '@chess-trainer/contracts/candidate-decision';
import type { RepertoireTarget } from '@chess-trainer/contracts/repertoire-target';
import type {
  BuilderBranch,
  BuilderSession,
  BuilderSessionPreview,
} from 'chess-domain';
import { ChessgroundBoardComponent } from '../../../shared/chess/board/chessground-board.component';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';
import {
  REPERTOIRE_BUILDER_DECISION_LIMIT,
  type RepertoireBuilderPreviewRow,
  type RepertoireBuilderSourceItem,
} from '../state/repertoire-builder.models';

export interface RepertoireBuilderQueueMove {
  branchId: string;
  targetIndex: number;
}

@Component({
  selector: 'app-repertoire-builder-workbench',
  standalone: true,
  imports: [ChessgroundBoardComponent, PanelComponent],
  templateUrl: './repertoire-builder-workbench.component.html',
  styleUrl: './repertoire-builder-workbench.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RepertoireBuilderWorkbenchComponent {
  readonly session = input<BuilderSession<RepertoireTarget> | null>(null);
  readonly activeBranch = input<BuilderBranch | null>(null);
  readonly displayedFen = input('startpos');
  readonly boardSide = input<'WHITE' | 'BLACK'>('WHITE');
  readonly boardMovable = input(false);
  readonly response = input<CandidateDecisionResponse | null>(null);
  readonly previewCandidate = input<CandidateDecisionCandidate | null>(null);
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly commandError = input<string | null>(null);
  readonly selectedResponseUcis = input<readonly string[]>([]);
  readonly selectedCoveragePercent = input(0);
  readonly coverageTargetPercent = input(0);
  readonly sourceItems = input<readonly RepertoireBuilderSourceItem[]>([]);
  readonly reasonLabels = input<readonly string[]>([]);
  readonly warningLabels = input<readonly string[]>([]);
  readonly queue = input<BuilderSessionPreview['queue']>([]);
  readonly deferredBranches = input<readonly BuilderBranch[]>([]);
  readonly staleBranches = input<readonly BuilderBranch[]>([]);
  readonly previewRows = input<readonly RepertoireBuilderPreviewRow[]>([]);
  readonly acceptedDecisionCount = input(0);
  readonly decisionLimitReached = input(false);
  readonly targetPopulationLabel = input('');
  readonly canFinishSession = input(false);
  readonly completed = input(false);
  readonly abandoned = input(false);
  readonly candidateExplanationAvailable = input(false);
  readonly candidateExplanationLoading = input(false);
  readonly candidateExplanationError = input<string | null>(null);
  readonly candidateExplanation = input<AiBuilderCandidateExplanationResponse | null>(null);
  readonly candidateExplanationComparisonMoveUci = input<string | null>(null);

  readonly boardMove = output<string>();
  readonly candidateSelected = output<string>();
  readonly responseToggled = output<string>();
  readonly decisionAccepted = output<void>();
  readonly branchDeferred = output<void>();
  readonly branchIgnored = output<void>();
  readonly branchStopped = output<void>();
  readonly queueBranchSelected = output<string>();
  readonly deferredBranchReopened = output<string>();
  readonly staleBranchRestarted = output<string>();
  readonly queueReordered = output<RepertoireBuilderQueueMove>();
  readonly sessionFinished = output<void>();
  readonly sessionAbandoned = output<void>();
  readonly newDraftRequested = output<void>();
  readonly candidateExplanationRequested = output<void>();
  readonly candidateExplanationComparisonChanged = output<string | null>();

  protected readonly decisionLimit = REPERTOIRE_BUILDER_DECISION_LIMIT;
  private readonly boardEntryMode = signal(false);
  protected readonly boardFen = computed(() => (
    this.boardEntryMode() ? this.activeBranch()?.fen ?? this.displayedFen() : this.displayedFen()
  ));
  protected readonly boardCanMove = computed(() => this.boardEntryMode() && this.boardMovable());
  protected readonly comparisonCandidates = computed(() => {
    const selectedMoveUci = this.previewCandidate()?.moveUci;
    return this.response()?.candidates.filter((candidate) => candidate.moveUci !== selectedMoveUci) ?? [];
  });

  protected isResponseSelected(moveUci: string): boolean {
    return this.selectedResponseUcis().includes(moveUci);
  }

  protected isPreviewed(moveUci: string): boolean {
    return !this.boardEntryMode() && this.previewCandidate()?.moveUci === moveUci;
  }

  protected previewMove(moveUci: string): void {
    this.boardEntryMode.set(false);
    this.candidateSelected.emit(moveUci);
  }

  protected enterBoardMoveMode(): void {
    this.boardEntryMode.set(true);
  }

  protected handleBoardMove(moveUci: string): void {
    this.boardEntryMode.set(false);
    this.boardMove.emit(moveUci);
  }

  protected handleExplanationComparisonChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.candidateExplanationComparisonChanged.emit(value || null);
  }

  protected pathLabel(path: readonly string[]): string {
    return path.length === 0 ? 'Initial position' : path.join(' ');
  }

  protected statusLabel(status: string): string {
    return status
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  protected percent(value: number | null): string {
    return value === null ? '—' : `${Math.round(value)}%`;
  }

  protected candidateEngineLabel(candidate: CandidateDecisionCandidate): string {
    const engine = candidate.evidence.engine;
    if (engine.mateForTarget !== null) return `Mate ${engine.mateForTarget}`;
    if (engine.scoreCpForTarget === null) return 'No stored score';
    const pawns = engine.scoreCpForTarget / 100;
    return `${pawns >= 0 ? '+' : ''}${pawns.toFixed(2)}`;
  }
}
