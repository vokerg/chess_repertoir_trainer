export interface GameTagDisplayItem {
  code: number;
  name: string;
}

export type GameTagTone = 'positive' | 'negative' | 'neutral';
export type GameTagBucketKey =
  | 'opening'
  | 'gameEnd'
  | 'conversion'
  | 'tactics'
  | 'phase'
  | 'positionState'
  | 'time'
  | 'quality';

export interface GameTagBucketDefinition {
  key: GameTagBucketKey;
  label: string;
  codes: readonly number[];
}

const POSITIVE_TAG_CODES = new Set<number>([
  1,
  3,
  5,
  81,
  103,
  111,
  112,
  115,
  117,
  118,
  121,
  123,
  127,
  129,
  130,
  131,
  133,
  134,
  141,
  143,
  145,
  172,
  173,
  174,
]);

const NEGATIVE_TAG_CODES = new Set<number>([
  2,
  4,
  6,
  11,
  82,
  100,
  102,
  104,
  105,
  106,
  107,
  108,
  109,
  110,
  113,
  114,
  116,
  119,
  120,
  122,
  126,
  128,
  135,
  140,
  144,
  146,
  162,
  170,
  171,
]);

export const GAME_TAG_BUCKETS: readonly GameTagBucketDefinition[] = [
  {
    key: 'opening',
    label: 'Opening',
    codes: [103, 174, 126, 102, 143, 144, 80],
  },
  {
    key: 'gameEnd',
    label: 'Game end',
    codes: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  },
  {
    key: 'conversion',
    label: 'Conversion',
    codes: [118, 119, 108, 110, 128, 111, 112],
  },
  {
    key: 'tactics',
    label: 'Tactics',
    codes: [135, 104, 105, 121, 134, 133, 107, 109],
  },
  {
    key: 'phase',
    label: 'Phase',
    codes: [114, 115, 116, 117, 120, 145, 146],
  },
  {
    key: 'positionState',
    label: 'Position state',
    codes: [170, 171, 172, 173, 127, 129, 130, 131],
  },
  {
    key: 'time',
    label: 'Time',
    codes: [1, 2, 140, 141, 142, 160, 161, 162],
  },
  {
    key: 'quality',
    label: 'Quality',
    codes: [122, 123, 124, 81, 82, 83, 84],
  },
] as const;

const BUCKETS_BY_CODE = new Map<number, GameTagBucketDefinition>(
  GAME_TAG_BUCKETS.flatMap((bucket) => bucket.codes.map((code) => [code, bucket] as const)),
);

export function gameTagTone(tag: GameTagDisplayItem): GameTagTone {
  if (POSITIVE_TAG_CODES.has(tag.code)) return 'positive';
  if (NEGATIVE_TAG_CODES.has(tag.code)) return 'negative';
  return 'neutral';
}

export function gameTagLabel(tag: GameTagDisplayItem): string {
  return tag.name
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function gameTagBucket(tag: GameTagDisplayItem): GameTagBucketDefinition | null {
  return BUCKETS_BY_CODE.get(tag.code) ?? null;
}

export function gameTagBucketLabel(key: string): string {
  return GAME_TAG_BUCKETS.find((bucket) => bucket.key === key)?.label ?? gameTagLabel({ code: 0, name: key });
}

export function gameTagBucketOrder(key: string): number {
  const index = GAME_TAG_BUCKETS.findIndex((bucket) => bucket.key === key);
  return index >= 0 ? index : GAME_TAG_BUCKETS.length;
}
