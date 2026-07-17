import { AnalysisStatus, PlyIndexStatus, Provider, ResultForUser, UserColor } from '../game.models';
import { gameFilterPeriodRange } from './game-filter-period';

export { formatLocalDateForInput } from './game-filter-period';

export interface GameFilters {
  accountId: string;
  provider: '' | Provider | 'ALL';
  resultForUser: '' | ResultForUser;
  userColor: '' | UserColor;
  speedCategory: string;
  rated: '' | 'true' | 'false';
  timeControl: string;
  opponent: string;
  openingNameExact: string;
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

export function defaultGameFilterFromDate(now = new Date()): string {
  return gameFilterPeriodRange('3M', now).from;
}

export function defaultGameFilters(now = new Date()): GameFilters {
  const defaultPeriod = gameFilterPeriodRange('3M', now);
  return {
    accountId: '',
    provider: 'ALL',
    resultForUser: '',
    userColor: '',
    speedCategory: 'blitz,rapid',
    rated: '',
    timeControl: '',
    opponent: '',
    openingNameExact: '',
    openingName: '',
    analysisStatus: '',
    plyIndexStatus: '',
    tagFilter: '',
    tagCodes: [],
    minAccuracy: '',
    maxAccuracy: '',
    minOpponentRating: '',
    maxOpponentRating: '',
    from: defaultPeriod.from,
    to: defaultPeriod.to,
  };
}
