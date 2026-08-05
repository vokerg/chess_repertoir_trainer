import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type {
  CandidateDecisionCandidate,
  CandidateDecisionResponse,
} from '@chess-trainer/contracts/candidate-decision';
import type { LichessGamesPeerResolution } from '@chess-trainer/contracts/opening-explorer';
import type { RepertoireTarget } from '@chess-trainer/contracts/repertoire-target';
import {
  acceptBuilderDecision,
  abandonBuilderSession,
  buildBuilderSessionPreview,
  completeBuilderBranch,
  completeBuilderSession,
  createBuilderSession,
  deferBuilderBranch,
  ignoreBuilderBranch,
  reopenBuilderBranch,
  reorderBuilderQueue,
  restartStaleBuilderBranch,
  type BuilderDecisionMoveInput,
  type BuilderSession,
  type BuilderSessionPreview,
} from 'chess-domain';
import { AuthService } from '../../../core/auth/auth.service';
import { RepertoireBuilderApiService } from '../data-access/repertoire-builder-api.service';
import {
  builderLaunchStartingPoint,
  type RepertoireBuilderCourseEndingLaunch,
} from '../helpers/repertoire-builder-launch';
import {
  buildRepertoireBuilderTarget,
  defaultRepertoireBuilderSetup,
  requiresPeerResolution,
  targetPopulationLabel as formatTargetPopulationLabel,
} from '../helpers/repertoire-builder-target';
import {
  buildRepertoireBuilderEvidenceReference,
  buildRepertoireBuilderPreviewRows,
  buildRepertoireBuilderSourceItems,
  reasonLabel,
  warningLabel,
} from '../helpers/repertoire-builder-view-model';
import {
  REPERTOIRE_BUILDER_CANDIDATE_LIMIT,
  REPERTOIRE_BUILDER_DECISION_LIMIT,
  REPERTOIRE_BUILDER_PREVIEW_LIMIT,
  type RepertoireBuilderSetup,
} from './repertoire-builder.models';

@Injectable()
export class RepertoireBuilderStore {
  private readonly api = inject(RepertoireBuilderApiService);
  private readonly auth = inject(AuthService);
  private setupRequestId = 0;
  private candidateRequestId = 0;

  private readonly setupState = signal<RepertoireBuilderSetup>(defaultRepertoireBuilderSetup());
  private readonly setupOpenState = signal(true);
  private readonly setupLoadingState = signal(false);
  private readonly setupErrorState = signal<string | null>(null);
  private readonly sessionState = signal<BuilderSession<RepertoireTarget> | null>(null);
  private readonly activeBranchIdState = signal<string | null>(null);
  private readonly candidateResponseState = signal<CandidateDecisionResponse | null>(null);
  private readonly candidatesLoadingState = signal(false);
  private readonly candidatesErrorState = signal<string | null>(null);
  private readonly previewMoveUciState = signal<string | null>(null);
  private readonly selectedResponseUcisState = signal<readonly string[]>([]);
  private readonly commandErrorState = signal<string | null>(null);

  readonly setup = this.setupState.asReadonly();
  readonly setupOpen = this.setupOpenState.asReadonly();
  readonly setupLoading = this.setupLoadingState.asReadonly();
  readonly setupError = this.setupErrorState.asReadonly();
  readonly session = this.sessionState.asReadonly();
  readonly activeBranchId = this.activeBranchIdState.asReadonly();
  readonly candidateResponse = this.candidateResponseState.asReadonly();
  readonly candidatesLoading = this.candidatesLoadingState.asReadonly();
  readonly candidatesError = this.candidatesErrorState.asReadonly();
  readonly selectedResponseUcis = this.selectedResponseUcisState.asReadonly();
  readonly commandError = this.commandErrorState.asReadonly();

  readonly activeBranch = computed(() => {
    const session = this.sessionState();
    const branchId = this.activeBranchIdState();
    return session?.branches.find((branch) => branch.id === branchId) ?? null;
  });

