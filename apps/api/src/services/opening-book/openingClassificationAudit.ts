export type UnknownOpeningFamilyBacklogItem = {
  family: string;
  entries: number;
  entriesPct: number;
  uniqueNames: number;
  examples: readonly string[];
};

function pct(value: number, total: number): number {
  return total ? Math.round((value / total) * 1000) / 10 : 0;
}

export function openingRootFamily(name: string): string {
  const colonIndex = name.indexOf(':');
  const beforeVariation = colonIndex >= 0 ? name.slice(0, colonIndex) : name;
  const commaIndex = beforeVariation.indexOf(',');
  const beforeQualifier = commaIndex >= 0 ? beforeVariation.slice(0, commaIndex) : beforeVariation;
  return beforeQualifier.trim() || name.trim();
}

export function buildUnknownOpeningFamilyBacklog(
  unknownEntryNames: readonly string[],
  totalEntries: number,
  exampleLimit = 10,
): readonly UnknownOpeningFamilyBacklogItem[] {
  const groups = new Map<string, { entries: number; names: Set<string> }>();

  for (const name of unknownEntryNames) {
    const family = openingRootFamily(name);
    const group = groups.get(family) ?? { entries: 0, names: new Set<string>() };
    group.entries += 1;
    group.names.add(name);
    groups.set(family, group);
  }

  return Array.from(groups.entries())
    .map(([family, group]) => ({
      family,
      entries: group.entries,
      entriesPct: pct(group.entries, totalEntries),
      uniqueNames: group.names.size,
      examples: Array.from(group.names).sort().slice(0, exampleLimit),
    }))
    .sort((a, b) => b.entries - a.entries
      || b.uniqueNames - a.uniqueNames
      || a.family.localeCompare(b.family));
}
