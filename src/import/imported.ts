import type { TreeData } from '@/backup/snapshot';
import { regionOf } from '@/domain/format';
import { newId } from '@/domain/ids';
import type { Person, Relationship, Sex } from '@/domain/types';

// Format-neutral shape every importer (GEDCOM, demo data) produces.
export interface ImportedEvent {
  year?: number;
  month?: number;
  day?: number;
  approx?: boolean;
  place?: string;
}

export interface ImportedPerson {
  key: string;
  name: string;
  sex?: Sex;
  birth?: ImportedEvent;
  death?: ImportedEvent;
  deceased?: boolean;
  origin?: string;
  notes?: string;
  // Path inside the source file/folder; resolved to an app photo by the caller.
  photo?: string;
}

export interface ImportedFamily {
  partners: string[];
  children: string[];
}

export interface ImportedTree {
  title: string;
  persons: ImportedPerson[];
  families: ImportedFamily[];
}

export class ImportError extends Error {}

const pad = (n: number) => String(n).padStart(2, '0');

export function isoDate(e: ImportedEvent | undefined): string | undefined {
  if (e?.year === undefined || !e.month) return undefined;
  return `${e.year}-${pad(e.month)}${e.day ? `-${pad(e.day)}` : ''}`;
}

export function toPerson(p: ImportedPerson, treeId: string, id: string, photoPath?: string): Person {
  const birthPlace = p.birth?.place?.trim() || undefined;
  return {
    id,
    treeId,
    name: p.name.trim() || 'Unnamed',
    sex: p.sex,
    birthYear: p.birth?.year,
    deathYear: p.death?.year,
    datesApprox: p.birth?.approx || p.death?.approx || undefined,
    birthDate: isoDate(p.birth),
    deathDate: isoDate(p.death),
    birthPlace,
    deathPlace: p.death?.place?.trim() || undefined,
    deceased: (p.deceased || !!p.death) && p.death?.year === undefined ? true : undefined,
    originRegion: p.origin?.trim() || regionOf(birthPlace),
    notes: p.notes?.trim() || undefined,
    photoPath,
  };
}

// Families → parent/spouse links the app's rules accept: ≤2 parents, no duplicates, no cycles.
export function toRelationships(families: ImportedFamily[], idOf: Map<string, string>, treeId: string): Relationship[] {
  const rels: Relationship[] = [];
  const parentsOf = new Map<string, string[]>();
  const childrenOf = new Map<string, string[]>();
  const spouseKeys = new Set<string>();
  for (const f of families) {
    const partners = [...new Set(f.partners.map(k => idOf.get(k)).filter((x): x is string => !!x))];
    for (let i = 0; i < partners.length; i++) {
      for (let j = i + 1; j < partners.length; j++) {
        const key = [partners[i], partners[j]].sort().join('|');
        if (spouseKeys.has(key)) continue;
        spouseKeys.add(key);
        rels.push({ id: newId(), treeId, type: 'spouse', fromPersonId: partners[i], toPersonId: partners[j] });
      }
    }
    for (const childKey of f.children) {
      const child = idOf.get(childKey);
      if (!child) continue;
      for (const parent of partners) {
        const ps = parentsOf.get(child) ?? [];
        if (parent === child || ps.includes(parent) || ps.length >= 2) continue;
        ps.push(parent);
        parentsOf.set(child, ps);
        childrenOf.set(parent, [...(childrenOf.get(parent) ?? []), child]);
      }
    }
  }
  const cut = backEdges(childrenOf);
  for (const [child, ps] of parentsOf) {
    for (const parent of ps) {
      if (cut.has(`${parent}>${child}`)) continue;
      rels.push({ id: newId(), treeId, type: 'parent', fromPersonId: parent, toPersonId: child });
    }
  }
  return rels;
}

function backEdges(childrenOf: Map<string, string[]>): Set<string> {
  const state = new Map<string, 1 | 2>();
  const cut = new Set<string>();
  for (const start of childrenOf.keys()) {
    if (state.has(start)) continue;
    const stack: [string, number][] = [[start, 0]];
    state.set(start, 1);
    while (stack.length) {
      const top = stack[stack.length - 1];
      const kids = childrenOf.get(top[0]) ?? [];
      if (top[1] >= kids.length) {
        state.set(top[0], 2);
        stack.pop();
        continue;
      }
      const next = kids[top[1]++];
      const s = state.get(next);
      if (s === 1) cut.add(`${top[0]}>${next}`);
      else if (s === undefined) {
        state.set(next, 1);
        stack.push([next, 0]);
      }
    }
  }
  return cut;
}

export function toTreeData(
  t: ImportedTree,
  photoFor: (p: ImportedPerson) => string | undefined = () => undefined,
  now = Date.now(),
  ids: { tree?: string; person?: (key: string) => string } = {},
): TreeData {
  const treeId = ids.tree ?? newId();
  const idOf = new Map(t.persons.map(p => [p.key, ids.person?.(p.key) ?? newId()]));
  return {
    tree: { id: treeId, title: t.title.trim() || 'Imported tree', kind: 'user', createdAt: now, updatedAt: now },
    persons: t.persons.map(p => toPerson(p, treeId, idOf.get(p.key)!, photoFor(p))),
    relationships: toRelationships(t.families, idOf, treeId),
  };
}
