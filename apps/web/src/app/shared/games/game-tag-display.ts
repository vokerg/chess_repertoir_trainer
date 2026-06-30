export interface GameTagDisplayItem {
  code: number;
  name: string;
}

export type GameTagTone = 'positive' | 'negative' | 'neutral';

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
