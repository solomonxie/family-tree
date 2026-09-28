import * as FS from '@dr.pogodin/react-native-fs';
import { NativeModules } from 'react-native';
import { unzip, zip } from 'react-native-zip-archive';

import { mutate } from '@/state/store';
import { PHOTO_DIR, removeUnusedPhotos } from '@/storage/photos';
import * as repo from '@/storage/repo';
import { inTransaction } from '@/storage/db';
import { buildSnapshot, parseSnapshot, remapForImport, type TreeData } from './snapshot';

const DOCS = FS.DocumentDirectoryPath;
const DAY = 24 * 60 * 60 * 1000;
const KEEP_DAYS = 7;

const stamp = (d = new Date()) => localDay(d);

function userTreeData(treeIds?: string[]): TreeData[] {
  return repo
    .listTrees()
    .filter(t => t.kind === 'user' && (!treeIds || treeIds.includes(t.id)))
    .map(({ personCount: _n, ...tree }) => ({
      tree,
      persons: repo.getPersons(tree.id),
      relationships: repo.getRelationships(tree.id),
    }));
}

async function writeZip(trees: TreeData[], target: string): Promise<string> {
  const staging = `${FS.CachesDirectoryPath}/backup-${Date.now()}`;
  await FS.mkdir(`${staging}/${PHOTO_DIR}`);
  await FS.writeFile(`${staging}/snapshot.json`, JSON.stringify(buildSnapshot(trees)), 'utf8');
  // The full history travels with every backup; it is never replayed on import (ids are remapped).
  const log = repo.changeLog().map(e => JSON.stringify(e)).join('\n');
  await FS.writeFile(`${staging}/changes.jsonl`, log ? `${log}\n` : '', 'utf8');
  for (const p of trees.flatMap(t => t.persons)) {
    if (!p.photoPath) continue;
    const src = `${DOCS}/${p.photoPath}`;
    const dest = `${staging}/${p.photoPath}`;
    if ((await FS.exists(src)) && !(await FS.exists(dest))) await FS.copyFile(src, dest);
  }
  if (await FS.exists(target)) await FS.unlink(target);
  await zip(staging, target);
  await FS.unlink(staging);
  return target;
}

export async function exportBackup(treeIds?: string[]): Promise<{ path: string; treeCount: number }> {
  const trees = userTreeData(treeIds);
  const name = trees.length === 1 && treeIds ? safeName(trees[0].tree.title) : 'family-tree';
  const path = await writeZip(trees, `${FS.CachesDirectoryPath}/${name}-${stamp()}.zip`);
  if (!treeIds) repo.setSetting('backup.lastExport', String(Date.now()));
  return { path, treeCount: trees.length };
}

function safeName(title: string) {
  return title.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'tree';
}

export async function readBackup(zipPath: string): Promise<TreeData[]> {
  const dir = `${FS.CachesDirectoryPath}/import-${Date.now()}`;
  await unzip(zipPath.replace(/^file:\/\//, ''), dir);
  const snapshotPath = `${dir}/snapshot.json`;
  if (!(await FS.exists(snapshotPath))) throw new Error('Not a Family Tree backup.');
  const snapshot = parseSnapshot(await FS.readFile(snapshotPath, 'utf8'));
  pendingImportDir = dir;
  return snapshot.trees;
}

let pendingImportDir: string | undefined;

// Call after readBackup, once the user confirms.
export async function importTrees(trees: TreeData[]): Promise<number> {
  await flushRestorePoint();
  const titles = repo.listTrees().map(t => t.title);
  const remapped = remapForImport({ format: 'family-tree-backup', version: 1, exportedAt: 0, trees }, titles);
  const dir = pendingImportDir;
  if (dir) {
    await FS.mkdir(`${DOCS}/${PHOTO_DIR}`);
    for (const p of remapped.flatMap(t => t.persons)) {
      if (!p.photoPath) continue;
      const src = `${dir}/${p.photoPath}`;
      const dest = `${DOCS}/${p.photoPath}`;
      if ((await FS.exists(src)) && !(await FS.exists(dest))) await FS.copyFile(src, dest);
    }
  }
  mutate(() =>
    inTransaction(() => {
      for (const t of remapped) {
        repo.insertTree(t.tree);
        t.persons.forEach(repo.insertPerson);
        t.relationships.forEach(repo.insertRelationship);
      }
    }),
  );
  if (dir) await FS.unlink(dir).catch(() => {});
  pendingImportDir = undefined;
  return remapped.length;
}

// Daily copies: one snapshot file per day, overwritten on every change that day, last 7 days.
// What changed between them is in the append-only change log. Photos aren't copied —
// they're content-addressed and kept while any daily copy names them.
export const RESTORE_DIR = `${DOCS}/daily`;
const LEGACY_DIR = `${DOCS}/restore-points`;

const pad = (n: number, w = 2) => String(n).padStart(w, '0');
const localDay = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export async function writeRestorePoint() {
  const changeId = repo.lastChangeId();
  if (changeId <= Number(repo.getSetting('restore.changeId') ?? 0)) return;
  await FS.mkdir(RESTORE_DIR);
  await FS.writeFile(`${RESTORE_DIR}/${localDay()}.json`, JSON.stringify(buildSnapshot(userTreeData())), 'utf8');
  repo.setSetting('restore.changeId', String(changeId));
  await pruneRestorePoints();
}

async function pruneRestorePoints() {
  if (await FS.exists(LEGACY_DIR)) await FS.unlink(LEGACY_DIR);
  const oldest = localDay(new Date(Date.now() - (KEEP_DAYS - 1) * DAY));
  for (const f of await FS.readDir(RESTORE_DIR)) {
    if (f.name.slice(0, 10) < oldest) await FS.unlink(f.path);
  }
}

let pointTimer: ReturnType<typeof setTimeout> | undefined;
export function scheduleRestorePoint(delayMs = 3000) {
  if (pointTimer) clearTimeout(pointTimer);
  pointTimer = setTimeout(() => {
    pointTimer = undefined;
    writeRestorePoint()
      .then(() => maybeSaveToICloud())
      .catch(() => {});
  }, delayMs);
}

export async function flushRestorePoint() {
  if (pointTimer) clearTimeout(pointTimer);
  pointTimer = undefined;
  await writeRestorePoint();
}

export interface RestorePoint {
  path: string;
  day: string;
  date: Date;
}

export async function listRestorePoints(): Promise<RestorePoint[]> {
  if (!(await FS.exists(RESTORE_DIR))) return [];
  return (await FS.readDir(RESTORE_DIR))
    .filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f.name))
    .map(f => ({ path: f.path, day: f.name.slice(0, 10), date: f.mtime ?? new Date(0) }))
    .sort((a, b) => b.day.localeCompare(a.day));
}

