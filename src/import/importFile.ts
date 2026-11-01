import * as FS from '@dr.pogodin/react-native-fs';
import { unzip } from 'react-native-zip-archive';

import { readBackupDir, type PendingImport } from '@/backup/backup';
import { importPhoto } from '@/storage/photos';
import { parseGedcom } from './gedcom';
import { ImportError, toTreeData, type ImportedPerson, type ImportedTree } from './imported';
import { base64ToBytes, decodeText } from './text';

const IMAGE = /\.(jpe?g|png|heic|heif|gif|webp)$/i;

async function listFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const item of await FS.readDir(dir)) {
    if (item.name.startsWith('.') || item.name === '__MACOSX') continue;
    if (item.isDirectory()) out.push(...(await listFiles(item.path)));
    else out.push(item.path);
  }
  return out;
}

const readText = async (path: string) => decodeText(base64ToBytes(await FS.readFile(path, 'base64')));
const baseName = (path: string) => path.split(/[\\/]/).pop() ?? path;
const stem = (name: string) => name.replace(/\.[^.]+$/, '').trim();

// Photos referenced by the source → copied into the app's photo store.
async function resolvePhotos(
  t: ImportedTree,
  find: (p: ImportedPerson) => string | undefined,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (const p of t.persons) {
    const src = find(p);
    if (!src) continue;
    try {
      out.set(p.key, await importPhoto(src));
    } catch {
      // A missing or unreadable photo shouldn't stop the import.
    }
  }
  return out;
}

async function fromFiles(files: string[], name: string): Promise<PendingImport | undefined> {
  const ged = files.find(f => /\.ged(com)?$/i.test(f));
  if (ged) {
    const tree = parseGedcom(await readText(ged), stem(name));
    const gedDir = ged.slice(0, ged.lastIndexOf('/'));
    const byName = new Map(files.filter(f => IMAGE.test(f)).map(f => [baseName(f).toLowerCase(), f]));
    const fileSet = new Set(files);
    const photos = await resolvePhotos(tree, p => {
      if (!p.photo) return undefined;
      const rel = `${gedDir}/${p.photo.replace(/\\/g, '/').replace(/^\.\//, '')}`;
      return fileSet.has(rel) ? rel : byName.get(baseName(p.photo).toLowerCase());
    });
    return { trees: [toTreeData(tree, p => photos.get(p.key))] };
  }
  return undefined;
}

// Any supported file: this app's .zip backup, GEDCOM .ged, or a zip holding a .ged and its photos.
export async function readImportFile(localPath: string, name: string): Promise<PendingImport> {
  const path = decodeURI(localPath.replace(/^file:\/\//, ''));
  const dir = `${FS.CachesDirectoryPath}/import-${Date.now()}`;
  let zipped = true;
  try {
    await unzip(path, dir);
  } catch {
    zipped = false;
  }
  if (zipped) {
    const backup = await readBackupDir(dir);
    if (backup) return backup;
    const files = await listFiles(dir);
    try {
      const found = await fromFiles(files, name);
      if (found) return found;
    } finally {
      await FS.unlink(dir).catch(() => {});
    }
    throw new ImportError('Nothing to import in that zip (no backup or .ged file).');
  }
  const text = await readText(path);
  if (/^\s*0\s+HEAD/.test(text.replace(/^﻿/, ''))) {
    return { trees: [toTreeData(parseGedcom(text, stem(name)))] };
  }
  throw new ImportError('Unsupported file. Choose a Family Tree backup (.zip), or a GEDCOM file (.ged).');
}
