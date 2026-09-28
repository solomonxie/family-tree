# Layout engine (T2.3)

Pure function: `layout(persons, relationships) → { nodes: Rect[], edges: Polyline[], generations: number }`. No RN imports.

## Steps

1. **Generation** — roots = persons with no parents. BFS down: `gen(child) = max(gen(parents)) + 1`. Spouse with no parents takes partner's gen (pull up/down). Unconnected persons → `unlinked` row below last gen.
2. **Units** — each gen's people grouped into units: single person, or couple (spouse pair adjacent). Person with 2+ spouses: `spouseA · person · spouseB`.
3. **Order** — within a gen, order units by the mean x of their parents' unit (barycentre), one top-down pass then one bottom-up pass. Ties: birth year, then name.
4. **X placement** — units packed left→right with `GAP_X`; a unit with children is centred over its children's span; resolve overlaps by shifting right, then recentre parents (2 sweeps).
5. **Edges** — spouse: straight dashed between node sides. Parent: couple midpoint (or single parent bottom) ↓ to `midY`, → across children span, ↓ to each child top (elbow).

## Constants

```
NODE      120 × 48
GAP_X     24    between units
SPOUSE_X  16    within a couple
GEN_Y     110   row pitch
```

## Tests

- Mock family (6) → snapshot of rects.
- Linear 77-gen chain → width = one node, height = 77 rows.
- 2,000 random valid persons → < 150 ms on CI, no overlapping rects.
- Cousin marriage, 2 spouses, orphan spouse, unlinked person → no throw, no overlap.
