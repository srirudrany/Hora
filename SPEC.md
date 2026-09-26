# Pañcāṅga Clock — build spec

A clock and almanac that tells time the way a Tamil panchangam does: the day starts at sunrise, time is counted in nāḻigai, and the "hands" are the Sun and the Moon. Target platforms: desktop, phone, watch. This spec is written for Claude Code; the reference film/page in `reference/` shows every concept working.

## 1. What already exists (in this bundle)

| Path | What it is |
|---|---|
| `engine/panchanga.js` | Dependency-free astronomy + panchanga engine (JS). Verified to ~1 min against a published Tamil panchangam. |
| `data/test-vectors.json` | 60 expected outputs (5 Tamil-Nadu/South-Indian cities × 12 dates, 2026–27) plus one externally verified day. Any port must match within 1 minute. |
| `data/names.json` | Every name table: tithi (with family), nakṣatra (IAST / Devanagari / Tamil / nature), yoga, karaṇa order, vāra + lords, rāśi ↔ Tamil month, 60 saṃvatsaras, horā order, kāla-period tables. |
| `data/rules.json` | Muhūrta rules used in the film (Riktā tithis, Viṣṭi, Vyatīpāta/Vaidhṛti, nakṣatra natures and uses, wedding stars and months, Candrāṣṭamam, festival pairs). |
| `design/tokens.json`, `design/clock-face.md` | Palette, type, and the exact geometry of the clock face. The same design system lives in Claude Design. |
| `reference/five-limbs-of-time.html` | The finished film + live clock page (loads three.js r149 from jsDelivr). |
| `reference/src/` | Readable source of that page. `chapters2.js` → `buildClock()` / `updateClock()` is a working 3D clock implementation. |
| `reference/stills/` | Key frames to match visually. |

## 2. Domain model (Tamil / South Indian conventions)

- **Day** = sunrise to next sunrise (sūryodaya). Sunrise = upper limb on the horizon, refraction included (h₀ = −0.833°). Everything is local to a place.
- **Time units**: 1 day = 60 nāḻigai (ghaṭikā) · 1 nāḻigai = 24 min = 60 vināḻigai (vighaṭikā) · 1 vināḻigai = 24 s = 6 prāṇa · 1 muhūrta = 2 nāḻigai = 48 min (30 per day).
- **Zodiac**: nirayana (sidereal), Lahiri / Citrā-pakṣa ayanāṁśa (Spica at 180°). ~24°14′ in 2026.
- **The five limbs (pañcāṅga)**

| Limb | Formula | Count | Changes |
|---|---|---|---|
| Tithi | (λMoon − λSun) / 12° | 30 (Śukla 1–15, Kṛṣṇa 1–15) | every ~20–27 h |
| Vāra | weekday | 7 | at sunrise |
| Nakṣatra | λMoon(sidereal) / 13°20′ | 27 | ~daily |
| Yoga | (λSun + λMoon)(sidereal) / 13°20′ | 27 | ~daily |
| Karaṇa | (λMoon − λSun) / 6° | 60 slots, 11 names | ~twice daily |

- A limb is reported as **the one in force at sunrise**, with its end time in clock time *and* in nāḻigai:vināḻigai from sunrise. End times can fall after the next sunrise ("next day").
- **Kṣaya** tithi: begins and ends between two sunrises (never "seen" at dawn). **Adhika**: spans two sunrises.
- **Tamil calendar**: solar month = rāśi of the Sun (Meṣa→Chithirai … Mīna→Paṅguni). Saṅkrānti before sunset ⇒ that day is day 1, else next day. Year names from the 60-year cycle (Prabhava = Chithirai 1987; 2026–27 = Parābhava).
- **Daily periods**: daylight split into 8 equal parts; Rāhu kālam, Yamagaṇḍam, Kuḷikai each take one part by weekday (tables in `data/names.json`). Abhijit = 8th of 15 daytime muhūrtas.
- **Horā**: 24 per day, lords in Chaldean order (Śani, Guru, Maṅgala, Sūrya, Śukra, Budha, Candra); the first horā's lord names the day.

## 3. Engine

API (see top of `engine/panchanga.js`):
```
panchanga(y, m, d, {lat, lon, tz}) -> {
  sunrise, sunset, nextSunrise,            // Julian Days (UT)
  weekday, tamilMonth, tamilDay, samvat,
  tithi[], nakshatra[], yoga[], karana[],  // each [{idx, end}] from sunrise to next sunrise
  rahu, yama, gulika, abhijit,             // [startJD, endJD]
  sunSid, moonSid, ayanamsa }
angaAt(kind, jd) / angaStart(kind, jd) / angaEnd(kind, jd)   // kind: tithi|nakshatra|yoga|karana|rasi|solar
sidSun(jd), sidMoon(jd), elong(jd), sunriseOn(y,m,d,loc)
```
Accuracy: Sun Meeus ch. 25 (~0.01°), Moon Meeus ch. 47 main series (~10″), ΔT fixed at 69.5 s, end times by bisection. Cost per full day ≈ a few ms, fine on a watch.

