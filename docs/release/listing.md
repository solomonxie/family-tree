# Publishing Family Tree — step by step

Every field below is ready to paste. `TODO` = only you can supply it.
App Store Connect paths start at **Apps → Family Tree → Distribution →**.

| | |
|---|---|
| Bundle ID | `com.example.familytree` |
| SKU | `familytree-ios` |
| Version | `1.0` (`MARKETING_VERSION`; Settings → Version shows it with the build number) |
| Build | timestamp, set by `make release` |
| Devices | iPhone only (`TARGETED_DEVICE_FAMILY = 1`) — no iPad screenshots needed. Review still runs it on iPad (compatibility mode); it uses the UIScene lifecycle (`SceneDelegate` in `AppDelegate.swift`), required from iOS 27 |
| Min iOS | 16.0 |
| Privacy Policy URL | `https://github.com/solomonxie/family-tree/blob/master/docs/release/privacy-policy.md` |
| Support URL | `https://github.com/solomonxie/family-tree/issues` |

---

## 1. Apple Developer account

- [ ] developer.apple.com → Account → membership **active** (paid, Individual is fine).
- [ ] App Store Connect → **Business** (Agreements, Tax, and Banking) → no pending agreement banner. Free app: no Paid Apps agreement or banking needed.

## 2. Xcode

- [ ] Xcode → Settings → **Accounts** → signed in with the developer Apple ID; the team shows under it.
- [ ] `cp ios/Local.xcconfig.example ios/Local.xcconfig`, set your Team ID (developer.apple.com → Membership). Gitignored — never commit it; the repo is public.
- [ ] `npm run pods` succeeds.

## 3–4. Bundle ID and iCloud container

Already created by automatic signing during device builds. Verify at
developer.apple.com → Certificates, Identifiers & Profiles:

- [ ] Identifiers → `com.example.familytree` → **iCloud** checked (iCloud Documents), container `iCloud.com.example.familytree` assigned.
- [ ] Entitlements don't pin an environment; `ios/ExportOptions.plist` sets `iCloudContainerEnvironment = Production` at export.

## 5. Run on the iPhone

- [ ] `make ios` → Release build on the paired iPhone; it must say "Built with iCloud." Smoke-test: new tree, add first person, + Parent / + Child / + Spouse, add a photo, Find, colour by origin, open both samples, export, import a `.ged`, Settings → Demo data on/off, iCloud row shows On and a time, Version shows `1.0 (build)`, deep link `familytree://tree/demo-0` opens from a cold start. Last: Settings → Remove all app data → only the samples remain.

## 6. Create the app in App Store Connect

**Apps → + → New App**

| Field | Value |
|---|---|
| Platforms | iOS |
| Name | `Family Tree` (if taken: `Family Tree: Trace Inheritance` — 30/30) |
| Primary Language | English (U.S.) |
| Bundle ID | `com.example.familytree` (dropdown) |
| SKU | `familytree-ios` |
| User Access | Full Access |

App names are unique store-wide and "Family Tree" is generic — expect to need the fallback. The home-screen name stays `Family Tree` either way (`CFBundleDisplayName`).

## 7. Listing content

