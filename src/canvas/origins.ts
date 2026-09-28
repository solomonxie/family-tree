import { OriginPalette } from '@/constants/theme';
import type { Person } from '@/domain/types';

export const UNKNOWN = 'Unknown';
export const OTHER = 'Other';

export interface LegendItem {
  origin: string;
  color: string;
  count: number;
}

// Most common origins get a hue each; the rest share "Other".
export function originColors(persons: Person[], scheme: 'light' | 'dark') {
  const counts = new Map<string, number>();
  for (const p of persons) {
    const o = p.originRegion?.trim() || UNKNOWN;
    counts.set(o, (counts.get(o) ?? 0) + 1);
  }
  const palette = OriginPalette[scheme];
  const ranked = [...counts.entries()].filter(([o]) => o !== UNKNOWN).sort((a, b) => b[1] - a[1]);
  const named = ranked.length > palette.length ? ranked.slice(0, palette.length - 1) : ranked;
  const colorOf = new Map<string, string>();
  const legend: LegendItem[] = named.map(([origin, count], i) => {
    colorOf.set(origin, palette[i]);
    return { origin, color: palette[i], count };
  });
  const rest = ranked.slice(named.length);
  if (rest.length) {
    for (const [o] of rest) colorOf.set(o, OriginPalette.other[scheme]);
    legend.push({ origin: OTHER, color: OriginPalette.other[scheme], count: rest.reduce((n, [, c]) => n + c, 0) });
  }
  if (counts.has(UNKNOWN)) {
    colorOf.set(UNKNOWN, OriginPalette.unknown[scheme]);
    legend.push({ origin: UNKNOWN, color: OriginPalette.unknown[scheme], count: counts.get(UNKNOWN)! });
  }
  const groupOf = (p: Person) => {
    const o = p.originRegion?.trim() || UNKNOWN;
    return named.some(([n]) => n === o) || o === UNKNOWN ? o : OTHER;
  };
  return { colorOf: (p: Person) => colorOf.get(p.originRegion?.trim() || UNKNOWN)!, groupOf, legend };
}