  readonly previewCandidate = computed(() => {
    const response = this.candidateResponseState();
    if (!response) return null;
    const selectedMove = this.previewMoveUciState();
    return response.candidates.find((candidate) => candidate.moveUci === selectedMove)
      ?? response.candidates[0]
      ?? null;
  });

  readonly displayedFen = computed(() => (
    this.previewCandidate()?.resultingFen
    ?? this.activeBranch()?.fen
    ?? 'startpos'
  ));

  readonly boardSide = computed(() => this.sessionState()?.repertoireSide ?? this.setupState().side);
  readonly boardMovable = computed(() => (
    this.activeBranch()?.role === 'USER_MOVE'
    && !this.candidatesLoadingState()
    && this.sessionState()?.lifecycle === 'ACTIVE'
  ));

  readonly sessionPreview = computed<BuilderSessionPreview | null>(() => {
    const session = this.sessionState();
    return session ? buildBuilderSessionPreview(session, REPERTOIRE_BUILDER_PREVIEW_LIMIT) : null;
  });
  readonly previewRows = computed(() => buildRepertoireBuilderPreviewRows(this.sessionPreview()));
  readonly queue = computed(() => this.sessionPreview()?.queue ?? []);
  readonly deferredBranches = computed(() => (
    this.sessionState()?.branches.filter((branch) => branch.status === 'DEFERRED') ?? []
  ));
  readonly staleBranches = computed(() => (
    this.sessionState()?.branches.filter((branch) => branch.status === 'STALE') ?? []
  ));
  readonly sourceItems = computed(() => buildRepertoireBuilderSourceItems(this.previewCandidate()));
  readonly selectedReasonLabels = computed(() => (
    this.previewCandidate()?.reasonCodes.map(reasonLabel) ?? []
  ));
  readonly selectedWarningLabels = computed(() => (
    this.previewCandidate()?.warningCodes.map(warningLabel) ?? []
  ));
  readonly targetPopulationLabel = computed(() => {
    const target = this.sessionState()?.targetSnapshot.value;
    return target ? formatTargetPopulationLabel(target) : '';
  });
  readonly acceptedDecisionCount = computed(() => (
    this.sessionState()?.branches.reduce((total, branch) => total + branch.decisionHistory.length, 0) ?? 0
  ));
  readonly decisionLimitReached = computed(
    () => this.acceptedDecisionCount() >= REPERTOIRE_BUILDER_DECISION_LIMIT,
  );
  readonly selectedCoveragePercent = computed(() => {
    const selected = new Set(this.selectedResponseUcisState());
    const total = this.candidateResponseState()?.candidates.reduce((sum, candidate) => (
      selected.has(candidate.moveUci) ? sum + (candidate.coverage?.contributionPercent ?? 0) : sum
    ), 0) ?? 0;
    return Math.min(100, Math.round(total * 10) / 10);
  });
  readonly coverageTargetPercent = computed(
    () => this.sessionState()?.targetSnapshot.value.coverage.opponentResponseCoveragePercent ?? 0,
  );
  readonly canFinishSession = computed(() => (
    Boolean(this.sessionState())
    && this.sessionState()?.lifecycle === 'ACTIVE'
    && this.queue().length === 0
  ));
  readonly isCompleted = computed(() => this.sessionState()?.lifecycle === 'COMPLETED');
  readonly isAbandoned = computed(() => this.sessionState()?.lifecycle === 'ABANDONED');

  openSetup(): void {
    this.setupOpenState.set(true);
    this.setupErrorState.set(null);
  }

  closeSetup(): void {
    this.setupOpenState.set(false);
  }

