/**
 * PanchangamData.js
 *
 * Complete reference data tables for the Panchanga Sky application.
 * All arrays and objects are frozen to prevent accidental mutation.
 */

// ---------------------------------------------------------------------------
// Helper: category lookup for Tithi
// ---------------------------------------------------------------------------
const TITHI_CATEGORIES = ["Nanda", "Bhadra", "Jaya", "Rikta", "Purna"];

const TITHI_AUSPICIOUS = {
  Nanda: "Beginnings, new projects, fine arts",
  Bhadra: "Education, commerce, marriage, journeys",
  Jaya: "Legal actions, competitions, overcoming hurdles",
  Rikta: "Surgical ops, demolitions, purification, debt settlement",
  Purna: "High-impact initiatives, rituals, real estate",
};

// ---------------------------------------------------------------------------
// 1. TITHI_TABLE  (30 entries)
// ---------------------------------------------------------------------------
const TITHI_NAMES = [
  { name: "प्रतिपदा", iast: "Pratipada" },
  { name: "द्वितीया", iast: "Dwitiya" },
  { name: "तृतीया", iast: "Tritiya" },
  { name: "चतुर्थी", iast: "Chaturthi" },
  { name: "पंचमी", iast: "Panchami" },
  { name: "षष्ठी", iast: "Shashthi" },
  { name: "सप्तमी", iast: "Saptami" },
  { name: "अष्टमी", iast: "Ashtami" },
  { name: "नवमी", iast: "Navami" },
  { name: "दशमी", iast: "Dashami" },
  { name: "एकादशी", iast: "Ekadashi" },
  { name: "द्वादशी", iast: "Dvadashi" },
  { name: "त्रयोदशी", iast: "Trayodashi" },
  { name: "चतुर्दशी", iast: "Chaturdashi" },
  { name: "पूर्णिमा", iast: "Purnima" },
];

export const TITHI_TABLE = Object.freeze(
  Array.from({ length: 30 }, (_, i) => {
    const index = i + 1;
    const category = TITHI_CATEGORIES[(index - 1) % 5];
    const paksha = index <= 15 ? "Shukla" : "Krishna";
    let nameEntry;
    if (index <= 15) {
      nameEntry = TITHI_NAMES[i];
    } else if (index === 30) {
      nameEntry = { name: "अमावस्या", iast: "Amavasya" };
    } else {
      nameEntry = TITHI_NAMES[(index - 1) % 15];
    }
    return Object.freeze({
      index,
      name: nameEntry.name,
      iast: nameEntry.iast,
      category,
      paksha,
      auspiciousFor: TITHI_AUSPICIOUS[category],
    });
  })
);

// ---------------------------------------------------------------------------
// 2. NAKSHATRA_TABLE  (27 entries)
// ---------------------------------------------------------------------------
const DEG_PER_NAK = 360 / 27; // 13.333...

