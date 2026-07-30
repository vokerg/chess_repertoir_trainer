import { Injectable, inject, signal } from '@angular/core';
import type {
  AiBuilderCompletionSummaryIdentity,
  AiBuilderCompletionSummaryRequest,
  AiBuilderCompletionSummaryResponse,
} from '@chess-trainer/contracts/ai';
import { firstValueFrom } from 'rxjs';
import { AiCapabilitiesService } from '../../../core/ai/ai-capabilities.service';
import { RepertoireBuilderAiApiService } from '../data-access/repertoire-builder-ai-api.service';

@Injectable()
export class RepertoireBuilderCompletionSummaryStore {
  private readonly capabilities = inject(AiCapabilitiesService);
  private readonly api = inject(RepertoireBuilderAiApiService);
  private requestId = 0;

  private readonly availableState = signal(false);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly responseState = signal<AiBuilderCompletionSummaryResponse | null>(null);
  private readonly currentIdentityKeyState = signal<string | null>(null);

  readonly available = this.availableState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly response = this.responseState.asReadonly();

  async initialize(): Promise<void> {
    const capabilities = await firstValueFrom(this.capabilities.getCapabilities());
    this.availableState.set(capabilities.widgets.builderCompletionSummary);
    if (!capabilities.widgets.builderCompletionSummary) this.clear();
  }

  sync(request: AiBuilderCompletionSummaryRequest | null): void {
    const key = request ? identityKey(toIdentity(request)) : null;
    if (key !== this.currentIdentityKeyState()) {
      this.currentIdentityKeyState.set(key);
      this.clearResult();
    }
  }

  async request(request: AiBuilderCompletionSummaryRequest | null): Promise<void> {
    if (!request || !this.availableState()) return;
    const key = identityKey(toIdentity(request));
    const currentRequest = ++this.requestId;
    this.currentIdentityKeyState.set(key);
    this.loadingState.set(true);
    this.errorState.set(null);
    this.responseState.set(null);

    try {
      const generated = await firstValueFrom(this.api.generateCompletionSummary(request));
      if (currentRequest !== this.requestId || this.currentIdentityKeyState() !== key) return;
      this.responseState.set(generated);
    } catch (error) {
      if (currentRequest !== this.requestId || this.currentIdentityKeyState() !== key) return;
      this.errorState.set(readError(error, 'Could not generate the course completion summary.'));
    } finally {
      if (currentRequest === this.requestId && this.currentIdentityKeyState() === key) {
        this.loadingState.set(false);
      }
    }
  }

  clear(): void {
    this.availableState.set(false);
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

function toIdentity(request: AiBuilderCompletionSummaryRequest): AiBuilderCompletionSummaryIdentity {
  return {
    sessionId: request.draft.sessionId,
    sessionRevision: request.draft.sessionRevision,
    targetId: request.draft.targetId,
    courseId: request.applyResult.courseId,
    chapterId: request.applyResult.chapterId,
    lineId: request.applyResult.lineId,
    courseContentRevision: request.applyResult.courseContentRevision,
  };
}

function identityKey(identity: AiBuilderCompletionSummaryIdentity): string {
  return [
    identity.sessionId,
    identity.sessionRevision,
    identity.targetId,
    identity.courseId,
    identity.chapterId,
    identity.lineId,
    identity.courseContentRevision,
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