export async function readRestorePoint(path: string): Promise<TreeData[]> {
  pendingImportDir = undefined;
  return parseSnapshot(await FS.readFile(path, 'utf8')).trees;
}

async function photosInRestorePoints(): Promise<string[]> {
  const found: string[] = [];
  for (const p of await listRestorePoints()) {
    const text = await FS.readFile(p.path, 'utf8');
    for (const m of text.matchAll(/"photoPath":"([^"]+)"/g)) found.push(m[1]);
  }
  return found;
}

export async function cleanupPhotos() {
  await removeUnusedPhotos(new Set([...repo.referencedPhotos(), ...(await photosInRestorePoints())]));
}

// iCloud Drive: one full .zip, overwritten at most once a day, only when something changed.
export const ICLOUD_FILE = 'Family Tree backup.zip';
export type ICloudStatus = 'unsupported' | 'available' | 'notEntitled' | 'driveOff' | 'notReady';

const ICloud = NativeModules.ICloudDrive as
  | {
      status(): Promise<Exclude<ICloudStatus, 'unsupported'>>;
      save(source: string, name: string): Promise<string>;
      fileInfo(name: string): Promise<{ path: string; modified: number; size: number; downloaded: boolean } | null>;
    }
  | undefined;

export async function icloudStatus(): Promise<ICloudStatus> {
  if (!ICloud) return 'unsupported';
  try {
    return await ICloud.status();
  } catch {
    return 'notReady';
  }
}

export const icloudEnabled = () => repo.getSetting('backup.icloud') !== '0';

export async function icloudFile() {
  return ICloud ? ICloud.fileInfo(ICLOUD_FILE) : null;
}

export async function maybeSaveToICloud(force = false): Promise<boolean> {
  if (!ICloud || !icloudEnabled() || repo.getSetting('restore.checked') !== '1') return false;
  const changeId = repo.lastChangeId();
  const today = localDay();
  const due =
    force ||
    (repo.getSetting('backup.icloud.day') !== today &&
      changeId > Number(repo.getSetting('backup.icloud.changeId') ?? 0));
  if (!due) return false;
  const trees = userTreeData();
  // Never let an empty phone overwrite a good copy in the cloud.
  if (!trees.length) return false;
  if ((await icloudStatus()) !== 'available') return false;
  const zipPath = await writeZip(trees, `${FS.CachesDirectoryPath}/icloud-${Date.now()}.zip`);
  try {
    await ICloud.save(zipPath, ICLOUD_FILE);
  } finally {
    await FS.unlink(zipPath).catch(() => {});
  }
  repo.setSetting('backup.icloud.day', today);
  repo.setSetting('backup.icloud.changeId', String(changeId));
  repo.setSetting('backup.icloud.savedAt', String(Date.now()));
  return true;
}

// Fresh install: pull the iCloud copy back once, silently. Retries until iCloud has answered.
export async function restoreFromICloudIfFresh(): Promise<number> {
  if (repo.getSetting('restore.checked') === '1') return 0;
  const done = () => repo.setSetting('restore.checked', '1');
  if (userTreeData().length || !ICloud) {
    done();
    return 0;
  }
  const status = await icloudStatus();
  if (status === 'notEntitled' || status === 'driveOff') {
    done();
    return 0;
  }
  if (status !== 'available') return 0;
  const info = await icloudFile();
  if (!info) {
    done();
    return 0;
  }
  if (!info.downloaded) return 0;
  const trees = await readBackup(info.path);
  const n = trees.length ? await importTrees(trees) : 0;
  done();
  return n;
}
