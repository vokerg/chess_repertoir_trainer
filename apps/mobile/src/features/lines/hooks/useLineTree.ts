import { useQuery } from '@tanstack/react-query';
import { endpoints } from '@/api/endpoints';

export function useLineTree(lineId: number) {
  const line = useQuery({ queryKey: ['line', lineId], queryFn: () => endpoints.lines.get(lineId), enabled: lineId > 0 });
  const tree = useQuery({ queryKey: ['lineTree', lineId], queryFn: () => endpoints.lines.tree(lineId), enabled: lineId > 0 });
  return { line, tree };
}
