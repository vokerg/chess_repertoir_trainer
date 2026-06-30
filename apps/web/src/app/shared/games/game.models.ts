export type Provider = 'LICHESS' | 'CHESS_COM';
export type UserColor = 'WHITE' | 'BLACK';
export type ResultForUser = 'WIN' | 'DRAW' | 'LOSS';
export type AnalysisStatus = 'NOT_ANALYZED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
export type PlyIndexStatus = 'NOT_INDEXED' | 'INDEXED' | 'FAILED';

export interface FacetValue {
  value?: string | number | boolean | null;
  label?: string | null;
  count?: number | null;
  id?: number | string | null;
  name?: string | null;
  provider?: Provider | null;
  username?: string | null;
}

export interface ImportedGameFacetsResponse {
  accounts?: FacetValue[];
  providers?: FacetValue[];
  speeds?: FacetValue[];
  variants?: FacetValue[];
  results?: FacetValue[];
  colors?: FacetValue[];
  openings?: FacetValue[];
  analysisStatuses?: FacetValue[];
  tags?: FacetValue[];
}
