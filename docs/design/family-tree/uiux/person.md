# Person

Detail (pushed from card) and Form (modal, add/edit).

## Person detail

```
‹ My Family                            Edit
────────────────────────────────────────────
               ╭──────╮
               │ photo│
               ╰──────╯
              Robert Jr.
     1958 – living · Yorkshire, England
╭──────────────────────────────────────────╮
│ Born                              1958   │
│ Died                            Living   │
│ Origin               Yorkshire, England  │
╰──────────────────────────────────────────╯
PARENTS
╭──────────────────────────────────────────╮
│ Robert Sr.              1930–2005      › │
│ Margaret                1932–2010      › │
╰──────────────────────────────────────────╯
SPOUSE
│ Elena                   1961–          › │
CHILDREN
│ Sofia                   1988–          › │
│ Marco                   1991–          › │
NOTES
Worked at the mill in Leeds until 1990. Mo…  ← 3 lines, "More" expands
────────────────────────────────────────────
        ( Show on tree )     ( Delete )!
```

States: no relatives → section omitted; no notes → omitted; person deleted
elsewhere → "This person was removed." + back. Read-only: Edit hidden, Delete
hidden.

Delete confirm: "Delete Robert Jr.? Their links to 5 relatives are removed
too." → toast `⌐ Robert Jr. deleted  ( Undo ) ¬`.

## Person form (modal)

```
( Cancel )    Add child of Robert Jr.   [[ Save ]]
────────────────────────────────────────────
               ╭──────╮
               │  + 📷 │                  ← photo picker
               ╰──────╯
╭──────────────────────────────────────────╮
│ Name        Sofia▌                       │
├──────────────────────────────────────────┤
│ Born        1988                         │  ← year or YYYY-MM-DD
├──────────────────────────────────────────┤
│ Died        Living                     › │  ← unfolds in place
├──────────────────────────────────────────┤
│ Sex         [ F | M | – ]                │
├──────────────────────────────────────────┤
│ Origin      London, England          ⌄  │  ← unfolds, suggests existing
│┌────────────────────────────────────────┐│
││ ✓ London, England                      ││
││   Yorkshire, England                   ││
││   Naples, Italy                        ││
│└────────────────────────────────────────┘│
├──────────────────────────────────────────┤
│ Notes                                    │
╰──────────────────────────────────────────╯
 ALSO CHILD OF
 [x] Elena                                   ← spouse of the parent, preselected
```

Header by entry: `New person` · `Add parent of X` · `Add child of X` ·
`Add spouse of X` · `Edit X`.

## Validation

```
Save·             Name empty → disabled, no message
Born  1988  Died  1970   ⚠ Died before born.
Born  3025               ⚠ Year is in the future.
Save → rule broken       alert: "Sofia already has two parents."
```
Historical: years may be negative / "c." prefix → stored as `approx: true`.

## Copy

| Key | String |
|---|---|
| `person.form.photo` | Add photo |
| `person.form.alsoChildOf` | Also child of |
| `person.detail.showOnTree` | Show on tree |
| `person.deleted.toast` | {name} deleted |
