import * as FS from '@dr.pogodin/react-native-fs';

import { openStore } from '@/demo/demo';
import { notifyChanged } from '@/state/store';
import { closeDb, dbPath } from '@/storage/db';
import { DB_NAMES, setProfile } from '@/storage/profile';
import * as repo from '@/storage/repo';
import { cancelRestorePoint, removeICloudBackup } from './backup';

async function removeContents(dir: string) {
  if (!(await FS.exists(dir))) return;
  for (const f of await FS.readDir(dir)) await FS.unlink(f.path).catch(() => {});
}

// Real and demo data alike: databases (with change history and settings), photos, daily copies, temp files.
// iCloud Drive: deleted when asked; otherwise kept, with the daily backup turned off so it isn't overwritten.
export async function removeAllData({ icloud }: { icloud: boolean }) {
  if (icloud) await removeICloudBackup();
  cancelRestorePoint();
  const dbDir = dbPath().replace(/\/[^/]+$/, '');
  closeDb();
  for (const name of Object.values(DB_NAMES)) {
    for (const suffix of ['', '-wal', '-shm']) {
      const f = `${dbDir}/${name}${suffix}`;
      if (await FS.exists(f)) await FS.unlink(f);
    }
  }
  await removeContents(FS.DocumentDirectoryPath);
  await removeContents(FS.CachesDirectoryPath);
  setProfile('real');
  openStore();
  // A kept iCloud copy is never pulled back in silently; Import from file still reads it.
  repo.setSetting('restore.checked', '1');
  if (!icloud) repo.setSetting('backup.icloud', '0');
  notifyChanged();
}
