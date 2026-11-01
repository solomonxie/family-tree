import { openStore } from '@/demo/demo';
import { closeDb } from '@/storage/db';
import { profile, setProfile } from '@/storage/profile';
import * as repo from '@/storage/repo';
import { cancelRestorePoint, removeICloudBackup } from './backup';
import { removeAllData } from './erase';

const mockFiles = new Set<string>();

jest.mock('@dr.pogodin/react-native-fs', () => ({
  DocumentDirectoryPath: '/app/Documents',
  CachesDirectoryPath: '/app/Library/Caches',
  exists: async (p: string) => [...mockFiles].some(f => f === p || f.startsWith(`${p}/`)),
  readDir: async (dir: string) => {
    const names = new Set([...mockFiles].filter(f => f.startsWith(`${dir}/`)).map(f => f.slice(dir.length + 1).split('/')[0]));
    return [...names].map(name => ({ name, path: `${dir}/${name}` }));
  },
  unlink: async (p: string) => [...mockFiles].forEach(f => (f === p || f.startsWith(`${p}/`)) && mockFiles.delete(f)),
}));
jest.mock('@/demo/demo', () => ({ openStore: jest.fn() }));
jest.mock('@/state/store', () => ({ notifyChanged: jest.fn() }));
jest.mock('@/storage/db', () => ({ closeDb: jest.fn(), dbPath: () => '/app/Library/family-tree.sqlite' }));
jest.mock('@/storage/repo', () => ({ setSetting: jest.fn() }));
jest.mock('./backup', () => ({ cancelRestorePoint: jest.fn(), removeICloudBackup: jest.fn() }));

const APP_FILES = [
  '/app/Library/family-tree.sqlite',
  '/app/Library/family-tree.sqlite-wal',
  '/app/Library/family-tree-demo.sqlite',
  '/app/Documents/photos/abc.jpg',
  '/app/Documents/daily/2026-10-01.json',
  '/app/Documents/demo/photos/d.jpg',
  '/app/Documents/demo-mode',
  '/app/Library/Caches/family-tree-2026-10-01.zip',
];

beforeEach(() => {
  jest.clearAllMocks();
  mockFiles.clear();
  APP_FILES.forEach(f => mockFiles.add(f));
  mockFiles.add('/app/Library/Preferences/other.plist');
  setProfile('demo');
});

test('removes databases, photos, daily copies and temp files for real and demo data', async () => {
  await removeAllData({ icloud: false });
  expect([...mockFiles]).toEqual(['/app/Library/Preferences/other.plist']);
  expect(cancelRestorePoint).toHaveBeenCalled();
  expect(closeDb).toHaveBeenCalled();
  expect(openStore).toHaveBeenCalled();
  expect(profile()).toBe('real');
  expect(removeICloudBackup).not.toHaveBeenCalled();
  expect(repo.setSetting).toHaveBeenCalledWith('restore.checked', '1');
  expect(repo.setSetting).toHaveBeenCalledWith('backup.icloud', '0');
});

test('deletes the iCloud Drive backup when asked', async () => {
  await removeAllData({ icloud: true });
  expect(removeICloudBackup).toHaveBeenCalled();
  expect(repo.setSetting).not.toHaveBeenCalledWith('backup.icloud', '0');
});

test('removes nothing when the iCloud Drive backup can’t be deleted', async () => {
  (removeICloudBackup as jest.Mock).mockRejectedValueOnce(new Error('unavailable'));
  await expect(removeAllData({ icloud: true })).rejects.toThrow('unavailable');
  expect(mockFiles.size).toBe(APP_FILES.length + 1);
  expect(closeDb).not.toHaveBeenCalled();
});
