import { newId } from '@/domain/ids';
import type { Person, Relationship, Tree } from '@/domain/types';

export const BACKUP_FORMAT = 'family-tree-backup';
export const BACKUP_VERSION = 1;

export interface TreeData {
  tree: Tree;
  persons: Person[];
  relationships: Relationship[];
}

export interface Snapshot {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: number;
  trees: TreeData[];
}

export class BackupError extends Error {}

export function buildSnapshot(trees: TreeData[], now = Date.now()): Snapshot {
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: now, trees };
}

export function parseSnapshot(text: string): Snapshot {
  let data: Partial<Snapshot>;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupError('Not a Family Tree backup.');
  }
  if (data?.format !== BACKUP_FORMAT || !Array.isArray(data.trees)) {
    throw new BackupError('Not a Family Tree backup.');
  }
  if (typeof data.version !== 'number' || data.version > BACKUP_VERSION) {
    throw new BackupError('This backup is from a newer app version.');
  }
  return data as Snapshot;
}

// Imports never overwrite: every tree, person and link gets a fresh id.
export function remapForImport(snapshot: Snapshot, existingTitles: string[], now = Date.now()): TreeData[] {
  const titles = new Set(existingTitles);
  return snapshot.trees.map(({ tree, persons, relationships }) => {
    const treeId = newId();
    const idMap = new Map(persons.map(p => [p.id, newId()]));
    let title = tree.title;
    if (titles.has(title)) title = `${tree.title} (imported)`;
    titles.add(title);
    return {
      tree: { ...tree, id: treeId, title, kind: 'user', createdAt: tree.createdAt ?? now, updatedAt: now },
      persons: persons.map(p => ({ ...p, id: idMap.get(p.id)!, treeId })),
      relationships: relationships
        .filter(r => idMap.has(r.fromPersonId) && idMap.has(r.toPersonId))
        .map(r => ({
          ...r,
          id: newId(),
          treeId,
          fromPersonId: idMap.get(r.fromPersonId)!,
          toPersonId: idMap.get(r.toPersonId)!,
        })),
    };
  });
}
