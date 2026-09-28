# Canvas

The tree itself. Pushed from Trees, full-bleed under a translucent nav bar.

```
‹ Trees        My Family           🔍   ⋯
────────────────────────────────────────────
                                             ← gen 1
      ╭────────────╮┄┄┄┄╭────────────╮
      │ Robert Sr. │    │ Margaret   │
      │ 1930–2005  │    │ 1932–2010  │
      ╰────────────╯    ╰────────────╯
                   └──┬──┘
                      │                      ← gen 2
             ╭────────────╮┄┄┄┄╭────────────╮
             │ Robert Jr. │    │ Elena      │
             │ 1958–      │    │ 1961–      │
             ╰────────────╯    ╰────────────╯
                          └──┬──┘
                   ┌─────────┴─────────┐     ← gen 3
             ╭────────────╮      ╭────────────╮
             │ Sofia      │      │ Marco      │
             │ 1988–      │      │ 1991–      │
             ╰────────────╯      ╰────────────╯
                                         [ ⊕ ]
                                         [ ⊖ ]
                                         [ ⤢ ]
                                   [[ + Add ]]  ← adds unlinked person
```

Gestures: drag = pan · pinch = zoom 0.2×–3× · double-tap = zoom in 2× at
point · tap node = select + card · tap empty = deselect. A tap on a canvas
still gliding only stops it (`uiux` mobile/gestures).

Opens: last viewport per tree, else fit-to-width on root generation.

## Zoom levels

```
≥ 0.5×  full node (name + years)
< 0.5×  initials dot      ●RS ┄ ●MA
                              │
                           ●RJ ┄ ●EL
< 0.25× dots only, generation labels on left edge "Gen 12"
```

## Person card (sheet, ~35%)

```
▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁
 (photo) Robert Jr.                 Open ›
         1958 – living · Yorkshire, England
 [ + Parent ]·  [ + Child ]  [ + Spouse ]
 Has two parents                              ← why + Parent disabled
```

Read-only tree:
```
 (photo) David                       Open ›
         c. 1040 BC – 970 BC · Bethlehem
 Read-only · Duplicate to edit…
```

## Tree menu (⋯)

```
                    ┌────────────────────────┐
                    │ ✓ Colour by origin     │
                    │ Fit whole tree         │
                    │ Rename…                │
                    │ Export…                │
                    ├────────────────────────┤
                    │ Delete tree          ! │
                    └────────────────────────┘
```

## Colour by origin

```
before                                after tapping "Naples, Italy"
 ╭Robert Sr.╮┄╭Margaret╮              ╭Robert Sr.╮┄╭Margaret╮   ← 30%
    (blue)     (green)                   ░░░░        ░░░░
 ╭Robert Jr.╮┄╭Elena ╮                ╭Robert Jr.╮┄╭Elena ╮      ← Elena full
    (blue)     (amber)                   ░░░░       (amber)
 ─────────────────────────            ─────────────────────────
 (● Yorkshire) (● Dublin) (● Naples)  (● Yorkshire) (● Dublin) (●NAPLES)
```
Unknown origin = neutral grey, legend "(● Unknown)". >8 origins: top 7 + "Other".

## Find (sheet, full)

```
▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁
┌─────────────────────────────┐   ( Cancel )
│ 🔍 dav▌                     │
└─────────────────────────────┘
David                         Gen 33 · c. 1040 BC
Davidson, Mary                Gen 5 · 1902
```
Match name + origin, prefix first. Tap → dismiss, animate to node, open card.

## States

```
empty      (centred)  Nobody here yet
                      [[ Add first person ]]
loading    ⟳ Arranging 1,204 people…          ← only if layout > 300ms
error      ⚠ Couldn't draw this tree.  ( Report… )
first-run  ⌐ Pinch to zoom · tap someone to add relatives ¬   once, auto-dismiss
unlinked   people with no relations sit in a row below the last generation
```

## Interactions

| Target | Action | Result |
|---|---|---|
| node | tap | select, card |
| card Open › | tap | → Person detail |
| + Parent/Child/Spouse | tap | → Person form, relation preset |
| + Add | tap | → Person form, no relation |
| 🔍 | tap | Find sheet |
| ⤢ | tap | fit whole tree |
