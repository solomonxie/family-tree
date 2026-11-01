// App Store region the build targets (Info.plist AppStoreRegion, `make … STORE=cn`).
export type StoreRegion = 'us' | 'cn';

let region: StoreRegion = 'us';

export function setStoreRegion(r?: string) {
  region = r === 'cn' ? 'cn' : 'us';
}

export const storeRegion = (): StoreRegion => region;
