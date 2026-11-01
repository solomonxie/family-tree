import * as FS from '@dr.pogodin/react-native-fs';

// Which data store is open. Demo lives in its own database and folder; nothing is shared.
export type Profile = 'real' | 'demo';

let current: Profile = 'real';

export const profile = () => current;
export const isDemo = () => current === 'demo';

export function setProfile(p: Profile) {
  current = p;
}

export const DB_NAMES = { real: 'family-tree.sqlite', demo: 'family-tree-demo.sqlite' } as const;
export const dbName = () => DB_NAMES[current];

// Photos and daily copies sit under this; the real one is Documents itself (unchanged paths).
export const dataRoot = () => (current === 'demo' ? `${FS.DocumentDirectoryPath}/demo` : FS.DocumentDirectoryPath);
