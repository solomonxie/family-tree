import { Person } from '@/types/Person';
import { Relationship } from '@/types/Relationship';

// Small placeholder family used to render the static Tree Canvas screen.
export const mockPersons: Person[] = [
  { id: 'g1', name: 'Robert Sr.', birthYear: 1930, deathYear: 2005, originRegion: 'Yorkshire, England' },
  { id: 'g2', name: 'Margaret', birthYear: 1932, deathYear: 2010, originRegion: 'Dublin, Ireland' },
  { id: 'p1', name: 'Robert Jr.', birthYear: 1958, originRegion: 'Yorkshire, England' },
  { id: 'p2', name: 'Elena', birthYear: 1961, originRegion: 'Naples, Italy' },
  { id: 'c1', name: 'Sofia', birthYear: 1988, originRegion: 'London, England' },
  { id: 'c2', name: 'Marco', birthYear: 1991, originRegion: 'London, England' },
];

export const mockRelationships: Relationship[] = [
  { id: 'r1', type: 'spouse', fromPersonId: 'g1', toPersonId: 'g2' },
  { id: 'r2', type: 'parent', fromPersonId: 'g1', toPersonId: 'p1' },
  { id: 'r3', type: 'parent', fromPersonId: 'g2', toPersonId: 'p1' },
  { id: 'r4', type: 'spouse', fromPersonId: 'p1', toPersonId: 'p2' },
  { id: 'r5', type: 'parent', fromPersonId: 'p1', toPersonId: 'c1' },
  { id: 'r6', type: 'parent', fromPersonId: 'p2', toPersonId: 'c1' },
  { id: 'r7', type: 'parent', fromPersonId: 'p1', toPersonId: 'c2' },
  { id: 'r8', type: 'parent', fromPersonId: 'p2', toPersonId: 'c2' },
];

// TODO: replace hardcoded coordinates with a real tree-layout algorithm.
export const mockNodePositions: Record<string, { x: number; y: number }> = {
  g1: { x: 70, y: 40 },
  g2: { x: 190, y: 40 },
  p1: { x: 130, y: 150 },
  p2: { x: 250, y: 150 },
  c1: { x: 90, y: 260 },
  c2: { x: 210, y: 260 },
};
