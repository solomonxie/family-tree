import type { Sex } from '@/domain/types';
import { ImportError, type ImportedEvent, type ImportedFamily, type ImportedPerson, type ImportedTree } from './imported';

// GEDCOM 5.5.1 / 7.0 (lineage-linked). Only what the app can show is read.
export interface GedNode {
  tag: string;
  xref?: string;
  value: string;
  children: GedNode[];
}

const LINE = /^\s*(\d+)\s+(?:(@[^@]+@)\s+)?(\S+)(?:\s(.*))?$/;

export function parseLines(text: string): GedNode[] {
  const roots: GedNode[] = [];
  const stack: GedNode[] = [];
  for (const raw of text.replace(/^﻿/, '').split(/\r\n|\r|\n/)) {
    const m = raw.match(LINE);
    if (!m) continue;
    const level = Number(m[1]);
    const node: GedNode = { tag: m[3].toUpperCase(), xref: m[2], value: (m[4] ?? '').replace(/@@/g, '@'), children: [] };
    stack.length = Math.min(stack.length, level);
    if (level === 0 || !stack.length) roots.push(node);
    else stack[stack.length - 1].children.push(node);
    stack.push(node);
  }
  return roots;
}

const child = (n: GedNode | undefined, tag: string) => n?.children.find(c => c.tag === tag);
const all = (n: GedNode, tag: string) => n.children.filter(c => c.tag === tag);

