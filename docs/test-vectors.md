# Panchanga Sky — Acceptance Test Vectors

Formal acceptance vectors for the build. Referenced from SPEC §3
("encoded as assertions") and PROMPT.md's Verification Checklist.
A build is accepted only if every vector below passes.

All engine-sourced numbers were extracted verbatim from Hora's
`engine/panchanga.js` / `data/test-vectors.json` — no values were
hand-computed or shifted. 2026-09-26 is the **regression day**; the
dynamic-time requirement (§5) is what makes the build work on any day.

---

## 1. Conventions (read first)

- **Our tables and this doc are 1-based.** Tithi 1..30, Nakshatra 1..27,
  Yoga 1..27, Karana 1..60 — matching the tables in SPEC §2–§3.
- **Hora's `data/test-vectors.json` is mixed-base:** `tithi` and
  `karana` indices are 1-based; `yoga` and `nakshatra` indices are
  0-based (e.g. JSON `"yoga": {"index": 10, "name": "Vṛddhi"}` = our
  Yoga 11). Convert before comparing: `yoga_ours = json.index + 1`,
  `nakshatra_ours = json.index + 1`.
- **Half-open intervals.** An index formula `floor(x/span)+1` puts an
  exact boundary value at the START of the next segment. Boundary
  expectations therefore use the ε-offset convention from SPEC §2
  ("Preset Configurations"): target − 0.001°.
- **Rounding:** sidereal longitudes compared to 4 decimal places;
  clock times to the minute (±1 min vs the external source).

---

## 2. Unit vectors — index formulas (pure functions)

Checkable without any ephemeris; a build that fails these has a ported
formula bug, not a data bug.

| ID | Input | Expected |
|---|---|---|
| V-TITHI-01 | ΔL = 90.5° | Tithi 8, Shukla Ashtami |
| V-TITHI-02 | ΔL = 179.999° | Tithi 15, Purnima (Shukla) |
| V-TITHI-03 | ΔL = 180° (exact boundary) | Tithi 16, Krishna Pratipada — boundary starts the NEXT tithi |
| V-TITHI-04 | ΔL = 359.999° | Tithi 30, Amavasya (Krishna) |
| V-TITHI-05 | ΔL = 0° | Tithi 1, Shukla Pratipada |
| V-KARA-01 | ΔL = 90.5° | Karana 16, Bava (Movable) |
| V-KARA-02 | ΔL = 271.0° | Karana 46, Kaulava (Movable) |
| V-KARA-03 | ΔL = 42.0° | Karana 8, Vishti (Bhadra — avoid-flag) |
| V-KARA-04 | ΔL = 0.5° | Karana 1, Kimstughna (Fixed) |
| V-KARA-05 | ΔL = 342.0° | Karana 58, Shakuni (Fixed) |
| V-KARA-06 | ΔL = 179.999° | Karana 30, Bava (Movable) — Purnima preset |
| V-KARA-07 | ΔL = 270.0° | Karana 46, Kaulava (Movable) — Third Quarter preset |
| V-NIKS-01 | λ☾ = 0° | Nakshatra 1 Ashwini, pada 1 |
| V-NIKS-02 | λ☾ = 13.2° | Nakshatra 1 Ashwini, pada 4 (13°20′ = 13.333…° span) |
| V-NIKS-03 | λ☾ = 13.34° | Nakshatra 2 Bharani, pada 1 |
| V-NIKS-04 | λ☾ = 228.4144° | Nakshatra 18 Jyeshtha |
| V-YOGA-01 | L_S = 110°, L_M = 45° | **Yoga 12 Dhruva, Shubha** — the guide-erratum vector; a build reporting Ganda here has ported the guide's §5.2 diagram label (SPEC §10.4) |
| V-YOGA-02 | (L_S + L_M) mod 360° = 130.0° | Yoga 10 Ganda (Ganda span: 120°–133°20′) |
| V-YOGA-03 | (L_S + L_M) mod 360° = 133.34° | Yoga 11 Vriddhi |
| V-YOGA-04 | (L_S + L_M) mod 360° = 146.67° | Yoga 12 Dhruva |

Preset-parity: the four UI presets (Amavasya 359.999°, First Quarter
90°, Purnima 179.999°, Third Quarter 270°) must show Tithi 30/8/15/23
and Karana 60/16/30/46 respectively — identical to V-TITHI-04/01/02
and V-KARA-06/07/01.

