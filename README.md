# Pañcāṅga Clock — handoff bundle

Everything needed to build a Tamil-panchangam clock for desktop, phone and watch.

Start with `SPEC.md`. Open `reference/five-limbs-of-time.html` in a browser to see the film and the live clock (needs internet for three.js). Visual design: `design/` here, and the "Pañcāṅga" design system in Claude Design.

## Suggested first prompt for Claude Code
> Read SPEC.md, engine/panchanga.js and data/*.json. Set up a monorepo with a TypeScript core package that ports the engine (add ΔT polynomial and IANA timezone support) and a test suite that checks every entry in data/test-vectors.json within 1 minute. Then build the phone app's "Now" screen: the clock face described in design/clock-face.md and the readout in SPEC §4.2, matching reference/stills/12-clock-face.png. Ask me before choosing frameworks for desktop and watch.

## Layout
```
SPEC.md                 product + engineering spec
engine/panchanga.js     verified reference engine (JS, no deps)
data/test-vectors.json  60 expected days (+1 externally verified)
data/names.json         IAST / Devanagari / Tamil name tables
data/rules.json         muhūrta rules used in the film
design/tokens.json      palette, type, radii
design/clock-face.md    face geometry
reference/              the film page, its source, and 17 stills
```

## Native phone apps (`android/`, `ios/`)

The phone app is built natively on both platforms. Each has its own port of `engine/panchanga.js`,
and both ports run the same `data/test-vectors.json` suite.

| Path | What it is |
|---|---|
| `android/core/` | Pure-Kotlin engine port + tables + muhūrta rules (JVM, no Android deps) |
| `android/app/` | Jetpack Compose app: Now (clock face + readout), Sky (Kālacakra / Horizon, lift-off transition), Day timeline, Month grid + muhūrta finder, Settings |
| `ios/PanchangaCore/` | SwiftPM package: Swift engine port + tables + rules (builds and tests on macOS and Linux) |
| `ios/PanchangaClock/` | SwiftUI app with the same screens; `ios/project.yml` is the XcodeGen spec |
| `scripts/gen_tables.py` | Generates `Tables.kt` / `Tables.swift` from `data/names.json`, `data/rules.json`, `data/glossary.json`, `data/sky.json` and `docs/SPEC.md` §3; copies `data/stars.json` into both apps |
| `data/sky.json` | Graha descriptions (science + lore) and the clock-ring legend colours |
| `data/stars.json` | 1,637 stars with V ≤ 5 from the HYG Database v4.1 (CC BY-SA 4.0) |

What the phone apps show:
- **Now:** the clock face with colour-coded, labelled rings (nāḻigai gold, nakṣatra blue, tithi silver, karaṇa copper,
  yoga teal). A legend under the face highlights a ring when you tap it, and the readout rows carry the same colours.
  The centre Moon is a textured sphere lit by the real elongation, the rings draw themselves in on launch, and the hand
  sweeps continuously.
- **Sky:** the Kālacakra with textured Earth (day/night/clouds, lit for the real time of day), Moon, Sun and the five
  grahas at their true sidereal longitudes (Budha, Śukra, Maṅgala, Guru, Śani with rings, ℞ when retrograde), plus
  Rāhu/Ketu on the Moon's orbit. Distances are not to scale. The real Milky Way and bright stars sit behind. Lock-on
  flights warp the stars, and Kālacakra ⇄ Horizon zoom-crossfades.
- **Textures:** Solar System Scope, CC BY 4.0, from Wikimedia Commons; see `*/Textures/ATTRIBUTION.txt`. Rendering
  uses AGSL runtime shaders on Android 13+ (older versions fall back to flat 2D drawing) and SwiftUI Metal shaders on iOS 17+.
- **Planets:** positions come from JPL's approximate Keplerian elements (1800–2050), checked against JPL Horizons
  to within 0.1° (`PlanetsTest`).
- **Emulator tip:** on NVIDIA hosts, run the emulator with `-gpu swiftshader_indirect`; host-GPU mode crashed
  under the shaders during development.

Engine changes vs the JS reference (SPEC §3): ΔT from the Espenak–Meeus polynomials, and IANA time
zones with DST. Both ports still match all 60 vectors within 1 minute.

```bash
# Android — needs JDK 21 and the Android SDK (platform 37)
cd android
./gradlew :core:test            # engine vs data/test-vectors.json
./gradlew :app:assembleDebug    # app/build/outputs/apk/debug/app-debug.apk

# iOS — core tests run anywhere Swift 5.9+ is installed
cd ios/PanchangaCore && swift test
# the app needs a Mac with Xcode 15+:
cd ios && brew install xcodegen && xcodegen generate && open PanchangaClock.xcodeproj
```

After editing any `data/*.json` name tables, re-run `python3 scripts/gen_tables.py`.

### Discrepancies found while building (per test-vectors.md §7 — reported, not silently resolved)
- `docs/test-vectors.md` §1 says the JSON's tithi/karana indices are 1-based. In `data/test-vectors.json`
  **all four limbs are 0-based** (e.g. `"index": 26` = Kṛṣṇa Dvādaśī = tithi 27).
- §4 therefore mislabels 2026-01-15 as "Tithi 26 Kṛṣṇa Dvādaśī"; by the formula it is tithi **27**.
- §3 numbers the 2026-09-26 karaṇas "28 Viṣṭi, 29 Bava, 30 Bālava". By `k = floor(E/6)+1` they are
  **29, 30, 31**. The names and times are right; only the numbers are off by one.
The native tests assert the formula values.
