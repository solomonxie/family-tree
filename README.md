# Family Tree

> 🚧 Work in progress — skeleton only, not yet functional.

Draw and explore family trees visually — pan and zoom around a canvas of connected people the way you'd sketch a tree on paper, but on your phone. Start with your own family: parents, grandparents, siblings, children, spouses, laid out generation by generation.

The same canvas works for lineages beyond your own household — historical and religious genealogies (Adam to Jesus, royal lines, founding lineages) that are usually locked behind clunky desktop software or paywalled apps. Anyone should be able to open a tree like that and just look at it.

Beyond names and dates, each person can carry an origin/region field, so a tree can double as a way to trace where a family line came from — following ancestry and regional/ethnic origins back through generations instead of just recording birthdays.

## Setup

```bash
npm install && npx expo start
```

## Status

This is a skeleton: navigation, screens, and a static placeholder tree canvas exist, but nothing is wired to real data yet. There is no persistence layer — a local database (e.g. `expo-sqlite`) is a future TODO. Pan/zoom gestures on the tree canvas are also a future TODO; the canvas currently renders a fixed mock layout via `react-native-svg`.
