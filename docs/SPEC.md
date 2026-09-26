# SPEC.md

## Panchanga Sky — Consolidated Product & Engineering Spec

**Everything a builder needs lives in this one file**: product overview, the
exact math, the complete data tables, the two modes and their transition,
time scrubbing, place view, the holy-day finder, the wider solar system, and
the polish bar. `PROMPT.md` is the one-prompt instruction you feed to Opus
5.5 alongside this file; `README.md` is the map.

Conventions kept from the review rounds: index formulas are authoritative,
boundary conventions are documented inline where they bite, and every table
below was cross-validated against the teammate Hora project's engine and
name tables (§10).

## 1. Product Overview & Architecture

### Core Concept
A **real-time astronomical visualization** engine that computes the Hindu Panchangam (calendar) from the **angular positions of the Sun and Moon** and renders everything in a **photorealistic night sky** with religious/cultural overlays.

The panchangam is not a calendar — it is a **sidereal clock** based on the dynamic relationship between the Sun (Surya) and Moon (Chandra) as seen from Earth. Its five limbs are:

| Limb  | Sanskrit    | Measure                     | Domain       | Range               |
|-------|-------------|-----------------------------|--------------|---------------------|
| Vara  | वार          | Solar weekday                | 7 divisions  | 1 (Sunday) .. 7     |
| Tithi | तिथि         | Lunar elongation (ΔL)        | 30 divisions | 1 (Pratipada) .. 30 |
| Nakshatra| नक्षत्र     | Moon's absolute longitude    | 27 divisions | 1 (Ashwini) .. 27   |
| Yoga  | योग          | Sun + Moon combined lon.    | 27 divisions | 1 (Vishkambha) .. 27|
| Karana| करण          | Half of a Tithi (6° step)    | 60 divisions | 1 (Kimstughna) .. 60|

**All five elements derive from exactly two inputs:** Sun longitude (L_S) and
Moon longitude (L_M), both sidereal ∈ [0°, 360°). One change → everything else
updates instantly, live. The product is a **cultural learning tool meets
astronomy**: two modes (a Kālacakra clock face and a celestial night sky),
joined by a lift-off transition, with time scrubbing, place-aware panchangam,
and a holy-day finder.

---

## 2. The Math (authoritative)

## Panchanga Sky — Exact Mathematical Formulas

### Coordinate System

**Geocentric, sidereal, ecliptic coordinates:**
- Origin: Earth center
- Reference plane: Ecliptic (Sun's apparent annual path)
- 0° reference: **Lahiri Ayanamsha** — starts at **Revati (ζ Piscium)** / opposite **Chitra (Spica)**
- Direction: Counter-clockwise (eastward) along ecliptic
- Units: Degrees (0° to 360°)

### Primary Inputs

| Variable | Name              | Range          | Typical Daily Motion |
|----------|-------------------|----------------|----------------------|
| L_S      | Sun Longitude     | [0, 360)       | ~1°/day             |
| L_M      | Moon Longitude    | [0, 360)       | ~13.2°/day          |

---

## Core Formulas

### 1. Elongation (ΔL) — The Fundamental Angle
```
ΔL = (L_M - L_S) mod 360°
```
Where `mod` returns a value in [0, 360).

**In code:**
```js
function elongation(lSun, lMoon) {
  const raw = lMoon - lSun;
  return raw < 0 ? raw + 360 : raw;
}
```

**Meaning:** Angular distance from Sun to Moon along the ecliptic (eastward).
- ΔL = 0° → Amavasya (New Moon, Sun-Moon conjunction)
- ΔL = 180° → Purnima (Full Moon, Sun-Moon opposition)

---

### 2. Tithi (Lunar Day) — 30 Divisions of 12° Each

**Formula:**
```
Tithi Index = ⌊ΔL / 12°⌋ + 1
```
Result: Integer 1..30

**Paksha (Fortnight):**
- 1..15 → **Shukla Paksha** (Waxing, Bright Fortnight) — culminating at Purnima
- 16..30 → **Krishna Paksha** (Waning, Dark Fortnight) — culminating at Amavasya

**Category (for auspiciousness):**
| Category | Sanskrit | Shukla Tithis | Krishna Tithis | Quality |
|----------|----------|---------------|----------------|---------|
| Nanda    | नन्दा     | 1, 6, 11      | 16, 21, 26     | Prosperity, joy-giving |
| Bhadra   | भद्रा     | 2, 7, 12      | 17, 22, 27     | Beneficent, productive |
| Jaya     | जया      | 3, 8, 13      | 18, 23, 28     | Victory, courageous |
| Rikta    | रिक्ता    | 4, 9, 14      | 19, 24, 29     | Hollow, draining |
| Purna    | पूर्णा     | 5, 10, 15     | 20, 25, 30     | Complete, nourishing |

**Tithi boundaries (exact ΔL values):**
```
Tithi 1 (Shukla Pratipada):    ΔL ∈ [0°,   12°)
Tithi 2 (Shukla Dwitiya):      ΔL ∈ [12°,  24°)
...
Tithi 15 (Purnima):            ΔL ∈ [168°, 180°]
Tithi 16 (Krishna Pratipada):  ΔL ∈ [180°, 192°)
...
Tithi 30 (Amavasya):           ΔL ∈ [348°, 360°)
```

---

### 3. Nakshatra (Lunar Mansion) — 27 Divisions of 13°20' Each

**Formula:**
```
Nakshatra Index = ⌊L_M / (40°/3)⌋ + 1
```
Where 13°20' = 40/3 = 13.333333...°

Result: Integer 1..27

**Span per Nakshatra:** 13°20' = 13.333...° = 40/3°

**Boundary values (Moon longitude L_M):**
```
Ashwini (1):      L_M ∈ [0°,         13°20')
Bharani (2):      L_M ∈ [13°20',     26°40')
Krittika (3):     L_M ∈ [26°40',     40°)
Rohini (4):       L_M ∈ [40°,        53°20')
Mrigashira (5):   L_M ∈ [53°20',     66°40')
Ardra (6):        L_M ∈ [66°40',     80°)
Punarvasu (7):    L_M ∈ [80°,        93°20')
Pushya (8):       L_M ∈ [93°20',     106°40')
Ashlesha (9):     L_M ∈ [106°40',    120°)
Magha (10):       L_M ∈ [120°,       133°20')
Purva Phalguni (11): L_M ∈ [133°20',   146°40')
Uttara Phalguni (12): L_M ∈ [146°40',   160°)
Hasta (13):       L_M ∈ [160°,       173°20')
Chitra (14):      L_M ∈ [173°20',    186°40')
Swati (15):       L_M ∈ [186°40',    200°)
Vishakha (16):    L_M ∈ [200°,       213°20')
Anuradha (17):    L_M ∈ [213°20',    226°40')
Jyeshtha (18):    L_M ∈ [226°40',    240°)
Mula (19):        L_M ∈ [240°,       253°20')
Purva Ashadha (20): L_M ∈ [253°20',   266°40')
Uttara Ashadha (21): L_M ∈ [266°40',   280°)
Shravana (22):    L_M ∈ [280°,       293°20')
Dhanishta (23):   L_M ∈ [293°20',    306°40')
Shatabhisha (24): L_M ∈ [306°40',    320°)
Purva Bhadrapada (25): L_M ∈ [320°,    333°20')
Uttara Bhadrapada (26): L_M ∈ [333°20',   346°40')
Revati (27):      L_M ∈ [346°40',    360°)
```

**Padas (quarters):** Each Nakshatra = 4 Padas of 3°20' each. Total 108 Padas.

---

### 4. Yoga (Combined Solar-Lunar Longitude) — 27 Divisions

**Formula:**
```
Combined Longitude = (L_S + L_M) mod 360°
Yoga Index = ⌊(L_S + L_M) mod 360° / (40°/3)⌋ + 1
```

Result: Integer 1..27

**Span per Yoga:** 13°20' (same as Nakshatra)

**Yoga Classifications:**

| # | Name         | IAST         | Classification | Notes                    |
|---|--------------|--------------|----------------|--------------------------|
| 1 | Vishkambha   | विष्कम्भ      | Ashubha        | Obstruction, friction    |
| 2 | Priti        | प्रीति        | **Shubha**     | Love, affection          |
| 3 | Ayushman     | आयुष्मान      | **Shubha**     | Long life                |
| 4 | Saubhagya    | सौभाग्य       | **Shubha**     | Good fortune             |
| 5 | Shobhana     | शोभन         | **Shubha**     | Beautiful, splendid      |
| 6 | Atiganda     | अतिगण्ड      | Ashubha        | Severe complications     |
| 7 | Sukarma      | सुकर्मा       | **Shubha**     | Good actions             |
| 8 | Dhriti       | धृति         | **Shubha**     | Steadfastness            |
| 9 | Shula        | शूल          | Ashubha        | Sharp conflict, pain     |
|10 | Ganda        | गण्ड          | Ashubha        | Emotional knots          |
|11 | Vriddhi      | वृद्धि        | **Shubha**     | Growth, prosperity       |
|12 | Dhruva       | ध्रुव         | **Shubha**     | Fixed, stable            |
|13 | Vyaghata     | व्याघात       | Ashubha        | Threatening, destructive |
|14 | Harshana     | हर्षण         | **Shubha**     | Joy, delight             |
|15 | Vajra        | वज्र          | Ashubha        | Volatile, piercing       |
|16 | Siddhi       | सिद्धि        | **Shubha**     | Accomplishment           |
|17 | Vyatipata    | व्यतिपात      | Ashubha        | Major calamity           |
|18 | Variyan      | वरियान        | **Shubha**     | Excellent                |
|19 | Parigha      | परिघ         | Ashubha        | Barriers, delays         |
|20 | Shiva        | शिव          | **Shubha**     | Auspicious, benevolent   |
|21 | Siddha       | सिद्ध         | **Shubha**     | Perfected, accomplished  |
|22 | Sadhya       | साध्य         | **Shubha**     | Attainable, possible     |
|23 | Shubha       | शुभ          | **Shubha**     | Auspicious               |
|24 | Shukla       | शुक्ल         | **Shubha**     | Bright, pure             |
|25 | Brahma       | ब्रह्म         | **Shubha**     | Creative, expansive      |
|26 | Indra        | इन्द्र         | **Shubha**     | Power, leadership        |
|27 | Vaidhriti    | वैधृति       | Ashubha        | Chaotic dissipation      |

> **Erratum in the source guide (verified):** the Panchanga Reference Guide's
> §5.2 worked example (Sun 110° + Moon 45° = 155°) labels the result "Ganda
> Yoga". 155° falls in segment 12 (146°40′–160°) = **Dhruva**; Ganda is
> segment 10. The formula and the table above are correct — follow them, not
> the guide's example label. (Documented independently in Hora's CLAUDE.md.)

