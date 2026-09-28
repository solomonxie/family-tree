export type Sex = 'm' | 'f';
export type TreeKind = 'user' | 'bundled';
export type RelationshipType = 'parent' | 'spouse';

export interface Tree {
  id: string;
  title: string;
  kind: TreeKind;
  source?: string;
  createdAt: number;
  updatedAt: number;
}

export interface TreeSummary extends Tree {
  personCount: number;
  generations: number;
}

export interface Person {
  id: string;
  treeId: string;
  name: string;
  sex?: Sex;
  birthYear?: number;
  deathYear?: number;
  datesApprox?: boolean;
  originRegion?: string;
  notes?: string;
  photoPath?: string;
}

// parent: from = parent, to = child. spouse: unordered, stored once.
export interface Relationship {
  id: string;
  treeId: string;
  type: RelationshipType;
  fromPersonId: string;
  toPersonId: string;
}

export type PersonDraft = Omit<Person, 'id' | 'treeId'>;