  async start(
    setup: RepertoireBuilderSetup,
    launch: RepertoireBuilderCourseEndingLaunch | null = null,
  ): Promise<void> {
    const normalizedSetup = normalizeSetup(setup);
    const currentRequest = ++this.setupRequestId;
    const startingFen = launch?.startingFen ?? 'startpos';
    this.setupState.set(normalizedSetup);
    this.setupLoadingState.set(true);
    this.setupErrorState.set(null);
    this.commandErrorState.set(null);

    try {
      await this.auth.initialize();
      const appUser = this.auth.appUser()?.user;
      if (!appUser) throw new Error('Your signed-in application user could not be resolved.');

      const now = new Date().toISOString();
      const peerResolution = requiresPeerResolution(normalizedSetup)
        ? await this.loadPeerResolution(normalizedSetup, startingFen)
        : null;
      if (currentRequest !== this.setupRequestId) return;

      const target = buildRepertoireBuilderTarget(
        normalizedSetup,
        peerResolution,
        now,
        undefined,
        builderLaunchStartingPoint(launch),
      );
      const session = createBuilderSession({
        sessionId: createId(),
        ownerId: String(appUser.id),
        targetSnapshot: {
          contractVersion: target.contractVersion,
          targetId: target.targetId,
          capturedAt: now,
          value: target,
        },
        repertoireSide: normalizedSetup.side,
        startingFen,
        createdAt: now,
      });
      this.sessionState.set(session);
      this.activeBranchIdState.set(session.rootBranchId);
      this.setupOpenState.set(false);
      this.resetCandidateSelection();
      await this.loadActiveCandidates(launch?.observedMoveUci);
    } catch (error) {
      if (currentRequest !== this.setupRequestId) return;
      this.setupErrorState.set(readError(error, 'Could not start the repertoire builder.'));
    } finally {
      if (currentRequest === this.setupRequestId) this.setupLoadingState.set(false);
    }
  }

  selectCandidate(moveUci: string): void {
    if (!this.candidateResponseState()?.candidates.some((candidate) => candidate.moveUci === moveUci)) return;
    this.previewMoveUciState.set(moveUci);
    this.commandErrorState.set(null);
  }

  async selectBoardMove(moveUci: string): Promise<void> {
    const normalized = moveUci.toLowerCase();
    const response = this.candidateResponseState();
    if (response?.candidates.some((candidate) => candidate.moveUci === normalized)) {
      this.selectCandidate(normalized);
      return;
    }
    await this.loadActiveCandidates(normalized);
    if (this.candidateResponseState()?.candidates.some((candidate) => candidate.moveUci === normalized)) {
      this.previewMoveUciState.set(normalized);
    }
  }

  toggleResponse(moveUci: string): void {
    if (this.activeBranch()?.role !== 'OPPONENT_RESPONSE') return;
    this.selectedResponseUcisState.update((selected) => (
      selected.includes(moveUci)
        ? selected.filter((candidate) => candidate !== moveUci)
        : [...selected, moveUci]
    ));
    this.previewMoveUciState.set(moveUci);
    this.commandErrorState.set(null);
  }

  async acceptCurrentDecision(): Promise<void> {
    const branch = this.activeBranch();
    const response = this.candidateResponseState();
    if (!branch || !response) return;
    if (this.decisionLimitReached()) {
      this.commandErrorState.set(`This MVP is limited to ${REPERTOIRE_BUILDER_DECISION_LIMIT} accepted decisions.`);
      return;
    }

    const selectedCandidates = branch.role === 'USER_MOVE'
      ? [this.previewCandidate()].filter(isCandidate)
      : response.candidates.filter((candidate) => this.selectedResponseUcisState().includes(candidate.moveUci));
    if (selectedCandidates.length === 0) {
      this.commandErrorState.set(
        branch.role === 'USER_MOVE'
          ? 'Choose one candidate move.'
          : 'Select at least one opponent response to cover.',
      );
      return;
    }

    const changed = this.applySessionMutation((session) => acceptBuilderDecision(session, {
      ...this.mutationContext(session),
      branchId: branch.id,
      evidence: buildRepertoireBuilderEvidenceReference(response),
      selectedMoves: selectedCandidates.map(toDecisionMove),
    }));
    if (changed) await this.advanceToQueuedBranch();
  }

  async deferActiveBranch(): Promise<void> {
    const branch = this.activeBranch();
    if (!branch || branch.status !== 'PENDING') return;
    const changed = this.applySessionMutation((session) => deferBuilderBranch(session, {
      ...this.mutationContext(session),
      branchId: branch.id,
    }));
    if (changed) await this.advanceToQueuedBranch();
  }

