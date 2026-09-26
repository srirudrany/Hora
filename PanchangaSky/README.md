# Panchanga Sky · पञ्चाङ्ग

A photorealistic, geocentric night sky that makes the Hindu Panchangam visible.
Built from `docs/PROMPT.md` against `docs/SPEC.md` and `docs/test-vectors.md`.
Vanilla JavaScript ES modules plus three.js from a CDN. There is no build step.

## Run

```bash
cd PanchangaSky
python3 -m http.server 8000     # or: npx serve .
# open http://localhost:8000
```

Run the acceptance vectors (Node ≥ 22):

```bash
node tests/vectors.test.mjs     # 48 checks: §2 unit vectors, preset parity, §3 regression day, §4 cross-validation
```

## What's in this first pass

- **Clock mode (Kālacakra):** the rashi ring, the 27-cell nakshatra ring, a tithi ring that turns with the Sun (karana half-step ticks), and a self-drawing gold ecliptic. The temporal dial shows 60 nāḻigai from sunrise, day and night arcs, Rāhu kālam, Yamagaṇḍam and Kuḷikai bands, and the Chaldean hora sectors with the hand. The face drifts slightly when idle.
- **Sky mode:** 18,000 procedural stars in three parallax layers with per-star twinkle, a milky-way band on the true galactic plane, a nebula wash, and about 100 named bright stars placed by RA/Dec. The celestial sphere turns by GMST around the fixed Earth. The Moon's phase is lit from the real Sun direction. Only the Sun and Moon bloom. Camera locks: overview, earth, sun, moon, nakshatra, tithi, yoga and karana.
- **Lift-off transition (Space key or the button):** a 50 ms anticipation beat, then up to 1.6 s of travel. The FOV breathes 40°→68°→40°, the stars swell about 3×, and a lapis fog passes. The readout cards shrink into HUD chips using transform and opacity only. With `prefers-reduced-motion` it becomes a 300 ms crossfade.
- **Five readout cards:** Devanagari first, with IAST, category chips, deity or temperament, and end times. Each card has a Shubha/Ashubha edge glow, and there's an overall assessment dot.
- **Sliders and presets:** direct L☉/L☾ control, ΔL and yoga-sum readouts. The presets use the ε-offset convention: Tithi 30/8/15/23 and Karana 60/16/30/46.
- **Time:** starts from the system clock (there is no demo date). Speeds are Live, 1×, 60×, 600×, 1 day/s and 1 month/s. You can pause, press **Now** (or the `L` key), or enter a date and time. The scrubber has a day domain (sunrise to sunrise, with limb-change marks and kala bands) and a month domain (with a festival lane for Ekādaśī, Pūrṇimā, Amāvāsyā, Saṅkrānti and the solar-month + nakshatra festivals from `rules.json`).
- **Place:** 41 bundled cities plus "My location". Sunrise-anchored vara, end times shown in the place's time zone.
- **Glossary hover:** every term uses one shared `GLOSSARY` object, and `g()` throws on a missing entry. **Views:** Scientific (RA/Dec grid, radial measurement lines, ΔL label), Religious (Devanagari names, deity lines), or Both.
- **Click to learn:** clicking the Sun, Moon, Earth, a nakshatra, a rashi or a tithi cell opens a tooltip. Clicking a ring on the clock face lifts off into the sky.

### Second pass

- **Grahas:** Budha, Shukra, Mangala, Guru and Shani sit on the ecliptic at approximate longitudes from JPL mean elements, with stylized distances. Each can be clicked (science line, myth line, weekday ruler) and has a camera lock. Guru shows its four Galilean moons and Shani its tilted rings. Today's day-lord pulses, and the Vara card has a "find ‹graha›" link.
- **Rahu and Ketu:** the mean lunar nodes appear as shadow points joined by a dashed axis. They glow when the Sun, and more strongly the Moon, comes near, and an eclipse-season note appears in the sky panel.
- **Heliocentric inset:** orbit rings on a log-compressed radius with motion trails, Galilean moons and Saturn's ring. Mesha points up, and it is labelled **NOT TO SCALE**.
- **"Stand here" (POV):** the same scene seen from the selected place at the scrubber time. An opaque ground hemisphere hides everything below the horizon, with a haze band and N/E/S/W markers. The pole altitude matches the latitude because the sky frame turns by GMST around the fixed Earth. Drag to look around and scroll to zoom. The Sun, Moon, nakshatra and graha locks become "look at" in this view. Switching between clock, sky and POV keeps the scrub position, locks and toggles.
- **Two-stage tooltips:** clicking a star, planet or node opens the body box plus a chip, such as "Part of Mrigashira (Orion) — view →" or "Solar System — view →". The chip opens a card: constellation cards highlight the stick figure and pulse the member stars. There are 12 stick figures, each with a note comparing it to its nakshatra, and bright stars and yogataras are labelled.
- **Holy-day finder ("Find a day"):** pick an activity and get a month grid tinted gold (favourable), muted (neutral) or kumkum (avoid). Days are judged at sunrise using only Hora's `rules.json`, and each day lists reason chips that name the limb they come from. "Show in the sky" scrubs to that day and locks the Moon's nakshatra. The disclaimer is shown. Riktā tithis, Amāvāsyā, Vyatīpāta/Vaidhṛti and months avoided for weddings count as hard avoids. Ugra/Tīkṣṇa stars and Viṣṭi only reduce the score.
- **Overlay toggles** in the sky: constellations, navagraha, nakshatra band and rashi wheel.

