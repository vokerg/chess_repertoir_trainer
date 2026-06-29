import type { StorePositionAnalysisInput, StoredEngineLine } from './analysis.types';

export const UCI_MOVE_RE = /^[a-h][1-8][a-h][1-8][qrbn]?$/i;

function smallIntOrUndefined(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(-32768, Math.min(32767, Math.trunc(value)))
    : undefined;
}

function depthOrUndefined(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(255, Math.trunc(value)))
    : undefined;
}

function multipvOrUndefined(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(1, Math.min(3, Math.trunc(value)))
    : undefined;
}

export function firstUciMove(value?: string | null): string | null {
  const token = value?.trim().split(/\s+/)[0]?.toLowerCase();
  return token && UCI_MOVE_RE.test(token) ? token : null;
}

export function lineMoveUci(line?: StoredEngineLine | null): string | null {
  return firstUciMove(line?.moveUci) ?? firstUciMove(line?.pvUci?.[0]);
}

export function normalizeStoredEngineLines(lines?: StoredEngineLine[] | null): StoredEngineLine[] {
  if (!Array.isArray(lines)) return [];

  return lines.slice(0, 3).flatMap((line, index) => {
    const pvUci = (Array.isArray(line?.pvUci) ? line.pvUci : [])
      .map((move) => firstUciMove(move))
      .filter((move): move is string => move !== null);
    const moveUci = firstUciMove(line?.moveUci) ?? pvUci[0] ?? null;
    if (!moveUci) return [];

    return [{
      multipv: multipvOrUndefined(line.multipv) ?? index + 1,
      depth: depthOrUndefined(line.depth),
      moveUci,
      scoreCpWhite: smallIntOrUndefined(line.scoreCpWhite),
      mateWhite: smallIntOrUndefined(line.mateWhite),
      pvUci: pvUci.length ? pvUci : [moveUci],
    }];
  });
}

export function bestScoreCpWhiteFrom(input: StorePositionAnalysisInput, lines: StoredEngineLine[]): number | null {
  return input.bestScoreCpWhite ?? lines[0]?.scoreCpWhite ?? null;
}

export function bestMateWhiteFrom(input: StorePositionAnalysisInput, lines: StoredEngineLine[]): number | null {
  return input.bestMateWhite ?? lines[0]?.mateWhite ?? null;
}

export function bestMoveUciFrom(input: StorePositionAnalysisInput, lines: StoredEngineLine[]): string | null {
  return firstUciMove(input.bestMoveUci) ?? lineMoveUci(lines[0]) ?? null;
}
