# TestFlight external testing

App Store Connect → TestFlight → External Testing → **+** group → add the build. First build of a version goes through Beta App Review (~1 day).

## Test Information

Beta App Description (≤4000):

```
Family Tree draws your family on a pan-and-zoom canvas laid out by generation. Add a parent, child or partner from any person; give each one dates, places, origin, notes and a photo; colour the tree by region of origin; find anyone by name.

No account, no server. The app opens with two read-only sample trees (Adam to Jesus from Luke 3, and the House of Windsor). To see a filled-in personal tree: scroll Trees to the bottom → Demo data (fictional families in a separate store; turn it off to return).

What's in this beta:
• Canvas with generation layout, pan/zoom, add parent / child / partner
• Person details with photo
• Colour by origin, search by name
• Export/import .zip backup and GEDCOM (.ged)
• Daily iCloud Drive backup (on when iCloud Drive is enabled)
• Remove all app data
```

Feedback Email: `you@example.com`

## Contact Information

| Field | Value |
|---|---|
| First Name | TODO |
| Last Name | TODO |
| Phone number | TODO — yours, with country code (`+1 …`) |
| Email | `you@example.com` |

## Sign-In Information

Sign-in required: **off** (no account in the app). Leave User Name / Password blank.

Review Notes: paste the App Review Notes block from [listing.md](listing.md) if present.

## Per build: What to Test

```
Open both sample trees and pan/zoom around. Create your own tree, add yourself, a parent, a partner and a child, set origins and colour by origin. Export a .zip, remove all app data, import it back. Turn on Demo data at the bottom of Trees and off again. Report anything confusing or any layout glitch with a screenshot via TestFlight.
```
