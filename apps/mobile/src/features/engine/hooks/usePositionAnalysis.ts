import { useQuery } from '@tanstack/react-query';
import { endpoints } from '@/api/endpoints';

export function usePositionAnalysis(fen: string, options?: { enabled?: boolean; depth?: number; multipv?: number }) {
  const depth = options?.depth ?? 12;
  const multipv = options?.multipv ?? 3;
  return useQuery({
    queryKey: ['positionAnalysis', fen, depth, multipv],
    enabled: options?.enabled !== false && !!fen,
    queryFn: async () => endpoints.engine.position(fen, depth, multipv),
  });
}

export function scoreFromWhiteToSideToMove(value: number | undefined, fen: string): number | undefined {
  if (value === undefined) return undefined;
  return fen.split(/\s+/)[1] === 'b' ? -value : value;
}
