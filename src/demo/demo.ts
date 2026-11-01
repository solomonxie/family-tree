import * as FS from '@dr.pogodin/react-native-fs';

import family from '../../demo/family.json';
import { cleanupPhotos, flushRestorePoint } from '@/backup/backup';
import { toTreeData, type ImportedTree } from '@/import/imported';
import { ensureSamplesLoaded } from '@/samples/load';
import { mutate, notifyChanged, useDataVersion } from '@/state/store';
import { closeDb, getDb, inTransaction } from '@/storage/db';
import { dataRoot, isDemo, setProfile } from '@/storage/profile';
import * as repo from '@/storage/repo';

// The flag is a file, not a setting: turning demo on or off must not write to the real database.
const FLAG = `${FS.DocumentDirectoryPath}/demo-mode`;
const SEEDED = 'demo.seeded';

let switching = false;

export const DEMO_TREES = (family as { trees: ImportedTree[] }).trees;

// Opens whichever store the in-app switch was last on.
export async function chooseProfile() {
  setProfile((await FS.exists(FLAG)) ? 'demo' : 'real');
  if (isDemo()) await FS.mkdir(dataRoot());
}

export function openStore() {
  getDb();
  ensureSamplesLoaded();
  if (isDemo()) seedDemo();
}

function seedDemo(force = false) {
  if (!force && repo.getSetting(SEEDED) === '1') return;
  inTransaction(() => {
    const now = Date.now();
    DEMO_TREES.forEach((t, i) => {
      const data = toTreeData(t, undefined, now - i * 60_000, {
        tree: `demo-${i}`,
        person: key => `demo-${i}:${key}`,
      });
      repo.insertTree(data.tree);
      data.persons.forEach(repo.insertPerson);
      data.relationships.forEach(repo.insertRelationship);
    });
    repo.setSetting(SEEDED, '1');
    // No iCloud restore prompt for demo data.
    repo.setSetting('restore.checked', '1');
  });
}

export async function setDemoMode(on: boolean) {
  if (switching || on === isDemo()) return;
  switching = true;
  try {
    await flushRestorePoint().catch(() => {});
    closeDb();
    setProfile(on ? 'demo' : 'real');
    if (on) {
      await FS.mkdir(dataRoot());
      await FS.writeFile(FLAG, '1', 'utf8');
    } else if (await FS.exists(FLAG)) {
      await FS.unlink(FLAG);
    }
    openStore();
  } finally {
    switching = false;
    notifyChanged();
  }
}

// Back to the demo trees as first installed. Only ever runs on the demo store.
export function resetDemo() {
  if (!isDemo()) return;
  mutate(() => {
    for (const t of repo.listTrees()) if (t.kind === 'user') repo.deleteTree(t.id);
    seedDemo(true);
  });
  cleanupPhotos().catch(() => {});
}

export function useDemo() {
  useDataVersion();
  return { on: isDemo() };
}
