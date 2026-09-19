import { describe, expect, it } from 'vitest';
import { deriveDownloadState } from './course-content.types';

describe('deriveDownloadState', () => {
  it('marks newer server content as an update', () => {
    expect(deriveDownloadState({
      serverContentRevision: 4,
      activeContentRevision: 3,
      availableOnServer: true,
      downloadStatus: 'AVAILABLE',
    })).toBe('UPDATE_AVAILABLE');
  });

  it('keeps unavailable downloaded content browseable as unavailable', () => {
    expect(deriveDownloadState({
      serverContentRevision: null,
      activeContentRevision: 3,
      availableOnServer: false,
      downloadStatus: 'AVAILABLE',
    })).toBe('UNAVAILABLE');
  });

  it('surfaces a failed update separately from the active revision', () => {
    expect(deriveDownloadState({
      serverContentRevision: 4,
      activeContentRevision: 3,
      availableOnServer: true,
      downloadStatus: 'ERROR',
    })).toBe('ERROR');
  });
});