Tests: `node tests/vectors.test.mjs` runs 79 checks. They add finder semantics, a check that every `rules.json` nakshatra nature matches the SPEC table, and a check that Rahu and Ketu stay opposite.

**Still open:** the compare-two-places slot, globe pin-drop, a year-domain zoom ladder on the scrubber, and the Tamil-script option.

## Files

| File | Role |
|---|---|
| `index.html` | Entry point: import map for three.js, fonts, and the vendored engine |
| `vendor/panchanga.js` | **Hora's verified engine**, copied verbatim (Meeus Sun/Moon, Lahiri, sunrise, end times) |
| `src/PanchangamData.js` | Frozen tables: 30 tithis, 27 nakshatras, 27 yogas, 60 karanas, 7 varas, 12 rashis, stars, cities, glossary |
| `src/PanchangamMath.js` | Pure index formulas (SPEC §2), plus live-sky, day-bounds and end-time wrappers over the engine |
| `src/rules.js` | Hora `data/rules.json`, embedded as an ES module |
| `src/Renderer.js` | Scene frames (world → equatorial → tilt → ecliptic), bloom, lift-off, labels, picking |
| `src/Starfield.js` · `src/ZodiacWheel.js` · `src/CelestialBodies.js` | The sky, the Kālacakra, and Surya/Chandra/Earth |
| `src/UI.js` · `src/App.js` · `src/styles.css` | Overlay, state and loop, and styling (palette from Hora `design/tokens.json`) |

## Deviations from the prompt (creative freedom, noted)

- **Live sky longitudes come from Hora's engine** instead of being re-derived (SPEC §10). The sliders switch to "Manual angles", and **Now** returns to the live sky.
- **Vara is anchored at sunrise** in every mode, following the Tamil convention in SPEC §10.3. It is not taken from `Date.getDay()`.
- **Labels are HTML**, positioned each frame with `transform`, so Devanagari stays crisp and never drops below 14 px. Only the Moon's nakshatra is named on the face, since the ring already numbers all 27.
- **Time zones are fixed offsets per city.** The engine takes a fixed `tz`, and daylight saving time is not modelled.
- **Planet placement uses JPL mean elements** (inclination ignored). It is labelled approximate in the tooltips. On 2026-09-26 Guru sits at about 18° Leo tropical and Rahu is in Kumbha, which is plausible.

## Findings in `docs/test-vectors.md` (per its §7 discrepancy rule — not silently picked)

1. **§4 epoch:** the listed L☉ 270.6612° / L☾ 228.4144° are the engine's values at **sunrise, 06:35 IST**, not at 10:00 IST. At 10:00, L☾ ≈ 230.11°. The test uses sunrise.
2. **§4 tithi number:** ΔL 317.75° gives `floor(317.75/12)+1` = **27**, which is Kṛṣṇa Dvādaśī. The doc says "26 Kṛṣṇa Dvādaśī". The name is right and the number is off by one.
3. **§3 karana numbers:** by the formula and the SPEC §3 table, Viṣṭi→Bava at Pūrṇimā's end are karanas **29 → 30**, then 31 Bālava. The doc lists 28/29/30. Hora's engine `karana` index is 0-based, which contradicts the §1 claim that it is 1-based. The names and end times all match.

## Credits

Engine, name tables, muhūrta rules and design tokens come from **Hora** by srirudrany (github.com/srirudrany/Hora).
Domain source: the team's Panchanga Reference Guide. The guide's §5.2 "Ganda" example is actually **Dhruva**, which vector V-YOGA-01 checks.