## 3. Regression day — 2026-09-26, Chennai (13.0827 N, 80.2707 E, UTC+05:30)

Externally verified against drikpanchang.com (Hora's vector). "Until"
times are IST clock times.

- **Sunrise 05:58 · Sunset 18:02**
- Tithi **15 Purnima** until 22:18, then 16 Krishna Pratipada
- Nakshatra **25 Pūrva Bhādrapadā** until 11:32, then 26 Uttara Bhādrapadā
- Yoga **10 Ganda** until 13:17, then 11 Vriddhi
- Karana **28 Viṣṭi (Bhadra)** until 10:46, **29 Bava** until 22:18, then 30 Bālava
- Rahu kalam 08:59–10:30 · Tamil date Purattasi 10

Acceptance: live mode reproduces every limb name and end time within
±1 min. This is the single externally-verified end-to-end vector.

## 4. Cross-validation vector — 2026-01-15, Chennai

Exact values from `data/test-vectors.json` (Meeus + Lahiri engine,
drikpanchang-consistent). Reproduce at the 10:00 IST epoch:
L_S = 270.6612°, L_M = 228.4144°, ayanamsa 24.2227°, ΔL = 317.7532°.

| Limb | Expected (our 1-based) |
|---|---|
| Vara | 4 Guruvāra (Thursday) |
| Tithi | **26 Kṛṣṇa Dvādaśī** until 20:17, then 27 Kṛṣṇa Trayodaśī |
| Nakshatra | **18 Jyeṣṭhā** until 05:47 (+1d), then 19 Mūla |
| Yoga | **11 Vṛddhi** until 20:37, then 12 Dhruva |
| Karana | **53 Kaulava** until 07:07, 54 Taitila until 20:17, then 55 Gara |
| Sunrise / Sunset | 06:35 / 18:01 IST |
| Rahu kalam | 13:44–15:09 IST |

(Gana spot-checks: nakshatra 18 Jyeshtha and yoga 12 Dhruva both confirm
the mixed-base conversion in §1 — JSON stores 17 and 11.)

## 5. Dynamic-time requirement (any day, not a demo date)

- The app initializes to the **system clock's current day** and computes
  the live Panchangam from it. No hardcoded demo date anywhere in the
  source (a `grep` for `2026-09-26` must match only test data, never
  app logic).
- Picking ANY other date/time — scrubber or date input — recomputes all
  five limbs from that moment. Verification protocol: run the build on
  today's date and check every limb against Hora's engine output for
  the same place/day (engine-source protocol below); then scrub to
  2026-01-15 and 2026-09-26 and match §3–§4. 2026-09-26 is the
  regression anchor, not the demo day.

## 6. Engine-source protocol (how to check "any day")

Hora's engine is the oracle: `engine/panchanga.js` (Meeus Sun ch.25 /
Moon ch.47, Lahiri ayanamsa) exposes `jdFromDate, sunLon, moonLon,
sidSun, sidMoon, elong(jd), sunriseOn, sunsetOn, panchanga(y, m, d,
{lat, lon, tz}), tithiName, karanaName`. Two rules:

1. **Longitudes:** feed `sidSun(jd)` / `sidMoon(jd)` (sidereal) into
   our index formulas — never raw tropical `sunLon`/`moonLon`.
   `elong(jd)` takes a JD, not two longitudes, and already returns
   tropical elongation; for sidereal ΔL use
   `(sidMoon(jd) − sidSun(jd)) mod 360°` (ayanamsha cancels).
2. **Times:** the engine's `panchanga()` times are UTC instants
   (JD-numbered `Date`s) — display them in the place's tz. Sanity
   anchor: 2026-01-15 Chennai sunrise must read 06:35 IST, never 00:35.

## 7. Discrepancy rule

Any number the build or docs assert must survive
`data/test-vectors.json` and this file simultaneously; if the two ever
disagree, the discrepancy is a finding — stop and reconcile, never
pick one silently.

---

*Provenance: vectors generated and script-verified 2026-09-26 against
Hora `engine/panchanga.js` (Meeus + Lahiri, ±1 min vs drikpanchang)
and the project's own SPEC §2 formulas; guide-erratum re-confirmed
(155° ⇒ segment 12 Dhruva, not Ganda).*
