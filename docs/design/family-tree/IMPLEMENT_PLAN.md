# Family Tree — Implementation Plan

Specs: `DESIGN.md`, `UIUX_DESIGN.md`, `uiux/*.md`. Target: physical iPhone
(Android kept building, not primary). Verify each UI task by installing on
device and attaching a screenshot.

## Phase 1: Remove Expo
Everything else builds on the native project, so the stack swap goes first,
while the screens are still stubs and cheap to move.

- [x] T1.1 Bare RN CLI project — `npx @react-native-community/cli init` into temp dir, bring over `ios/`, `android/`, metro/babel config; drop `app.json`, all `expo*` deps, `expo-router/entry`; `index.js` + `App.tsx`; app icons/splash via native assets — see `/` — depends: none
- [x] T1.2 React Navigation — native-stack only (one page app: Trees root with flat Settings section); move `src/app/**` → `src/screens/*Screen.tsx`, typed `RootStackParamList`; replace `useLocalSearchParams`/`router` — see `src/navigation`, `src/screens` — depends: T1.1
- [x] T1.3 Theme without Expo — drop `use-color-scheme.web.ts`, `global.css`; `useColorScheme` from RN only — see `src/hooks`, `src/constants` — depends: T1.1
- [x] T1.4 Tooling — jest (react-native preset), eslint `@react-native`, `tsc --noEmit`; npm scripts `test`, `lint`, `typecheck`, `ios:device` — see `package.json` — depends: T1.1
- [x] T1.5 Device smoke test — skeleton runs on the phone, screenshot home + settings; README setup updated (`npm run ios:device`), Expo mentions removed — see `README.md` — depends: T1.2, T1.3, T1.4

## Phase 2: Data core
Pure-TS domain, storage and layout — no UI — so they parallelise and are unit
tested before any screen depends on them.

- [x] T2.1 Domain model + rules — `Tree`, `Person` (+ `sex`, dates, `datesApprox`, `notes`, `photoPath`), `Relationship`; validators: no self-link, no parent cycle, ≤2 parents, died ≥ born — see `src/domain` — depends: T1.4
- [x] T2.2 Storage — op-sqlite, schema v1 + migration runner, repositories (trees/persons/relationships CRUD in transactions), append-only `change_log` — see `src/storage` — depends: T2.1
- [x] T2.3 Layout engine — generation assignment, couple grouping, children centred under couple midpoint, collision sweep, unlinked row; output node rects + edge polylines; tests incl. 2,000-node + 77-gen linear fixture — see `docs/design/family-tree/layout.md` — depends: T2.1
- [x] T2.4 Bundled sample trees — JSON (Adam→Jesus per Luke 3, House of Windsor) with source note; loader into SQLite as `kind=bundled` on first run — see `src/samples` — depends: T2.2
- [x] T2.5 Data hooks — `useTrees`, `useTree(id)`, `usePerson(id)` with change subscription; replace `mockFamily.ts` — see `src/state` — depends: T2.2

## Phase 3: Canvas
The core experience; needs layout (T2.3) and data (T2.5).

- [ ] T3.1 Viewport — gesture-handler + reanimated pan/pinch/double-tap, 0.2×–3× clamp, fling brake, per-tree saved viewport, zoom buttons — see `src/canvas/Viewport.tsx` — depends: T1.5 (built, installed; on-device screenshot check pending)
- [ ] T3.2 Tree render — SVG nodes/edges from layout, zoom-level variants (full/initials/dots), viewport culling, selection; a11y elements — see `src/canvas`, `uiux/canvas.md` → Zoom levels — depends: T2.3, T2.5, T3.1 (built, installed; on-device screenshot check pending)
- [ ] T3.3 Person card sheet + relation buttons (disabled reasons), read-only variant — see `uiux/canvas.md` → Person card — depends: T3.2 (built, installed; on-device screenshot check pending)
- [ ] T3.4 Find sheet + animate-to-node — see `uiux/canvas.md` → Find — depends: T3.2 (built, installed; on-device screenshot check pending)
- [ ] T3.5 Colour by origin — palette assignment, legend, dim filter, Tree menu — see `uiux/canvas.md` → Colour by origin — depends: T3.2 (built, installed; on-device screenshot check pending)
- [ ] T3.6 Canvas states — empty, loading (>300ms), error, first-run hint — see `uiux/canvas.md` → States — depends: T3.2 (built, installed; on-device screenshot check pending)
- [ ] T3.7 Perf pass on device (render is native Views + viewport culling, not SVG; layout of 2,000 people = 15 ms in tests) — 2,000-node fixture ≥ 55 fps pan; else swap render to Skia behind same interface — depends: T3.2

## Phase 4: Editing
Writes go through the domain rules from Phase 2 and land on the canvas from Phase 3.

- [ ] T4.1 Trees screen — list with counts/sections, New tree alert, rename/duplicate/delete, empty + error states — see `uiux/trees.md` — depends: T2.4, T2.5 (built, installed; on-device screenshot check pending)
- [ ] T4.2 Person form — add/edit, relation preset header, "Also child of", origin suggestions unfolding in place, validation — see `uiux/person.md` → Person form — depends: T2.5, T3.3 (built, installed; on-device screenshot check pending)
- [ ] T4.3 Photos — image picker, copy to app storage hash-named, heal path on read — see `src/storage/photos.ts` — depends: T2.2 (built, installed; on-device screenshot check pending)
- [ ] T4.4 Person detail — fields, relatives sections, Show on tree, delete + undo toast — see `uiux/person.md` → Person detail — depends: T2.5, T3.2 (built, installed; on-device screenshot check pending)
- [x] T4.5 Duplicate bundled tree to edit — see `src/storage` — depends: T2.4

## Phase 5: Settings & backup
Needs real data to export; last because nothing else depends on it.

- [x] T5.1 Backup format — versioned `snapshot.json` + `photos/` zip; export (all / one tree); import as new trees with id remap; reject newer version — see `src/backup` — depends: T2.2, T4.3
- [x] T5.2 Change log + daily copies — append-only log (full before/after) shipped as `changes.jsonl` in every zip; one daily snapshot overwritten per change, 7 days; photo cleanup honours them — see `src/backup` — depends: T5.1
- [ ] T5.4 iCloud Drive daily backup (1 file, latest overwrites) + fresh-install auto-restore; native `ICloudDrive` module — see `ios/LocalModules/ICloudDrive`, `src/backup` — depends: T5.1 (built; blocked: profile lacks iCloud until Xcode is signed in)
- [ ] T5.3 Settings section on Trees (flat: theme, years, iCloud, restore, export/import, storage, sources, version) — theme, show-years toggle, storage size, share sheet / file picker, states — see `uiux/settings.md` — depends: T5.1 (built, installed; on-device screenshot check pending)

## Phase 6: Release readiness

- [ ] T6.1 Accessibility pass — VoiceOver walk of every screen, Dynamic Type, 44pt targets — depends: T4.1, T4.2, T4.3, T4.4, T4.5, T5.3
- [ ] T6.2 Screenshot set from device, all screens + states; update `uiux/*.md` where built UI diverged — depends: T6.1
- [x] T6.3 README — real title, status, device install steps — see `README.md` — depends: T6.2
