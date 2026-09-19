import { describe, expect, it } from 'vitest';
import { createBoardEventDeduplicator } from './board-event-deduplicator';

describe('board event deduplicator', () => {
  it('accepts an event once and rejects its duplicate', () => {
    const deduplicator = createBoardEventDeduplicator();
    expect(deduplicator.accept('board-1:1')).toBe(true);
    expect(deduplicator.accept('board-1:1')).toBe(false);
  });

  it('forgets the oldest event after the configured bound', () => {
    const deduplicator = createBoardEventDeduplicator(2);
    expect(deduplicator.accept('a')).toBe(true);
    expect(deduplicator.accept('b')).toBe(true);
    expect(deduplicator.accept('c')).toBe(true);
    expect(deduplicator.accept('a')).toBe(true);
  });

  it('can be reset between mounted board instances', () => {
    const deduplicator = createBoardEventDeduplicator();
    expect(deduplicator.accept('same')).toBe(true);
    deduplicator.reset();
    expect(deduplicator.accept('same')).toBe(true);
  });
});
