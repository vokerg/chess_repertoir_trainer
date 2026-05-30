import { OpeningWdlDto } from '@/api/dto';

export function wdlLabel(wdl: Pick<OpeningWdlDto, 'wins' | 'draws' | 'losses'>): string {
  return `${wdl.wins} ${wdl.draws} ${wdl.losses}`;
}

export function scoreLabel(wdl: Pick<OpeningWdlDto, 'scorePct'>): string {
  return typeof wdl.scorePct === 'number' ? `${wdl.scorePct}%` : '-';
}
