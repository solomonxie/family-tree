export type RelationshipType = 'parent' | 'spouse';

export interface Relationship {
  id: string;
  type: RelationshipType;
  fromPersonId: string;
  toPersonId: string;
}
