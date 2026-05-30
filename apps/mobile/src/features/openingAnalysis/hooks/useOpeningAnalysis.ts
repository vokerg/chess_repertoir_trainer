import { useQuery } from '@tanstack/react-query';
import { endpoints } from '@/api/endpoints';
import { OpeningAnalysisFilters } from '../utils';

export function useOpeningAnalysis(filters: OpeningAnalysisFilters) {
  return useQuery({
    queryKey: ['openingAnalysis', filters],
    queryFn: () => endpoints.opening.analysis(filters),
    enabled: !!filters.fen,
  });
}
