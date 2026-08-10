import type { OpeningExplorerOpening } from '@chess-trainer/contracts/opening-explorer';

export function percentage(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 1_000) / 10;
}

export function sameOpening(
  left: OpeningExplorerOpening | null,
  right: OpeningExplorerOpening | null,
): boolean {
  if (!left || !right) return left === right;
  return left.eco === right.eco && left.name === right.name;
}