// Value with CONT (new line) and CONC (same line) continuations.
export function textOf(n: GedNode): string {
  let s = n.value;
  for (const c of n.children) {
    if (c.tag === 'CONT') s += `\n${c.value}`;
    else if (c.tag === 'CONC') s += c.value;
  }
  return s;
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const APPROX = /^(ABT|ABOUT|CAL|EST|BEF|AFT|BET|FROM|TO|INT|C\.?|CA\.?|CIRCA)$/;

export function parseDate(value: string): Omit<ImportedEvent, 'place'> | undefined {
  const words = value
    .replace(/@#D[^@]*@/g, ' ')
    .replace(/\(.*?\)/g, ' ')
    .replace(/B\.\s*C\./gi, 'BC')
    .trim()
    .toUpperCase()
    .split(/\s+/)
    .filter(Boolean);
  let approx = false;
  const tokens: string[] = [];
  for (const w of words) {
    if (APPROX.test(w)) {
      if (tokens.length) break; // second half of "BET x AND y" / "FROM x TO y"
      approx = true;
      continue;
    }
    if (w === 'AND') break;
    tokens.push(w);
  }
  let yearAt = -1;
  tokens.forEach((t, i) => {
    if (/^\d{1,4}(\/\d{1,4})?$/.test(t)) yearAt = i;
  });
  if (yearAt < 0 || MONTHS.includes(tokens[yearAt + 1] ?? '')) return undefined;
  let year = parseInt(tokens[yearAt], 10);
  if (/^(BC|BCE)$/.test(tokens[yearAt + 1] ?? '')) year = -year;
  const monthAt = yearAt - 1;
  const month = monthAt >= 0 ? MONTHS.indexOf(tokens[monthAt]) + 1 : 0;
  const day = month && monthAt >= 1 && /^\d{1,2}$/.test(tokens[monthAt - 1]) ? Number(tokens[monthAt - 1]) : 0;
  return {
    year,
    month: month || undefined,
    day: day >= 1 && day <= 31 ? day : undefined,
    approx: approx || undefined,
  };
}

export function personName(n: GedNode): string {
  const name = child(n, 'NAME');
  if (!name) return '';
  const m = name.value.match(/^([^/]*)(?:\/([^/]*)\/?(.*))?$/);
  const given = m?.[1].trim() || child(name, 'GIVN')?.value.trim();
  const surname = m?.[2]?.trim() || child(name, 'SURN')?.value.trim();
  return [given, surname, m?.[3]?.trim()].filter(Boolean).join(' ');
}

const IMAGE = /\.(jpe?g|png|heic|heif|gif|webp|bmp|tiff?)$/i;

export function parseGedcom(text: string, title = 'Imported tree'): ImportedTree {
  const roots = parseLines(text);
  if (!roots.some(r => r.tag === 'INDI') && !roots.some(r => r.tag === 'HEAD')) {
    throw new ImportError('Not a GEDCOM file.');
  }
  const byXref = new Map(roots.filter(r => r.xref).map(r => [r.xref!, r]));
  const deref = (n: GedNode) => (n.value.startsWith('@') ? byXref.get(n.value.trim()) : undefined);

  // `seen`: the event is recorded even without a usable date or place ("1 DEAT Y").
  const event = (indi: GedNode, tags: string[]): { seen: boolean; e?: ImportedEvent } => {
    const node = tags.map(t => child(indi, t)).find(Boolean);
    if (!node) return { seen: false };
    const date = child(node, 'DATE');
    const place = child(node, 'PLAC');
    const e: ImportedEvent = { ...(date ? parseDate(date.value) : {}), place: place ? textOf(place).trim() || undefined : undefined };
    return { seen: true, e: e.year !== undefined || e.place ? e : undefined };
  };

  const notesOf = (indi: GedNode): string | undefined => {
    const parts: string[] = [];
    for (const occ of all(indi, 'OCCU')) if (occ.value.trim()) parts.push(`Occupation: ${textOf(occ).trim()}`);
    for (const n of all(indi, 'NOTE')) {
      const target = deref(n);
      const t = (target ? textOf(target) : textOf(n)).trim();
      if (t) parts.push(t);
    }
    return parts.length ? parts.join('\n\n') : undefined;
  };

  const photoOf = (indi: GedNode): string | undefined => {
    const files: { path: string; primary: boolean }[] = [];
    for (const o of all(indi, 'OBJE')) {
      const obj = deref(o) ?? o;
      const primary = child(o, '_PRIM')?.value === 'Y' || child(obj, '_PRIM')?.value === 'Y';
      for (const f of all(obj, 'FILE')) if (IMAGE.test(f.value.trim())) files.push({ path: f.value.trim(), primary });
    }
    return (files.find(f => f.primary) ?? files[0])?.path;
  };

  const persons: ImportedPerson[] = roots
    .filter(r => r.tag === 'INDI' && r.xref)
    .map(indi => {
      const sex = child(indi, 'SEX')?.value.trim().toUpperCase();
      const death = event(indi, ['DEAT', 'BURI', 'CREM']);
      return {
        key: indi.xref!,
        name: personName(indi) || 'Unnamed',
        sex: (sex === 'M' ? 'm' : sex === 'F' ? 'f' : undefined) as Sex | undefined,
        birth: event(indi, ['BIRT', 'CHR', 'BAPM']).e,
        death: death.e,
        deceased: death.seen || undefined,
        notes: notesOf(indi),
        photo: photoOf(indi),
      };
    });

  const families = new Map<string, ImportedFamily>();
  for (const fam of roots.filter(r => r.tag === 'FAM' && r.xref)) {
    families.set(fam.xref!, {
      partners: [...all(fam, 'HUSB'), ...all(fam, 'WIFE')].map(n => n.value.trim()),
      children: all(fam, 'CHIL').map(n => n.value.trim()),
    });
  }
  // Some writers only link from the person side.
  for (const indi of roots.filter(r => r.tag === 'INDI' && r.xref)) {
    for (const n of all(indi, 'FAMS')) {
      const f = families.get(n.value.trim());
      if (f && !f.partners.includes(indi.xref!)) f.partners.push(indi.xref!);
    }
    for (const n of all(indi, 'FAMC')) {
      const f = families.get(n.value.trim());
      if (f && !f.children.includes(indi.xref!)) f.children.push(indi.xref!);
    }
  }

  return { title, persons, families: [...families.values()] };
}
