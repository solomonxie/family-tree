import type { Person, Relationship } from './types';

export function parentsOf(personId: string, rels: Relationship[]): string[] {
  return rels.filter(r => r.type === 'parent' && r.toPersonId === personId).map(r => r.fromPersonId);
}

export function childrenOf(personId: string, rels: Relationship[]): string[] {
  return rels.filter(r => r.type === 'parent' && r.fromPersonId === personId).map(r => r.toPersonId);
}

export function spousesOf(personId: string, rels: Relationship[]): string[] {
  return rels
    .filter(r => r.type === 'spouse' && (r.fromPersonId === personId || r.toPersonId === personId))
    .map(r => (r.fromPersonId === personId ? r.toPersonId : r.fromPersonId));
}

export function isDescendant(ancestorId: string, personId: string, rels: Relationship[]): boolean {
  const stack = [ancestorId];
  const seen = new Set<string>();
  while (stack.length) {
    const id = stack.pop()!;
    if (id === personId) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    stack.push(...childrenOf(id, rels));
  }
  return false;
}

export type RelationRule = { ok: true } | { ok: false; reason: string };

export function canAddParentTo(child: Person, rels: Relationship[]): RelationRule {
  return parentsOf(child.id, rels).length >= 2
    ? { ok: false, reason: `${child.name} already has two parents.` }
    : { ok: true };
}

export function checkNewRelationship(
  type: Relationship['type'],
  from: Person,
  to: Person,
  rels: Relationship[],
): RelationRule {
  if (from.id === to.id) return { ok: false, reason: 'Someone can’t be related to themselves.' };
  if (type === 'spouse') {
    const exists = spousesOf(from.id, rels).includes(to.id);
    return exists ? { ok: false, reason: `${from.name} and ${to.name} are already partners.` } : { ok: true };
  }
  if (parentsOf(to.id, rels).includes(from.id)) {
    return { ok: false, reason: `${from.name} is already a parent of ${to.name}.` };
  }
  const limit = canAddParentTo(to, rels);
  if (!limit.ok) return limit;
  if (isDescendant(to.id, from.id, rels)) {
    return { ok: false, reason: `That would make ${from.name} their own ancestor.` };
  }
  return { ok: true };
}

export interface FieldErrors {
  name?: string;
  birthYear?: string;
  deathYear?: string;
}

export function validatePersonFields(
  p: { name: string; birthYear?: number; deathYear?: number },
  now = new Date().getFullYear(),
): FieldErrors {
  const errors: FieldErrors = {};
  if (!p.name.trim()) errors.name = 'Name is required.';
  if (p.birthYear !== undefined && p.birthYear > now) errors.birthYear = 'Year is in the future.';
  if (p.deathYear !== undefined && p.deathYear > now) errors.deathYear = 'Year is in the future.';
  if (p.birthYear !== undefined && p.deathYear !== undefined && p.deathYear < p.birthYear) {
    errors.deathYear = 'Died before born.';
  }
  return errors;
}
