import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import type { AiBuilderCandidateExplanationResponse } from '@chess-trainer/contracts/ai';
import type {
  CandidateDecisionCandidate,
  CandidateDecisionResponse,
} from '@chess-trainer/contracts/candidate-decision';
import type { RepertoireTarget } from '@chess-trainer/contracts/repertoire-target';
import {
  isOpponentPreparationRecommended,
  type BuilderBranch,
  type BuilderSession,
  type BuilderSessionPreview,
} from 'chess-domain';
import { ChessgroundBoardComponent } from '../../../shared/chess/board/chessground-board.component';
import { EngineEvalBarComponent } from '../../../shared/chess/engine/engine-eval-bar.component';
import type { EngineAnalysis } from '../../../shared/chess/engine/stockfish-analysis.service';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';
import type { UiShellAction } from '../../../shared/ui/ui-shell.model';
import {
  personalEvidenceDetail as formatPersonalEvidenceDetail,
  personalEvidenceLabel as formatPersonalEvidenceLabel,
} from '../helpers/repertoire-builder-view-model';
import {
  REPERTOIRE_BUILDER_DECISION_LIMIT,
  type RepertoireBuilderEngineImpact,
  type RepertoireBuilderPositionEvaluation,
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
  imports: [ChessgroundBoardComponent, EngineEvalBarComponent, PanelComponent],
  templateUrl: './repertoire-builder-workbench.component.html',
  styleUrls: [
    './repertoire-builder-workbench.component.css',
    './repertoire-builder-workbench-explanation.component.css',
  ],
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
  readonly engineAnalysis = input.required<EngineAnalysis>();
  readonly engineImpacts = input<Readonly<Record<string, RepertoireBuilderEngineImpact>>>({});
  readonly activePositionEvaluation = input<RepertoireBuilderPositionEvaluation | null>(null);

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
  readonly newDraftRequested = output<void>();
  readonly candidateExplanationRequested = output<void>();
  readonly candidateExplanationComparisonChanged = output<string | null>();

  protected readonly decisionLimit = REPERTOIRE_BUILDER_DECISION_LIMIT;
  protected readonly boardEntryMode = signal(false);
  protected readonly boardFen = computed(() =>
    this.boardEntryMode() ? (this.activeBranch()?.fen ?? this.displayedFen()) : this.displayedFen(),
  );
  protected readonly boardCanMove = computed(() => this.boardEntryMode() && this.boardMovable());
  protected readonly boardPanelActions = computed<readonly UiShellAction[]>(() => {
    if (this.activeBranch()?.role !== 'USER_MOVE' || !this.previewCandidate()) return [];
    return [
      {
        id: 'toggle-board-entry',
        label: this.boardEntryMode() ? 'Back to suggestion' : 'Enter your own move',
        kind: 'toggle',
        pressed: this.boardEntryMode(),
        run: () => this.boardEntryMode.update((enabled) => !enabled),
      },
    ];
  });
  protected readonly canIgnoreActiveBranch = computed(
    () => (this.session()?.branches.length ?? 0) > 1,
  );
  protected readonly decisionPanelTitle = computed(() => {
    const role = this.activeBranch()?.role;
    if (role === 'OPPONENT_RESPONSE') return 'Opponent responses';
    if (role === 'USER_MOVE') return 'Your move';
    return 'Draft ready';
  });
  protected readonly previewEngineImpact = computed(() => {
    const moveUci = this.previewCandidate()?.moveUci;
    return moveUci ? (this.engineImpacts()[moveUci] ?? null) : null;
  });
  protected readonly boardEvaluation = computed(() => {
    if (this.boardEntryMode()) return this.activePositionEvaluation();
    const impact = this.previewEngineImpact();
    return impact?.status === 'AVAILABLE' ? impact : null;
  });
  protected readonly comparisonCandidates = computed(() => {
    const selectedMoveUci = this.previewCandidate()?.moveUci;
    return (
      this.response()?.candidates.filter((candidate) => candidate.moveUci !== selectedMoveUci) ?? []
    );
  });

  protected isResponseSelected(moveUci: string): boolean {
    return this.selectedResponseUcis().includes(moveUci);
  }

  protected isOpponentResponseRecommended(candidate: CandidateDecisionCandidate): boolean {
    return isOpponentPreparationRecommended(candidate.reasonCodes);
  }

  protected useRecommendedResponses(): void {
    const candidates = this.response()?.candidates ?? [];
    const recommended = new Set(
      candidates
        .filter((candidate) => this.isOpponentResponseRecommended(candidate))
        .map((candidate) => candidate.moveUci),
    );
    const selected = new Set(this.selectedResponseUcis());

    for (const moveUci of selected) {
      if (!recommended.has(moveUci)) this.responseToggled.emit(moveUci);
    }
    for (const moveUci of recommended) {
      if (!selected.has(moveUci)) this.responseToggled.emit(moveUci);
    }
  }

  protected isPreviewed(moveUci: string): boolean {
    return !this.boardEntryMode() && this.previewCandidate()?.moveUci === moveUci;
  }

  protected previewMove(moveUci: string): void {
    this.boardEntryMode.set(false);
    this.candidateSelected.emit(moveUci);
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

  protected personalEvidenceLabel(candidate: CandidateDecisionCandidate): string {
    return formatPersonalEvidenceLabel(candidate.evidence.personal);
  }

  protected personalEvidenceDetail(candidate: CandidateDecisionCandidate): string {
    return formatPersonalEvidenceDetail(candidate.evidence.personal)
      ?? 'Personal game history could not be loaded.';
  }

  protected candidateEngineLabel(candidate: CandidateDecisionCandidate): string {
    const impact = this.engineImpacts()[candidate.moveUci];
    if (impact?.status === 'QUEUED' || impact?.status === 'ANALYZING') return 'Analyzing…';
    if (impact?.status === 'AVAILABLE') {
      return this.engineScoreLabel(impact.scoreCpForTarget, impact.mateForTarget);
    }
    const engine = candidate.evidence.engine;
    return this.engineScoreLabel(engine.scoreCpForTarget, engine.mateForTarget);
  }

  protected candidateEngineDetail(candidate: CandidateDecisionCandidate): string {
    const impact = this.engineImpacts()[candidate.moveUci];
    if (!impact) return 'stored engine';
    if (impact.status === 'QUEUED') return 'browser engine queued';
    if (impact.status === 'ANALYZING') return 'browser engine running';
    if (impact.status === 'FAILED') return 'engine unavailable';
    const source = this.engineImpactSourceLabel(impact);
    return impact.objectiveDeltaCp === null
      ? source
      : `${source} · ${impact.objectiveDeltaCp} cp from best`;
  }

  protected candidateKindLabel(candidate: CandidateDecisionCandidate): string {
    const opening = candidate.evidence.opening;
    const traits = [opening.soundness, ...opening.character.slice(0, 2)]
      .filter((value) => value !== null && value !== 'UNKNOWN')
      .map((value) => this.statusLabel(value));
    return traits.length > 0 ? traits.join(' · ') : 'Character not classified';
  }

  protected engineImpactSummary(impact: RepertoireBuilderEngineImpact): string {
    if (impact.status === 'QUEUED') return 'Queued behind the other candidate positions.';
    if (impact.status === 'ANALYZING')
      return 'Stockfish is evaluating this resulting position in your browser.';
    if (impact.status === 'FAILED')
      return impact.error ?? 'Browser Stockfish analysis was unavailable.';
    const score = this.engineScoreLabel(impact.scoreCpForTarget, impact.mateForTarget);
    const source =
      impact.source === 'BROWSER'
        ? impact.persistence === 'SAVED'
          ? 'Calculated in this browser and persisted for reuse.'
          : impact.persistence === 'FAILED'
            ? 'Calculated in this browser, but persistence failed.'
            : 'Calculated in this browser and queued for persistence.'
        : 'Loaded from persisted position analysis.';
    const delta =
      impact.objectiveDeltaCp === null
        ? ''
        : ` ${impact.objectiveDeltaCp} centipawns from the safest evaluated candidate.`;
    return `${score} for the repertoire side. ${source}${delta}`;
  }

  protected engineImpactStatus(impact: RepertoireBuilderEngineImpact): string {
    if (impact.status !== 'AVAILABLE') return this.statusLabel(impact.status);
    return this.statusLabel(this.engineImpactSourceLabel(impact));
  }

  private engineImpactSourceLabel(impact: RepertoireBuilderEngineImpact): string {
    if (impact.source !== 'BROWSER') return 'stored';
    if (impact.persistence === 'SAVED') return 'browser · saved';
    if (impact.persistence === 'FAILED') return 'browser · save failed';
    return 'browser · saving';
  }

  private engineScoreLabel(scoreCpForTarget: number | null, mateForTarget: number | null): string {
    if (mateForTarget !== null) return `Mate ${mateForTarget}`;
    if (scoreCpForTarget === null) return 'No score';
    const pawns = scoreCpForTarget / 100;
    return `${pawns >= 0 ? '+' : ''}${pawns.toFixed(2)}`;
  }
}
