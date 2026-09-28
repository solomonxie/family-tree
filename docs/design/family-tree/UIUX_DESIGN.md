# Family Tree — UI/UX Design

Product reasoning: `DESIGN.md`. Mobile, portrait, ~60 col mocks. Per-screen
detail in `uiux/`.

## Screen map

```
      Launch
        │ first run → Trees (empty + samples)
        ▼
  ┌ Trees (home, only root page) ─────────┐
  │ MY TREES … · New tree… ──▶ (alert)   │
  │ SAMPLES …                             │
  │ SETTINGS (flat rows, no sub-pages)    │
  │   Restore… ──▶ [action sheet] ──▶ confirm
  │   Export… ──▶ [share sheet] · Import… ──▶ [file picker]
  └─ tap tree ──▶ Canvas ──tap node──▶ Person card (overlay)
                   │  🔍 ──▶ Find (sheet)      │ Open ›
                   │  ⋯ ──▶ Tree menu          ▼
                   │                    Person detail
                   └─ + Add ────────────────┴─ Edit ─▶ Person form (modal)
  [brackets] = OS-owned surface
```

One page app: no tab bar, no settings page. Settings is a flat section at the bottom of Trees; nothing folds or drills down.

## Surfaces

| Surface | Kind | Why this kind |
|---|---|---|
| Trees | root page | home; list of all trees; no tab bar |
| Settings | flat section at the bottom of Trees | owner: one page, no folding |
| Canvas | pushed page, full-bleed | the product; needs the whole screen |
| Person card | bottom sheet (detent ~35%) | peek without losing canvas position |
| Person detail | pushed page | full fields, relatives list, notes |
| Person form | modal page | multi-field edit; Cancel/Save |
| Find | sheet, full detent | searching a corpus, needs keyboard + list |
| Tree menu | context menu from ⋯ | few actions |
| New / rename tree | alert with text field | one field |
| Delete confirms | alert | destructive |

## Flows

```
Build my tree (first person)
  Trees + ─▶ "New tree" alert ─▶ Canvas (empty) ─▶ [[ Add first person ]]
        ─▶ Person form ─Save─▶ Canvas, node centred, card open

Grow the tree
  Canvas tap node ─▶ card ─▶ [ + Parent ] [ + Child ] [ + Spouse ]
        ─▶ Person form (relation preset, shown in header) ─Save─▶
        Canvas re-layouts, animates to new node
  error: 3rd parent ─▶ "Sofia already has two parents" alert, form stays

Explore a historical tree
  Trees ─▶ "Adam to Jesus" (bundled) ─▶ Canvas fit to root generation
        ─▶ 🔍 "David" ─▶ result tap ─▶ canvas animates to node, card open
  edit attempt ─▶ card shows "Read-only · Duplicate to edit…"

Trace an origin
  Canvas ⋯ ─▶ ✓ Colour by origin ─▶ nodes tinted + legend chip row
        ─▶ tap legend "Naples, Italy" ─▶ others dim to 30%

Backup / restore
  Settings ─▶ Backup ─▶ [ Export all ] ─▶ [share sheet]
                      ─▶ [ Import… ] ─▶ [file picker] ─▶ confirm alert
        ─▶ new trees appear in Trees, toast "Imported 2 trees"
  error: newer version ─▶ "This backup is from a newer app version."
```

## Components

```
PersonNode (canvas)                      variants
 ╭────────────╮                          default   outline = text colour
 │ Robert Jr. │  ← name, 1 line, trunc    selected  2pt accent outline
 │ 1958–      │  ← years; "–" if living   dimmed    30% opacity
 ╰────────────╯                          origin    fill = origin colour
  120×48pt, radius 10                    photo     24pt avatar left of name
                                         zoomed-out (<0.5×) initials only ●RJ
Edges
  │  parent→child: elbow line, from couple midpoint down to child
  ┄┄ spouse: dashed horizontal, 1.5pt

OriginLegend (canvas bottom, horizontal scroll)
  ( ● Yorkshire, England ) ( ● Naples, Italy ) ( ● London… )  selected = filled

RelationButtons (person card)
  [ + Parent ]  [ + Child ]  [ + Spouse ]     ·disabled when rule blocks, hint below

ZoomControls (canvas bottom-right)
  [ ⊕ ]
  [ ⊖ ]
  [ ⤢ ]   ← fit whole tree
```

## Copy (shared)

| Key | String |
|---|---|
| `trees.title` | Trees |
| `trees.new` | New tree |
| `trees.new.placeholder` | e.g. Dad's side |
| `common.readonly` | Read-only |
| `common.duplicate` | Duplicate to edit… |
| `person.living` | Living |
| `error.twoParents` | {name} already has two parents. |
| `error.cycle` | That would make {name} their own ancestor. |

## States (index — drawn per screen in `uiux/`)

| Screen | empty | loading | error | first-run | read-only |
|---|---|---|---|---|---|
| Trees | ✓ | – (sync DB) | DB open fail | ✓ samples | badge |
| Canvas | ✓ | ✓ layout of big tree | layout fail | coach hint | ✓ |
| Person detail | no relatives | – | person deleted | – | ✓ |
| Person form | – | saving | validation | – | n/a |
| Settings section | never exported | ⟳ in section header | toast | – | – |

## Accessibility

- Canvas nodes are accessible elements (label "Robert Jr., born 1958, Yorkshire, England"); VoiceOver order = generation, left→right.
- Find sheet is the non-gesture path to every person.
- Zoom buttons duplicate pinch. Min tap target 44pt; at low zoom, tap hits nearest node within 22pt.
- Origin colour never the only signal: legend + label in card.

## Deviations from `uiux` skill

- Relation preset in Person form shown as header text, not a picker — the relation is fixed by the button that opened it.
- Tree menu and row menus use the native action sheet: no ✓ state, so the item reads "Colour by origin" / "Turn off colour by origin".
- No ⓘ notes on backup rows: the flat section carries one-line subtitles instead.
- Person form: Died is a plain year field ("Living or unknown" placeholder), not an unfolding picker.
- Canvas "Arranging…" loading state dropped: layout of 2,000 people takes ~15 ms.
- Person form adds "Partner of" (for + Parent) and "Also parent of" (for + Spouse) next to "Also child of".
- Otherwise none; the `uiux` foundations/mobile sections not yet written (TODO) are decided here per screen.
