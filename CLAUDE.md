# CLAUDE.md

## Project: Hora

Hora is a Vedic astrology / Panchanga project. The domain reference is
[`Panchanga Reference Guide.md`](./Panchanga%20Reference%20Guide.md). Read it before
implementing any Panchanga calculation.

Note: the guide's formulas are embedded as base64 images, so they don't come through
as text. The rules below restate them in plain text and are what the code should follow.

## Panchanga reference (summary of the guide)

The five limbs (*anga*) of the Panchanga are Vara, Tithi, Nakshatra, Yoga and Karana.
All longitudes are **sidereal (Nirayana)**, geocentric, and normalised to `[0°, 360°)`.
The default Ayanamsha is Lahiri.

- Sun longitude `λ☉` moves about 0.9856°/day. Moon longitude `λ☾` moves about 13.176°/day.
- Elongation: `E = (λ☾ − λ☉) mod 360°`

### Vara
Solar weekday, named after the lord of the day.

### Tithi (30 per synodic month, 12° each)
- `tithi = floor(E / 12°) + 1` → 1..30
- Shukla Paksha: 1–15 (E 0°–180°), ends at Purnima (15).
- Krishna Paksha: 16–30 (E 180°–360°), ends at Amavasya (30).
- Categories, by `((tithi − 1) mod 5)`:
  - 0 = Nanda (1, 6, 11, 16, 21, 26)
  - 1 = Bhadra (2, 7, 12, 17, 22, 27)
  - 2 = Jaya (3, 8, 13, 18, 23, 28)
  - 3 = Rikta (4, 9, 14, 19, 24, 29)
  - 4 = Purna (5, 10, 15, 20, 25, 30)

### Nakshatra (27 segments of 13°20′ = 13.333…°)
- `nakshatra = floor(λ☾ / (360°/27)) + 1` → 1..27
- `pada = floor((λ☾ mod 13°20′) / 3°20′) + 1` → 1..4 (108 padas in total)
- Order: Ashwini, Bharani, Krittika, Rohini, Mrigashira, Ardra, Punarvasu, Pushya,
  Ashlesha, Magha, Purva Phalguni, Uttara Phalguni, Hasta, Chitra, Swati, Vishakha,
  Anuradha, Jyeshtha, Mula, Purva Ashadha, Uttara Ashadha, Shravana, Dhanishta,
  Shatabhisha, Purva Bhadrapada, Uttara Bhadrapada, Revati.
- Deities and temperaments (Kshipra/Ugra/Mishra/Dhruva/Mridu/Tikshna/Chara) are listed
  in guide §4.2.

### Yoga (27 segments of 13°20′)
- `yoga = floor(((λ☉ + λ☾) mod 360°) / (360°/27)) + 1` → 1..27
- Order: Vishkambha, Priti, Ayushman, Saubhagya, Shobhana, Atiganda, Sukarma, Dhriti,
  Shula, Ganda, Vriddhi, Dhruva, Vyaghata, Harshana, Vajra, Siddhi, Vyatipata, Variyan,
  Parigha, Shiva, Siddha, Sadhya, Shubha, Shukla, Brahma, Indra, Vaidhriti.
- Inauspicious (Ashubha): 1, 6, 9, 10, 13, 15, 17, 19, 27. All other yogas are auspicious (Shubha).
- **Known error in the guide:** the §5.2 worked example (Sun 110° + Moon 45° = 155°)
  labels the result "Ganda Yoga". 155° falls in segment 12 (146°40′–160°00′), which is
  **Dhruva**. Ganda is segment 10. Follow the formula, not the diagram label.

### Karana (60 per month, 6° each)
- `k = floor(E / 6°) + 1` → 1..60
- k = 1: Kimstughna (fixed)
- k = 2..57: movable cycle `[Bava, Balava, Kaulava, Taitila, Gara, Vanija, Vishti]` at
  index `(k − 2) mod 7`, repeated 8 times
- k = 58: Shakuni (fixed). k = 59: Chatushpada (fixed). k = 60: Naga (fixed).
- Vishti (Bhadra) should be avoided for auspicious events. Symbols and uses are in guide §6.3.

### Classical sources
Surya Siddhanta, Brihat Samhita (Varahamihira), Brihat Parashara Hora Shastra,
Vedanga Jyotisha (Lagadha).
