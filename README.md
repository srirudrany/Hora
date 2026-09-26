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
