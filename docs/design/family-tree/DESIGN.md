# Family Tree — Design

## Problem

Family-tree apps are paywalled, account-bound, or desktop-era. None make it
easy to just *look at* a tree on a phone — your own, or a well-known lineage
(Adam → Jesus, royal lines). Origin/region is usually a buried note, not
something you can trace a line by.

## Goals

- Draw and explore a tree on a pannable, zoomable canvas, laid out by generation.
- Build your own tree quickly: add parent / child / spouse from a person.
- Ship read-only historical trees in the app; open them like any other tree.
- Origin/region per person; colour the canvas by origin to trace where a line came from.
- Offline, local-only, free. Data is the user's: full export/import.

## Non-goals (v1)

- Accounts, cloud sync, collaboration, sharing links.
- DNA, record search, hints, "matches".
- GEDCOM import/export (v2 candidate, see Open questions).
- Web build. Tablet-specific layouts.
- Complex kinship: adoption/step/half types, divorce dates, multiple marriages drawn distinctly. Model allows `parent` / `spouse` only.

## Options considered

| Area | Option | Deciding factor |
|---|---|---|
| App stack | Expo (current) | ✗ rejected by owner — no Expo in repo |
| | **Bare React Native CLI** | keeps existing TS/RN code, react-native-svg, one codebase |
| | Flutter / native Swift+Kotlin | full rewrite of skeleton, two codebases for native |
| Navigation | expo-router | Expo-only |
| | **React Navigation** (native-stack; one page app, no tabs) | de-facto RN standard, typed params |
| Storage | AsyncStorage JSON blob | no queries, whole-tree rewrite per edit |
| | **SQLite (`@op-sqlite/op-sqlite`)** | relational fits persons/relationships, fast, sync API |
| | WatermelonDB / Realm | heavier, sync features we don't need |
| Canvas | **native Views + gesture-handler + reanimated** (SVG only for dashed spouse lines) | whole canvas transformed on the UI thread; edges are orthogonal so plain Views draw them; culled to 3 screens |
| | react-native-skia | faster at scale; switch only if SVG fails perf target |
| Layout | Graphviz/ELK port | heavy, not mobile-friendly |
| | **Own layered layout (pure TS)** | generations are the natural layers; testable, small |
| Historical data | Download on demand | needs server |
| | **Bundled JSON, read-only** | offline, free, no infra |

## Decision

Bare RN CLI + React Navigation + op-sqlite + View-based canvas + in-house generation
layout. Reuses the skeleton's components/types, removes Expo entirely, keeps
everything local. Skia stays a fallback behind the canvas's render interface.

## Data model

```
Tree          id, title, kind(user|bundled), rootPersonId?, createdAt, updatedAt
Person        id, treeId, name, sex?(m|f), birthYear?, deathYear?,
              datesApprox?, originRegion?,
              notes?, photoPath?
Relationship  id, treeId, type(parent|spouse), fromPersonId, toPersonId
ChangeLog     id, table, rowId, op, before, after, at   (append-only)
```

- `parent`: from = parent, to = child. `spouse`: unordered, stored once.
- Years only in v1 (negative = BC); full dates deferred.
- Rules: no self-links, no cycles in `parent`, max 2 parents per child.
- Bundled trees: JSON in app bundle, loaded into SQLite on first open, `kind=bundled` → not editable; "Duplicate to edit".
- Photos copied into app storage, hash-named; never store picker paths.
- `originRegion` free text in v1; colour mapping by distinct value.

## Integrations & cost

None. No network, no backend, no analytics. Build/sign via Xcode + Gradle.

## Backup

Payload per `uiux` backup-restore pattern: versioned `snapshot.json` + `changes.jsonl` (full append-only change log) + `photos/` in zips. Restore always adds trees, never overwrites; the log is never replayed.

| Tier | What | Cadence | Retention |
|---|---|---|---|
| Change log (phone, DB) | one row per write: table, row, op, full before/after, time | every write | forever, append-only; travels in every zip |
| Daily copy (phone) | `daily/YYYY-MM-DD.json` snapshot, no photos (photos hash-named, kept while referenced) | every change overwrites today's file (3 s debounce, on background, before import) | 7 days |
| iCloud Drive | full `.zip`, `Files → iCloud Drive → Family Tree/Family Tree backup.zip` | once a day, only if changed | 1 file, latest overwrites |
| Manual export | same `.zip` via share sheet | on demand | user's |

- Fresh install: iCloud copy restored automatically once, before anything else; empty phone never overwrites the cloud copy.
- iCloud needs a provisioning profile with the iCloud capability (Xcode signed in to the team). Without it the build is unentitled and the row says so.
- Traceability comes from the log, not from many snapshots: daily copies give a state per day, the log says what changed in between.
- Deviation from the pattern: daily copies are restorable in-app (owner's request) — framed as rollback, not as a backup destination.

## Risks / open questions

- **Large bundled trees** (Adam → Jesus ≈ 75 generations, deep and narrow): canvas culling + "fit to generation" navigation needed; perf target 2,000 nodes at 60 fps pan on a mid phone.
- **Historical accuracy/sources**: which genealogy (Matthew vs Luke differ)? Pick one per bundled tree and state source in tree info.
- **Layout with multiple spouses / cousin marriages**: layered layout will draw crossing edges; accept in v1.
- GEDCOM v2: most-requested import format; decide after v1 usage.
