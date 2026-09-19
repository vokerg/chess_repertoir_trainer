export type DownloadState =
  | 'NOT_DOWNLOADED'
  | 'DOWNLOADING'
  | 'AVAILABLE'
  | 'UPDATE_AVAILABLE'
  | 'ERROR'
  | 'UNAVAILABLE';

export type LocalCourseSummary = {
  courseId: number;
  name: string;
  description: string | null;
  serverContentRevision: number | null;
  activeContentRevision: number | null;
  contentChangedAt: string | null;
  estimatedBundleBytes: number | null;
  state: DownloadState;
  lastError: string | null;
};

export type LocalCourseHierarchy = {
  courseId: number;
  name: string;
  description: string | null;
  contentRevision: number;
  chapters: Array<{
    id: number;
    name: string;
    description: string | null;
    sortOrder: number;
    lines: Array<{
      id: number;
      name: string;
      sideToTrain: 'WHITE' | 'BLACK';
      startingFen: string;
      notes: string | null;
      tags: string[];
      attemptCount: number;
      pendingAttemptCount: number;
      hasInProgressSession: boolean;
      latestResult: 'PASSED' | 'FAILED' | null;
    }>;
  }>;
};

export function deriveDownloadState(input: {
  serverContentRevision: number | null;
  activeContentRevision: number | null;
  availableOnServer: boolean;
  downloadStatus: 'DOWNLOADING' | 'AVAILABLE' | 'ERROR' | null;
}): DownloadState {
  if (input.downloadStatus === 'DOWNLOADING') return 'DOWNLOADING';
  if (input.downloadStatus === 'ERROR') return 'ERROR';
  if (input.activeContentRevision === null) {
    return input.availableOnServer ? 'NOT_DOWNLOADED' : 'UNAVAILABLE';
  }
  if (!input.availableOnServer) return 'UNAVAILABLE';
  if (
    input.serverContentRevision !== null
    && input.serverContentRevision > input.activeContentRevision
  ) return 'UPDATE_AVAILABLE';
  return 'AVAILABLE';
}
