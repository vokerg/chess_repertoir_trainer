import { ParamMap } from '@angular/router';
import { MarathonMode, MarathonScopeType } from '../data-access/lines.models';

const marathonModes = new Set<MarathonMode>([
  'ALL',
  'WEAK_SUBLINES',
  'UNTRAINED_SUBLINES',
  'MIXED_WEAK_UNTRAINED',
]);

export interface MarathonInitializeOptions {
  scope?: { type: MarathonScopeType; id: number };
  lineIds?: number[];
  sublineHashes?: string[];
  mode?: MarathonMode;
}

export function parseMarathonOptions(params: ParamMap, query: ParamMap): MarathonInitializeOptions {
  const courseId = Number(params.get('courseId'));
  const chapterId = Number(params.get('chapterId'));
  const modeParam = query.get('mode') as MarathonMode | null;
  const options: MarathonInitializeOptions = {
    lineIds: parseNumberList(query.get('lineIds')),
    sublineHashes: parseStringList(query.get('sublineHashes')),
    mode: modeParam && marathonModes.has(modeParam) ? modeParam : 'ALL',
  };

  if (courseId > 0) options.scope = { type: 'COURSE', id: courseId };
  if (chapterId > 0) options.scope = { type: 'CHAPTER', id: chapterId };
  return options;
}

function parseNumberList(value: string | null): number[] {
  return (value ?? '')
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item > 0);
}

function parseStringList(value: string | null): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
