# Trees

Home and only root page (no tab bar). Every tree, user's first, bundled below.

```
Trees
────────────────────────────────────────────
MY TREES
╭──────────────────────────────────────────╮
│ My Family                                │
│ 6 people · 3 generations · edited Sep 24 ›│
├──────────────────────────────────────────┤
│ Dad's side — the Yorkshire and Dublin br…›│ ← 1 line, truncate
│ 41 people · 7 generations · edited Aug 2  │
├──────────────────────────────────────────┤
│ New tree…                                │  ← accent; New tree alert
╰──────────────────────────────────────────╯
SAMPLES                          Read-only
╭──────────────────────────────────────────╮
│ Adam to Jesus                            │
│ 77 people · Luke 3 · 🔒                 ›│
├──────────────────────────────────────────┤
│ House of Windsor                         │
│ 58 people · 1840–today · 🔒             ›│
╰──────────────────────────────────────────╯
SETTINGS                                      ← see settings.md, flat
```

Reached from: launch · back from any pushed page.

## States

```
empty (first run)
  MY TREES
    No trees yet
    Start with yourself and add outward.
    [[ New tree ]]
  SAMPLES  (always shown)

error
  ⚠ Couldn't open your data.     ( Try again )   ( Export raw file… )
```

## Overlays

```
New tree alert                        Row long-press context menu
┌────────────────────────────┐        ┌───────────────────┐
│ New tree                   │        │ Rename            │
│ ┌────────────────────────┐ │        │ Duplicate         │
│ │ e.g. Dad's side▌       │ │        │ Export…           │
│ └────────────────────────┘ │        ├───────────────────┤
│      ( Cancel ) [[ Create ]]│       │ Delete          ! │
└────────────────────────────┘        └───────────────────┘
 Create · disabled while empty         bundled: Duplicate + Export only

Delete confirm
┌──────────────────────────────────┐
│ Delete "My Family"?              │
│ 6 people and their photos will   │
│ be removed from this phone.      │
│         ( Cancel ) [[ Delete ]]! │
└──────────────────────────────────┘
```

## Interactions

| Target | Action | Result |
|---|---|---|
| row | tap | → Canvas |
| row | long-press | context menu |
| + | tap | New tree alert → Canvas (empty) |