  async ignoreActiveBranch(): Promise<void> {
    const branch = this.activeBranch();
    if (!branch) return;
    const changed = this.applySessionMutation((session) => ignoreBuilderBranch(session, {
      ...this.mutationContext(session),
      branchId: branch.id,
    }));
    if (changed) await this.advanceToQueuedBranch();
  }

  async stopActiveBranch(reason: 'USER_STOP' | 'DEPTH_LIMIT' | 'THEORY_LIMIT' = 'USER_STOP'): Promise<void> {
    const branch = this.activeBranch();
    if (!branch) return;
    const changed = this.applySessionMutation((session) => completeBuilderBranch(session, {
      ...this.mutationContext(session),
      branchId: branch.id,
      reason,
    }));
    if (changed) await this.advanceToQueuedBranch();
  }

  async reopenBranch(branchId: string): Promise<void> {
    const changed = this.applySessionMutation((session) => reopenBuilderBranch(session, {
      ...this.mutationContext(session),
      branchId,
    }));
    if (changed) await this.selectQueuedBranch(branchId);
  }

  async restartStaleBranch(branchId: string): Promise<void> {
    const changed = this.applySessionMutation((session) => restartStaleBuilderBranch(session, {
      ...this.mutationContext(session),
      branchId,
    }));
    if (changed) await this.selectQueuedBranch(branchId);
  }

  async selectQueuedBranch(branchId: string): Promise<void> {
    const session = this.sessionState();
    if (!session?.queue.includes(branchId)) return;
    this.activeBranchIdState.set(branchId);
    await this.loadActiveCandidates();
  }

  reorderQueue(branchId: string, targetIndex: number): void {
    this.applySessionMutation((session) => reorderBuilderQueue(session, {
      ...this.mutationContext(session),
      branchId,
      targetIndex,
    }));
  }

  finishSession(): void {
    if (!this.canFinishSession()) return;
    const changed = this.applySessionMutation(
      (session) => completeBuilderSession(session, this.mutationContext(session)),
    );
    if (!changed) return;
    this.activeBranchIdState.set(null);
    this.resetCandidateSelection();
  }

  abandonSession(): void {
    const session = this.sessionState();
    if (!session || session.lifecycle !== 'ACTIVE') return;
    const changed = this.applySessionMutation(
      (current) => abandonBuilderSession(current, this.mutationContext(current)),
    );
    if (!changed) return;
    this.activeBranchIdState.set(null);
    this.resetCandidateSelection();
  }

  startNewDraft(): void {
    this.setupRequestId += 1;
    this.candidateRequestId += 1;
    this.sessionState.set(null);
    this.activeBranchIdState.set(null);
    this.candidateResponseState.set(null);
    this.candidatesLoadingState.set(false);
    this.candidatesErrorState.set(null);
    this.commandErrorState.set(null);
    this.setupState.set(defaultRepertoireBuilderSetup());
    this.setupOpenState.set(true);
    this.setupLoadingState.set(false);
    this.setupErrorState.set(null);
    this.selectedResponseUcisState.set([]);
    this.previewMoveUciState.set(null);
  }

  private async loadPeerResolution(
    setup: RepertoireBuilderSetup,
    fen: string,
  ): Promise<LichessGamesPeerResolution> {
    const response = await firstValueFrom(this.api.getPopulation({
      fen,
      speedPreset: setup.speedPreset,
      ratingTarget: setup.ratingTarget,
      ratingGroup: setup.ratingGroup,
    }));
    const resolution = response.population?.peerResolution;
    if (!resolution) {
      throw new Error('Peer evidence could not be resolved. Choose an explicit rating group or try again.');
    }
    return resolution;
  }

