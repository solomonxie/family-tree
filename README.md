# Family Tree

Draw and explore family trees on your phone: pan and zoom a canvas of people laid out generation by generation, add parents, children and partners from any person, and colour the tree by region of origin to trace where a line came from.

Ships with read-only sample lineages (Adam to Jesus per Luke 3, House of Windsor). Everything stays on the device; export/import a `.zip` backup any time.

Bare React Native (no Expo) · React Navigation · op-sqlite · Reanimated + Gesture Handler canvas.

## Setup

```bash
npm install
npm run pods
cp ios/Local.xcconfig.example ios/Local.xcconfig   # set DEVELOPMENT_TEAM and APP_BUNDLE_ID
make ios                                            # release build → connected iPhone
make ios STORE=cn                                   # any install: STORE=us (Canada/US, default) | cn
```

`STORE` → Info.plist `AppStoreRegion` → `storeRegion()` in `src/constants/store-region.ts`. `make sim` for a simulator.

Physical iPhone only, no Metro server. Checks: `npm test`, `npm run typecheck`, `npm run lint`.

Import (Settings → Import from file…): this app's backup `.zip`, GEDCOM `.ged` or a `.zip` holding one with its photos (names, sex, birth/death dates and places, notes, occupations, photos). Snapshot `.json` files copied into the app's `Documents/import-inbox/` are imported once on launch.

Demo: Settings → Demo data switches to fictional families (`demo/family.json`) in a separate database and photo folder (`Documents/demo`); real data and iCloud are untouched. Reset demo data restores them.

Backups: change log (in every backup zip; deleting a person or tree drops its entries) + one daily copy on the phone (overwritten per change, 7 days) + one daily iCloud Drive copy. iCloud needs Xcode signed in to the team (Settings → Accounts) so the profile gets the iCloud capability; otherwise `make ios` builds without it.

Remove all app data (Settings): deletes both databases, photos, daily copies and caches; optionally the app's iCloud Drive folder, else iCloud backup is switched off so the kept copy isn't overwritten (`src/backup/erase.ts`).

Screenshot a screen on the phone: `scripts/screenshot.sh tree/sample-house-of-windsor /tmp/out.png` (deep links: `familytree://trees|tree/<id>|person/<id>`).

App icon: edit `assets/icon/icon.svg`, run `scripts/make-icon.sh`.

Design: `docs/design/family-tree/`. App Store release: `docs/release/`.