const NAKSHATRA_RAW = [
  { name: "अश्विनी", iast: "Ashwini", deity: "Ashvins", temperament: "Swift, Healing" },
  { name: "भरणी", iast: "Bharani", deity: "Yama", temperament: "Fierce, Restrictive" },
  { name: "कृत्तिका", iast: "Krittika", deity: "Agni", temperament: "Mixed, Sharp" },
  { name: "रोहिणी", iast: "Rohini", deity: "Prajapati", temperament: "Fixed, Fertile" },
  { name: "मृगशिरा", iast: "Mrigashira", deity: "Soma", temperament: "Gentle, Inquisitive" },
  { name: "आर्द्रा", iast: "Ardra", deity: "Rudra", temperament: "Sharp, Transformative" },
  { name: "पुनर्वसु", iast: "Punarvasu", deity: "Aditi", temperament: "Movable, Renewing" },
  { name: "पुष्य", iast: "Pushya", deity: "Brihaspati", temperament: "Swift, Nourishing" },
  { name: "आश्लेषा", iast: "Ashlesha", deity: "Sarpas", temperament: "Sharp, Piercing" },
  { name: "मघा", iast: "Magha", deity: "Pitris", temperament: "Fierce, Royal" },
  { name: "पूर्व फाल्गुनी", iast: "Purva Phalguni", deity: "Bhaga", temperament: "Fierce, Creative" },
  { name: "उत्तर फाल्गुनी", iast: "Uttara Phalguni", deity: "Aryaman", temperament: "Fixed, Enduring" },
  { name: "हस्त", iast: "Hasta", deity: "Savitr", temperament: "Swift, Dexterous" },
  { name: "चित्रा", iast: "Chitra", deity: "Tvashtar", temperament: "Gentle, Artistic" },
  { name: "स्वाती", iast: "Swati", deity: "Vayu", temperament: "Movable, Adaptable" },
  { name: "विशाखा", iast: "Vishakha", deity: "Indragni", temperament: "Mixed, Purpose-Driven" },
  { name: "अनुराधा", iast: "Anuradha", deity: "Mitra", temperament: "Gentle, Devotional" },
  { name: "ज्येष्ठा", iast: "Jyeshtha", deity: "Indra", temperament: "Sharp, Protective" },
  { name: "मूल", iast: "Mula", deity: "Nirriti", temperament: "Sharp, Investigating" },
  { name: "पूर्वाषाढा", iast: "Purva Ashadha", deity: "Apas", temperament: "Fierce, Invincible" },
  { name: "उत्तराषाढा", iast: "Uttara Ashadha", deity: "Vishvedevas", temperament: "Fixed, Victorious" },
  { name: "श्रवण", iast: "Shravana", deity: "Vishnu", temperament: "Movable, Receptive" },
  { name: "धनिष्ठा", iast: "Dhanishta", deity: "Ashta Vasus", temperament: "Movable, Rhythmic" },
  { name: "शतभिषा", iast: "Shatabhisha", deity: "Varuna", temperament: "Movable, Curative" },
  { name: "पूर्व भाद्रपदा", iast: "Purva Bhadrapada", deity: "Aja Ekapada", temperament: "Fierce, Ascetic" },
  { name: "उत्तर भाद्रपदा", iast: "Uttara Bhadrapada", deity: "Ahirbudhnya", temperament: "Fixed, Grounded" },
  { name: "रेवती", iast: "Revati", deity: "Pushan", temperament: "Gentle, Nurturing" },
];

export const NAKSHATRA_TABLE = Object.freeze(
  NAKSHATRA_RAW.map((n, i) => {
    const start = +(i * DEG_PER_NAK).toFixed(3);
    const end = +((i + 1) * DEG_PER_NAK).toFixed(3);
    return Object.freeze({
      index: i + 1,
      name: n.name,
      iast: n.iast,
      start,
      end,
      deity: n.deity,
      temperament: n.temperament,
    });
  })
);

// ---------------------------------------------------------------------------
// 3. YOGA_TABLE  (27 entries)
// ---------------------------------------------------------------------------
const ASHUBHA_YOGA_INDICES = new Set([1, 6, 9, 10, 13, 15, 17, 19, 27]);