  private async loadActiveCandidates(includeMoveUci?: string): Promise<void> {
    const session = this.sessionState();
    const branch = this.activeBranch();
    if (!session || !branch || session.lifecycle !== 'ACTIVE') return;
    if (branch.status === 'STALE') {
      this.candidateResponseState.set(null);
      this.candidatesErrorState.set('This branch is stale. Restart it before loading new candidates.');
      return;
    }

    const currentRequest = ++this.candidateRequestId;
    this.candidatesLoadingState.set(true);
    this.candidatesErrorState.set(null);
    this.commandErrorState.set(null);
    this.candidateResponseState.set(null);
    this.previewMoveUciState.set(null);
    this.selectedResponseUcisState.set([]);

    try {
      const request = {
        fen: branch.fen,
        decisionRole: branch.role,
        target: session.targetSnapshot.value,
        candidateLimit: REPERTOIRE_BUILDER_CANDIDATE_LIMIT,
        ...(includeMoveUci ? { includeMoveUci } : {}),
      };
      const response = await firstValueFrom(this.api.getCandidates(request));
      if (currentRequest !== this.candidateRequestId || this.activeBranchIdState() !== branch.id) return;
      this.candidateResponseState.set(response);
      this.previewMoveUciState.set(
        includeMoveUci && response.candidates.some((candidate) => candidate.moveUci === includeMoveUci)
          ? includeMoveUci
          : response.candidates[0]?.moveUci ?? null,
      );
    } catch (error) {
      if (currentRequest !== this.candidateRequestId || this.activeBranchIdState() !== branch.id) return;
      this.candidatesErrorState.set(readError(error, 'Could not load candidate evidence.'));
    } finally {
      if (currentRequest === this.candidateRequestId) this.candidatesLoadingState.set(false);
    }
  }

  private async advanceToQueuedBranch(): Promise<void> {
    const nextBranchId = this.sessionState()?.queue[0] ?? null;
    this.activeBranchIdState.set(nextBranchId);
    this.resetCandidateSelection();
    if (nextBranchId) await this.loadActiveCandidates();
  }

  private mutationContext(session: BuilderSession<RepertoireTarget>) {
    return {
      ownerId: session.ownerId,
      expectedRevision: session.revision,
      at: new Date().toISOString(),
    };
  }

  private applySessionMutation(
    mutation: (session: BuilderSession<RepertoireTarget>) => BuilderSession<RepertoireTarget>,
  ): boolean {
    const session = this.sessionState();
    if (!session) return false;
    try {
      this.sessionState.set(mutation(session));
      this.commandErrorState.set(null);
      return true;
    } catch (error) {
      this.commandErrorState.set(readError(error, 'The builder state could not be updated.'));
      return false;
    }
  }

  private resetCandidateSelection(): void {
    this.candidateRequestId += 1;
    this.candidateResponseState.set(null);
    this.candidatesLoadingState.set(false);
    this.candidatesErrorState.set(null);
    this.previewMoveUciState.set(null);
    this.selectedResponseUcisState.set([]);
  }
}

function toDecisionMove(candidate: CandidateDecisionCandidate): BuilderDecisionMoveInput {
  return {
    moveUci: candidate.moveUci,
    moveSan: candidate.moveSan,
    resultingFen: candidate.resultingFen,
    candidateRank: candidate.rank,
    coverageContributionPercent: candidate.coverage?.contributionPercent ?? null,
    reasonCodes: candidate.reasonCodes,
    warningCodes: candidate.warningCodes,
  };
}

function isCandidate(
  candidate: CandidateDecisionCandidate | null,
): candidate is CandidateDecisionCandidate {
  return candidate !== null;
}

function normalizeSetup(setup: RepertoireBuilderSetup): RepertoireBuilderSetup {
  return {
    ...setup,
    ratingGroup: setup.ratingTarget === 'GROUP' ? setup.ratingGroup : null,
    coveragePercent: Math.max(50, Math.min(100, Math.round(setup.coveragePercent))),
  };
}

function createId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `builder-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readError(error: unknown, fallback: string): string {
  const response = error as {
    error?: string | { error?: string; message?: string };
    message?: string;
  };
  if (typeof response?.error === 'string' && response.error) return response.error;
  if (typeof response?.error === 'object') {
    if (response.error.error) return response.error.error;
    if (response.error.message) return response.error.message;
  }
  return error instanceof Error && error.message ? error.message : fallback;
}
