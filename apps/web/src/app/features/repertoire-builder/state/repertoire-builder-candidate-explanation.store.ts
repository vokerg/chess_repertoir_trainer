import { Injectable, inject, signal } from '@angular/core';
import type {
  AiBuilderCandidateExplanationIdentity,
  AiBuilderCandidateExplanationRequest,
  AiBuilderCandidateExplanationResponse,
} from '@chess-trainer/contracts/ai';
import type {
  CandidateDecisionRequest,
  CandidateDecisionResponse,
} from '@chess-trainer/contracts/candidate-decision';
import { firstValueFrom } from 'rxjs';
import { AiCapabilitiesService } from '../../../core/ai/ai-capabilities.service';
import { RepertoireBuilderAiApiService } from '../data-access/repertoire-builder-ai-api.service';

@Injectable()
export class RepertoireBuilderCandidateExplanationStore {
  private readonly capabilities = inject(AiCapabilitiesService);
  private readonly api = inject(RepertoireBuilderAiApiService);
  private requestId = 0;

  private readonly availableState = signal(false);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly responseState = signal<AiBuilderCandidateExplanationResponse | null>(null);
  private readonly comparisonMoveUciState = signal<string | null>(null);
  private readonly currentIdentityKeyState = signal<string | null>(null);

  readonly available = this.availableState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly response = this.responseState.asReadonly();
  readonly comparisonMoveUci = this.comparisonMoveUciState.asReadonly();

  async initialize(): Promise<void> {
    const capabilities = await firstValueFrom(this.capabilities.getCapabilities());
    this.availableState.set(capabilities.widgets.builderCandidateExplanation);
    if (!capabilities.widgets.builderCandidateExplanation) this.clear();
  }

  sync(response: CandidateDecisionResponse | null, selectedMoveUci: string | null): void {
    const comparison = this.comparisonMoveUciState();
    if (!response || !selectedMoveUci) {
      this.currentIdentityKeyState.set(null);
      this.comparisonMoveUciState.set(null);
      this.clearResult();
      return;
    }

    const comparisonIsValid = comparison !== null
      && comparison !== selectedMoveUci
      && response.candidates.some((candidate) => candidate.moveUci === comparison);
    if (!comparisonIsValid && comparison !== null) this.comparisonMoveUciState.set(null);

    const key = identityKey(toIdentity(
      response,
      selectedMoveUci,
      comparisonIsValid ? comparison : null,
    ));
    if (key !== this.currentIdentityKeyState()) {
      this.currentIdentityKeyState.set(key);
      this.clearResult();
    }
  }

  setComparison(
    moveUci: string | null,
    response: CandidateDecisionResponse | null,
    selectedMoveUci: string | null,
  ): void {
    const normalized = moveUci && moveUci !== selectedMoveUci
      && response?.candidates.some((candidate) => candidate.moveUci === moveUci)
      ? moveUci
      : null;
    this.comparisonMoveUciState.set(normalized);
    this.sync(response, selectedMoveUci);
  }

  async request(
    decisionRequest: CandidateDecisionRequest,
    response: CandidateDecisionResponse,
    selectedMoveUci: string,
  ): Promise<void> {
    if (!this.availableState()) return;

    const comparisonMoveUci = this.comparisonMoveUciState();
    const identity = toIdentity(response, selectedMoveUci, comparisonMoveUci);
    const key = identityKey(identity);
    const request: AiBuilderCandidateExplanationRequest = {
      decisionRequest,
      identity,
    };
    const currentRequest = ++this.requestId;
    this.currentIdentityKeyState.set(key);
    this.loadingState.set(true);
    this.errorState.set(null);
    this.responseState.set(null);

    try {
      const generated = await firstValueFrom(this.api.generateCandidateExplanation(request));
      if (currentRequest !== this.requestId || this.currentIdentityKeyState() !== key) return;
      this.responseState.set(generated);
    } catch (error) {
      if (currentRequest !== this.requestId || this.currentIdentityKeyState() !== key) return;
      this.errorState.set(readError(error, 'Could not generate the candidate explanation.'));
    } finally {
      if (currentRequest === this.requestId && this.currentIdentityKeyState() === key) {
        this.loadingState.set(false);
      }
    }
  }

  clear(): void {
    this.availableState.set(false);
    this.comparisonMoveUciState.set(null);
    this.currentIdentityKeyState.set(null);
    this.clearResult();
  }

  private clearResult(): void {
    this.requestId += 1;
    this.loadingState.set(false);
    this.errorState.set(null);
    this.responseState.set(null);
  }
}

function toIdentity(
  response: CandidateDecisionResponse,
  selectedMoveUci: string,
  comparisonMoveUci: string | null,
): AiBuilderCandidateExplanationIdentity {
  return {
    targetId: response.targetId,
    normalizedFen: response.normalizedFen,
    decisionRole: response.decisionRole,
    rankingPolicyVersion: response.rankingPolicyVersion,
    responseGeneratedAt: response.generatedAt,
    selectedMoveUci,
    comparisonMoveUci,
  };
}

function identityKey(identity: AiBuilderCandidateExplanationIdentity): string {
  return [
    identity.targetId,
    identity.normalizedFen,
    identity.decisionRole,
    identity.rankingPolicyVersion,
    identity.responseGeneratedAt,
    identity.selectedMoveUci,
    identity.comparisonMoveUci ?? '',
  ].join('|');
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
