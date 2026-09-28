import * as FS from '@dr.pogodin/react-native-fs';

// Stored paths are relative to Documents, so a reinstall's new container path never breaks them.
export const PHOTO_DIR = 'photos';

export function photoUri(relPath: string | undefined): string | undefined {
  return relPath ? `file://${FS.DocumentDirectoryPath}/${relPath}` : undefined;
}

export async function importPhoto(sourceUri: string): Promise<string> {
  const src = decodeURI(sourceUri.replace(/^file:\/\//, ''));
  const digest = await FS.hash(src, 'sha256');
  const ext = (src.match(/\.(\w{3,4})$/)?.[1] ?? 'jpg').toLowerCase();
  const rel = `${PHOTO_DIR}/${digest}.${ext}`;
  const dest = `${FS.DocumentDirectoryPath}/${rel}`;
  await FS.mkdir(`${FS.DocumentDirectoryPath}/${PHOTO_DIR}`);
  if (!(await FS.exists(dest))) await FS.copyFile(src, dest);
  return rel;
}

export async function removeUnusedPhotos(referenced: Set<string>) {
  const dir = `${FS.DocumentDirectoryPath}/${PHOTO_DIR}`;
  if (!(await FS.exists(dir))) return;
  for (const f of await FS.readDir(dir)) {
    if (!referenced.has(`${PHOTO_DIR}/${f.name}`)) await FS.unlink(f.path);
  }
}
