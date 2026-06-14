import { AnalysisStatus, PlyIndexStatus, Provider, ResultForUser, UserColor } from '../../features/games/data-access/games.models';

export interface GameFilters {
  accountId: string;
  provider: '' | Provider | 'ALL';
  resultForUser: '' | ResultForUser;
  userColor: '' | UserColor;
  speedCategory: string;
  rated: '' | 'true' | 'false';
  timeControl: string;
  opponent: string;
  openingName: string;
  analysisStatus: '' | AnalysisStatus;
  plyIndexStatus: '' | PlyIndexStatus;
  minAccuracy: string;
  maxAccuracy: string;
  minOpponentRating: string;
  maxOpponentRating: string;
  from: string;
  to: string;
}

export function defaultGameFilters(): GameFilters {
  return {
    accountId: '',
    provider: 'ALL',
    resultForUser: '',
    userColor: '',
    speedCategory: 'blitz,rapid',
    rated: '',
    timeControl: '',
    opponent: '',
    openingName: '',
    analysisStatus: '',
    plyIndexStatus: '',
    minAccuracy: '',
    maxAccuracy: '',
    minOpponentRating: '',
    maxOpponentRating: '',
    from: '',
    to: '',
  };
}
