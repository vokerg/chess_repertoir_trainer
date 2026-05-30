import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { endpoints } from '@/api/endpoints';
import { TrainingSessionDto } from '@/api/dto';

export function useTrainingSession(lineId: number) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<TrainingSessionDto | null>(null);
  const line = useQuery({ queryKey: ['line', lineId], queryFn: () => endpoints.lines.get(lineId), enabled: lineId > 0 });
  const start = useMutation({
    mutationFn: () => endpoints.training.start(lineId),
    onSuccess: setSession,
  });
  const playMove = useMutation({
    mutationFn: (moveUci: string) => {
      if (!session) throw new Error('Session has not started');
      return endpoints.training.move(session.id, moveUci);
    },
    onSuccess: (result) => {
      if (result.session) setSession(result.session);
      else if (session) setSession({ ...session, fen: result.fen, expectedMoveUci: result.expectedMoveUci ?? null });
      if (result.completed) {
        void queryClient.invalidateQueries({ queryKey: ['trainingReview', session?.id] });
        void queryClient.invalidateQueries({ queryKey: ['statsSummary'] });
      }
    },
  });
  const review = useQuery({
    queryKey: ['trainingReview', session?.id],
    queryFn: () => endpoints.training.review(session?.id ?? 0),
    enabled: !!session?.id && playMove.data?.completed === true,
  });

  useEffect(() => {
    if (lineId > 0 && !session && !start.isPending && !start.data) start.mutate();
  }, [lineId, session, start]);

  return { line, session, start, playMove, review };
}