const YOGA_RAW = [
  { name: "विष्कम्भ", iast: "Vishkambha", nature: "Obstruction, initial friction" },
  { name: "प्रीति", iast: "Priti", nature: "Love, affection, satisfaction" },
  { name: "आयुष्मान", iast: "Ayushman", nature: "Long life, vitality" },
  { name: "सौभाग्य", iast: "Saubhagya", nature: "Good fortune, prosperity" },
  { name: "शोभन", iast: "Shobhana", nature: "Beautiful, splendid" },
  { name: "अतिगण्ड", iast: "Atiganda", nature: "Severe complications" },
  { name: "सुकर्मा", iast: "Sukarma", nature: "Good actions, merit" },
  { name: "धृति", iast: "Dhriti", nature: "Steadfastness, determination" },
  { name: "शूल", iast: "Shula", nature: "Sharp conflict, pain" },
  { name: "गण्ड", iast: "Ganda", nature: "Emotional knots, tangles" },
  { name: "वृद्धि", iast: "Vriddhi", nature: "Growth, prosperity" },
  { name: "ध्रुव", iast: "Dhruva", nature: "Fixed, stable" },
  { name: "व्याघात", iast: "Vyaghata", nature: "Threatening, destructive" },
  { name: "हर्षण", iast: "Harshana", nature: "Joy, delight" },
  { name: "वज्र", iast: "Vajra", nature: "Volatile, piercing" },
  { name: "सिद्धि", iast: "Siddhi", nature: "Accomplishment, perfection" },
  { name: "व्यतिपात", iast: "Vyatipata", nature: "Major calamity" },
  { name: "वरियान्", iast: "Variyan", nature: "Excellent, superior" },
  { name: "परिघ", iast: "Parigha", nature: "Barriers, delays" },
  { name: "शिव", iast: "Shiva", nature: "Auspicious, benevolent" },
  { name: "सिद्ध", iast: "Siddha", nature: "Perfected, accomplished" },
  { name: "साध्य", iast: "Sadhya", nature: "Attainable, possible" },
  { name: "शुभ", iast: "Shubha", nature: "Auspicious, favorable" },
  { name: "शुक्ल", iast: "Shukla", nature: "Bright, pure" },
  { name: "ब्रह्म", iast: "Brahma", nature: "Creative, expansive" },
  { name: "इन्द्र", iast: "Indra", nature: "Power, leadership" },
  { name: "वैधृति", iast: "Vaidhriti", nature: "Chaotic dissipation" },
];

export const YOGA_TABLE = Object.freeze(
  YOGA_RAW.map((y, i) => {
    const index = i + 1;
    return Object.freeze({
      index,
      name: y.name,
      iast: y.iast,
      classification: ASHUBHA_YOGA_INDICES.has(index) ? "Ashubha" : "Shubha",
      nature: y.nature,
    });
  })
);

// ---------------------------------------------------------------------------
// 4. KARANA_TABLE  (60 entries)
// ---------------------------------------------------------------------------
const MOVABLE_KARANAS = [
  { name: "बव", iast: "Bava", animal: "Lion", nature: "Commanding", application: "Leadership, fitness, initiation" },
  { name: "बालव", iast: "Balava", animal: "Tiger", nature: "Intellectual", application: "Study, spiritual rituals" },
  { name: "कौलव", iast: "Kaulava", animal: "Boar", nature: "Cooperative", application: "Social alliances, contracts" },
  { name: "तैतिल", iast: "Taitila", animal: "Rhinoceros", nature: "Defensive", application: "Construction, paperwork" },
  { name: "गर", iast: "Gara", animal: "Elephant", nature: "Diligent", application: "Agriculture, physical labor" },
  { name: "वणिज", iast: "Vanija", animal: "Merchant", nature: "Commercial", application: "Trade, financial exchanges" },
  { name: "विष्टि", iast: "Vishti", animal: "Donkey", nature: "Volatile", application: "Avoid all auspicious events" },
];

function buildKaranaTable() {
  const entries = [];

  // k = 1: Kimstughna (fixed)
  entries.push(
    Object.freeze({
      index: 1,
      name: "किंस्तुघ्न",
      iast: "Kimstughna",
      type: "Fixed",
      animal: "Wild Beast",
      nature: "Rebirth, Foundational",
      application: "Sowing seeds, charity",
    })
  );

  // k = 2..57: movable cycle
  for (let k = 2; k <= 57; k++) {
    const m = MOVABLE_KARANAS[(k - 2) % 7];
    entries.push(
      Object.freeze({
        index: k,
        name: m.name,
        iast: m.iast,
        type: "Movable",
        animal: m.animal,
        nature: m.nature,
        application: m.application,
      })
    );
  }

  // k = 58: Shakuni (fixed)
  entries.push(
    Object.freeze({
      index: 58,
      name: "शकुनि",
      iast: "Shakuni",
      type: "Fixed",
      animal: "Raven",
      nature: "Diagnostic",
      application: "Medicine, therapy",
    })
  );

  // k = 59: Chatushpada (fixed)
  entries.push(
    Object.freeze({
      index: 59,
      name: "चतुष्पाद",
      iast: "Chatushpada",
      type: "Fixed",
      animal: "Bull",
      nature: "Grounded",
      application: "Ancestral rites",
    })
  );

  // k = 60: Naga (fixed)
  entries.push(
    Object.freeze({
      index: 60,
      name: "नाग",
      iast: "Naga",
      type: "Fixed",
      animal: "Serpent",
      nature: "Covert",
      application: "Mining, excavations",
    })
  );

  return Object.freeze(entries);
}

