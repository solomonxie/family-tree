import type { Person } from './types';

export function formatYear(year: number, approx?: boolean): string {
  const text = year < 0 ? `${-year} BC` : String(year);
  return approx ? `c. ${text}` : text;
}

// Node label: "1930–2005", "1958–", "c. 1040 BC–970 BC", "" when unknown.
export function lifespan(p: Pick<Person, 'birthYear' | 'deathYear' | 'datesApprox'>): string {
  const { birthYear: b, deathYear: d, datesApprox } = p;
  if (b === undefined && d === undefined) return '';
  const born = b === undefined ? '?' : formatYear(b, datesApprox);
  const died = d === undefined ? '' : formatYear(d);
  return `${born}–${died}`;
}

// Card/detail line: "1958 – living", "1930 – 2005".
export function lifespanLong(
  p: Pick<Person, 'birthYear' | 'deathYear' | 'datesApprox' | 'deceased'>,
  now = new Date().getFullYear(),
): string {
  const { birthYear: b, deathYear: d, datesApprox } = p;
  if (b === undefined && d === undefined) return '';
  const born = b === undefined ? '?' : formatYear(b, datesApprox);
  if (d !== undefined) return `${born} – ${formatYear(d)}`;
  if (p.deceased) return `${born} – ?`;
  if (b !== undefined && now - b < 110) return `${born} – living`;
  return born;
}

export function isLiving(p: Pick<Person, 'birthYear' | 'deathYear' | 'deceased'>, now = new Date().getFullYear()) {
  return !p.deceased && p.deathYear === undefined && p.birthYear !== undefined && now - p.birthYear < 110;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "1950-03-14" → "14 Mar 1950", "1950-03" → "Mar 1950"; falls back to the year.
export function formatEventDate(iso: string | undefined, year: number | undefined, approx?: boolean): string | undefined {
  const m = iso?.match(/^(-?\d{1,4})-(\d{2})(?:-(\d{2}))?$/);
  if (m && (year === undefined || Number(m[1]) === year)) {
    const text = [m[3] ? String(Number(m[3])) : '', MONTHS[Number(m[2]) - 1], formatYear(Number(m[1]))]
      .filter(Boolean)
      .join(' ');
    return approx ? `c. ${text}` : text;
  }
  return year === undefined ? undefined : formatYear(year, approx);
}

// "Leeds, Yorkshire, England" → "England".
export function regionOf(place: string | undefined): string | undefined {
  const parts = place?.split(',').map(s => s.trim()).filter(Boolean) ?? [];
  return parts[parts.length - 1];
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] ?? '';
  const second = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : parts[0][1] ?? '';
  return (first + second).toUpperCase();
}

// Accepts "1958", "-1040", "1040 BC", "c. 1040 BC", "c1040". Empty → undefined.
export function parseYear(input: string): { year?: number; approx: boolean; error?: string } {
  let s = input.trim();
  if (!s) return { approx: false };
  let approx = false;
  const approxMatch = s.match(/^(c\.?|ca\.?|~)\s*/i);
  if (approxMatch) {
    approx = true;
    s = s.slice(approxMatch[0].length);
  }
  let bc = false;
  const bcMatch = s.match(/\s*(bc|bce)$/i);
  if (bcMatch) {
    bc = true;
    s = s.slice(0, s.length - bcMatch[0].length);
  }
  if (!/^-?\d{1,4}$/.test(s)) return { approx, error: 'Enter a year, e.g. 1958 or 1040 BC.' };
  let year = parseInt(s, 10);
  if (bc) year = -Math.abs(year);
  return { year, approx };
}

export function yearInputValue(year: number | undefined, approx?: boolean): string {
  return year === undefined ? '' : formatYear(year, approx);
}
