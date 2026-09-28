import { useMemo, useSyncExternalStore } from 'react';

import { layoutTree } from '@/layout/layout';
import * as repo from '@/storage/repo';

let version = 0;
const listeners = new Set<() => void>();

export function notifyChanged() {
  version++;
  listeners.forEach(l => l());
}

export function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useDataVersion(): number {
  return useSyncExternalStore(subscribe, () => version);
}

// Run a write and refresh every screen reading from the DB.
export function mutate<T>(fn: () => T): T {
  const out = fn();
  notifyChanged();
  return out;
}

export function useTrees() {
  const v = useDataVersion();
  return useMemo(() => {
    void v;
    return repo.listTrees().map(t => {
      const { generations } = layoutTree(repo.getPersons(t.id), repo.getRelationships(t.id));
      return { ...t, generations };
    });
  }, [v]);
}

export function useTree(treeId: string) {
  const v = useDataVersion();
  return useMemo(() => {
    void v;
    const tree = repo.getTree(treeId);
    const persons = tree ? repo.getPersons(treeId) : [];
    const relationships = tree ? repo.getRelationships(treeId) : [];
    return { tree, persons, relationships };
  }, [treeId, v]);
}

export function usePerson(personId: string) {
  const v = useDataVersion();
  return useMemo(() => {
    void v;
    return repo.getPerson(personId);
  }, [personId, v]);
}

export function useSetting(key: string, fallback: string): string {
  const v = useDataVersion();
  return useMemo(() => {
    void v;
    return repo.getSetting(key) ?? fallback;
  }, [key, fallback, v]);
}

export function setSetting(key: string, value: string) {
  mutate(() => repo.setSetting(key, value));
}