export const KARANA_TABLE = buildKaranaTable();

// ---------------------------------------------------------------------------
// 5. VARA_TABLE  (7 entries)
// ---------------------------------------------------------------------------
export const VARA_TABLE = Object.freeze([
  Object.freeze({ index: 1, name: "रविवार", iast: "Ravivara", english: "Sunday", planet: "Surya (Sun)", nature: "Vitality, leadership" }),
  Object.freeze({ index: 2, name: "सोमवार", iast: "Somavara", english: "Monday", planet: "Chandra (Moon)", nature: "Mind, emotions" }),
  Object.freeze({ index: 3, name: "मङ्गलवार", iast: "Mangalavara", english: "Tuesday", planet: "Mangala (Mars)", nature: "Energy, courage" }),
  Object.freeze({ index: 4, name: "बुधवार", iast: "Budhavara", english: "Wednesday", planet: "Budha (Mercury)", nature: "Intellect, communication" }),
  Object.freeze({ index: 5, name: "गुरुवार", iast: "Guruvara", english: "Thursday", planet: "Brihaspati (Jupiter)", nature: "Wisdom, expansion" }),
  Object.freeze({ index: 6, name: "शुक्रवार", iast: "Shukravara", english: "Friday", planet: "Shukra (Venus)", nature: "Love, beauty, creativity" }),
  Object.freeze({ index: 7, name: "शनिवार", iast: "Shanivara", english: "Saturday", planet: "Shani (Saturn)", nature: "Discipline, karma" }),
]);

// ---------------------------------------------------------------------------
// 6. RASHI_TABLE  (12 entries)
// ---------------------------------------------------------------------------
export const RASHI_TABLE = Object.freeze([
  Object.freeze({ index: 1, name: "मेष", iast: "Mesha", ruler: "Mangala" }),
  Object.freeze({ index: 2, name: "वृषभ", iast: "Vrishabha", ruler: "Shukra" }),
  Object.freeze({ index: 3, name: "मिथुन", iast: "Mithuna", ruler: "Budha" }),
  Object.freeze({ index: 4, name: "कर्क", iast: "Karka", ruler: "Chandra" }),
  Object.freeze({ index: 5, name: "सिंह", iast: "Simha", ruler: "Surya" }),
  Object.freeze({ index: 6, name: "कन्या", iast: "Kanya", ruler: "Budha" }),
  Object.freeze({ index: 7, name: "तुला", iast: "Tula", ruler: "Shukra" }),
  Object.freeze({ index: 8, name: "वृश्चिक", iast: "Vrishchika", ruler: "Mangala" }),
  Object.freeze({ index: 9, name: "धनु", iast: "Dhanu", ruler: "Guru" }),
  Object.freeze({ index: 10, name: "मकर", iast: "Makara", ruler: "Shani" }),
  Object.freeze({ index: 11, name: "कुंभ", iast: "Kumbha", ruler: "Shani" }),
  Object.freeze({ index: 12, name: "मीन", iast: "Meena", ruler: "Guru" }),
]);

