# Settings

Flat section at the bottom of Trees. No settings page, no sub-pages, nothing folds.

```
SETTINGS                                  ⟳ Packing…   ← busy state, header right
╭──────────────────────────────────────────╮
│ Theme                 [ AUTO | Light | Dark ] │
│ Show years on nodes                      ─● │
│ Daily iCloud Drive backup                ─● │
│ Files → iCloud Drive → Family Tree · Today 4:10 PM
│ Restore a daily copy…                       │  ← accent → action sheet
│ 7 days on this phone · updated Today 4:12 PM│
│ Export all trees…                           │  ← accent → share sheet
│ Never exported                              │
│ Import from file…                           │  ← accent → file picker
│ Storage                   4 trees · 12 MB   │
│ Adam to Jesus source           Luke 3:23–38 │
│ House of Windsor source   Public royal ge…  │
│ Version                              1.0.0  │
╰──────────────────────────────────────────╯
```

Restore action sheet (flat, one row per day):
```
┌ Daily copies · last 7 days · each holds that day’s latest state ┐
│ Today 4:12 PM                                      │
│ Yesterday 9:31 PM                                  │
│ Sep 25 6:02 PM                                     │
│ Cancel                                             │
└────────────────────────────────────────────────────┘
→ alert "Restore trees as of Today 4:12 PM? 2 trees are added next to your current trees. Nothing is replaced."
```

iCloud row states (subtitle replaces the location line):
```
unsupported   row hidden (Android)
notEntitled   This build of the app isn’t signed for iCloud          switch disabled
driveOff      iCloud Drive is off on this phone                      switch disabled
              + row: Settings → your name → iCloud → iCloud Drive → turn on  (accent)
notReady      iCloud Drive isn’t ready yet — try again shortly
```

Toasts: `Restored 2 trees` · `⚠ Not a Family Tree backup.` · `⚠ This backup is from a newer app version.`
