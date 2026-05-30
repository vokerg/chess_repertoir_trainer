import {
  ChapterDto,
  CourseDto,
  CourseStatsDto,
  ImportedGameAnalysisDto,
  ImportedGameDetailDto,
  ImportedGameFacetsResponseDto,
  ImportedGamePlyIndexResultDto,
  ImportedGameSearchResponseDto,
  LineDto,
  MoveNodeDto,
  MoveTreeDto,
  OpeningAnalysisResponseDto,
  PositionAnalysisResponseDto,
  StatsSummaryDto,
  TrainingMoveResultDto,
  TrainingReviewDto,
  TrainingSessionDto,
} from './dto';
import { apiDelete, apiGet, apiPatch, apiPost } from './apiClient';
import { mapGameFiltersToQueryString } from '@/features/games/utils/gameFilters';
import { OpeningAnalysisFilters, openingAnalysisQueryString } from '@/features/openingAnalysis/utils';

export const endpoints = {
  courses: {
    list: () => apiGet<CourseDto[]>('/courses'),
    create: (body: Pick<CourseDto, 'name' | 'description'>) => apiPost<CourseDto>('/courses', body),
    get: (id: number) => apiGet<CourseDto>(`/courses/${id}`),
    update: (id: number, body: Partial<Pick<CourseDto, 'name' | 'description'>>) => apiPatch<CourseDto>(`/courses/${id}`, body),
    delete: (id: number) => apiDelete(`/courses/${id}`),
    stats: (id: number) => apiGet<CourseStatsDto>(`/courses/${id}/stats`),
    chapters: (id: number) => apiGet<ChapterDto[]>(`/courses/${id}/chapters`),
    createChapter: (id: number, body: Pick<ChapterDto, 'name' | 'description'>) =>
      apiPost<ChapterDto>(`/courses/${id}/chapters`, body),
  },
  chapters: {
    update: (id: number, body: Partial<Pick<ChapterDto, 'name' | 'description'>>) =>
      apiPatch<ChapterDto>(`/chapters/${id}`, body),
    delete: (id: number) => apiDelete(`/chapters/${id}`),
    lines: (id: number) => apiGet<LineDto[]>(`/chapters/${id}/lines`),
    createLine: (id: number, body: Pick<LineDto, 'name' | 'sideToTrain' | 'startingFen'>) =>
      apiPost<LineDto>(`/chapters/${id}/lines`, body),
  },
  lines: {
    get: (id: number) => apiGet<LineDto>(`/lines/${id}`),
    tree: (id: number) => apiGet<MoveTreeDto>(`/lines/${id}/tree`),
    update: (id: number, body: Partial<Pick<LineDto, 'name' | 'sideToTrain' | 'startingFen'>>) =>
      apiPatch<LineDto>(`/lines/${id}`, body),
    delete: (id: number) => apiDelete(`/lines/${id}`),
    exportPgn: (id: number) => apiGet<{ pgn?: string } | string>(`/lines/${id}/export-pgn`),
    createNode: (lineId: number, body: { parentId: number | null; moveUci: string }) =>
      apiPost<MoveNodeDto>(`/lines/${lineId}/nodes`, body),
    updateNode: (id: number, body: Partial<Pick<MoveNodeDto, 'branchLabel' | 'comment' | 'annotation'>>) =>
      apiPatch<MoveNodeDto>(`/nodes/${id}`, body),
    deleteSubtree: (id: number) => apiDelete(`/nodes/${id}/subtree`),
    stats: (id: number) => apiGet<CourseStatsDto>(`/lines/${id}/stats`),
  },
  training: {
    start: (lineId: number) => apiPost<TrainingSessionDto>(`/lines/${lineId}/training/start`),
    move: (sessionId: number, moveUci: string) => apiPost<TrainingMoveResultDto>(`/training/${sessionId}/move`, { moveUci }),
    complete: (sessionId: number) => apiPost<TrainingSessionDto>(`/training/${sessionId}/complete`),
    abandon: (sessionId: number) => apiPost<TrainingSessionDto>(`/training/${sessionId}/abandon`),
    review: (sessionId: number) => apiGet<TrainingReviewDto>(`/training/${sessionId}/review`),
  },
  stats: {
    summary: () => apiGet<StatsSummaryDto>('/stats/summary'),
  },
  games: {
    facets: () => apiGet<ImportedGameFacetsResponseDto>('/imported-games/facets'),
    search: (filters: Record<string, unknown>) => apiGet<ImportedGameSearchResponseDto>(`/imported-games${mapGameFiltersToQueryString(filters)}`),
    get: (id: number) => apiGet<ImportedGameDetailDto>(`/imported-games/${id}`),
    pgn: (id: number) => apiGet<{ pgn?: string } | string>(`/imported-games/${id}/pgn`),
    analysis: (id: number) => apiGet<ImportedGameAnalysisDto>(`/imported-games/${id}/analysis`),
    analyze: (id: number, force = false) => apiPost(`/imported-games/${id}/analysis-runs`, { force }),
    indexPly: (id: number, force = false) => apiPost<ImportedGamePlyIndexResultDto>(`/imported-games/${id}/ply-index`, { force }),
  },
  opening: {
    analysis: (filters: OpeningAnalysisFilters) => apiGet<OpeningAnalysisResponseDto>(`/opening-analysis${openingAnalysisQueryString(filters)}`),
  },
  engine: {
    position: (fen: string, depth = 12, multipv = 3) =>
      apiPost<PositionAnalysisResponseDto>('/position-analysis', { fen, depth, multipv }),
  },
};
