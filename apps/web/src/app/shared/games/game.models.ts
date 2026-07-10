import type {
  ImportedGameAnalysisStatus,
  ImportedGameFacetsResponse as ImportedGameFacetsDto,
  ImportedGamePlyIndexStatus,
  ImportedGameProvider,
  ImportedGameResultForUser,
  ImportedGameUserColor,
} from '@chess-trainer/contracts/imported-games';

export type Provider = ImportedGameProvider;
export type UserColor = ImportedGameUserColor;
export type ResultForUser = ImportedGameResultForUser;
export type AnalysisStatus = ImportedGameAnalysisStatus;
export type PlyIndexStatus = ImportedGamePlyIndexStatus;

export interface FacetValue {
  value?: string | number | boolean | null;
  label?: string | null;
  count?: number | null;
  id?: number | string | null;
  name?: string | null;
  provider?: Provider | null;
  username?: string | null;
}

export type ImportedGameFacetsResponse = Partial<ImportedGameFacetsDto>;