**Required work**
1. Port to the shared core language you choose (recommended: TypeScript, kept as the single source of truth). If the watch needs Swift/Kotlin, port there too and run the same `test-vectors.json` in CI for every port.
2. Replace the fixed ΔT with a polynomial (Espenak–Meeus) so dates far from 2026 stay accurate.
3. Handle any IANA timezone (not just IST) and DST; civil dates must be computed in the place's zone.
4. Optional "high precision" mode (Swiss Ephemeris / VSOP87 + ELP) behind the same interface.
5. Cache: compute a day once at sunrise (all transition times), then the UI only interpolates. Recompute on location change.

## 4. Product

### 4.1 The clock face (all platforms; geometry in `design/clock-face.md`)
Concentric rings, outside in:
1. **Nāḻigai dial** – 0 at top = sunrise, clockwise to 60. Gold arc = day, blue arc = night (sunset position moves daily). Rāhu kālam (kumkum red), Yamagaṇḍam (plum), Kuḷikai (copper) as bands. The main hand sweeps once per sunrise-to-sunrise.
2. **Nakṣatra ring** – 27 sidereal segments with 12 rāśi dividers, Meṣa 0° at top, counter-clockwise. Sun and Moon markers at true sidereal longitude.
3. **Tithi ring** – 30 cells, rotates with the Sun (cell 1 starts at the Sun). The Moon's radial line crossing it gives the tithi; a mid-cell tick gives the karaṇa half.
4. **Yoga ring** – 27 cells; pointer at λSun + λMoon. Cells 17 and 27 tinted red.
5. **Centre** – the Moon rendered with its true phase (lit-sphere shader, elongation drives light direction).

Current cells highlighted; nothing snaps on the hour.

### 4.2 Readout (beside or below the face)
Vāra (IAST + Tamil), civil date · Tamil month/day · saṃvatsara, place · sunrise · sunset, big `NN:VV` nāḻigai:vināḻigai since sunrise + civil time, then one row per limb: name, "ends NN:VV · h:mm am", progress bar, "next day" flag. Then today's Rāhu kālam / Yamagaṇḍam / Kuḷikai with the active one highlighted.

### 4.3 Screens / features (phone + desktop)
- **Now** – face + readout (the live clock in the reference page).
- **Day timeline** – horizontal sunrise→sunrise strip: limb blocks with transitions, kāla periods, horā lords, Abhijit, sunset.
- **Month** – Tamil solar month grid; each day shows tithi at sunrise, nakṣatra, special days (Amāvāsyā, Pūrṇimā, Ekādaśī, Pradoṣam (Trayodaśī evening), Ṣaṣṭhī, Saṅkaṭahara Caturthī, Kārttikai, festivals by month+star).
- **Muhūrta finder** – pick an activity (wedding, gṛhapraveśa, travel, starting study/business); filter days/windows with `data/rules.json`; explain each exclusion (the film's filter scene). Always labelled as guidance.
- **Personal** – birth date/time/place → janma nakṣatra and rāśi; Candrāṣṭamam days highlighted; star-birthday reminder (nakṣatra in the Tamil birth month).
- **Learn** – the film chapters as short interactive explainers (reuse reference scenes).
- **Notifications** – before Rāhu kālam, at tithi/nakṣatra change, festival mornings, Candrāṣṭamam start/end.
- **Settings** – location (GPS or city list), script for names (IAST / Tamil / Devanagari), 12/24 h, ayanāṁśa (Lahiri default), sound (tanpura/bell) on/off.

### 4.4 Platform notes
- **Phone** (iOS + Android): full feature set; home-screen widgets (small: vāra + tithi + nāḻigai; medium: face).
- **Desktop** (macOS / Windows / Linux): menu-bar / tray showing `NN:VV · tithi`; window with the full 3D face and timeline.
- **Watch** (watchOS, Wear OS): 2D face (no WebGL); complications: nāḻigai, tithi + phase icon, nakṣatra, "Rāhu kālam in 20 min". Compute on-watch (engine is cheap) or receive the day's transition table from the phone; refresh at sunrise and at each transition.
- Suggested stack (Claude Code may choose differently, keep the shared core + vectors): TypeScript core; React Native/Expo for phone; Tauri for desktop; SwiftUI (watchOS) and Compose (Wear OS) with native engine ports.

## 5. Visual design
Use the design system in Claude Design ("Pañcāṅga") and `design/tokens.json`. Night-sky lapis ground, turmeric gold accent, kumkum red for inauspicious periods, moon silver for the Moon, copper for fixed karaṇas / Kuḷikai. Sanskrit terms in IAST italic (Tiro Devanagari Sanskrit), Tamil in Tiro Tamil, UI in Noto Sans, figures in IBM Plex Mono with tabular numerals. Chapter/ordinal numerals may use Devanagari digits.

## 6. Acceptance
- All ports pass `data/test-vectors.json` within 1 minute (times) and exact indices.
- 26 Sep 2026, Chennai reproduces the externally verified values.
- Face renders correctly at any time of day including the minutes around sunrise, a kṣaya day (2 Sep 2026 Chennai) and an adhika day (17 Oct 2026).
- Location change updates sunrise, kāla periods and the dial immediately.
- Works offline.
