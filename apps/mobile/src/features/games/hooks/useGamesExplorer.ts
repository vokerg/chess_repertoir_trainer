import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { endpoints } from '@/api/endpoints';
import { GameFilters } from '../utils/gameFilters';

export function useGamesExplorer(filters: GameFilters) {
  const queryClient = useQueryClient();
  const games = useInfiniteQuery({
    queryKey: ['importedGames', filters],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => endpoints.games.search({ limit: 50, sort: 'endedAtDesc', ...filters, cursor: pageParam }),
    getNextPageParam: (lastPage) => (lastPage.pageInfo.hasMore ? lastPage.pageInfo.nextCursor ?? undefined : undefined),
  });
  const analyze = useMutation({
    mutationFn: ({ id, force }: { id: number; force?: boolean }) => endpoints.games.analyze(id, force),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['importedGames'] }),
  });
  const indexPly = useMutation({
    mutationFn: ({ id, force }: { id: number; force?: boolean }) => endpoints.games.indexPly(id, force),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['importedGames'] }),
  });
  return { games, analyze, indexPly };
}