---

### 5. Karana (Half-Tithi) — 60 Divisions of 6° Each

**Formula:**
```
Karana Index = ⌊ΔL / 6°⌋ + 1
```
Result: Integer 1..60

**Structure:**
- **7 Movable (Chara) Karanas** — repeat in an 8-cycle loop (48 total)
- **4 Fixed (Sthira) Karanas** — occur once each around Amavasya

**Cycle Architecture:**
```
Karana  1: Kimstughna (Fixed #4) — 1st half of Shukla Pratipada
Karanas 2–57: Movable Loop × 8 cycles
  Sequence: Bava → Balava → Kaulava → Taitila → Gara → Vanija → Vishti
Karana 58: Shakuni (Fixed #1) — 2nd half of Krishna Chaturdashi
Karana 59: Chatushpada (Fixed #2) — 1st half of Amavasya
Karana 60: Naga (Fixed #3) — 2nd half of Amavasya
```

**Movable Karanas (Chara):**
| #  | Name     | Animal/ Symbol | Nature          | Suitable Activities                          |
|----|----------|----------------|-----------------|---------------------------------------------|
| 2  | Bava     | Lion           | Commanding      | Leadership, fitness, initiation             |
| 3  | Balava   | Tiger/Leopard  | Intellectual    | Study, spiritual rituals, sacred tasks      |
| 4  | Kaulava  | Boar/Pig       | Cooperative     | Social alliances, contracts, partnerships   |
| 5  | Taitila  | Rhinoceros     | Defensive       | Construction, official paperwork, boundaries|
| 6  | Gara     | Elephant       | Diligent        | Agriculture, groundwork, physical labor     |
| 7  | Vanija   | Merchant       | Commercial      | Trade, finance, sales                       |
| 8  | Vishti   | Donkey         | Volatile        | **Avoid** all auspicious events (Bhadra)    |

**Fixed Karanas (Sthira):**
| #   | Name       | Animal/ Symbol | Nature              | Suitable Activities                          |
|-----|------------|----------------|---------------------|---------------------------------------------|
| 58  | Shakuni    | Raven/Bird     | Diagnostic          | Medicine, therapy, settling long disputes   |
| 59  | Chatushpada| Bull/Quadruped | Grounded, Material  | Ancestral rites (Shraddha), animal care     |
| 60  | Naga       | Serpent        | Covert, Penetrating | Mining, excavations, secret negotiations    |
| 1   | Kimstughna | Wild Beast     | Rebirth             | Sowing seeds, charity, foundation stones    |

---

### 6. Vara (Solar Weekday) — 7-Day Cycle

**Formula (from Julian Day Number):**
```
JDN = floor(365.25 * (Y + 4716)) + floor(30.6001 * (M + 1)) + D + B - 1524.5
Vara Index (0-based) = (JDN + 1) mod 7   // 0=Sunday (Ravi), 1=Monday (Soma)... 6=Saturday (Shani)
Vara Index (1-based) = ((JDN + 1) mod 7) + 1  // 1=Sunday (Ravi)... 7=Saturday (Shani)
```
Where:
- Y, M, D = Gregorian year, month, day
- B = correction for Gregorian calendar (0 for Julian)
- Result: 0=Sunday..6=Saturday (Hora engine/JavaScript convention) or 1=Sunday..7=Saturday (table convention below)

**Simplified (if date is known):**
```js
// 1-based index matching the table below. Date.getDay(): Sunday = 0.
// Mapping: 1=Ravi, 2=Soma, 3=Mangala, 4=Budha, 5=Guru, 6=Shukra, 7=Shani
function varaFromDate(date) {
  return date.getDay() + 1;
}
```

