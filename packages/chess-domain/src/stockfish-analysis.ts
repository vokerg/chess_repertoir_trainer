export interface StoredEngineLine {
  multipv?: number;
  depth?: number;
  moveUci?: string;
  scoreCpWhite?: number;
  mateWhite?: number;
  pvUci: string[];
}

export type PositionAnalysisPersistenceMode = 'compact' | 'rich';

export interface StorePositionAnalysisInput {
  fen: string;
  bestMoveUci?: string | null;
  bestScoreCpWhite?: number | null;
  bestMateWhite?: number | null;
  lines?: StoredEngineLine[] | null;
  persistenceMode?: PositionAnalysisPersistenceMode;
}

export interface ParsedUciInfoLine {
  multipv: number;
  depth?: number;
  scoreCp?: number;
  mate?: number;
  moveUci?: string;
  pvUci: string[];
}

export const UCI_MOVE_RE = /^[a-h][1-8][a-h][1-8][qrbn]?$/i;

function boundedInt(value: unknown, min: number, max: number): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(min, Math.min(max, Math.trunc(value)))
    : undefined;
}

function numberAfter(tokens: string[], marker: string): number | null {
  const index = tokens.indexOf(marker);
  if (index < 0) return null;
  const parsed = Number.parseInt(tokens[index + 1] ?? '', 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function firstUciMove(value?: string | null): string | null {
  const token = value?.trim().split(/\s+/)[0]?.toLowerCase();
  return token && UCI_MOVE_RE.test(token) ? token : null;
}

export function lineMoveUci(line?: StoredEngineLine | null): string | null {
  return firstUciMove(line?.moveUci) ?? firstUciMove(line?.pvUci?.[0]);
}

export function stockfishActiveColorFromFen(fen: string): 'w' | 'b' {
  return fen.trim().split(/\s+/)[1] === 'b' ? 'b' : 'w';
}

export function scoreFromSideToMoveToWhite(value: number | undefined, fenOrActiveColor: string | 'w' | 'b'): number | undefined {
  if (value === undefined) return undefined;
  const activeColor = fenOrActiveColor === 'w' || fenOrActiveColor === 'b'
    ? fenOrActiveColor
    : stockfishActiveColorFromFen(fenOrActiveColor);
  return activeColor === 'b' ? -value : value;
}

export function scoreFromWhiteToSideToMove(value: number | undefined, fenOrActiveColor: string | 'w' | 'b'): number | undefined {
  return scoreFromSideToMoveToWhite(value, fenOrActiveColor);
}

export function effectiveScoreCpWhite(scoreCpWhite?: number | null, mateWhite?: number | null): number | null {
  if (typeof scoreCpWhite === 'number' && Number.isFinite(scoreCpWhite)) return scoreCpWhite;
  if (typeof mateWhite !== 'number' || !Number.isFinite(mateWhite)) return null;
  return mateWhite >= 0 ? 1000 : -1000;
}

export function parseUciInfoLine(line: string, options: { pvMoveLimit?: number } = {}): ParsedUciInfoLine | null {
  const tokens = line.trim().split(/\s+/);
  if (tokens[0] !== 'info') return null;

  const pvIndex = tokens.indexOf('pv');
  const scoreIndex = tokens.indexOf('score');
  if (scoreIndex < 0 || pvIndex < 0 || pvIndex >= tokens.length - 1) return null;

  const scoreKind = tokens[scoreIndex + 1];
  const scoreValue = Number.parseInt(tokens[scoreIndex + 2] ?? '', 10);
  if (!Number.isFinite(scoreValue)) return null;

  const rawPvUci = tokens.slice(pvIndex + 1)
    .map((move) => firstUciMove(move))
    .filter((move): move is string => move !== null);
  const pvUci = options.pvMoveLimit ? rawPvUci.slice(0, options.pvMoveLimit) : rawPvUci;
  if (!pvUci.length) return null;

  const parsed: ParsedUciInfoLine = {
    multipv: boundedInt(numberAfter(tokens, 'multipv') ?? 1, 1, 255) ?? 1,
    depth: boundedInt(numberAfter(tokens, 'depth'), 0, 255),
    moveUci: pvUci[0],
    pvUci,
  };

  if (scoreKind === 'cp') parsed.scoreCp = scoreValue;
  if (scoreKind === 'mate') parsed.mate = scoreValue;
  return parsed.scoreCp === undefined && parsed.mate === undefined ? null : parsed;
}

export function storedEngineLineFromUciInfo(
  info: ParsedUciInfoLine,
  fenOrActiveColor: string | 'w' | 'b',
): StoredEngineLine {
  const scoreCpWhite = boundedInt(scoreFromSideToMoveToWhite(info.scoreCp, fenOrActiveColor), -32768, 32767);
  const mateWhite = boundedInt(scoreFromSideToMoveToWhite(info.mate, fenOrActiveColor), -32768, 32767);
  return {
    multipv: boundedInt(info.multipv, 1, 3),
    depth: boundedInt(info.depth, 0, 255),
    moveUci: firstUciMove(info.moveUci) ?? info.pvUci[0],
    ...(scoreCpWhite === undefined ? {} : { scoreCpWhite }),
    ...(mateWhite === undefined ? {} : { mateWhite }),
    pvUci: info.pvUci,
  };
}

export function normalizeStoredEngineLines(lines?: readonly unknown[] | null): StoredEngineLine[] {
  if (!Array.isArray(lines)) return [];

  return lines.slice(0, 3).flatMap((line, index) => {
    if (!line || typeof line !== 'object') return [];
    const persisted = line as Record<string, unknown>;
    const pvUci = (Array.isArray(persisted['pvUci']) ? persisted['pvUci'] : [])
      .map((move) => firstUciMove(move))
      .filter((move): move is string => move !== null);
    const moveUci = firstUciMove(typeof persisted['moveUci'] === 'string' ? persisted['moveUci'] : null) ?? pvUci[0] ?? null;
    if (!moveUci) return [];

    const scoreCpWhite = boundedInt(persisted['scoreCpWhite'], -32768, 32767);
    const mateWhite = boundedInt(persisted['mateWhite'], -32768, 32767);
    return [{
      multipv: boundedInt(persisted['multipv'], 1, 3) ?? index + 1,
      depth: boundedInt(persisted['depth'], 0, 255),
      moveUci,
      ...(scoreCpWhite === undefined ? {} : { scoreCpWhite }),
      ...(mateWhite === undefined ? {} : { mateWhite }),
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

export function shapePositionAnalysisForStorage(
  input: StorePositionAnalysisInput,
  persistenceMode: PositionAnalysisPersistenceMode = input.persistenceMode ?? 'rich',
): StorePositionAnalysisInput {
  const lines = normalizeStoredEngineLines(input.lines);
  const shaped: StorePositionAnalysisInput = {
    fen: input.fen,
    bestMoveUci: bestMoveUciFrom(input, lines),
    bestScoreCpWhite: bestScoreCpWhiteFrom(input, lines),
    bestMateWhite: bestMateWhiteFrom(input, lines),
    persistenceMode,
  };
  if (persistenceMode === 'rich') shaped.lines = lines;
  return shaped;
}
