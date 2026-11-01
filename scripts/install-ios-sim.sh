#!/bin/sh
# Release build installed and launched on an iPhone simulator, unsigned.
# STORE=us|cn (default us: Canada/US) → Info.plist AppStoreRegion. SIM=<udid> picks the simulator.
set -eu
cd "$(dirname "$0")/.."

uuid() { grep iPhone | grep -oE '[0-9A-F]{8}(-[0-9A-F]{4}){3}-[0-9A-F]{12}' | head -1; }
SIM=${SIM:-$(xcrun simctl list devices booted | uuid)}
SIM=${SIM:-$(xcrun simctl list devices available | uuid)}
[ -n "$SIM" ] || { echo "No iPhone simulator." >&2; exit 1; }
xcrun simctl boot "$SIM" 2>/dev/null || true
open -a Simulator

LOG=/tmp/family-tree-sim-build.log
xcodebuild -workspace ios/FamilyTree.xcworkspace -scheme FamilyTree -configuration Release \
  -destination "id=$SIM" -derivedDataPath /tmp/familytree-build CODE_SIGNING_ALLOWED=NO \
  APP_STORE_REGION="${STORE:-us}" build > "$LOG" 2>&1 \
  || { grep -E "error:" "$LOG" | sort -u | head -20 >&2; echo "Build failed. Full log: $LOG" >&2; exit 1; }

xcrun simctl install "$SIM" /tmp/familytree-build/Build/Products/Release-iphonesimulator/FamilyTree.app
xcrun simctl launch --terminate-running-process "$SIM" com.example.familytree
