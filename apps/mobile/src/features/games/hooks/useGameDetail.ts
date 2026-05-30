import { useQuery } from '@tanstack/react-query';
import { endpoints } from '@/api/endpoints';

export function useGameDetail(gameId: number) {
  const game = useQuery({ queryKey: ['importedGame', gameId], queryFn: () => endpoints.games.get(gameId), enabled: gameId > 0 });
  const pgn = useQuery({ queryKey: ['importedGamePgn', gameId], queryFn: () => endpoints.games.pgn(gameId), enabled: gameId > 0 });
  const analysis = useQuery({ queryKey: ['importedGameAnalysis', gameId], queryFn: () => endpoints.games.analysis(gameId), enabled: gameId > 0 });
  return { game, pgn, analysis };
}
