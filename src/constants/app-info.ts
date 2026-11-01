import pkg from '../../package.json';

// CFBundleShortVersionString / CFBundleVersion, passed in by the iOS SceneDelegate.
let version = pkg.version;
let build = '';

export function setAppVersion(v?: string, b?: string) {
  if (v) version = v;
  build = b ?? '';
}

export const appVersion = () => (build ? `${version} (${build})` : version);
