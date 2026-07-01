import { AnalysisStatus, PlyIndexStatus, Provider, ResultForUser, UserColor } from '../game.models';

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
  tagFilter: '' | 'NO_TAGS';
  tagCodes: number[];
  minAccuracy: string;
  maxAccuracy: string;
  minOpponentRating: string;
  maxOpponentRating: string;
  from: string;
  to: string;
}

export function formatLocalDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function defaultGameFilterFromDate(now = new Date()): string {
  return formatLocalDateForInput(new Date(now.getFullYear(), now.getMonth() - 3, 1));
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
    tagFilter: '',
    tagCodes: [],
    minAccuracy: '',
    maxAccuracy: '',
    minOpponentRating: '',
    maxOpponentRating: '',
    from: defaultGameFilterFromDate(),
    to: '',
  };
}
