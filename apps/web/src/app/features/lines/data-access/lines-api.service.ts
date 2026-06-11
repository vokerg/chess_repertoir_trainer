import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import {
  ChapterDetail,
  CreateLineNodePayload,
  CreateLinePayload,
  ImportLinePgnPayload,
  LineDetail,
  LineSummary,
  LineTrainingSession,
  LineTree,
  LineTreeNodeData,
  TrainingMoveResult,
  TrainingReview,
  TrainingSessionResult,
  UpdateLineNodePayload,
  MarathonNextResponse,
  MarathonScopeType,
} from './lines.models';

@Injectable({ providedIn: 'root' })
export class LinesApiService {
  private readonly api = inject(ApiService);

  getChapter(chapterId: number): Observable<ChapterDetail> {
    return this.api.get<ChapterDetail>(`/chapters/${chapterId}`);
  }

  updateChapter(chapterId: number, body: { name: string }): Observable<ChapterDetail> {
    return this.api.patch<ChapterDetail>(`/chapters/${chapterId}`, body);
  }

  getChapterLines(chapterId: number): Observable<LineSummary[]> {
    return this.api.get<LineSummary[]>(`/chapters/${chapterId}/lines`);
  }

  createLine(chapterId: number, body: CreateLinePayload): Observable<LineSummary> {
    return this.api.post<LineSummary>(`/chapters/${chapterId}/lines`, body);
  }

  importLinePgn(chapterId: number, body: ImportLinePgnPayload): Observable<LineSummary> {
    return this.api.post<LineSummary>(`/chapters/${chapterId}/lines/import-pgn`, body);
  }

  getLine(lineId: number): Observable<LineDetail> {
    return this.api.get<LineDetail>(`/lines/${lineId}`);
  }

  updateLine(lineId: number, body: { name: string }): Observable<LineSummary> {
    return this.api.patch<LineSummary>(`/lines/${lineId}`, body);
  }

  deleteLine(lineId: number): Observable<void> {
    return this.api.delete<void>(`/lines/${lineId}`);
  }

  exportLinePgn(lineId: number): Observable<{ pgn: string }> {
    return this.api.get<{ pgn: string }>(`/lines/${lineId}/export-pgn`);
  }

  getLineTree(lineId: number): Observable<LineTree> {
    return this.api.get<LineTree>(`/lines/${lineId}/tree`);
  }

  createLineNode(lineId: number, body: CreateLineNodePayload): Observable<LineTreeNodeData> {
    return this.api.post<LineTreeNodeData>(`/lines/${lineId}/nodes`, body);
  }

  updateLineNode(nodeId: number, body: UpdateLineNodePayload): Observable<LineTreeNodeData> {
    return this.api.patch<LineTreeNodeData>(`/nodes/${nodeId}`, body);
  }

  deleteLineNodeSubtree(nodeId: number): Observable<void> {
    return this.api.delete<void>(`/nodes/${nodeId}/subtree`);
  }

  startLineTraining(lineId: number): Observable<LineTrainingSession> {
    return this.api.post<LineTrainingSession>(`/lines/${lineId}/training/start`, {});
  }

  playTrainingMove(sessionId: number, moveUci: string): Observable<TrainingMoveResult> {
    return this.api.post<TrainingMoveResult>(`/training/${sessionId}/move`, { moveUci });
  }

  completeTraining(sessionId: number): Observable<TrainingSessionResult> {
    return this.api.post<TrainingSessionResult>(`/training/${sessionId}/complete`, {});
  }

  getTrainingReview(sessionId: number): Observable<TrainingReview> {
    return this.api.get<TrainingReview>(`/training/${sessionId}/review`);
  }

  startNextMarathonLine(
    scope: { type: MarathonScopeType; id: number },
    recentLineIds: number[],
  ): Observable<MarathonNextResponse> {
    return this.api.post<MarathonNextResponse>('/training-marathons/next', { scope, recentLineIds });
  }
}

export function readLinesError(error: unknown, fallback: string): string {
  if (typeof error !== 'object' || error === null) return fallback;
  const candidate = error as { error?: { message?: string; error?: string }; message?: string };
  return candidate.error?.message || candidate.error?.error || candidate.message || fallback;
}
