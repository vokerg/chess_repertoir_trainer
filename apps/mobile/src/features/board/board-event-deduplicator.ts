export type BoardEventDeduplicator = {
  accept: (eventId: string) => boolean;
  reset: () => void;
};

export function createBoardEventDeduplicator(maxRemembered = 256): BoardEventDeduplicator {
  if (!Number.isInteger(maxRemembered) || maxRemembered < 1) {
    throw new Error('maxRemembered must be a positive integer.');
  }

  const seen = new Set<string>();
  const order: string[] = [];

  return {
    accept(eventId: string): boolean {
      if (!eventId || seen.has(eventId)) return false;
      seen.add(eventId);
      order.push(eventId);
      if (order.length > maxRemembered) {
        const expired = order.shift();
        if (expired) seen.delete(expired);
      }
      return true;
    },
    reset(): void {
      seen.clear();
      order.length = 0;
    },
  };
}
