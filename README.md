# Family Tree

Draw and explore family trees on your phone: pan and zoom a canvas of people laid out generation by generation, add parents, children and partners from any person, and colour the tree by region of origin to trace where a line came from.

Ships with read-only sample lineages (Adam to Jesus per Luke 3, House of Windsor). Everything stays on the device; export/import a `.zip` backup any time.

Bare React Native (no Expo) · React Navigation · op-sqlite · Reanimated + Gesture Handler canvas.

## Setup

```bash
npm install
npm run pods
cp ios/Local.xcconfig.example ios/Local.xcconfig   # set DEVELOPMENT_TEAM
npm run ios:device                                  # release build → connected iPhone
```

Dev loop: `npm start` + `npm run ios`. Checks: `npm test`, `npm run typecheck`, `npm run lint`.

Backups: append-only change log (in every backup zip) + one daily copy on the phone (overwritten per change, 7 days) + one daily iCloud Drive copy. iCloud needs Xcode signed in to the team (Settings → Accounts) so the profile gets the iCloud capability; otherwise `npm run ios:device` builds without it.

Screenshot a screen on the phone: `scripts/screenshot.sh tree/sample-house-of-windsor /tmp/out.png` (deep links: `familytree://trees|tree/<id>|person/<id>`).

App icon: edit `assets/icon/icon.svg`, run `scripts/make-icon.sh`.

Design: `docs/design/family-tree/`.
