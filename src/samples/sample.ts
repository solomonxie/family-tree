import type { Person, Relationship, Sex } from '@/domain/types';
import adamToJesus from './adam-to-jesus.json';
import houseOfWindsor from './house-of-windsor.json';

export interface SampleTree {
  id: string;
  title: string;
  source: string;
  persons: {
    id: string;
    name: string;
    sex?: string;
    birthYear?: number;
    deathYear?: number;
    datesApprox?: boolean;
    originRegion?: string;
    notes?: string;
  }[];
  relationships: { type: string; from: string; to: string }[];
}

export const SAMPLES = [adamToJesus, houseOfWindsor] as SampleTree[];

// Person ids are prefixed with the tree id so samples and their duplicates never collide.
export function fromSample(s: SampleTree, treeId: string): { persons: Person[]; relationships: Relationship[] } {
  const pid = (id: string) => `${treeId}:${id}`;
  const persons: Person[] = s.persons.map(p => ({
    id: pid(p.id),
    treeId,
    name: p.name,
    sex: p.sex === 'm' || p.sex === 'f' ? (p.sex as Sex) : undefined,
    birthYear: p.birthYear,
    deathYear: p.deathYear,
    datesApprox: p.datesApprox,
    originRegion: p.originRegion,
    notes: p.notes,
  }));
  const relationships: Relationship[] = s.relationships.map((r, i) => ({
    id: `${treeId}:r${i}`,
    treeId,
    type: r.type === 'spouse' ? 'spouse' : 'parent',
    fromPersonId: pid(r.from),
    toPersonId: pid(r.to),
  }));
  return { persons, relationships };
}
