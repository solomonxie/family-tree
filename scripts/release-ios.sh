#!/bin/sh
# Archive a Release build and upload it to App Store Connect in one go.
# Needs: Xcode → Settings → Accounts signed in to the developer Apple ID,
# and ios/Local.xcconfig holding DEVELOPMENT_TEAM.
#
# Build number is a timestamp so every upload is higher than the last;
# the user-visible version is MARKETING_VERSION in project.pbxproj.
# STORE=us|cn (default us) → Info.plist AppStoreRegion.
#
# Usage: scripts/release-ios.sh [build-number]
set -eu
cd "$(dirname "$0")/.."

if [ ! -f ios/Local.xcconfig ]; then
  echo "Missing ios/Local.xcconfig — copy ios/Local.xcconfig.example and set DEVELOPMENT_TEAM." >&2
  exit 1
fi

SCHEME=FamilyTree
BUILD=${1:-$(date +%Y%m%d%H%M)}
OUT=/tmp/familytree-release
ARCHIVE=$OUT/$SCHEME-$BUILD.xcarchive

xcodebuild -workspace "ios/$SCHEME.xcworkspace" -scheme "$SCHEME" \
  -configuration Release -destination 'generic/platform=iOS' \
  -xcconfig ios/Local.xcconfig -archivePath "$ARCHIVE" -allowProvisioningUpdates \
  APP_STORE_REGION="${STORE:-us}" CURRENT_PROJECT_VERSION="$BUILD" archive

xcodebuild -exportArchive -archivePath "$ARCHIVE" \
  -exportOptionsPlist ios/ExportOptions.plist \
  -exportPath "$OUT/export" -allowProvisioningUpdates

echo "Uploaded build $BUILD. Processing in App Store Connect takes 15–60 min."