// ---------------------------------------------------------------------------
// 7. GLOSSARY
// ---------------------------------------------------------------------------
export const GLOSSARY = Object.freeze({
  tithi:
    "A lunar day defined by every 12 degrees of elongation between the Moon and the Sun. There are 30 tithis in a synodic month.",
  nakshatra:
    "One of 27 lunar mansions, each spanning 13 degrees 20 minutes of the ecliptic. Determined by the sidereal longitude of the Moon.",
  yoga:
    "One of 27 luni-solar combinations formed by dividing the sum of the Sun and Moon sidereal longitudes into 13-degree-20-minute segments.",
  karana:
    "A half-tithi, spanning 6 degrees of elongation. There are 60 karanas in a synodic month: 4 fixed and 7 movable (repeated 8 times).",
  vara:
    "The solar weekday, named after the planetary lord that rules the first hour after sunrise on that day.",
  paksha:
    "A fortnight or half of the lunar month. Shukla Paksha is the waxing (bright) half; Krishna Paksha is the waning (dark) half.",
  shukla:
    "Bright or waxing. Refers to the Shukla Paksha, the period from new moon (Amavasya) to full moon (Purnima).",
  krishna:
    "Dark or waning. Refers to the Krishna Paksha, the period from full moon (Purnima) to new moon (Amavasya).",
  ayanamsha:
    "The angular difference between the tropical (Sayana) and sidereal (Nirayana) zodiacs, caused by the precession of the equinoxes. The default standard is Lahiri.",
  graha:
    "A celestial body or planet in Vedic astrology. The nine grahas are Surya, Chandra, Mangala, Budha, Guru, Shukra, Shani, Rahu, and Ketu.",
  shubha:
    "Auspicious. In the context of yogas, a Shubha yoga indicates a favorable period.",
  ashubha:
    "Inauspicious. In the context of yogas, an Ashubha yoga indicates a challenging or unfavorable period.",
  rashi:
    "A zodiac sign. There are 12 rashis, each spanning 30 degrees of the sidereal ecliptic.",
  elongation:
    "The angular separation between the Moon and the Sun, measured as (Moon longitude minus Sun longitude) modulo 360 degrees. It drives the tithi and karana calculations.",
  purnima:
    "The full moon, occurring at the end of the 15th tithi (Shukla Paksha). Elongation reaches 180 degrees.",
  amavasya:
    "The new moon, occurring at the end of the 30th tithi (Krishna Paksha). Elongation reaches 360 degrees (0 degrees of the next cycle).",
  ekadashi:
    "The 11th tithi of each paksha, traditionally observed as a day of fasting and spiritual discipline.",
  nanda:
    "One of the five tithi categories, associated with joy and new beginnings. Tithis 1, 6, 11, 16, 21, 26.",
  bhadra:
    "One of the five tithi categories, associated with auspiciousness and well-being. Tithis 2, 7, 12, 17, 22, 27.",
  jaya:
    "One of the five tithi categories, associated with victory and overcoming obstacles. Tithis 3, 8, 13, 18, 23, 28.",
  rikta:
    "One of the five tithi categories, associated with emptiness and purification. Tithis 4, 9, 14, 19, 24, 29.",
  purna:
    "One of the five tithi categories, associated with fullness and completion. Tithis 5, 10, 15, 20, 25, 30.",
  prajapati:
    "The lord of creation in Vedic cosmology. Deity of the Rohini nakshatra.",
  surya:
    "The Sun, one of the nine grahas. Lord of Sunday (Ravivara) and ruler of Simha (Leo) rashi.",
  chandra:
    "The Moon, one of the nine grahas. Lord of Monday (Somavara) and ruler of Karka (Cancer) rashi.",
  mangala:
    "Mars, one of the nine grahas. Lord of Tuesday (Mangalavara) and ruler of Mesha (Aries) and Vrishchika (Scorpio) rashis.",
  budha:
    "Mercury, one of the nine grahas. Lord of Wednesday (Budhavara) and ruler of Mithuna (Gemini) and Kanya (Virgo) rashis.",
  guru:
    "Jupiter, one of the nine grahas. Also called Brihaspati. Lord of Thursday (Guruvara) and ruler of Dhanu (Sagittarius) and Meena (Pisces) rashis.",
  shukra:
    "Venus, one of the nine grahas. Lord of Friday (Shukravara) and ruler of Vrishabha (Taurus) and Tula (Libra) rashis.",
  shani:
    "Saturn, one of the nine grahas. Lord of Saturday (Shanivara) and ruler of Makara (Capricorn) and Kumbha (Aquarius) rashis.",
  rahu:
    "The north (ascending) lunar node, one of the nine grahas. A shadow planet (chhaya graha) with no physical body, associated with illusion and material desire.",
  ketu:
    "The south (descending) lunar node, one of the nine grahas. A shadow planet (chhaya graha) with no physical body, associated with spirituality and liberation.",
});
