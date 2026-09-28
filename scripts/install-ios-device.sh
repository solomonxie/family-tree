#!/bin/sh
# Release build (JS bundled, no Metro needed) installed and launched on a connected iPhone.
set -eu
cd "$(dirname "$0")/.."

if [ ! -f ios/Local.xcconfig ]; then
  echo "Missing ios/Local.xcconfig — copy ios/Local.xcconfig.example and set DEVELOPMENT_TEAM." >&2
  exit 1
fi

DEVICE=${DEVICE_ID:-$(xcrun devicectl list devices --json-output /dev/stdout 2>/dev/null | node -e '
  let s = ""; process.stdin.on("data", d => (s += d)).on("end", () => {
    const j = JSON.parse(s.slice(s.indexOf("{")));
    const d = (j.result?.devices ?? []).find(d => d.hardwareProperties?.reality === "physical" && d.hardwareProperties?.platform === "iOS");
    process.stdout.write(d?.hardwareProperties?.udid ?? "");
  });')}
[ -n "$DEVICE" ] || { echo "No iPhone found. Connect and unlock it." >&2; exit 1; }

build() {
  xcodebuild -workspace ios/FamilyTree.xcworkspace -scheme FamilyTree -configuration Release \
    -destination "id=$DEVICE" -xcconfig ios/Local.xcconfig -allowProvisioningUpdates \
    -derivedDataPath ios/build "$@" build > /tmp/family-tree-build.log 2>&1
}

# iCloud needs a profile with the iCloud capability (Xcode → Settings → Accounts signed in).
# Without it, build unentitled: the app then shows "not signed for iCloud" and keeps local restore points.
fail() {
  grep -E "error:" /tmp/family-tree-build.log | sort -u | head -20 >&2
  echo "Build failed. Full log: /tmp/family-tree-build.log" >&2
  exit 1
}
no_icloud() { build CODE_SIGN_ENTITLEMENTS=FamilyTree/Base.entitlements || fail; echo "Built WITHOUT iCloud."; }

if [ "${ICLOUD:-1}" != 1 ]; then
  no_icloud
elif build; then
  echo "Built with iCloud."
elif grep -qi "icloud" /tmp/family-tree-build.log; then
  echo "Profile lacks iCloud — falling back." >&2
  no_icloud
else
  fail
fi

APP=ios/build/Build/Products/Release-iphoneos/FamilyTree.app
xcrun devicectl device install app --device "$DEVICE" "$APP"
xcrun devicectl device process launch --device "$DEVICE" com.solomonxie.familytree