Fill the pages in [App Store Connect pages](#app-store-connect-pages) below. Screenshots: see [Screenshots](#screenshots).

## 8–9. Archive and upload

```
make release
```

Runs typecheck, lint and tests, then archives Release, signs for App Store and uploads (`scripts/release-ios.sh`) — no Xcode clicks. Default `STORE=us`; one binary serves every storefront.
Processing in App Store Connect: 15–60 min, then an email "build has completed processing".

Fallback, Xcode GUI: open `ios/FamilyTree.xcworkspace` → destination **Any iOS Device (arm64)** → Product → **Archive** → Organizer → **Distribute App** → App Store Connect → Upload.

## 10. TestFlight

- [ ] App Store Connect → **TestFlight** → the build shows no "Missing Compliance" (see [Export compliance](#export-compliance)).
- [ ] Internal Testing → **+** group `Me` → add your Apple ID → install via the TestFlight app on the iPhone.
- [ ] Same smoke test as step 5, on the TestFlight build (this is the exact binary Apple reviews). Check the iCloud row specifically — it's the Production container now.

## 11. Submit

- [ ] `iOS App → 1.0 Prepare for Submission` → **Build** → **+** → pick the build.
- [ ] Every page in [App Store Connect pages](#app-store-connect-pages) filled; App Privacy published.
- [ ] **Add for Review** → **Submit for Review**.

## 12. App Review

- Typical: 24–48 h. Status: Waiting for Review → In Review → Pending Developer Release.
- Rejection → **Resolution Center**: reply there, or fix, re-run `make release` (new build number is automatic), attach the new build, resubmit.
- Likely questions: what the bundled sample trees are (notes explain the sources), iCloud backup (on by default, user's own iCloud Drive, switch in Settings), deleting data (Settings → Remove all app data). All answered in the App Review Notes.

### Guideline 2.1 "Information Needed" (new developer accounts)

Apple wants a screen recording plus answers 2–6. The answers are the App Review Notes further down — paste them into the reply **and** into App Review → Notes.

Record the build Apple will review. If it's a new build, upload it first (`make release`), pick it under **Build** on the `1.0` page, and install it from TestFlight.

Recording (the build Apple reviews, on the iPhone, current iOS):
1. iPhone Settings → Control Center → add **Screen Recording**. Turn on Do Not Disturb.
2. In the app, scroll Trees to the bottom → Demo → **Demo data** on (fictional families; keeps your real relatives out). Swipe the app away.
3. Start recording, then launch the app from the Home Screen.
4. ~2 minutes:
   1. Trees: My trees (demo families) and Samples.
   2. Open **Hartwell & Lin Family** → pan, pinch-zoom, fit.
   3. Tap a person → card → **Open ›** → detail (dates, places, notes, relatives) → back.
   4. Card → **+ Child** → type a name and year → Save → canvas re-lays out.
   5. Edit that person → add a photo from the system picker → Save.
   6. ⋯ → **Colour by origin** → tap a legend chip.
   7. 🔍 Find → type a name → jump to it.
   8. Back → open **House of Windsor** → tap a person → card shows "Read-only · Duplicate to edit…".
   9. Trees → Settings: iCloud Drive backup row (On, switch), Restore a daily copy, Export all trees (share sheet, cancel), Import from file (picker, cancel), Remove all app data (dialog, cancel), Demo data.
5. Stop. Photos → trim → share the video.

Reply: `App Review` in App Store Connect → the message → **Reply**, attach the video (or an unlisted link if too large), paste:

```
Hello, thank you for the review. Answers below, and the same text is now in the App Review Information notes.

1. Screen recording attached, captured on an iPhone running the latest iOS, starting from launch. The app has no account registration or login (so no account deletion flow); all app data can be deleted in Settings → Remove all app data. No user-generated content is shared with others, and there is no paid content.

[paste the App Review Notes block from PURPOSE AND AUDIENCE to the end]
```

## 13. Release

- [ ] Status **Pending Developer Release** → `1.0` page → **Release This Version**. Live in the store within ~24 h.
- [ ] `git tag v1.0 && git push --tags`.

---

## Screenshots

Apple requires one set: **iPhone 6.9" Display**, exactly `1320 × 2868`. App Store Connect
scales it for smaller phones.

Captured 2026-10-03 (simulator, demo data): 5 shots in `docs/release/screenshots/` — canvas, person, add, trees, sample. Missing vs. the list below: colour by origin, find, settings (need taps). The canvas shot is the weakest: the tree is small. Recapture on the paired iPhone; any portrait iPhone shot (~0.46 aspect) resizes without visible distortion.

1. `make ios` — Release build. Then scroll Trees to the bottom → **Demo data** on. Only fictional demo families and the public sample trees on screen — never a real family's names or photos.
2. Status bar: charged battery, Wi-Fi, no banners. Light theme (Settings → Theme → Light) for a consistent set.
3. Shots, in upload order (first two are what people see). Deep links go through `scripts/screenshot.sh <link> <out.png> [wait]`, which opens them on the unlocked iPhone and captures, no taps:
   1. **Canvas** — `tree/demo-0` (Hartwell & Lin, whole tree; zoom to a 3–4 generation slice)
   2. **Colour by origin** — `tree/demo-0`, then ⋯ → Colour by origin; capture by hand (side button + volume up)
   3. **Person** — `person/demo-0:thomas` (dates, places, notes, relatives)
   4. **Add a relative** — `add/demo-0`, or tap a node → + Child; capture mid-entry by hand
   5. **Find** — `find/demo-0`, type a name; by hand
   6. **Trees** — `trees` (demo families + Samples)
   7. **Sample** — `tree/sample-adam-to-jesus` (read-only historical tree)
   8. **Settings** — `trees`, scrolled to the bottom (iCloud backup, export/import); by hand
4. Save as `01-canvas.png`, `02-origin.png` … in one folder (AirDrop hand-taken ones to the Mac), then:

```
make screenshots SHOTS=~/Desktop/shots
```

Outputs go to `docs/release/screenshots/`, JPEG, alpha stripped. Drag the `6.9` files into the 6.9" slot.

App Preview video: skip for 1.0.

---

## App Store Connect pages

### `iOS App → 1.0 Prepare for Submission`

| Field | Value |
|---|---|
| Previews and Screenshots | [Screenshots](#screenshots) |
| Promotional Text | below |
| Description | below |
| Keywords | below |
| Support URL | `https://github.com/solomonxie/family-tree/issues` |
| Marketing URL | leave blank |
| Version | `1.0` |
| Copyright | `2026 solomonxie` |
| Routing App Coverage File | leave blank |
| Build | the uploaded build (step 11) |
| App Review → Sign-In Required | Off |
| App Review → Contact First / Last Name | TODO |
| App Review → Phone | TODO (with country code, e.g. `+1 …`) |
| App Review → Email | TODO |
| App Review → Notes | below |
| App Review → Attachment | none |
| Version Release | **Manually release this version** |

Promotional Text (144/170, no price wording — Guideline 2.3.7):

```
Draw your family tree on a zoomable canvas, trace where each line came from, and keep it all on your iPhone. No account, no server, no tracking.
```

Description:

```
Family Tree lets you draw and explore family trees on your iPhone. Everyone is laid out generation by generation on a canvas you can pan and zoom, and you grow the tree from any person: add a parent, a child, or a partner in a couple of taps.

No account. No subscription. No server holding your family's details.

BUILD YOUR TREE
• Start from one person and add parents, children, and partners
• Names, birth and death dates and places, origin, notes, and a photo for each person
• Rules that keep the tree sound: at most two parents, no one their own ancestor
• Several trees side by side — Mum's side, Dad's side, your partner's family

EXPLORE
• Pan, pinch-zoom, and fit the whole tree to the screen
• Colour by origin: tint everyone by where they came from and trace a line across countries
• Find anyone by name and jump straight to them
• Person pages with dates, places, notes, and every relative one tap away

SAMPLE TREES
• Adam to Jesus, following the genealogy in Luke 3
• The House of Windsor, from Queen Victoria to today
• Read-only — duplicate one to make it your own

YOUR DATA
• Everything lives on your iPhone and works with the network off
• Daily backup to your own iCloud Drive, visible in the Files app — turn it off any time
• The last 7 days of daily copies kept on the phone to restore from
• Export a .zip with every tree and photo; import it back, or import a GEDCOM (.ged) file from other genealogy software
• Remove all app data in one step from Settings

Free, with no ads, no analytics, and no tracking.
```

Keywords (94/100 — "family" and "tree" are omitted, the name already indexes them):

```
genealogy,ancestor,lineage,pedigree,relatives,heritage,gedcom,roots,kinship,offline,descendant
```

App Review Notes (also the Guideline 2.1 answers Apple asked to keep here):

```
No account or login. The app opens on the Trees screen with two read-only sample trees. To see a filled-in personal tree, scroll Trees to the bottom and turn on "Demo data": it switches to fictional families in a separate store (turn it off to return).

PURPOSE AND AUDIENCE
Family Tree is a genealogy app for anyone who wants to record and explore their family history privately on their own iPhone. You build a tree person by person (parents, children, partners), add dates, places, origin, notes and photos, and explore it on a zoomable canvas laid out by generation. It solves the problem that most family-tree tools require an account and upload your relatives' details to a company's servers: here there is no account, no server and no network use; the data stays on the device and in the user's own iCloud Drive backup.

HOW TO USE THE MAIN FEATURES (no setup needed)
- Trees screen: My trees and Samples. "New tree…" creates a tree.
- Tap a tree: the canvas. Pan, pinch to zoom, fit button bottom-right.
- Tap a person: a card with + Parent / + Child / + Spouse; "Open ›" shows full details. Edit adds dates, places, origin, notes and a photo (system photo picker; only the chosen photo is copied).
- Canvas ⋯ menu: Colour by origin (legend chips filter by origin), Rename, Export, Delete tree.
- 🔍 (canvas header): find a person by name.
- Settings (bottom of Trees): theme, daily iCloud Drive backup (on/off switch), restore a daily copy, export all trees (.zip via share sheet), import (.zip backup or GEDCOM .ged), Remove all app data, demo data.

DELETING DATA
Deleting a person or tree also removes it from the app's change history. Settings → Remove all app data deletes every tree, photo, the history, settings and the on-device daily copies after a confirmation; if an iCloud Drive backup exists, the user chooses whether to delete it too.

SAMPLE CONTENT
Two read-only trees ship in the app, compiled by the developer from public sources: "Adam to Jesus" (the genealogy in Luke 3:23-38) and "House of Windsor" (public royal genealogy). Names, years and relationships only; no photos or third-party text.

EXTERNAL SERVICES
- Apple iCloud Drive: a daily backup file is written to the user's own iCloud Drive (on by default when iCloud Drive is enabled; Settings → Daily iCloud Drive backup shows it and turns it off). We have no access to it.
The app makes no network requests of its own. No analytics, advertising, crash reporting, authentication or payment services. We run no server.

REGIONAL DIFFERENCES
None. The app works the same in every region and is in English.

REGULATION
Family Tree is a personal record-keeping tool. It does not provide DNA, health, legal or financial services, and does not share data with anyone. No third-party protected material is included.

All data is stored on the device and, optionally, in the user's own iCloud Drive. We operate no server and receive no user data.
```

What's New: not shown for a first version. From 1.1 on, write it here.

### `General → App Information`

| Field | Value |
|---|---|
| Name | `Family Tree` (or the fallback from step 6) |
| Subtitle (30/30) | `Genealogy that stays on device` |
| Category — Primary | Reference |
| Category — Secondary | Lifestyle |
| Content Rights | **No**, it does not contain, show, or access third-party content (sample trees are public-domain facts compiled by you; no third-party text or images) |
| Age Rating | **Edit** → answer below → result **4+** |
| License Agreement | Apple standard EULA (default) |
| Privacy Policy URL | `https://github.com/solomonxie/family-tree/blob/master/docs/release/privacy-policy.md` |

Age rating questionnaire — every answer:

| Section | Answer |
|---|---|
| Parental controls / age assurance | No |
| Unrestricted web access | No |
| User-generated content | No (notes and photos stay on the device; nothing is shared or shown to other users) |
| Messaging and chat | No |
| Advertising | No |
| Violence, sexual content, profanity, horror, mature themes | None |
| Alcohol, tobacco, drugs | None |
| Medical or treatment information / health & wellness | None |
| Gambling, simulated gambling, contests, loot boxes | None / No |
| Made for Kids | No |

Regional (Korea, China Mainland, Vietnam) — leave unset.
**Digital Services Act** trader status: **Not a trader** (free, no monetization) — if App Store Connect blocks EU availability without it, answer this in Business → Compliance.

### `App Store → Trust & Safety → App Privacy`

| Field | Value |
|---|---|
| Privacy Policy URL | same as above |
| Do you or your third-party partners collect data from this app? | **No, we do not collect data from this app** |

Then **Publish**. Label shows "Data Not Collected".

Why that's true (from the code):
- No network calls in `src/` (no `fetch`, no HTTP library); no analytics/crash SDK in `package.json` or `ios/Podfile.lock`.
- Family data (names, dates, places, notes, photos — personal data about relatives) is stored in op-sqlite and the app's Documents folder on the device.
- The only off-device copy is the daily backup zip in the user's own iCloud Drive container (`iCloud.com.example.familytree`, `ios/LocalModules/ICloudDrive`), on by default, switch in Settings; Remove all app data can delete it. It sits in the user's Apple account; you never receive it, so it isn't "collected". Disclosed in the privacy policy.
- Photo picker: `launchImageLibrary` (system picker, no library permission); only the chosen photo is copied.
- `PrivacyInfo.xcprivacy`: `NSPrivacyCollectedDataTypes` empty, `NSPrivacyTracking` false — matches.

Re-check before each submission:

```
grep -rniE "fetch\(|https?://|analytics|firebase|sentry|amplitude|mixpanel|posthog|bugsnag" src package.json ios/Podfile.lock
```

### `App Store → Trust & Safety → App Accessibility`

Skip for 1.0 rather than over-claim.

### `App Store → Monetization → Pricing and Availability`

| Field | Value |
|---|---|
| Base Country or Region | United States (USD) |
| Price | **Free** ($0.00) |
| Availability | All countries or regions **except China mainland** for 1.0 (it needs an ICP filing number; add later once you have one) |
| Tax Category | App Store software (default) |
| iPhone and iPad Apps on Apple Silicon Macs | **Off** for 1.0 (iCloud Files paths and the document picker are untested on Mac) |
| Apple Vision Pro | Off |

### Not needed for 1.0

In-App Purchases, Subscriptions, In-App Events, Custom Product Pages, Product Page Optimization, Promo Codes, Game Center, Featuring Nominations, Ratings and Reviews, History.

---

## Export compliance

No page for it in App Store Connect — nothing to fill in. `ITSAppUsesNonExemptEncryption = false`
in `Info.plist` answers it at upload (no network requests; SHA-256 only to name photo files; plain zip, no encryption → exempt).
Verify: TestFlight → the build is **not** marked "Missing Compliance".
Only if it is: **Manage** → **None of the algorithms mentioned above**.

---

## Localization

The app UI is English only, so the listing is English (U.S.) only for 1.0. No 简体中文 listing until the app ships `zh`.