> **Convention caveat:** this derives Vara from the *civil* calendar date
> (day changes at midnight). Classical/Tamil panchangam practice anchors the
> day at **sunrise** — the Vara in force is the one ruling at that day's
> sunrise. For the manual slider visualizer this distinction is invisible;
> for any live/date mode, follow the sunrise convention (see
> SPEC §10 (Hora Integration) — Hora's engine implements it).

**Vara Names:**
| Index | Sanskrit | IAST  | English  | Deity/Planet |
|-------|----------|-------|----------|--------------|
| 1     | रविवार   | Ravivara | Sunday  | Surya (Sun) |
| 2     | सोमवार    | Somavara | Monday  | Chandra (Moon) |
| 3     | मङ्गलवार  | Mangalavara | Tuesday | Mangala (Mars) |
| 4     | बुधवार    | Budhavara | Wednesday | Budha (Mercury) |
| 5     | गुरुवार   | Guruvara | Thursday | Brihaspati (Jupiter) |
| 6     | शुक्रवार   | Shukravara | Friday  | Shukra (Venus) |
| 7     | शनिवार    | Shanivara | Saturday | Shani (Saturn) |

---

## Complete Computation Function

```js
/**
 * @typedef {Object} Panchangam
 * @property {number} vara        // 1..7
 * @property {number} tithi       // 1..30
 * @property {"Nanda"|"Bhadra"|"Jaya"|"Rikta"|"Purna"} tithiCategory
 * @property {"Shukla"|"Krishna"} paksha
 * @property {number} nakshatra   // 1..27
 * @property {number} yoga        // 1..27
 * @property {"Shubha"|"Ashubha"} yogaType
 * @property {number} karana      // 1..60
 * @property {"Movable"|"Fixed"} karanaType
 * @property {number} elongation  // dL in degrees
 * @property {number} sunLon
 * @property {number} moonLon
 */

export function computePanchangam(sunLon, moonLon, date) {
  const elongation = (moonLon - sunLon + 360) % 360;

  // Clamp every index to its max: a floating-point edge just under 360 deg
  // would otherwise floor one past the end (Tithi 31 / Nakshatra 28 /
  // Karana 61) and crash the table lookup.
  const tithiIndex = Math.min(Math.floor(elongation / 12) + 1, 30);
  const paksha = tithiIndex <= 15 ? "Shukla" : "Krishna";
  const tithiCategory = categorizeTithi(tithiIndex);

  const nakshatraIndex = Math.min(Math.floor(moonLon / (40 / 3)) + 1, 27);

  const yogaSum = (sunLon + moonLon) % 360;
  const yogaIndex = Math.min(Math.floor(yogaSum / (40 / 3)) + 1, 27);
  const yogaType = isShubhaYoga(yogaIndex) ? "Shubha" : "Ashubha";

  const karanaIndex = Math.min(Math.floor(elongation / 6) + 1, 60);
  // Fixed (Sthira) karanas are indices 58, 59, 60 AND 1 (Kimstughna)
  const karanaType = karanaIndex >= 58 || karanaIndex === 1 ? "Fixed" : "Movable";

  const vara = varaFromDate(date);

  return { vara, tithi: tithiIndex, tithiCategory, paksha,
           nakshatra: nakshatraIndex, yoga: yogaIndex, yogaType,
           karana: karanaIndex, karanaType,
           elongation, sunLon, moonLon };
}
```

---

## Corrections from the PDF

The original PDF had several issues:

| Issue | PDF Version | Corrected Version |
|-------|-------------|-------------------|
| Tithi formula | Used floor(ΔL/12) | **floor(ΔL/12) + 1** (1-indexed) |
| Nakshatra span | "13 20'" (ambiguous) | **40/3° = 13.333...°** exact |
| Yoga calculation | Sun + Moon without mod | **(L_S + L_M) mod 360°** then divide |
| Karana index | Not specified clearly | **floor(ΔL/6) + 1** |
| Fixed Karana positions | Partial list | **Complete 4 fixed positions at 58,59,60,1** |
| Nakshatra boundaries | Degree ranges not exact | **Exact 13°20' boundaries in table** |

---

## Preset Configurations

**Boundary convention (important):** the index formulas use half-open intervals
`[12k, 12k+12)`, so an *exact* ΔL of 0° or 180° lands at the START of the next
tithi/karana, not the end of the expected one (ΔL = 0° → Tithi 1/Karana 1, NOT
Tithi 30/Karana 60). The presets below therefore use an **epsilon offset**
(ΔL = target − 0.001°) so the UI shows the traditionally expected values the
instant a user clicks a preset button.

| Preset        | L_S | L_M            | ΔL       | Tithi         | Karana      |
|---------------|-----|----------------|----------|---------------|-------------|
| Amavasya      | any | L_S + 359.999° | 359.999° | 30 (Amavasya) | 60 (Naga)   |
| First Quarter | any | L_S + 90°      | 90°      | 8 (Ashtami)   | 16 (Bava)   |
| Purnima       | any | L_S + 179.999° | 179.999° | 15 (Purnima)  | 30 (Bava)   |
| Third Quarter | any | L_S + 270°     | 270°     | 23 (Ashtami)  | 46 (Kaulava)|

Note: Nakshatra and Yoga depend on absolute L_M and L_S, not just ΔL.
First/Third Quarter sit mid-interval, so they need no epsilon.
All values verified against the Karana table (§3) and encoded as
assertions in test-vectors.md (§2, V-KARA-01/06/07 + preset parity).

---

## Units Summary

| Quantity          | Value        | Notes                        |
|-------------------|--------------|------------------------------|
| Full circle       | 360°         | 2π radians                   |
| Zodiac sign (Rashi)| 30°         | 12 signs                     |
| Nakshatra span    | 13°20'       | 40/3° = 13.333...°          |
| Tithi span        | 12°          | 30 tithis per month          |
| Karana span       | 6°           | 60 karanas per month         |
| Pada span         | 3°20'        | 4 padas per nakshatra        |
| Sun daily motion  | ~0.9856°/day | 360°/365.25                 |
| Moon daily motion | ~13.176°/day | 360°/27.32 (sidereal month) |

---

## 3. Data Tables (single source of truth)

## Panchanga Sky — Complete Reference Data

All data is **static and complete** — no external APIs or lookups needed.  
Use these tables as the single source of truth for the Panchanga Sky computation layer.

> **Orthography caveat:** Devanagari spellings below follow standard panchangam
> usage, but Sanskrit orthography varies between sources (e.g. कृत्तिका/कृतिका,
> स्वाती/स्वाति). Have a teammate familiar with Devanagari spot-check before the
> spellings ship in the UI.

---

## 1. Tithi Table (30 entries)

Each Tithi = 12° of elongation (ΔL).  
Columns: Index, Sanskrit Name, IAST, Category, Paksha, Auspicious For (activities).

| Index | Sanskrit | IAST | Category | Paksha | Auspicious For |
|-------|----------|------|----------|--------|----------------|
| 1 | प्रतिपदा | Pratipada | Nanda | Shukla | Beginnings, new projects, fine arts |
| 2 | द्वितीया | Dwitiya | Bhadra | Shukla | Education, commerce, marriage, journeys |
| 3 | तृतीया | Tritiya | Jaya | Shukla | Legal actions, competitions, overcoming hurdles |
| 4 | चतुर्थी | Chaturthi | Rikta | Shukla | Surgical ops, demolitions, purification, debt settlement |
| 5 | पंचमी | Panchami | Purna | Shukla | High-impact initiatives, rituals, real estate |
| 6 | षष्ठी | Shashthi | Nanda | Shukla | Celebrations, beginnings, fine arts |
| 7 | सप्तमी | Saptami | Bhadra | Shukla | Education, commerce, marriage, journeys |
| 8 | अष्टमी | Ashtami | Jaya | Shukla | Legal actions, competitions, overcoming hurdles |
| 9 | नवमी | Navami | Rikta | Shukla | Surgical ops, demolitions, purification, debt settlement |
| 10 | दशमी | Dashami | Purna | Shukla | High-impact initiatives, rituals, real estate |
| 11 | एकादशी | Ekadashi | Nanda | Shukla | Celebrations, beginnings, fine arts |
| 12 | द्वादशी | Dvadashi | Bhadra | Shukla | Education, commerce, marriage, journeys |
| 13 | त्रयोदशी | Trayodashi | Jaya | Shukla | Legal actions, competitions, overcoming hurdles |
| 14 | चतुर्दशी | Chaturdashi | Rikta | Shukla | Surgical ops, demolitions, purification, debt settlement |
| 15 | पूर्णिमा | Purnima | Purna | Shukla | High-impact initiatives, rituals, real estate |
| 16 | प्रतिपदा | Pratipada (Krishna) | Nanda | Krishna | Beginnings, new projects, fine arts |
| 17 | द्वितीया | Dwitiya (Krishna) | Bhadra | Krishna | Education, commerce, marriage, journeys |
| 18 | तृतीया | Tritiya (Krishna) | Jaya | Krishna | Legal actions, competitions, overcoming hurdles |
| 19 | चतुर्थी | Chaturthi (Krishna) | Rikta | Krishna | Surgical ops, demolitions, purification, debt settlement |
| 20 | पंचमी | Panchami (Krishna) | Purna | Krishna | High-impact initiatives, rituals, real estate |
| 21 | षष्ठी | Shashthi (Krishna) | Nanda | Krishna | Celebrations, beginnings, fine arts |
| 22 | सप्तमी | Saptami (Krishna) | Bhadra | Krishna | Education, commerce, marriage, journeys |
| 23 | अष्टमी | Ashtami (Krishna) | Jaya | Krishna | Legal actions, competitions, overcoming hurdles |
| 24 | नवमी | Navami (Krishna) | Rikta | Krishna | Surgical ops, demolitions, purification, debt settlement |
| 25 | दशमी | Dashami (Krishna) | Purna | Krishna | High-impact initiatives, rituals, real estate |
| 26 | एकादशी | Ekadashi (Krishna) | Nanda | Krishna | Celebrations, beginnings, fine arts |
| 27 | द्वादशी | Dvadashi (Krishna) | Bhadra | Krishna | Education, commerce, marriage, journeys |
| 28 | त्रयोदशी | Trayodashi (Krishna) | Jaya | Krishna | Legal actions, competitions, overcoming hurdles |
| 29 | चतुर्दशी | Chaturdashi (Krishna) | Rikta | Krishna | Surgical ops, demolitions, purification, debt settlement |
| 30 | अमावस्या | Amavasya | Purna | Krishna | High-impact initiatives, rituals, real estate |

> **Note:** The Sanskrit names repeat for Shukla/Krishna; the Paksha column distinguishes them.  
> The Purna Tithis (5,10,15,20,25,30) are considered especially auspicious for major undertakings.

---

## 2. Nakshatra Table (27 entries)

Each Nakshatra = 13°20' (40/3°) of Moon's longitude.  
Columns: Index, Sanskrit Name, IAST, Longitude Start, Longitude End, Ruling Deity, Primary Temperament.

| Index | Sanskrit | IAST | Start (°) | End (°) | Ruling Deity | Temperament |
|-------|----------|------|-----------|---------|--------------|-------------|
| 1 | अश्विनी | Ashwini | 0.000 | 13.333 | Ashvins (Divine Twins) | Swift, Healing |
| 2 | भरणी | Bharani | 13.333 | 26.667 | Yama (God of Death) | Fierce, Restrictive |
| 3 | कृत्तिका | Krittika | 26.667 | 40.000 | Agni (Fire God) | Mixed, Sharp |
| 4 | रोहिणी | Rohini | 40.000 | 53.333 | Prajapati (Creator) | Fixed, Fertile |
| 5 | मृगशिरा | Mrigashira | 53.333 | 66.667 | Soma (Moon) | Gentle, Inquisitive |
| 6 | आर्द्रा | Ardra | 66.667 | 80.000 | Rudra (Storm God) | Sharp, Transformative |
| 7 | पुनर्वसु | Punarvasu | 80.000 | 93.333 | Aditi (Mother of Gods) | Movable, Renewing |
| 8 | पुष्य | Pushya | 93.333 | 106.667 | Brihaspati (Jupiter) | Swift, Nourishing |
| 9 | आश्लेषा | Ashlesha | 106.667 | 120.000 | Sarpas (Serpents) | Sharp, Piercing |
| 10 | मघा | Magha | 120.000 | 133.333 | Pitris (Ancestors) | Fierce, Royal |
| 11 | पूर्व फाल्गुनी | Purva Phalguni | 133.333 | 146.667 | Bhaga (God of Prosperity) | Fierce, Creative |
| 12 | उत्तर फाल्गुनी | Uttara Phalguni | 146.667 | 160.000 | Aryaman (God of Patronage) | Fixed, Enduring |
| 13 | हस्त | Hasta | 160.000 | 173.333 | Savitr (Sun God) | Swift, Dexterous |
| 14 | चित्रा | Chitra | 173.333 | 186.667 | Tvashtar (Divine Architect) | Gentle, Artistic |
| 15 | स्वाती | Swati | 186.667 | 200.000 | Vayu (Wind God) | Movable, Adaptable |
| 16 | विशाखा | Vishakha | 200.000 | 213.333 | Indragni (Indra+Agni) | Mixed, Purpose-Driven |
| 17 | अनुराधा | Anuradha | 213.333 | 226.667 | Mitra (Divine Friend) | Gentle, Devotional |
| 18 | ज्येष्ठा | Jyeshtha | 226.667 | 240.000 | Indra (King of Gods) | Sharp, Protective |
| 19 | मूल | Mula | 240.000 | 253.333 | Nirriti (Goddess of Destruction) | Sharp, Investigating |
| 20 | पूर्वाषाढा | Purva Ashadha | 253.333 | 266.667 | Apas (Waters) | Fierce, Invincible |
| 21 | उत्तराषाढा | Uttara Ashadha | 266.667 | 280.000 | Vishvedevas (All Gods) | Fixed, Victorious |
| 22 | श्रवण | Shravana | 280.000 | 293.333 | Vishnu (Preserver) | Movable, Receptive |
| 23 | धनिष्ठा | Dhanishta | 293.333 | 306.667 | Ashta Vasus (Eight Deities) | Movable, Rhythmic |
| 24 | शतभिषा | Shatabhisha | 306.667 | 320.000 | Varuna (God of Waters) | Movable, Curative |
| 25 | पूर्व भाद्रपदा | Purva Bhadrapada | 320.000 | 333.333 | Aja Ekapada (One-footed Goat) | Fierce, Ascetic |
| 26 | उत्तर भाद्रपदा | Uttara Bhadrapada | 333.333 | 346.667 | Ahirbudhnya (Serpent Dragon) | Fixed, Grounded |
| 27 | रेवती | Revati | 346.667 | 360.000 | Pushan (Nourisher) | Gentle, Nurturing |

> **Padas (quarters):** Each Nakshatra = 4 Padas of 3°20' each.  
> Example: Ashwini Pada 1 = 0°–3°20', Pada 2 = 3°20'–6°40', etc.

---

## 3. Yoga Table (27 entries)

Each Yoga = 13°20' (40/3°) of (Sun + Moon) longitude.  
Columns: Index, Sanskrit Name, IAST, Classification (Shubha/Ashubha), Nature/Notes.

| Index | Sanskrit | IAST | Classification | Nature / Notes |
|-------|----------|------|----------------|----------------|
| 1 | विष्कम्भ | Vishkambha | Ashubha | Obstruction, initial friction |
| 2 | प्रीति | Priti | **Shubha** | Love, affection, satisfaction |
| 3 | आयुष्मान | Ayushman | **Shubha** | Long life, vitality, good health |
| 4 | सौभाग्य | Saubhagya | **Shubha** | Good fortune, prosperity, auspiciousness |
| 5 | शोभन | Shobhana | **Shubha** | Beautiful, splendid, virtuous |
| 6 | अतिगण्ड | Atiganda | Ashubha | Severe complications, high turbulence |
| 7 | सुकर्मा | Sukarma | **Shubha** | Good actions, virtuous deeds, merit |
| 8 | धृति | Dhriti | **Shubha** | Steadfastness, patience, determination |
| 9 | शूल | Shula | Ashubha | Sharp conflict, pain, weapons, surgery |
| 10 | गण्ड | Ganda | Ashubha | Emotional knots, tangles, administrative blocks |
| 11 | वृद्धि | Vriddhi | **Shubha** | Growth, increase, prosperity, expansion |
| 12 | ध्रुव | Dhruva | **Shubha** | Fixed, stable, permanent, unchanging |
| 13 | व्याघात | Vyaghata | Ashubha | Threatening, destructive, prone to sudden injury |
| 14 | हर्षण | Harshana | **Shubha** | Joy, delight, happiness, celebration |
| 15 | वज्र | Vajra | Ashubha | Volatile, piercing, sharp like thunderbolt |
| 16 | सिद्धि | Siddhi | **Shubha** | Accomplishment, perfection, attainment |
| 17 | व्यतिपात | Vyatipata | Ashubha | Major directional calamity; avoid material initiatives |
| 18 | वरियान् | Variyan | **Shubha** | Excellent, best, superior quality |
| 19 | परिघ | Parigha | Ashubha | Gates/barriers, delays, opposition, obstacles |
| 20 | शिव | Shiva | **Shubha** | Auspicious, benevolent, benevolent destruction |
| 21 | सिद्ध | Siddha | **Shubha** | Perfected, accomplished, established |
| 22 | साध्य | Sadhya | **Shubha** | Attainable, possible, achievable |
| 23 | शुभ | Shubha | **Shubha** | Auspicious, favorable, beneficial |
| 24 | शुक्ल | Shukla | **Shubha** | Bright, pure, clear, white |
| 25 | ब्रह्म | Brahma | **Shubha** | Creative, expansive, universal consciousness |
| 26 | इन्द्र | Indra | **Shubha** | Power, leadership, sovereignty, strength |
| 27 | वैधृति | Vaidhriti | Ashubha | Chaotic dissipation; unstable for worldly investments |

> **Shubha Yogas (benefic):** 2,3,4,5,7,8,11,12,14,16,18,20,21,22,23,24,25,26  
> **Ashubha Yogas (malefic):** 1,6,9,10,13,15,17,19,27

---

## 4. Karana Table (60 entries)

Each Karana = 6° of elongation (ΔL).  
Columns: Index, Sanskrit Name, IAST, Type (Movable/Fixed), Animal/Symbol, Core Nature, Practical Application.

| Index | Sanskrit | IAST | Type | Animal / Symbol | Core Nature | Practical Application |
|-------|----------|------|------|-----------------|-------------|-----------------------|
| 1 | किंस्तुघ्न | Kimstughna | Fixed | Wild Beast | Rebirth, Foundational | Sowing seeds, charity, foundation stones |
| 2 | बव | Bava | Movable | Lion | Commanding, Courageous | Leadership, fitness, health, initiation |
| 3 | बालव | Balava | Movable | Tiger / Leopard | Intellectual, Active | Study, spiritual rituals, sacred tasks |
| 4 | कौलव | Kaulava | Movable | Boar / Pig | Cooperative, Grounded | Social alliances, contracts, partnerships |
| 5 | तैतिल | Taitila | Movable | Rhinoceros | Defensive, Resilient | Construction, official paperwork, boundaries |
| 6 | गर | Gara | Movable | Elephant | Diligent, Heavy | Agriculture, groundwork, physical labor |
| 7 | वणिज | Vanija | Movable | Merchant | Commercial, Agile | Trade, financial exchanges, sales trips |
| 8 | विष्टि | Vishti (Bhadra) | Movable | Donkey | Volatile, Destructive | **Avoid** all auspicious events |
| 9 | बव | Bava | Movable | Lion | Commanding, Courageous | Leadership, fitness, health, initiation |
| 10 | बालव | Balava | Movable | Tiger / Leopard | Intellectual, Active | Study, spiritual rituals, sacred tasks |
| 11 | कौलव | Kaulava | Movable | Boar / Pig | Cooperative, Grounded | Social alliances, contracts, partnerships |
| 12 | तैतिल | Taitila | Movable | Rhinoceros | Defensive, Resilient | Construction, official paperwork, boundaries |
| 13 | गर | Gara | Movable | Elephant | Diligent, Heavy | Agriculture, groundwork, physical labor |
| 14 | वणिज | Vanija | Movable | Merchant | Commercial, Agile | Trade, financial exchanges, sales trips |
| 15 | विष्टि | Vishti (Bhadra) | Movable | Donkey | Volatile, Destructive | **Avoid** all auspicious events |
| 16 | बव | Bava | Movable | Lion | Commanding, Courageous | Leadership, fitness, health, initiation |
| 17 | बालव | Balava | Movable | Tiger / Leopard | Intellectual, Active | Study, spiritual rituals, sacred tasks |
| 18 | कौलव | Kaulava | Movable | Boar / Pig | Cooperative, Grounded | Social alliances, contracts, partnerships |
| 19 | तैतिल | Taitila | Movable | Rhinoceros | Defensive, Resilient | Construction, official paperwork, boundaries |
| 20 | गर | Gara | Movable | Elephant | Diligent, Heavy | Agriculture, groundwork, physical labor |
| 21 | वणिज | Vanija | Movable | Merchant | Commercial, Agile | Trade, financial exchanges, sales trips |
| 22 | विष्टि | Vishti (Bhadra) | Movable | Donkey | Volatile, Destructive | **Avoid** all auspicious events |
| 23 | बव | Bava | Movable | Lion | Commanding, Courageous | Leadership, fitness, health, initiation |
| 24 | बालव | Balava | Movable | Tiger / Leopard | Intellectual, Active | Study, spiritual rituals, sacred tasks |
| 25 | कौलव | Kaulava | Movable | Boar / Pig | Cooperative, Grounded | Social alliances, contracts, partnerships |
| 26 | तैतिल | Taitila | Movable | Rhinoceros | Defensive, Resilient | Construction, official paperwork, boundaries |
| 27 | गर | Gara | Movable | Elephant | Diligent, Heavy | Agriculture, groundwork, physical labor |
| 28 | वणिज | Vanija | Movable | Merchant | Commercial, Agile | Trade, financial exchanges, sales trips |
| 29 | विष्टि | Vishti (Bhadra) | Movable | Donkey | Volatile, Destructive | **Avoid** all auspicious events |
| 30 | बव | Bava | Movable | Lion | Commanding, Courageous | Leadership, fitness, health, initiation |
| 31 | बालव | Balava | Movable | Tiger / Leopard | Intellectual, Active | Study, spiritual rituals, sacred tasks |
| 32 | कौलव | Kaulava | Movable | Boar / Pig | Cooperative, Grounded | Social alliances, contracts, partnerships |
| 33 | तैतिल | Taitila | Movable | Rhinoceros | Defensive, Resilient | Construction, official paperwork, boundaries |
| 34 | गर | Gara | Movable | Elephant | Diligent, Heavy | Agriculture, groundwork, physical labor |
| 35 | वणिज | Vanija | Movable | Merchant | Commercial, Agile | Trade, financial exchanges, sales trips |
| 36 | विष्टि | Vishti (Bhadra) | Movable | Donkey | Volatile, Destructive | **Avoid** all auspicious events |
| 37 | बव | Bava | Movable | Lion | Commanding, Courageous | Leadership, fitness, health, initiation |
| 38 | बालव | Balava | Movable | Tiger / Leopard | Intellectual, Active | Study, spiritual rituals, sacred tasks |
| 39 | कौलव | Kaulava | Movable | Boar / Pig | Cooperative, Grounded | Social alliances, contracts, partnerships |
| 40 | तैतिल | Taitila | Movable | Rhinoceros | Defensive, Resilient | Construction, official paperwork, boundaries |
| 41 | गर | Gara | Movable | Elephant | Diligent, Heavy | Agriculture, groundwork, physical labor |
| 42 | वणिज | Vanija | Movable | Merchant | Commercial, Agile | Trade, financial exchanges, sales trips |
| 43 | विष्टि | Vishti (Bhadra) | Movable | Donkey | Volatile, Destructive | **Avoid** all auspicious events |
| 44 | बव | Bava | Movable | Lion | Commanding, Courageous | Leadership, fitness, health, initiation |
| 45 | बालव | Balava | Movable | Tiger / Leopard | Intellectual, Active | Study, spiritual rituals, sacred tasks |
| 46 | कौलव | Kaulava | Movable | Boar / Pig | Cooperative, Grounded | Social alliances, contracts, partnerships |
| 47 | तैतिल | Taitila | Movable | Rhinoceros | Defensive, Resilient | Construction, official paperwork, boundaries |
| 48 | गर | Gara | Movable | Elephant | Diligent, Heavy | Agriculture, groundwork, physical labor |
| 49 | वणिज | Vanija | Movable | Merchant | Commercial, Agile | Trade, financial exchanges, sales trips |
| 50 | विष्टि | Vishti (Bhadra) | Movable | Donkey | Volatile, Destructive | **Avoid** all auspicious events |
| 51 | बव | Bava | Movable | Lion | Commanding, Courageous | Leadership, fitness, health, initiation |
| 52 | बालव | Balava | Movable | Tiger / Leopard | Intellectual, Active | Study, spiritual rituals, sacred tasks |
| 53 | कौलव | Kaulava | Movable | Boar / Pig | Cooperative, Grounded | Social alliances, contracts, partnerships |
| 54 | तैतिल | Taitila | Movable | Rhinoceros | Defensive, Resilient | Construction, official paperwork, boundaries |
| 55 | गर | Gara | Movable | Elephant | Diligent, Heavy | Agriculture, groundwork, physical labor |
| 56 | वणिज | Vanija | Movable | Merchant | Commercial, Agile | Trade, financial exchanges, sales trips |
| 57 | विष्टि | Vishti (Bhadra) | Movable | Donkey | Volatile, Destructive | **Avoid** all auspicious events |
| 58 | शकुनि | Shakuni | Fixed | Raven / Bird | Diagnostic, Remedial | Medicine, therapy, settling long disputes |
| 59 | चतुष्पाद | Chatushpada | Fixed | Bull / Quadruped | Grounded, Material | Ancestral rites (Shraddha), animal care, soil |
| 60 | नाग | Naga | Fixed | Serpent | Covert, Penetrating | Mining, excavations, secret negotiations |

> **Movable Karana Cycle:** Bava → Balava → Kaulava → Taitila → Gara → Vanija → Vishti (repeats 8×)  
> **Fixed Karanas:** Kimstughna (1), Shakuni (58), Chatushpada (59), Naga (60)  
> **Vishti (Bhadra)** is considered inauspicious — avoid initiating important work during its period.

---

## 5. Vara Table (7-day Weekday)

| Index | Sanskrit | IAST | English | Planet/Deity | Nature |
|-------|----------|------|---------|--------------|--------|
| 1 | रविवार | Ravivara | Sunday | Surya (Sun) | Vitality, leadership, authority |
| 2 | सोमवार | Somavara | Monday | Chandra (Moon) | Mind, emotions, nurturing |
| 3 | मङ्गलवार | Mangalavara | Tuesday | Mangala (Mars) | Energy, courage, conflict |
| 4 | बुधवार | Budhavara | Wednesday | Budha (Mercury) | Intellect, communication, trade |
| 5 | गुरुवार | Guruvara | Thursday | Brihaspati (Jupiter) | Wisdom, expansion, prosperity |
| 6 | शुक्रवार | Shukravara | Friday | Shukra (Venus) | Love, beauty, creativity, luxury |
| 7 | शनिवार | Shanivara | Saturday | Shani (Saturn) | Discipline, karma, longevity, obstacles |

---

## How to Use These Tables in Code

Represent each table as a frozen array of records (or a `Map`) indexed by
1..N. Example (valid JS — frozen so no code can mutate the tables):

```js
export const TITHI_TABLE = Object.freeze([
  Object.freeze({ index: 1, name: "प्रतिपदा", iast: "Pratipada", category: "Nanda", paksha: "Shukla" }),
  Object.freeze({ index: 2, name: "द्वितीया", iast: "Dwitiya", category: "Bhadra", paksha: "Shukla" }),
  // ... up to 30
]);

export const NAKSHATRA_TABLE = Object.freeze([
  Object.freeze({ index: 1, name: "अश्विनी", iast: "Ashwini", start: 0.0, end: 13.333, deity: "Ashvins" }),
  // ... up to 27
]);
```

Then compute the index from the angles and look up the record
(`TABLE[index - 1]` — indices are 1-based).

---

## Validation

These tables are derived directly from:
- **Surya Siddhanta** (true planetary longitudes)
- **Lahiri Ayanamsha** (0° = Revati / opposite Spica)
- **Standard Panchangam calculations** as used in Hindu calendars

All spans are exact:
- Tithi: 360° / 30 = 12°
- Nakshatra/Yoga: 360° / 27 = 13°20' = 40/3° ≈ 13.333...°
- Karana: 360° / 60 = 6°

Use these tables as the **single source of truth** for the Panchanga Sky project.

---

## 4. Modes — Clock ⇄ Celestial + Transition

## Panchanga Sky — Clock Mode ⇄ Celestial Mode

Two views of **one universe** — the transition between them is a change of
perspective, not a page change. A teammate already prototyped the sky scene
and the lift-off mechanic (`Panchangam Clock App Design/sky-scene.js`,
`Sky Navigator.dc.html` in the Hora repo). This document specifies both
modes and the transition, so the generated build can either adopt that scene
directly or re-create the behavior.

**These two modes are the product's core.** Feature ideas beyond them live in
§9 (Feature Ideas); motion principles follow the motion-design discipline
(emotional intent first, three motion layers, transform/opacity only).

---

## 1. Clock Mode (default) — "Kālacakra"

Top-down view of the panchangam clock face, every overlay visible.

| Element | Behavior |
|---|---|
| Kālacakra face | Round dial, sunrise-anchored: nāḻigai ticks 0–60 since sunrise, gold on lapis |
| Nakshatra ring | 27 sectors; the Moon's current nakshatra highlighted |
| Zodiac ring | 12 rashi sectors with Devanagari + IAST names |
| Tithi dial | Current tithi + paksha, end-time countdown |
| Rahu kalam | Kumkum-red sector of the day (only in clock mode — it's time, not sky) |
| Hora hand | Rotates hourly through the Chaldean hora order |
| Readout cards | Vara / Tithi / Nakshatra / Yoga / Karana, Devanagari first, IAST + English below |
| Location chip | "Observer · Chennai 13.08°N 80.27°E" (click → Place View, see 11) |
| Time chip | Live clock; nāḻigai:vināḻigai since sunrise; civil time |

Camera: face-on, locked, gentle idle drift (prototype: ±0.6 unit sway, ~20s
period) so it never feels like a static screenshot. Interaction: the face is
readable at a glance; hovering a ring segment lights it; clicking a segment is
a shortcut that **lifts off** and locks that target in Celestial Mode
(e.g. click the nakshatra ring → lift off → camera locks the Moon's
nakshatra).

---

## 2. Celestial Mode — "the sky"

Full 3D night sky, geocentric: Earth at origin with its axis fixed, the
celestial sphere turning overhead. Stars, planets, constellations, and every
sky-relevant overlay, toggleable. (Rahu kalam, hora hand and other purely
*temporal* overlays don't exist here.)

**Camera.** Orbit controls around Earth: drag to rotate, wheel to zoom,
inertia damping. Prototype's camera goals to keep as lock presets:
`overview / earth / moon / sun / nakshatra / tithi / yoga` — extend with
`karana` and per-graha locks (see picking below).

**Stars & constellations.** Bright-star catalog (use the ~120 brightest stars
with RA/Dec); the nakshatra band aligns to the ecliptic, which is the gold
line. Constellation stick-figures toggleable; when the nakshatra overlay is
on, Hindu nakshatra regions (13°20′ ecliptic sectors) tint over the western
stick figures — the point is the *comparison*: Mrigashira's deer head sits
inside Orion, Rohini is Aldebaran in Taurus.

**Picking + tooltip (the learning moment).** Every clickable object —
star, planet, Sun, Moon, nakshatra sector, rashi sector — opens a small
anchored box on click:

```
 Rohini · रोहिणी                       [×]
 Aldebaran (α Tauri) — Taurus / Vrishabha
 ─────────────────────────────────────
 Deity: Brahma / Prajapati · Temperament: Dhruva (steady)
 The Moon's favorite — the red eye of the bull. Rohini
 gives growth, charm and agricultural abundance.
 Rashi: Vrishabha · Ecliptic 40°00′–53°20′
```

Rules for the box (it is the cultural-learning payload, keep it tight):
- Line 1: Sanskrit (Devanagari) + IAST. Line 2: western identification.
- One **why it matters** line, 1–2 sentences max, drawn from the guide's
  deity/temperament data — never invent lore.
- Coordinates line shows the object's ecliptic longitude, which ties the myth
  to the math the app is visualizing.
- **No emojis, no decorative icons — Phosphor/SVG only.**
- Closes on ×, outside click, or Escape. Hover = soft glow highlight
  (brightness up, no layout shift); click = box + camera lock.
- Planets carry graha lore + weekday ruler (Shani → Saturday → Shani-vāra);
  that cross-link (sky object ↔ calendar limb) is the app's whole thesis.


**Tooltip system v2 — two-stage, glossary-linked (required).**

1. **Body tooltip** (star, planet, graha, node, moon): click opens the box
   above — Devanagari + IAST, one science line, one myth line.
2. **Constellation / system chip** — every pickable star that belongs to a
   constellation or nakshatra carries a second, smaller tooltip beside the
   box: "Part of Mrigashira (Orion) — view →". Clicking opens the
   constellation card (stick figure highlights, member stars pulse, its
   nakshatra meaning shows). Same pattern for planets and moons: the chip
   links to the host system card ("Solar System — view →"; Jupiter →
   Galilean moons; Saturn → rings) and to the day-lord link ("Guru rules
   today"). One body, one chip, one card — always two hops away from context.
3. **Glossary hover** — EVERY technical term in panels, tooltips, readouts
   and toggles (tithi, karana, paksha, nakshatra, yoga, ayanamsha, nāḻigai,
   graha, Shubha, Ashubha, Rahu kalam…) is dotted-underlined; hovering shows
   a tiny plain-language explanation ("Tithi — one of 30 lunar days; the Moon
   moves 12° closer to the Sun each one"). Terms map to explanations in ONE
   shared glossary structure that also powers long-press/detail cards. No
   term may appear in the UI without a glossary entry.

**Overlay toggles (celestial mode):** nakshatra band · rashi wheel · ecliptic
line · tithi arc · yoga point · karana half-step · navagraha paths · western
constellations · star names · atmosphere/ground. Each is a small toggle row in
the bottom dock; the dock hides (edge tab) for a clean sky. Toggles animate
opacity in 150–250 ms, stagger 30–40 ms when several switch together.

---

## 3. The Transition — "lift off"

One gesture, both directions: the clock face **lies flat and becomes the sky**.
The prototype implements exactly this (`liftOff`, direction state
`liftoff → bridge → horizon`, warp factor with FOV bulge). Whether reusing it
or rebuilding, hit these beats:

| Beat | What happens | Timing |
|---|---|---|
| Anticipation | Clock face scales 1→0.97, 50 ms | 50 ms |
| Lift | Face tilts to the horizon plane and rises; camera pulls up and out; scene elements take over (nakshatra ring → star band, zodiac ring → gold ecliptic line, sun ray → sun, moon dial → moon) | 900–1700 ms, ease-in-out cubic |
| Warp | FOV breathes 40°→~68°→40° mid-flight; star sprites swell ~3× and settle; a faint lapis fog passes the camera | peak at midpoint |
| Settle | Camera eases into orbit pose; dock + toggles slide up; the readout cards morph into their HUD chips (same data, new place — **continuity, not replacement**) | last 400 ms |

Return trip ("Return to clock face"): the reverse — camera dives, face lands
flat, temporal overlays (rahu kalam, hora hand) fade back in last.

Choreography constraints (non-negotiable for the polish bar):
- Total transition ≤ 1.7 s; panel/label exits staggered ≤ 500 ms total; at most
  a third of on-screen elements in motion at once.
- Transform/opacity only; 60 fps on integrated graphics. Any DOM overlay
  animates `transform`/`opacity`, never layout properties.
- The scene transition itself is ink-dark (page's own lapis/ink tones, at most
  one gold accent edge) — **no saturated multi-color wipes**; motion carries
  the energy, not color count.
- `prefers-reduced-motion`: skip the warp entirely — 300 ms crossfade with the
  same element mapping.

---

## 4. Modes are one state machine

`clock → bridge → celestial` with a single source of truth for time and place:
both modes render the same `(jd, lat, lon, tz)`. Switching modes never
recomputes the panchangam, never loses the scrub position, never reloads the
scene. The mode toggle lives in the dock: `Clock · Sky` with the lift-off
button between them — but *any* deep interaction in clock mode (clicking a
ring, tapping the sky chip) should just lift off.
### POV from the selected place — "Stand here"

Place view is not only a readout — it changes the camera. A **"Stand here"
action** re-renders the celestial stage as the sky **from that exact point on
Earth at the scrubber time**:

- Horizon-plane view: a ground plane cuts the stage, cardinal points are
  marked, and the dome above shows what that observer actually sees (an
  alt/az projection of the same geocentric state — no new computation, only
  a transform).
- Latitude-authentic details: the pole sits at the right altitude for the
  latitude; the observer's sunrise/sunset anchor the Vara; "nāḻigai since
  sunrise" reads correctly for that place.
- Clock (top-down) and POV (horizon) are two cameras on ONE scene — the
  switch between them is another camera move, never a reload. Scrubber
  position, locks and overlay toggles persist across the switch.
- From POV, "look at" locks: moonrise direction, the current nakshatra, the
  Sun's day-arc (Hora's Sky Arc watch face is the 2D cousin).
- Prototype note: Hora's sky-scene.js already implements a horizon direction
  with yaw/pitch drag (SPEC §10) — extend it, don't reinvent it.


---

## 5. Time — Scrubbing & Playback

## Panchanga Sky — Time Scrubbing & Playback

One time state for the whole app: `(jd, lat, lon, tz)`. Clock mode, celestial
mode, scrubber and place view all read it; nothing recomputes independently.

## The scrubber

A horizontal timeline **under a collapsible dropdown dock** ("Sky conditions"),
in both modes. Two linked domains:

1. **Day domain** (default): sunrise → next sunrise, 60 nāḻigai. Scrubbing
   moves the scene through that day — the sky wheel turns, tithi/nakshatra
   arcs advance, rahu kalam sector lights up when entered. The prototype's
   navigator already has this gesture (`onScrubDown/Move/Up`, ew-resize).
2. **Date domain** (dropdown toggle): day/month/year. The sky wheel turns
   visibly fast — a month of nakshatras passes under the finger. Fine idea:
   pinch/shift-drag narrows the window (year → month → day → hour) so the
   scrubber is a zoomable ladder rather than one impossible scale.

While scrubbing, the "sky conditions" panel shows the five limbs **dynamically evaluated at the cursor date, time, and observer location**, Devanagari-first:

```
 Tithi      {tithi.sanskrit}      {tithi.name} · ends {tithi.endTime}
 Nakshatra  {nakshatra.sanskrit}  {nakshatra.name} · ends {nakshatra.endTime}
 Yoga       {yoga.sanskrit}       {yoga.name} · ends {yoga.endTime}   ({yoga.nature} chip)
 Karana     {karana.sanskrit}     {karana.name} · ends {karana.endTime}   ({karana.nature} chip)
 Vara       {vara.sanskrit}       {vara.name} ({vara.abbr})
 Sunrise {sunriseTime} · Sunset {sunsetTime} · Moon: {moonPhase} · {tithiAtSunrise} until {tithiEnd}
```

All values (sunrise, sunset, and limb transitions) are resolved dynamically per frame/scrub step from the astronomical engine (`panchanga(y, m, d, loc)` and `angaAt(...)`) for the active date and observer coordinates. For validation, the test vector `2026-09-26, Chennai` serves as the reference benchmark to verify dynamic calculation accuracy against known ephemeris data.

## Playback speeds

Dropdown row of fixed speeds (the prototype navigator already carries a
`SPEEDS` list — reuse its labels/values). Recommended set:

| Speed | Meaning | Feel |
|---|---|---|
| Live | real time (now) | clock ticks |
| 1× | 1 real s = 1 sky s | stars drift imperceptibly |
| 60× | 1 min = 1 min... i.e. 1 s = 1 min | hora hand breathes |
| 600× | 1 s = 10 min | nāḻigai ticks |
| 1 day/s | 1 s = 1 day | tithis flick past, Moon laps the Sun |
| 1 month/s | 1 s = 30 days | samvatsara wheel spins |

Scrubbing while playing pauses playback; a prominent **Now** button (and
`L`) snaps back to live. The panchangam recomputes per frame from the engine —
it's cheap (a few Meeus-series evaluations); never cache-then-interpolate
except star positions.

Boundary convention while playing: at an exact new-tithi instant, the limb
flips to its *next* value — that's correct per the half-open interval rule
(see §2's preset note), don't "fix" it into off-by-one flicker.

## Polish

- Scrub handle: gold diamond, ew-resize cursor, 80 ms hover glow.
- The scene must never judder at high speed: star field updates in the same
  rAF as the panchangam tick; throttle HUD text re-renders to 4 Hz.
- `prefers-reduced-motion`: playback still works (it's semantic motion), but
  the warp/FOV effects stay off.

---

## 6. Place View & the Holy-Day Finder

## Panchanga Sky — Place View & The Holy-Day Finder

## 1. Place View — "any point on Earth"

A location context switcher, reachable from the observer chip in clock mode
and a target icon in the celestial dock.

**Flow:** click the chip → panel slides up (never a modal page):
- **Search** an IANA place name (typeahead over a bundled city table; the
  prototype's engine ships `lat/lon/tz` on its vectors — Chennai is the
  default: 13.0827°N, 80.2707°E, +05:30).
- Or drop a pin on a small globe view; timezone resolves from the IANA db.
- **The sky re-orientates**: camera glides so the observer's zenith is
  centered, ground/atmosphere dome re-anchors, the readout cards animate
  (number roll, 300 ms) to the new place's panchangam. Same instant, same
  engine — only the frame changed.
- The panel stays as a chip: `Observer · Varanasi 25.32°N 83.01°E · IST` —
  click again to switch or compare.

**Tell the panchanga for that place:** the readout cards and sky-conditions
panel always describe the *selected* place's panchangam — sunrise-anchored
vara/nāḻigai, tithi end-times in that place's civil time. Panchangam is
local by definition (Britannica: the same muhurta differs between Chicago
and New Delhi); the app must make that visible, so a second "compare"
slot can pin a second place and diff the two skies (same tithi, different
end-times, maybe different vara across a sunrise boundary).

## 2. The Holy-Day Finder — "when is it good to…?"

The question the whole cultural layer answers. Two entries, both backed by
the Hora repo's `data/rules.json` (teaching-level muhurta rules — keep its
disclaimer: present as guidance, not astrological advice).

### A. Date-first: "what's holy about today / this month?"
- The scrubber's date domain gains a **festival lane**: dots on days where
  `festivals_solar_month_plus_star` matches (solar month + moon-in-nakshatra
  rule) — e.g. Maha Shivaratri = Māgha + Moon in Mākha. Hovering a dot shows
  the festival + why it's anchored astronomically.
- Ekadashi (11th tithi), Purnima, Amavasya, Sankranti (sun enters a new
  rashi) auto-mark — they're pure functions of the five limbs.

### B. Activity-first: "find me a good day to…"
Pick an activity → the app scans a date range and ranks days, using
`rules.json`:

| Activity family | Rule applied |
|---|---|
| Foundations, house-warming, planting | Dhruva nakshatras (3, 11, 20, 25) |
| Travel, vehicles | Cara nakshatras (6, 14, 21, 22, 23) |
| Learning, medicine, trade | Kṣipra nakshatras (0, 7, 12) |
| Arts, friendship, new clothes | Mṛdu nakshatras (4, 13, 16, 26) |
| Wedding | the `wedding.favourable_nakshatra` list |
| Any beginning | avoid Riktā tithis + Amāvāsyā, Viṣṭi karana, Vyatīpāta/Vaidhṛti yogas, Rāhu kālam/Yamagaṇḍam windows |

**Result UI:** a month grid (the phone design's month screen already sketches
this) where each cell is tinted by verdict — gold (favourable) / muted
(neutral) / kumkum (avoid) — with the reason chips on hover/click
("Śravaṇa · Dhruva · Shukla paksha — good for foundations"). Clicking a day
**scrubs the scene there** in the current mode: the sky shows *why* (the Moon
sits in that nakshatra, the yoga sector is lit). That loop — rule → ranked
days → sky evidence — is the learning tool working end to end.

Scope guard: this is `rules.json`-depth only (tithi family, nakshatra
nature, karana, yoga, daily windows, wedding list). **No lagna, no tārābalam,
no personal charts** — the doc's disclaimer says real muhurta selection weighs
those; show the disclaimer once in the finder UI and stop there.

## 3. Copy notes (voice)

- Guidance tone, never verdicts: "traditionally favourable", "commonly
  avoided" — not "good"/"bad"/"sinister".
- Every rule chip names its source limb (tithi/nakshatra/yoga/karana) so the
  astronomy link stays explicit.
- Devanagari first, IAST + English second, everywhere.

## 7. The Wider Solar System — planets, nodes & moons

The navagraha are not decoration; they are the rest of the cast. Framing:
a cultural learning tool meets astronomy — every body carries BOTH a fact
and a story.

- **The five visible grahas** — Budha (Mercury), Shukra (Venus), Mangala
  (Mars), Guru (Jupiter), Shani (Saturn) — rendered along the ecliptic at
  their approximate current longitudes. Mean-element approximation is fine
  for visualization; label accuracy honestly as "approximate". Each is
  pickable with the same tooltip system: one scientific line + one
  mythological line (e.g. Budha: "closest planet to the Sun; in Jyotisha,
  the wise scribe, son of Chandra").
- **Rahu & Ketu** — the two lunar nodes as shadow-points on the ecliptic,
  always opposite each other; when Sun or Moon nears a node, the eclipse
  affordance glows. This is the visual bridge between the astronomy
  (orbital nodes) and the mythology (the swallowers).
- **Orbit rings (heliocentric inset)** — an optional zoom-out from the
  geocentric stage to a small stylized solar system: planets on their rings,
  moons as companion dots, comet-style motion trails. Distances compressed
  (log scale) and LABELED as not-to-scale — honesty about scale is polish,
  not compromise.
- **Moons worth showing** — locked on Jupiter: the four Galilean moons as
  moving pinpricks. Locked on Saturn: tilted rings. Earth's Moon is the
  protagonist everywhere else (phase-true as specified). Clicking any moon
  gives a tooltip — even one line each is enough.
- **Tooltips everywhere** — planets and moons use the same two-stage
  tooltip system (body box + system chip + glossary hover) as the stars.
- **Day-lord cross-link** — the Vara readout highlights its ruling graha in
  the sky ("today is Guruvāra — find Guru"). This is the kind of connection
  that makes the tool feel alive.

## 8. The Polish Bar — what "visually stunning" means here

The difference between a demo and something people screenshot. Every item is
a requirement, not a suggestion; the implementing model may achieve each one
by any means.

**Light behaves.** Light emits; dark absorbs. Sun and Moon bloom; stars do
not. Bloom radius scales with apparent magnitude, never with viewport size.

**Depth is felt, not stated.** Three parallax star layers (bright/near,
medium, faint/far) plus a faint milky-way band diagonal to the ecliptic.
Twinkle = per-star phase offset + slow amplitude drift — never a uniform
flicker.

**Nothing snaps.** Every state change eases (cubic in-out family), every
duration lands between 150–700 ms; the lift-off is the only hero motion.
Target 60 fps; transform and opacity only; will-change discipline; no layout
thrash in the readout loop.

**The first five seconds.** The page loads into near-black; the gold zodiac
ring draws itself; readout cards fade in with a stagger; the "Lift off"
affordance breathes once. A loaded sky, not a loading screen.

**Type is sacred.** Devanagari never below 14 px, generous line-height, gold
on lapis. IAST always secondary-weight. Numerals in mono. Hora's token file
(SPEC §10) is the palette of record: lapis night, turmeric gold, kumkum red,
moon silver.

**The cheap list (automatic reject).** Emojis as icons. Default-blue
anything. Oversaturated UI. Unstyled scrollbars. Layout shift on recompute.
Console warnings. Loading spinners where a skeleton would do. Tooltips that
clip Devanagari. Inconsistent border radii.

---

## 9. Feature Ideas (ideas, not mandates)

## Panchanga Sky — Feature Ideas for the Visualization

**How to read this document:** everything here is an *idea*, not a mandate.
The implementing model has full creative freedom to choose better approaches,
drop items that hurt coherence, or invent features not listed here. When a
concrete technique is suggested, it is one option among many — pick whatever
produces the most stunning, accurate, and usable result. Priority order when
trading off: correctness of the Panchangam > visual impact > feature count.

---

## 1. Camera & World Model

- **Geocentric stage (default):** Earth at the origin, its rotation axis fixed;
  the celestial sphere turns around it — the sky moves, the Earth does not.
  This matches how the Panchangam is traditionally conceptualized and should
  be the default experience.
- Consider letting the axis tilt with observer latitude so the pole star sits
  at the right altitude — a subtle authenticity cue.
- Optional alternative viewpoints (heliocentric inset, top-down ecliptic view)
  are welcome if they clarify the five limbs, but never at the cost of the
  default geocentric read.
- Time controls: scrub the day, play at accelerated speed (see a full month of
  tithis in a minute), jump to sunrise/sunset/moonrise, presets for the four
  lunar quarters (see §2 for the exact preset values and the ε-offset
  convention they require).

## 2. Overlay Layers (all toggleable)

Each layer independent, with sensible group presets ("Religious view",
"Astronomical view", "Minimal"):

- **Nakshatra band** — the 27 lunar mansions as a ring or band along the
  Moon's path, each with deity and temperament; the Moon's current mansion
  highlighted.
- **Rashi wheel** — the 12 zodiac signs with their ruling planets (see the
  corrected ruling-planet list in the build prompt (PROMPT.md)).
- **Tithi arc** — the current elongation angle rendered as an arc or sector
  from Sun to Moon, growing and shrinking through the month; paksha shading
  (Shukla vs Krishna).
- **Yoga indicator** — the (Sun + Moon) sum longitude marked distinctly;
  Ashubha yogas flagged in the inauspicious color.
- **Karana half-step** — the current half-tithi, including fixed-karana
  highlighting.
- **Navagraha (planets)** — the seven classical grahas with their sidereal
  positions, Sanskrit names, and day-lords. (Rahu/Ketu are mathematical
  points — the Moon's nodes — render them as shadow points if included.)
- **Constellations** — both Western IAU figures and their traditional Hindu
  nakshatra star-groupings where they differ; toggle between or blend.
- **Moon phase** — the Moon rendered in its true phase, lit by the scene's
  actual Sun direction rather than a faked texture.
- **Eclipse affordance** — when Sun and Moon near a node, hint at eclipse
  possibility (Rahu/Ketu proximity).

## 3. Religious & Cultural Layer

- **Deity associations** surface naturally: nakshatra lords, vara lords,
  yoga natures — as labels or gentle iconography (Phosphor/SVG style icons,
  no emojis).
- **Auspicious/inauspicious coloring** follows the traditional palette:
  gold/silver for Shubha, kumkum red for Ashubha, consistent everywhere.
- **Kala periods** (Rahu Kalam, Yamagandam, Gulika, Abhijit) if day-scrubbing
  is implemented — Hora's `data/rules.json` and `data/names.json` carry the
  tables; credit the Hora project (see SPEC §10).
- **Festival hooks** — a few anchor examples (Purnima, Amavasya, Ekadashi)
  rather than a full calendar; keep scope honest.

## 4. Readouts & Education

- **Five-limb readout cards**: Tithi, Nakshatra, Yoga, Karana, Vara — each
  with Devanagari name (from §3), category, and a one-line meaning.
- **Hover/tap explainers**: what a tithi IS, why yoga is (Sun+Moon)/13°20′,
  with the geometric visualization reinforcing the formula.
- **Pronunciation**: IAST alongside Devanagari where space allows.
- **Live mode**: bind the sliders to the real current sky (Hora's engine can
  supply sidereal longitudes for any date/place) — the "wow, it's real" moment.

## 5. Settings

- Layer toggles and group presets (above).
- Script preference: IAST / Devanagari / Tamil (Hora's names.json ships all
  three).
- Animation speed, location/date, ayanamsha display toggle.
- Everything server-free: must work fully offline.

## 6. Non-Goals

- No full festival calendar, no horoscope generation, no muhurta advice
  engine, no accounts/sync. A beautiful, correct, mesmerizing sky with the
  five limbs made visible is the product.

---

## 10. Hora Integration — the teammate engine

## Panchanga Sky × Hora — Reusing the Teammate's Verified Engine

## What Hora is

A teammate's (srirudrany) Panchanga project, local at
`C:/Users/traps/Downloads/ResumeProjects/CC_BuildEvent/Hora`
(remote: https://github.com/srirudrany/Hora). It is a **verified computation
core + data bundle + design system**, complementary to Panchanga Sky's
visualization goal. **Updated 2026-09-26: commit 269a3ac "Exported Claude
design" added a full app-design pass — a working three.js sky scene and three
interactive design canvases (see table rows marked NEW).**

| Hora asset | What it gives us | Trust level |
|---|---|---|
| `engine/panchanga.js` | Dependency-free JS engine: Sun (Meeus ch.25), Moon (Meeus ch.47), Lahiri ayanamsa, sunrise/sunset, all five limbs **with end times**, Tamil month, samvatsara, kala periods | Verified ~1 min vs published Tamil panchangam |
| `data/test-vectors.json` | 60 expected days (5 South-Indian cities × 12 dates, 2026–27) + 1 externally verified day | External source: drikpanchang.com |
| `data/names.json` | Every name table — tithi, nakshatra (IAST / **Devanagari** / **Tamil**), yoga, karana, vara + lords, rashi ↔ Tamil month, 60 samvatsaras, hora order, kala tables | Structured JSON |
| `data/rules.json` | Muhurta rules: Rikta tithis, Vishti, Vyatipata/Vaidhriti, nakshatra natures, wedding stars, Chandrashtamam, festival pairs | From the reference film |
| `design/tokens.json`, `design/clock-face.md` | The "Pañcāṅga" design system: lapis night ground, turmeric gold, kumkum red, moon silver, copper; type stack (Tiro Devanagari, Tiro Tamil, Noto Sans, IBM Plex Mono) | Shared with Claude Design |
| `reference/five-limbs-of-time.html` + `reference/src/` | A working film + live 3D clock (`buildClock()`/`updateClock()` in chapters2.js), 17 stills | Runs today |
| **NEW** `Panchangam Clock App Design/sky-scene.js` | **Working three.js sky scene**: `window.PanchangaSky.create(el, opts) → ctrl` with `setTime(jd) / setDirection('liftoff'\|'bridge'\|'horizon') / liftOff(on) / lock(k) / setShift / isLifted / onFrame / dispose`; camera lock presets (overview, earth, moon, sun, nakshatra, tithi, yoga), drag-orbit + wheel zoom, warp FOV bulge transition, seeded star field, canvas-generated zodiac/nakshatra ring textures | Adopt as the celestial-mode renderer, or port its mechanics — SPEC §4's transition beats are read from this file. Note: no raycast picking yet — star/planet click-to-tooltip (SPEC §4 (Modes)) is our addition |
| **NEW** `Panchangam Clock App Design/Sky Navigator.dc.html` | Desktop celestial-mode design canvas: "Lift off into the sky", target-lock list with gloss lines, info/tooltip panel structure, scrub gesture (`onScrubDown/Move/Up`), `SPEEDS` dropdown, Live/offset chips, "Return to clock face · L" | Interaction design source for SPEC §4 (Modes) + SPEC §5 (Time; scrubber + speed presets already designed here — reuse its labels) |
| **NEW** `Panchangam Clock App Design/Phone Screens.dc.html` + `Watch.dc.html` | Phone flow (Now lift-off face / Bridge lock-warp / Horizon first-person / Day timeline / Month grid) and 2D watch faces with complications (Rahu countdown, tithi-moon, nāḻigai gauge) | The **month grid** screen is the base for the holy-day finder UI (SPEC §6.2); watch faces constrain future responsive scope |
| **NEW** `Panchangam Clock App Design/support.js` + `names.json` + `panchanga.js` | Generated dc-runtime bundle + design-local copies of names/engine | The canvases run standalone in a browser — open them, they're live on the real engine |

## How it changes our plan

### 1. Division of labor (recommended)
- **Hora = source of truth for computation and naming.** If Panchanga Sky
  needs real sky data for a date/place (live mode, festival anchoring), call
  Hora's engine — do NOT re-derive ephemerides in the visualization layer.
- **Panchanga Sky = the experiential layer.** Our manual L_S/L_M slider model
  (§2) remains perfect for the didactic visualizer; it is the
  geometry-teaching mode. Hora powers the "real tonight's sky" mode.

### 2. Sidereal vs our simplified inputs
Our §2 (Math) treats L_S and L_M as **sidereal (nirayana)** longitudes —
that is the convention the whole Panchangam runs on. Hora's engine computes
*apparent tropical* longitudes internally and subtracts Lahiri ayanamsa
(~24.22° in 2026) to get sidereal. When wiring the two:
```
sidereal = tropical − ayanamsa(jd)     (mod 360)
```
If a slider value fails to reproduce a published panchangam, check the
ayanamsha conversion before suspecting the index formulas.

### 3. Vara boundary difference
Our simplified model derives Vara from the civil calendar date
(`varaFromDate`). Hora follows the Tamil convention: **the day (and therefore
Vara) changes at sunrise, not midnight.** For the slider-visualizer this is
invisible; for any live/day-scrubbing mode, follow Hora's sunrise anchor.

### 4. Known erratum in the source guide — do not "fix" our correct tables
The Panchanga Reference Guide's §5.2 worked example (Sun 110° + Moon 45° =
155° → "Ganda Yoga") is **wrong**. 155° falls in segment 12 = **Dhruva**
(Ganda is segment 10). Hora's CLAUDE.md documents this explicitly.
Our §2 and §3 Yoga tables are already correct
(Ganda = index 10). If any generated code reproduces the guide's example
label, treat it as a bug in the port, not in our tables — this is
formalized as vector V-YOGA-01 in test-vectors.md
(Sun 110° + Moon 45° ⇒ Yoga 12 Dhruva, Shubha).

### 5. Cross-validation of our data tables
Checked against Hora's `names.json` and CLAUDE.md (2026-09-26):
- Nakshatra order and Devanagari spellings: consistent with our §3 tables.
- Yoga order and the Ashubha set {1,6,9,10,13,15,17,19,27}: consistent.
- Karana cycle and the four fixed positions (1, 58, 59, 60): consistent.
- Tithi categories by `((t − 1) mod 5)`: consistent.
Differences to respect: Hora uses IAST diacritics (Kṛṣṇa, Nakṣatra) as its
primary strings with Tamil + Devanagari alongside; our tables lead with
Devanagari. Both are correct — pick per UI context, don't merge styles
mid-screen.

### 6. Live smoke test available today
Hora's externally verified benchmark vector is **2026-09-26, Chennai**: sunrise 05:58,
sunset 18:02, Purnima until 22:18, Purva Bhadrapada until 11:32, Ganda yoga
until 13:17, Vishti karana until 10:46/10:47 followed by Bava karana until 22:18.
In "live mode", all values are dynamically calculated for the observer's current
day and coordinates (using `sunriseOn`, `sunsetOn`, and `panchanga(y, m, d, loc)`),
with the benchmark serving as the integration test to confirm the calculation
pipeline matches verified astronomical ephemeris outputs.

## Ground rules

- Credit Hora (srirudrany) in the README and any submission; the engine and
  name tables are their work.
- Do not fork-patch Hora's engine inside our repo; consume it (file copy with
  provenance header, or import), so their verification stays meaningful.
- Any number our docs assert must survive `data/test-vectors.json` and
  `test-vectors.md` simultaneously; if the two ever disagree, the
  discrepancy is a finding — stop and reconcile, never pick one silently.
