#!/bin/sh
# Open a screen on the paired iPhone via deep link and save a screenshot.
# Usage: scripts/screenshot.sh "tree/sample-house-of-windsor" /tmp/out.png [wait-seconds]
set -e
cd "$(dirname "$0")/.."
APP_ID=$(sed -n 's/^APP_BUNDLE_ID *= *//p' ios/Local.xcconfig)
UDID=$(xcrun devicectl list devices 2>/dev/null | grep physical | grep -oE '[0-9A-Fa-f]{8}-[0-9A-Fa-f]{16}' | head -1)
xcrun devicectl device process launch --terminate-existing --device "$UDID" --payload-url "familytree://$1" "$APP_ID" >/dev/null
sleep "${3:-4}"
xcrun devicectl device capture screenshot --device "$UDID" --destination "$2" >/dev/null
