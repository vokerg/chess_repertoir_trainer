const compactCountFormatter = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const exactCountFormatter = new Intl.NumberFormat('en');

export function compactGameCount(count: number): string {
  return compactCountFormatter.format(count);
}

export function exactGameCount(count: number): string {
  return exactCountFormatter.format(count);
}
