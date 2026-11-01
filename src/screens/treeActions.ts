import { Share } from 'react-native';

import { cleanupPhotos, exportBackup, flushRestorePoint, maybeSaveToICloud } from '@/backup/backup';
import { confirm } from '@/components/menu';
import type { PromptSpec } from '@/components/prompt';
import { showToast } from '@/components/toast';
import type { Tree } from '@/domain/types';
import { mutate } from '@/state/store';
import * as repo from '@/storage/repo';

export async function shareFile(path: string) {
  await Share.share({ url: `file://${path}` });
}

export async function exportTree(tree: Tree) {
  try {
    const { path } = await exportBackup([tree.id]);
    await shareFile(path);
  } catch (e) {
    showToast(`Export failed: ${(e as Error).message}`);
  }
}

export function renamePrompt(tree: Tree): PromptSpec {
  return {
    title: 'Rename tree',
    initial: tree.title,
    action: 'Save',
    onSubmit: title => mutate(() => repo.renameTree(tree.id, title)),
  };
}

export function duplicate(tree: Tree): Tree {
  const copy = mutate(() => repo.duplicateTree(tree.id, tree.kind === 'bundled' ? tree.title : `${tree.title} copy`));
  showToast(`Made an editable copy of “${tree.title}”`);
  return copy;
}

export function confirmDelete(tree: Tree, count: number, onDeleted?: () => void) {
  confirm(
    `Delete “${tree.title}”?`,
    `${count} ${count === 1 ? 'person' : 'people'}, their photos and their edit history will be removed. Settings → Restore a daily copy can bring the tree back for 7 days.`,
    'Delete',
    () => {
      mutate(() => repo.deleteTree(tree.id));
      // Rewrite today's copy and the iCloud Drive backup now, not at the next daily save.
      flushRestorePoint()
        .then(() => maybeSaveToICloud(true))
        .finally(() => cleanupPhotos())
        .catch(() => {});
      onDeleted?.();
    },
  );
}
