# PROMPT.md

## Panchanga Sky — The One-Prompt Build (Opus 5.5 → Fable 5.1 → Three.js)

**How to use:** paste the prompt block below into Opus 5.5 and attach
`SPEC.md` (the prompt's data/verification sections point into it). If your
interface cannot attach files, paste `SPEC.md` §2–§3 (math + tables) after
the prompt. The prompt is intentionally demanding about completeness and the
polish bar, and explicitly grants creative freedom on every concrete
technique — the built result must pass the Verification Checklist and the
acceptance vectors (SPEC §3 end, "Test Vectors").

---

## THE PROMPT

```
You are a senior computational astronomer, full-stack visualization engineer, 
and Vedic Jyotisha (Hindu astrology) scholar. Build a comprehensive, 
single-file interactive web application using **Fable 5.1** (F# compiled 
to JavaScript via Fable) that renders a **photorealistic night sky** with 
live Hindu Panchangam overlays.

## Context & Aesthetic

This is for a **cultural-educational visualization** — a realistic night 
sky that serves as both a scientific instrument and a religious teaching 
tool. The Hindu Panchangam measures time from celestial geometry: the 
angular relationship between Sun and Moon as seen from Earth. The goal 
is to **make the astronomy visible** so the astrology becomes 
intelligible.

**Visual style:**
- Night sky: Deep space black (#0a0a1a) with subtle indigo tint
- Golden/silver celestial bodies with bloom/glow effects
- Zodiac wheel: Thin golden ring with 12 Rashi segments
- Sanskrit text: Noto Sans Devanagari font, gold color on dark backgrounds
- Auspiciousness: Shubha (benefic) = warm gold/green glow; Ashubha (malefic) = deep terracotta/red glow
- Smooth animations, subtle star twinkle, soft atmospheric haze on horizon
- Temple-inspired borders on panels (subtle gold filigree)

## Deliverables

Generate ALL source files for a complete, buildable Fable 5.1 application:

### 1. index.html — Entry Point
- Canvas container for Three.js
- Import Three.js from CDN
- Include Noto Sans Devanagari font from Google Fonts
- Include Fable-generated JavaScript bundle
- Responsive full-screen layout

### 2. src/PanchangamData.fs — Complete Reference Tables
Immutable F# records containing ALL data. No lookups beyond these tables:

**30 Tithis** with: Index, Sanskrit name, IAST, Category (Nanda/Bhadra/Jaya/Rikta/Purna), Paksha (Shukla/Krishna), Auspicious activities list

**27 Nakshatras** with: Index, Sanskrit name, IAST, Start/End longitude (degrees), Ruling Deity, Temperament, 4 Pada boundaries

**27 Yogas** with: Index, Sanskrit name, IAST, Classification (Shubha/Ashubha), Nature description

**60 Karanas** with: Index, Sanskrit name, IAST, Type (Movable/Chara × 7 repeating pattern, or Fixed/Sthira × 4 at positions 58-60 and 1), Animal/Symbol, Core Nature, Practical Application

**7 Varas** with: Index, Sanskrit name, IAST, Day name, Ruling Planet/Deity

### 3. src/PanchangamMath.fs — Core Computation Functions
Pure F# functions (no side effects):

```fsharp
// Elongation
let elongation (lSun: float) (lMoon: float) : float =
    let raw = lMoon - lSun
    if raw < 0.0 then raw + 360.0 else raw

// Tithi index 1..30
let tithiIndex (elongation: float) : int =
    (int(elongation / 12.0)) + 1  // clamp 1..30

// Nakshatra index 1..27
let nakshatraIndex (moonLon: float) : int =
    (int(moonLon / 13.333333333333334)) + 1  // 40/3 degrees per nakshatra

// Yoga index 1..27
let yogaIndex (sunLon: float) (moonLon: float) : int =
    let sum = (sunLon + moonLon) % 360.0
    (int(sum / 13.333333333333334)) + 1

// Karana index 1..60
let karanaIndex (elongation: float) : int =
    min ((int(elongation / 6.0)) + 1) 60  // clamp: never 61
// Fixed (Sthira) karanas are indices 58, 59, 60 AND 1 (Kimstughna)

// Vara from DateTime
let varaFromDate (date: DateTime) : int =
    match date.DayOfWeek with
    | DayOfWeek.Sunday -> 1 | DayOfWeek.Monday -> 2 | DayOfWeek.Tuesday -> 3
    | DayOfWeek.Wednesday -> 4 | DayOfWeek.Thursday -> 5 | DayOfWeek.Friday -> 6
    | DayOfWeek.Saturday -> 7

// Main computation
let computePanchangam (sunLon: float) (moonLon: float) (date: DateTime) : PanchangamRecord = ...
```

### 4. src/Renderer.fs — Three.js Scene
F# bindings for Three.js rendering. Scene graph:

```
Scene
├── AmbientLight (dim blue-tinted)
├── DirectionalLight (warm, from Sun direction)
├── Starfield (points geometry, 15,000+ stars, Perlin-noise brightness)
│   ├── Stars: white/blue/yellow point particles with twinkle animation
│   ├── Atmospheric glow: radial gradient on horizon
│   └── Subtle nebula: transparent planes with color bands
├── ZodiacWheel
│   ├── Inner ring: gold line (#DAA520), radius 5
│   ├── Outer ring: thinner gold line
│   ├── 12 Rashi arcs: filled segments (gold, 30° each)
│   └── 12 Labels: Sanskrit Rashi names (Mesha, Vrishabha, ..., Meena)
├── EclipticPlane
│   └── Transparent ring, wireframe
├── Sun
│   ├── Disc: golden sphere/icosahedron with bloom
│   ├── Glow: radial gradient sprite
│   └── Label: Sanskrit + IAST
├── Moon
│   ├── Crescent: silver crescent shape
│   ├── Glow: silver halo sprite
│   └── Label: Sanskrit + IAST
├── ElongationArc
│   └── Curved line from Sun to Moon, labeled with ΔL
├── PanchangamPanel (HTML overlay)
│   ├── Tithi card
│   ├── Nakshatra card
│   ├── Yoga card
│   └── Karana card
└── UIControls (HTML overlay)
    ├── Sun longitude slider (0-359°)
    ├── Moon longitude slider (0-359°)
    ├── Preset buttons (Amavasya, First Quarter, Purnima, Third Quarter)
    ├── Visualization mode toggle (Scientific / Religious / Both)
    └── Auspiciousness indicator (glowing dot)
```

### 5. src/Starfield.fs — Photorealistic Stars
Procedural star generation:
- 15,000+ stars distributed across sky sphere
- Brightness follows magnitude distribution (log-normal)
- Colors: white, blue-white, yellow, orange (realistic stellar types)
- Twinkle animation (sinusoidal opacity variation per star)
- Atmospheric haze near horizon (blue-to-black gradient)
- Subtle nebula color bands (warm golds, cool blues, deep violets)

### 6. src/ZodiacWheel.fs — 12 Rashi Segments
12 golden segments on a ring:
- Each segment = 30° of ecliptic
- Labels: मेष (Mesha), वृषभ (Vrishabha), मिथुन (Mithuna), कर्क (Karka),
  सिंह (Simha), कन्या (Kanya), तुला (Tula), वृश्चिक (Vrishchika),
  धनु (Dhanu), मकर (Makara), कुंभ (Kumbha), मीन (Meena)
- Gold color (#DAA520) with glow effect
- Ruling planets: Mangala, Shukra, Budha, Chandra, Surya, Budha, Shukra,
  Mangala, Guru, Shani, Shani, Guru

### 7. src/CelestialBodies.fs — Sun & Moon
**Sun:**
- Golden glowing disc (positioned at L_S on ecliptic circle)
- Warm white/yellow (#FFD700)
- Radial bloom/glow shader
- Label: सूर्य (Surya) / "Surya"

**Moon:**
- Silver crescent (positioned at L_M on ecliptic circle)
- Cool silver/white (#C0C0C0)
- Phase-dependent crescent shape based on elongation
- Label: चन्द्र (Chandra) / "Chandra"

### 8. src/UI.fs — Interactive Controls

**Dual Angular Sliders:**
- Range: 0° to 359° for both Sun and Moon
- Real-time update as user drags
- Degree readout labels

**Quick-Phase Presets:**
- Amavasya (New Moon): sets ΔL = 359.999° (ε below 360°, so Tithi 30 /
  Karana 60 display — an exact ΔL = 0° would show Tithi 1/Karana 1
  because the index formulas use half-open intervals)
- First Quarter: sets ΔL = 90°
- Purnima (Full Moon): sets ΔL = 179.999° (ε below 180°, so Tithi 15 /
  Karana 30 display — exact 180° would show Tithi 16/Karana 31)
- Third Quarter: sets ΔL = 270°

**Panchangam Readout Cards:**
Each card shows:
- Sanskrit name in Devanagari (e.g., प्रतिपदा)
- IAST transliteration (e.g., Pratipada)
- Category/Classification
- Color indicator (Shubha = green/gold, Ashubha = deep red/orange)
- Additional context (deity, temperament, suitable activities)

**Visualization Mode Toggle:**
- Scientific: measurement lines, angles, coordinate grids visible
- Religious: Sanskrit glyphs, deity imagery, temple-style borders
- Both: combined view

**Auspiciousness Indicator:**
- Glowing dot in corner
- Green/gold pulse for Shubha (overall auspicious)
- Deep red/orange pulse for Ashubha (overall inauspicious)
- Combined assessment: if majority of elements are Shubha → auspicious

### 9. src/App.fs — Entry Point & Main Loop
- Initialize Three.js scene, camera, renderer
- Initialize Panchangam computation with current date
- Set up animation loop (requestAnimationFrame)
- Wire slider events to recompute + re-render
- Wire preset buttons to set angles
- Wire mode toggle to switch visualization styles
- Update all readout cards on each computation cycle

### 10. Styles — CSS
Separate stylesheet or inline in F#:
- Dark space background (#0a0a1a)
- Gold (#DAA520) and silver (#C0C0C0) accents
- Gold filigree borders on panels
- Noto Sans Devanagari for Sanskrit text
- Responsive layout (flexbox/grid)
- Smooth transitions on all interactive elements

## Required npm Dependencies
- Fable.Core
- Fable.Browser.Dom
- Three.js (imported via CDN in HTML, or via npm if using bundler)

NOTE: Do NOT use Fable.PowerPack — it has been deprecated for years.
Fable.Core + Fable.Browser.* interop packages cover everything needed.

### 11. The Wider Solar System (see SPEC.md §7)
- The five visible grahas (Budha, Shukra, Mangala, Guru, Shani) along the
  ecliptic at approximate longitudes, pickable with dual-line tooltips
  (science + mythology). Rahu/Ketu nodes as opposite shadow-points; eclipse
  affordance glows on node approach.
- Optional heliocentric inset with orbit rings, motion trails, Galilean moons
  and Saturn's rings when locked on. Distances log-compressed and LABELED
  not-to-scale. Vara readout cross-links to its ruling graha in the sky.

### 12. Place-POV — "Stand here" (see SPEC.md §4)
- From place view, re-render the stage as the sky from that lat/lon at the
  scrubber time: horizon plane, cardinal points, alt/az projection of the
  same scene (a camera/transform change, not a reload). Pole altitude matches
  latitude; sunrise anchors the Vara; clock ⇄ POV switch preserves scrub,
  locks and toggles.

### 13. The Polish Bar (see SPEC.md §8)
- Light behaves (bloom on Sun/Moon only); 3 parallax star layers + faint
  milky-way band; twinkle via per-star phase offset; nothing snaps (150–700ms
  eases, lift-off is the only hero motion, 60fps, transform/opacity only).
- First five seconds: near-black load, gold ring self-draws, cards stagger
  in, no loading spinner. Devanagari never below 14px. AUTOMATIC REJECT:
  emojis as icons, default-blue anything, oversaturated UI, layout shift,
  console warnings, clipped Devanagari.

### 14. Tooltip System v2 (see SPEC.md §4)
- Two-stage: every pickable body (star, planet, moon, node) opens a tooltip
  box PLUS a secondary chip linking to its constellation/nakshatra/system
  card ("Part of Mrigashira (Orion) — view →"). Constellation cards highlight
  their member stars.
- GLOSSARY HOVER: every term (tithi, karana, paksha, yoga, ayanamsha,
  nāḻigai, graha, Shubha…) is dotted-underlined with a plain-language hover
  tooltip, backed by one shared glossary structure. No term without an entry.

## Verification Checklist
After generation, verify ALL of these work:
- [ ] npm install completes without errors
- [ ] dotnet fable build compiles successfully
- [ ] Browser loads the night sky (photorealistic starfield visible)
- [ ] Zodiac wheel with 12 Rashi segments renders correctly
- [ ] Sun and Moon discs glow and move with slider changes
- [ ] Both dual sliders update the visualization in real-time
- [ ] All 5 Panchangam elements (Vara, Tithi, Nakshatra, Yoga, Karana) display correct Sanskrit names
- [ ] Categories and classifications match the reference tables exactly
- [ ] Auspiciousness colors work (green/gold for Shubha, red/orange for Ashubha)
- [ ] All 4 preset buttons function (Amavasya, First Quarter, Purnima, Third Quarter)
- [ ] Visualization mode toggle switches between Scientific/Religious/Both
- [ ] MODES: clock face ⇄ celestial sky via the lift-off transition
      (SPEC.md §4 (Modes)): ≤1.7 s, transform/opacity only, readout cards
      morph to HUD chips (continuity), reduced-motion = 300 ms crossfade
- [ ] CELESTIAL PICKING: clicking a star/planet/nakshatra opens the tooltip
      box per SPEC.md §4 (Modes) §2 (Devanagari-first, one "why it matters"
      line, no emojis, Phosphor/SVG icons only)
- [ ] SCRUBBER: dropdown dock + timeline per SPEC.md §5 (Time); day and
      date domains; speed presets incl. Live and 1-day/s; "Now" snap-back;
      sky-conditions readout matches the five limbs at cursor time
- [ ] PLACE VIEW: location switch per SPEC.md §6 (Place & Holy Days) —
      panchangam recomputes for the chosen lat/lon/tz, readouts animate
- [ ] HOLY-DAY FINDER: activity → ranked month grid per docs/11 §2, backed
      by Hora data/rules.json, guidance-tone copy, disclaimer shown
- [ ] SOLAR SYSTEM: five grahas pickable with dual-line tooltips; Rahu/Ketu
      nodes + eclipse glow on approach; heliocentric inset labeled not-to-scale
- [ ] POV: "Stand here" renders the horizon view from the selected place;
      scrub position, locks and toggles persist across clock ⇄ POV
- [ ] TOOLTIPS v2: star/planet/moon body box + constellation/system chip
      (opens member-highlight card); glossary hover on EVERY term with a
      plain-language one-liner; no UI term lacks a glossary entry
- [ ] POLISH: no emojis, no default-blue, staggered entrance, 60fps,
      Devanagari ≥ 14px everywhere
- [ ] FIRST FIVE SECONDS: ring self-draw + card stagger (no loading spinner)
- [ ] Sanskrit Devanagari text renders properly (Noto Sans Devanagari)
- [ ] No console errors
- [ ] Responsive layout (different screen sizes)
- [ ] Smooth slider transitions (lerp-based, no jank)

## Output Format
Generate the complete code in the following structure:
```
PanchangaSky/
├── index.html
├── package.json
├── fableconfig.json
├── src/
│   ├── App.fs
│   ├── PanchangamData.fs
│   ├── PanchangamMath.fs
│   ├── Renderer.fs
│   ├── Starfield.fs
│   ├── ZodiacWheel.fs
│   ├── CelestialBodies.fs
│   ├── UI.fs
│   └── Styles.fs
└── README.md
```

No stubs, no TODOs, no "you need to implement..." — complete, buildable code.
If any specific Three.js feature is uncertain, use the simplest equivalent 
that achieves the visual effect. Prioritize correctness of the Panchangam 
computation over visual perfection.

## Important Notes
- CAMERA MODEL: the view is geocentric — Earth sits at the origin with its
  axis fixed, and the camera observes the celestial sphere around Earth's
  rotation axis (the sky turns, Earth does not). Treat this as the default
  experience; the exact camera path and controls are yours to design.
- CREATIVE FREEDOM: every concrete choice in this prompt (libraries,
  shaders, scene-graph layout, interaction details) is a suggestion, not a
  mandate. Where a different approach produces a more stunning or more
  accurate result, choose it and note the deviation in the README.
  Feature ideas live in SPEC.md §9 (Feature Ideas).
- All 30 Tithis, 27 Nakshatras, 27 Yogas, 60 Karanas, and 7 Varas must be 
  included with correct Sanskrit names in Devanagari script
- The computation is deterministic: given L_S and L_M, everything else follows
- No external APIs, no ephemeris lookups, no network requests
- The prompt must be self-contained — do not reference external files
- The result should be a SINGLE prompt implementation ready to build and run
```

---

## After the Prompt

Once Opus 5.5 generates the code:

1. **Save** all files to `PanchangaSky/src/`
2. **Build:**
   ```bash
   cd PanchangaSky
   dotnet restore
   dotnet fable build
   ```
3. **Serve:**
   ```bash
   npx serve .
   # or python -m http.server
   ```
4. **Open** browser to the served URL
5. **Test** all sliders, presets, and readout cards
6. **Verify** against the reference tables in SPEC §3 (Data Tables)

---

## Design Decisions (Why This Way)

| Decision | Rationale |
|----------|-----------|
| Fable 5.1 (F# → JS) | Functional, type-safe, compiles clean |
| Three.js | WebGL rendering, photorealistic 3D |
| Single prompt | Forces completeness, no incremental handoffs |
| Static data tables | No external APIs, instant computation |
| Sanskrit + IAST + English | Accessible to both practitioners and learners |
| Shubha/Ashubha color coding | Makes the "religious" aspect visible through geometry |
| Slider-based input | Direct manipulation of the fundamental variables (L_S, L_M) |
| Presets for key phases | Amavasya/Purnima are the anchor points of the lunar cycle |

---

## Team Collaboration Notes

- **Shared source of truth:** SPEC §3 (Data Tables) (reference tables)
- **Math correctness:** SPEC §2 (Math) (exact formulas)
- **System design:** SPEC §1 (Architecture)
- **Build guide:** PROMPT.md appendix
- **One-prompt spec:** PROMPT.md (this file)

Coordinate on the data tables first — everything else derives from them.

---

## Appendix — F# types & Three.js notes (kept from the build guide)

### F# Data Types

The Fable 5.1 code should define:

```fsharp
// Core types
type TithiCategory = Nanda | Bhadra | Jaya | Rikta | Purna
type YogaType = Shubha | Ashubha
type KaranaType = Movable | Fixed

// Reference records
type TithiInfo = { Index: int; Name: string; IAST: string; Category: TithiCategory; Paksha: string; AuspiciousFor: string list }
type NakshatraInfo = { Index: int; Name: string; IAST: string; Start: float; End: float; Deity: string; Temperament: string }
type YogaInfo = { Index: int; Name: string; IAST: string; Classification: YogaType; Nature: string }
type KaranaInfo = { Index: int; Name: string; IAST: string; Type: KaranaType; Animal: string; Nature: string; Application: string }
type VaraInfo = { Index: int; Name: string; IAST: string; Planet: string; Nature: string }

// Computation
type Panchangam = { Vara: VaraInfo; Tithi: TithiInfo; Nakshatra: NakshatraInfo; Yoga: YogaInfo; Karana: KaranaInfo; Elongation: float; SunLon: float; MoonLon: float }

let compute (sunLon: float) (moonLon: float) (date: DateTime) : Panchangam = ...
```

---

### Build & Deploy Checklist

- [ ] `dotnet restore` — dependencies resolved
- [ ] `dotnet fable build` — F# compiles to JavaScript
- [ ] `npm install` — Node.js dependencies installed
- [ ] Browser opens to `index.html`
- [ ] Starfield renders correctly (photorealistic)
- [ ] Zodiac wheel visible with 12 segments
- [ ] Sun and Moon move with sliders
- [ ] All 5 Panchangam elements update in real-time
- [ ] Sanskrit Devanagari text renders correctly
- [ ] Auspiciousness colors work (green/gold vs red/orange)
- [ ] All 4 preset buttons function
- [ ] No console errors
- [ ] Responsive layout (works on different screen sizes)

---

### Known Considerations for Fable 5.1 + Three.js

1. **F# type system:** Opus 5.5 should generate proper discriminated unions and records.
2. **Three.js interop:** Fable can import JS modules via `import` statements or Fable.Remoting.
3. **Animation loop:** Use `requestAnimationFrame` from Fable.Browser.Dom.
4. **CSS:** Either inline styles in F# or external stylesheet linked from index.html.
5. **Devanagari font:** Include `<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari&display=swap" rel="stylesheet">` in index.html.
6. **Performance:** Keep star count reasonable (10k-50k particles). Use instanced rendering if needed.
7. **Mobile:** Touch sliders work via standard browser events. Responsive layout via CSS media queries.

---

### The Final Output

One single prompt to Opus 5.5, generating a complete Fable 5.1 application that:
- Computes all Panchangam elements from two angles
- Renders a photorealistic night sky with Three.js
- Overlays Sanskrit glyphs with religious/cultural context
- Provides full interactivity (sliders, presets, cards)
- Serves as both a scientific instrument and a cultural teaching tool