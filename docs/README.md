# Panchanga Sky — Docs

A **cultural learning tool meets astronomy**: a photorealistic, geocentric
night sky that makes the Hindu Panchangam visible. Two modes — the
**Kālacakra clock face** (top-down, temporal overlays) and the **celestial
sky** (stars, planets, constellations, click-to-learn tooltips) — joined by
a lift-off transition. Time scrubbing with playback speeds, place-aware
panchangam for any point on Earth (with a "Stand here" POV), a holy-day
finder, and the wider solar system as the graha cast.

## The three files

| File | Purpose |
|---|---|
| [README.md](README.md) | This map — start here |
| [SPEC.md](SPEC.md) | The consolidated spec: product, math, tables, modes, transition, time, place, holy days, solar system, polish bar, feature ideas, Hora integration |
| [PROMPT.md](PROMPT.md) | The one-prompt build: paste into Opus 5.5 (with SPEC.md attached) → Three.js web app in vanilla JavaScript, no build step; includes the data-record appendix and the full verification checklist |
| [test-vectors.md](test-vectors.md) | Formal acceptance vectors: index-formula unit vectors, the guide-erratum vector (V-YOGA-01), the 2026-09-26 Chennai regression day, and the any-day/dynamic-time protocol |

Everything that was previously spread across 11 numbered docs (01–11 +
CHANGELOG) was consolidated into SPEC.md, and the acceptance vectors now
live in test-vectors.md — nothing was dropped; sections were merged and
renumbered. The review history (2 external review rounds,
every finding script-verified before patching) is preserved in the git
history of this folder and summarized below.

## Build flow

1. Read SPEC.md §1 (product) — it frames the whole build.
2. Give Opus 5.5 the PROMPT.md prompt block with SPEC.md attached (or paste
   ALL of SPEC §2–§10 after the prompt if your interface can't attach
   files — the Verification Checklist grades against those sections, so
   a partial paste makes gates ungradable).
3. Accept the build only if it passes PROMPT.md's Verification Checklist
   (25 gates) and the acceptance vectors in test-vectors.md.
4. Live-mode smoke test: verify the engine dynamically computes all astronomical
   values (Sunrise, Sunset, Tithi, Nakshatra, Yoga, Karana transitions) for the
   current day and location. In addition, benchmark the dynamic calculation
   against the externally verified reference day (2026-09-26, Chennai: Sunrise 05:58,
   Sunset 18:02, Purnima until 22:18, Purva Bhadrapada until 11:32, Ganda yoga until 13:17,
   Vishti karana until 10:46/10:47 followed by Bava until 22:18 —
   full vector: test-vectors.md §3).

## Provenance & credits

- Domain source: the team's Panchanga Reference Guide (formulas, tables);
  erratum noted inline (guide §5.2 "Ganda" worked example is actually
  Dhruva — follow the formula, not the diagram).
- **Hora** (github.com/srirudrany/Hora, teammate srirudrany): verified
  Panchanga engine (Meeus + Lahiri, ±1 min vs drikpanchang), 60 test
  vectors, name tables (IAST/Devanagari/Tamil), muhurta rules, design
  tokens, and the three.js sky-scene prototype whose lift-off transition
  and lock presets this spec adopts. Credit Hora in any submission.
- Review discipline: every external review finding was re-derived by script
  against the project's own formulas/tables before being accepted and
  patched (5/5 accepted Round 1; Hora cross-validation clean Round 2).

## Standing directives (from Ojas)

- Creative freedom is explicit: every concrete technique in the prompt is a
  suggestion; the builder chooses better approaches for better outcomes and
  notes deviations.
- Ideas, not mandates: SPEC §9 is inspiration; priority order is correctness
  of the Panchangam > visual impact > feature count.
- No emojis in UI — Phosphor/SVG only. Devanagari-first naming. Guidance
  tone, never prescription, for muhurta content.
