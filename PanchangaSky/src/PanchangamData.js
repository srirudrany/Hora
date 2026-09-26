// PanchangamData.js — immutable reference tables (docs/SPEC.md §3 is the source of truth).
// Every record is frozen; indices are 1-based, look up with TABLE[index - 1].

const deepFreeze = (arr) => Object.freeze(arr.map((r) => Object.freeze(r)));

/** @typedef {"Nanda"|"Bhadra"|"Jaya"|"Rikta"|"Purna"} TithiCategory */

const TITHI_NAMES = [
  ['प्रतिपदा', 'Pratipada'], ['द्वितीया', 'Dwitiya'], ['तृतीया', 'Tritiya'], ['चतुर्थी', 'Chaturthi'],
  ['पंचमी', 'Panchami'], ['षष्ठी', 'Shashthi'], ['सप्तमी', 'Saptami'], ['अष्टमी', 'Ashtami'],
  ['नवमी', 'Navami'], ['दशमी', 'Dashami'], ['एकादशी', 'Ekadashi'], ['द्वादशी', 'Dvadashi'],
  ['त्रयोदशी', 'Trayodashi'], ['चतुर्दशी', 'Chaturdashi'],
];
const TITHI_CATS = ['Nanda', 'Bhadra', 'Jaya', 'Rikta', 'Purna'];
const TITHI_USES = {
  Nanda: 'Beginnings, new projects, fine arts, celebrations',
  Bhadra: 'Education, commerce, marriage, journeys',
  Jaya: 'Legal actions, competitions, overcoming hurdles',
  Rikta: 'Surgical ops, demolitions, purification, debt settlement',
  Purna: 'High-impact initiatives, rituals, real estate',
};
export const TITHI_CATEGORY_INFO = Object.freeze({
  Nanda: Object.freeze({ name: 'नन्दा', quality: 'Prosperity, joy-giving' }),
  Bhadra: Object.freeze({ name: 'भद्रा', quality: 'Beneficent, productive' }),
  Jaya: Object.freeze({ name: 'जया', quality: 'Victory, courageous' }),
  Rikta: Object.freeze({ name: 'रिक्ता', quality: 'Hollow, draining' }),
  Purna: Object.freeze({ name: 'पूर्णा', quality: 'Complete, nourishing' }),
});

export const TITHI_TABLE = deepFreeze(Array.from({ length: 30 }, (_, i) => {
  const index = i + 1;
  const paksha = index <= 15 ? 'Shukla' : 'Krishna';
  const k = i % 15;
  let [name, iast] = k === 14 ? (index === 15 ? ['पूर्णिमा', 'Purnima'] : ['अमावस्या', 'Amavasya']) : TITHI_NAMES[k];
  if (paksha === 'Krishna' && k !== 14) iast += ' (Krishna)';
  const category = TITHI_CATS[i % 5];
  return { index, name, iast, category, paksha, auspiciousFor: TITHI_USES[category].split(', ') };
}));

export const NAKSHATRA_TABLE = deepFreeze([
  ['अश्विनी', 'Ashwini', 'Ashvins (Divine Twins)', 'Swift, Healing', 'ksipra'],
  ['भरणी', 'Bharani', 'Yama (God of Death)', 'Fierce, Restrictive', 'ugra'],
  ['कृत्तिका', 'Krittika', 'Agni (Fire God)', 'Mixed, Sharp', 'misra'],
  ['रोहिणी', 'Rohini', 'Prajapati (Creator)', 'Fixed, Fertile', 'dhruva'],
  ['मृगशिरा', 'Mrigashira', 'Soma (Moon)', 'Gentle, Inquisitive', 'mrdu'],
  ['आर्द्रा', 'Ardra', 'Rudra (Storm God)', 'Sharp, Transformative', 'tiksna'],
  ['पुनर्वसु', 'Punarvasu', 'Aditi (Mother of Gods)', 'Movable, Renewing', 'cara'],
  ['पुष्य', 'Pushya', 'Brihaspati (Jupiter)', 'Swift, Nourishing', 'ksipra'],
  ['आश्लेषा', 'Ashlesha', 'Sarpas (Serpents)', 'Sharp, Piercing', 'tiksna'],
  ['मघा', 'Magha', 'Pitris (Ancestors)', 'Fierce, Royal', 'ugra'],
  ['पूर्व फाल्गुनी', 'Purva Phalguni', 'Bhaga (God of Prosperity)', 'Fierce, Creative', 'ugra'],
  ['उत्तर फाल्गुनी', 'Uttara Phalguni', 'Aryaman (God of Patronage)', 'Fixed, Enduring', 'dhruva'],
  ['हस्त', 'Hasta', 'Savitr (Sun God)', 'Swift, Dexterous', 'ksipra'],
  ['चित्रा', 'Chitra', 'Tvashtar (Divine Architect)', 'Gentle, Artistic', 'mrdu'],
  ['स्वाती', 'Swati', 'Vayu (Wind God)', 'Movable, Adaptable', 'cara'],
  ['विशाखा', 'Vishakha', 'Indragni (Indra+Agni)', 'Mixed, Purpose-Driven', 'misra'],
  ['अनुराधा', 'Anuradha', 'Mitra (Divine Friend)', 'Gentle, Devotional', 'mrdu'],
  ['ज्येष्ठा', 'Jyeshtha', 'Indra (King of Gods)', 'Sharp, Protective', 'tiksna'],
  ['मूल', 'Mula', 'Nirriti (Goddess of Destruction)', 'Sharp, Investigating', 'tiksna'],
  ['पूर्वाषाढा', 'Purva Ashadha', 'Apas (Waters)', 'Fierce, Invincible', 'ugra'],
  ['उत्तराषाढा', 'Uttara Ashadha', 'Vishvedevas (All Gods)', 'Fixed, Victorious', 'dhruva'],
  ['श्रवण', 'Shravana', 'Vishnu (Preserver)', 'Movable, Receptive', 'cara'],
  ['धनिष्ठा', 'Dhanishta', 'Ashta Vasus (Eight Deities)', 'Movable, Rhythmic', 'cara'],
  ['शतभिषा', 'Shatabhisha', 'Varuna (God of Waters)', 'Movable, Curative', 'cara'],
  ['पूर्व भाद्रपदा', 'Purva Bhadrapada', 'Aja Ekapada (One-footed Goat)', 'Fierce, Ascetic', 'ugra'],
  ['उत्तर भाद्रपदा', 'Uttara Bhadrapada', 'Ahirbudhnya (Serpent Dragon)', 'Fixed, Grounded', 'dhruva'],
  ['रेवती', 'Revati', 'Pushan (Nourisher)', 'Gentle, Nurturing', 'mrdu'],
].map(([name, iast, deity, temperament, nature], i) => {
  const start = (i * 40) / 3;
  return {
    index: i + 1, name, iast, deity, temperament, nature,
    start, end: start + 40 / 3,
    padas: Object.freeze([0, 1, 2, 3].map((p) => start + (p * 10) / 3)),
  };
}));

export const YOGA_TABLE = deepFreeze([
  ['विष्कम्भ', 'Vishkambha', 'Ashubha', 'Obstruction, initial friction'],
  ['प्रीति', 'Priti', 'Shubha', 'Love, affection, satisfaction'],
  ['आयुष्मान', 'Ayushman', 'Shubha', 'Long life, vitality, good health'],
  ['सौभाग्य', 'Saubhagya', 'Shubha', 'Good fortune, prosperity, auspiciousness'],
  ['शोभन', 'Shobhana', 'Shubha', 'Beautiful, splendid, virtuous'],
  ['अतिगण्ड', 'Atiganda', 'Ashubha', 'Severe complications, high turbulence'],
  ['सुकर्मा', 'Sukarma', 'Shubha', 'Good actions, virtuous deeds, merit'],
  ['धृति', 'Dhriti', 'Shubha', 'Steadfastness, patience, determination'],
  ['शूल', 'Shula', 'Ashubha', 'Sharp conflict, pain, weapons, surgery'],
  ['गण्ड', 'Ganda', 'Ashubha', 'Emotional knots, tangles, administrative blocks'],
  ['वृद्धि', 'Vriddhi', 'Shubha', 'Growth, increase, prosperity, expansion'],
  ['ध्रुव', 'Dhruva', 'Shubha', 'Fixed, stable, permanent, unchanging'],
  ['व्याघात', 'Vyaghata', 'Ashubha', 'Threatening, destructive, prone to sudden injury'],
  ['हर्षण', 'Harshana', 'Shubha', 'Joy, delight, happiness, celebration'],
  ['वज्र', 'Vajra', 'Ashubha', 'Volatile, piercing, sharp like thunderbolt'],
  ['सिद्धि', 'Siddhi', 'Shubha', 'Accomplishment, perfection, attainment'],
  ['व्यतिपात', 'Vyatipata', 'Ashubha', 'Major directional calamity; avoid material initiatives'],
  ['वरियान्', 'Variyan', 'Shubha', 'Excellent, best, superior quality'],
  ['परिघ', 'Parigha', 'Ashubha', 'Gates/barriers, delays, opposition, obstacles'],
  ['शिव', 'Shiva', 'Shubha', 'Auspicious, benevolent'],
  ['सिद्ध', 'Siddha', 'Shubha', 'Perfected, accomplished, established'],
  ['साध्य', 'Sadhya', 'Shubha', 'Attainable, possible, achievable'],
  ['शुभ', 'Shubha', 'Shubha', 'Auspicious, favorable, beneficial'],
  ['शुक्ल', 'Shukla', 'Shubha', 'Bright, pure, clear, white'],
  ['ब्रह्म', 'Brahma', 'Shubha', 'Creative, expansive, universal consciousness'],
  ['इन्द्र', 'Indra', 'Shubha', 'Power, leadership, sovereignty, strength'],
  ['वैधृति', 'Vaidhriti', 'Ashubha', 'Chaotic dissipation; unstable for worldly investments'],
].map(([name, iast, classification, nature], i) => ({ index: i + 1, name, iast, classification, nature })));

const MOVABLE_KARANAS = [
  ['बव', 'Bava', 'Lion', 'Commanding, Courageous', 'Leadership, fitness, health, initiation'],
  ['बालव', 'Balava', 'Tiger / Leopard', 'Intellectual, Active', 'Study, spiritual rituals, sacred tasks'],
  ['कौलव', 'Kaulava', 'Boar / Pig', 'Cooperative, Grounded', 'Social alliances, contracts, partnerships'],
  ['तैतिल', 'Taitila', 'Rhinoceros', 'Defensive, Resilient', 'Construction, official paperwork, boundaries'],
  ['गर', 'Gara', 'Elephant', 'Diligent, Heavy', 'Agriculture, groundwork, physical labor'],
  ['वणिज', 'Vanija', 'Merchant', 'Commercial, Agile', 'Trade, financial exchanges, sales trips'],
  ['विष्टि', 'Vishti (Bhadra)', 'Donkey', 'Volatile, Destructive', 'Avoid all auspicious events'],
];
const FIXED_KARANAS = {
  1: ['किंस्तुघ्न', 'Kimstughna', 'Wild Beast', 'Rebirth, Foundational', 'Sowing seeds, charity, foundation stones'],
  58: ['शकुनि', 'Shakuni', 'Raven / Bird', 'Diagnostic, Remedial', 'Medicine, therapy, settling long disputes'],
  59: ['चतुष्पाद', 'Chatushpada', 'Bull / Quadruped', 'Grounded, Material', 'Ancestral rites (Shraddha), animal care, soil'],
  60: ['नाग', 'Naga', 'Serpent', 'Covert, Penetrating', 'Mining, excavations, secret negotiations'],
};
export const KARANA_TABLE = deepFreeze(Array.from({ length: 60 }, (_, i) => {
  const index = i + 1;
  const fixed = FIXED_KARANAS[index];
  const [name, iast, animal, nature, application] = fixed || MOVABLE_KARANAS[(index - 2) % 7];
  return { index, name, iast, type: fixed ? 'Fixed' : 'Movable', animal, nature, application, avoid: !fixed && (index - 2) % 7 === 6 };
}));

export const VARA_TABLE = deepFreeze([
  ['रविवार', 'Ravivara', 'Sunday', 'Surya (Sun)', 'surya', 'Vitality, leadership, authority'],
  ['सोमवार', 'Somavara', 'Monday', 'Chandra (Moon)', 'chandra', 'Mind, emotions, nurturing'],
  ['मङ्गलवार', 'Mangalavara', 'Tuesday', 'Mangala (Mars)', 'mangala', 'Energy, courage, conflict'],
  ['बुधवार', 'Budhavara', 'Wednesday', 'Budha (Mercury)', 'budha', 'Intellect, communication, trade'],
  ['गुरुवार', 'Guruvara', 'Thursday', 'Brihaspati (Jupiter)', 'guru', 'Wisdom, expansion, prosperity'],
  ['शुक्रवार', 'Shukravara', 'Friday', 'Shukra (Venus)', 'shukra', 'Love, beauty, creativity, luxury'],
  ['शनिवार', 'Shanivara', 'Saturday', 'Shani (Saturn)', 'shani', 'Discipline, karma, longevity, obstacles'],
].map(([name, iast, day, planet, graha, nature], i) => ({ index: i + 1, name, iast, day, planet, graha, nature })));

export const RASHI_TABLE = deepFreeze([
  ['मेष', 'Mesha', 'Aries', 'Mangala'], ['वृषभ', 'Vrishabha', 'Taurus', 'Shukra'],
  ['मिथुन', 'Mithuna', 'Gemini', 'Budha'], ['कर्क', 'Karka', 'Cancer', 'Chandra'],
  ['सिंह', 'Simha', 'Leo', 'Surya'], ['कन्या', 'Kanya', 'Virgo', 'Budha'],
  ['तुला', 'Tula', 'Libra', 'Shukra'], ['वृश्चिक', 'Vrishchika', 'Scorpio', 'Mangala'],
  ['धनु', 'Dhanu', 'Sagittarius', 'Guru'], ['मकर', 'Makara', 'Capricorn', 'Shani'],
  ['कुंभ', 'Kumbha', 'Aquarius', 'Shani'], ['मीन', 'Meena', 'Pisces', 'Guru'],
].map(([name, iast, western, lord], i) => ({ index: i + 1, name, iast, western, lord, start: i * 30 })));

// Grahas — tooltip copy: one science line + one mythology line (SPEC §7). Colours from Hora tokens.
export const GRAHAS = Object.freeze({
  surya: Object.freeze({ name: 'सूर्य', iast: 'Surya', western: 'Sun', color: '#FFD27A', vara: 1,
    science: 'A G-type star; its apparent path through the year defines the ecliptic.',
    myth: 'The soul of the zodiac, driver of the seven-horsed chariot; lord of Ravivara.' }),
  chandra: Object.freeze({ name: 'चन्द्र', iast: 'Chandra', western: 'Moon', color: '#CBD5DE', vara: 2,
    science: 'Earth\'s satellite; its 12° daily gain on the Sun counts out each tithi.',
    myth: 'Soma, the mind, husband of the 27 nakshatras, one visited each night; lord of Somavara.' }),
  budha: Object.freeze({ name: 'बुध', iast: 'Budha', western: 'Mercury', color: '#57A872', vara: 4,
    science: 'Closest planet to the Sun; never strays more than 28° from it in our sky.',
    myth: 'The wise scribe, son of Chandra; lord of Budhavara.' }),
  shukra: Object.freeze({ name: 'शुक्र', iast: 'Shukra', western: 'Venus', color: '#F4EFE6', vara: 6,
    science: 'Brightest planet; a cloud-veiled world that shows phases like the Moon.',
    myth: 'Preceptor of the asuras and keeper of the revival mantra; lord of Shukravara.' }),
  mangala: Object.freeze({ name: 'मङ्गल', iast: 'Mangala', western: 'Mars', color: '#D0473A', vara: 3,
    science: 'The red planet; its iron-oxide dust gives the ruddy tint you see.',
    myth: 'The warrior son of Bhumi (Earth), commander of the gods; lord of Mangalavara.' }),
  guru: Object.freeze({ name: 'गुरु', iast: 'Guru', western: 'Jupiter', color: '#E0B040', vara: 5,
    science: 'Largest planet; its four Galilean moons are visible in small binoculars.',
    myth: 'Brihaspati, teacher of the devas and giver of wisdom; lord of Guruvara.' }),
  shani: Object.freeze({ name: 'शनि', iast: 'Shani', western: 'Saturn', color: '#6F7FB0', vara: 7,
    science: 'The ringed planet; takes 29.5 years to circle the zodiac once.',
    myth: 'Slow-moving son of Surya and Chhaya, dispenser of karma; lord of Shanivara.' }),
  rahu: Object.freeze({ name: 'राहु', iast: 'Rahu', western: 'Ascending lunar node', color: '#8F6BB8',
    science: 'Where the Moon\'s orbit crosses the ecliptic northward; eclipses happen near a node.',
    myth: 'The severed head of the asura Svarbhanu, who swallows the Sun or Moon at eclipse.' }),
  ketu: Object.freeze({ name: 'केतु', iast: 'Ketu', western: 'Descending lunar node', color: '#C07A43',
    science: 'The opposite crossing point, always exactly 180° from Rahu.',
    myth: 'The headless body of Svarbhanu; a shadow graha of detachment and release.' }),
});

export const MOONS = Object.freeze({
  io: Object.freeze({ name: 'Io', host: 'guru', period: 1.769, r: 0.55, science: 'Most volcanically active body known.' }),
  europa: Object.freeze({ name: 'Europa', host: 'guru', period: 3.551, r: 0.75, science: 'An ice shell over a hidden salt-water ocean.' }),
  ganymede: Object.freeze({ name: 'Ganymede', host: 'guru', period: 7.155, r: 1.0, science: 'The largest moon in the Solar System.' }),
  callisto: Object.freeze({ name: 'Callisto', host: 'guru', period: 16.689, r: 1.3, science: 'An ancient, heavily cratered ice world.' }),
});

// Bright stars (J2000): [name, bayer, RA h, Dec °, mag, constellation, yogatara nakshatra index or 0]
export const STARS = deepFreeze([
  ['Sirius', 'α CMa', 6.752, -16.716, -1.46, 'Canis Major', 0], ['Canopus', 'α Car', 6.399, -52.696, -0.74, 'Carina', 0],
  ['Arcturus', 'α Boo', 14.261, 19.182, -0.05, 'Boötes', 15], ['Vega', 'α Lyr', 18.616, 38.784, 0.03, 'Lyra', 0],
  ['Capella', 'α Aur', 5.278, 45.998, 0.08, 'Auriga', 0], ['Rigel', 'β Ori', 5.242, -8.202, 0.13, 'Orion', 0],
  ['Procyon', 'α CMi', 7.655, 5.225, 0.34, 'Canis Minor', 0], ['Betelgeuse', 'α Ori', 5.919, 7.407, 0.5, 'Orion', 6],
  ['Achernar', 'α Eri', 1.629, -57.237, 0.46, 'Eridanus', 0], ['Hadar', 'β Cen', 14.064, -60.373, 0.61, 'Centaurus', 0],
  ['Altair', 'α Aql', 19.846, 8.868, 0.76, 'Aquila', 22], ['Acrux', 'α Cru', 12.443, -63.099, 0.77, 'Crux', 0],
  ['Aldebaran', 'α Tau', 4.599, 16.509, 0.86, 'Taurus', 4], ['Spica', 'α Vir', 13.42, -11.161, 0.97, 'Virgo', 14],
  ['Antares', 'α Sco', 16.49, -26.432, 1.06, 'Scorpius', 18], ['Pollux', 'β Gem', 7.755, 28.026, 1.14, 'Gemini', 7],
  ['Fomalhaut', 'α PsA', 22.961, -29.622, 1.16, 'Piscis Austrinus', 0], ['Deneb', 'α Cyg', 20.69, 45.28, 1.25, 'Cygnus', 0],
  ['Regulus', 'α Leo', 10.139, 11.967, 1.35, 'Leo', 10], ['Castor', 'α Gem', 7.577, 31.888, 1.58, 'Gemini', 0],
  ['Bellatrix', 'γ Ori', 5.419, 6.35, 1.64, 'Orion', 0], ['Elnath', 'β Tau', 5.438, 28.608, 1.65, 'Taurus', 0],
  ['Alnilam', 'ε Ori', 5.604, -1.202, 1.69, 'Orion', 0], ['Alnitak', 'ζ Ori', 5.679, -1.943, 1.77, 'Orion', 0],
  ['Mintaka', 'δ Ori', 5.533, -0.299, 2.23, 'Orion', 0], ['Saiph', 'κ Ori', 5.796, -9.67, 2.06, 'Orion', 0],
  ['Meissa', 'λ Ori', 5.585, 9.934, 3.39, 'Orion', 5], ['Alcyone', 'η Tau', 3.791, 24.105, 2.87, 'Taurus', 3],
  ['Ain', 'ε Tau', 4.477, 19.18, 3.53, 'Taurus', 0], ['Prima Hyadum', 'γ Tau', 4.33, 15.628, 3.65, 'Taurus', 0],
  ['Tianguan', 'ζ Tau', 5.627, 21.143, 3.0, 'Taurus', 0],
  ['Hamal', 'α Ari', 2.12, 23.462, 2.0, 'Aries', 0], ['Sheratan', 'β Ari', 1.911, 20.808, 2.64, 'Aries', 1],
  ['Mesarthim', 'γ Ari', 1.892, 19.294, 3.9, 'Aries', 0], ['41 Arietis', '41 Ari', 2.833, 27.26, 3.63, 'Aries', 2],
  ['Polaris', 'α UMi', 2.53, 89.264, 1.98, 'Ursa Minor', 0],
  ['Dubhe', 'α UMa', 11.062, 61.751, 1.79, 'Ursa Major', 0], ['Merak', 'β UMa', 11.031, 56.382, 2.37, 'Ursa Major', 0],
  ['Phecda', 'γ UMa', 11.897, 53.695, 2.44, 'Ursa Major', 0], ['Megrez', 'δ UMa', 12.257, 57.033, 3.31, 'Ursa Major', 0],
  ['Alioth', 'ε UMa', 12.9, 55.96, 1.77, 'Ursa Major', 0], ['Mizar', 'ζ UMa', 13.399, 54.925, 2.27, 'Ursa Major', 0],
  ['Alkaid', 'η UMa', 13.792, 49.313, 1.86, 'Ursa Major', 0],
  ['Alhena', 'γ Gem', 6.629, 16.399, 1.93, 'Gemini', 0], ['Mebsuta', 'ε Gem', 6.732, 25.131, 3.06, 'Gemini', 0],
  ['Tejat', 'μ Gem', 6.383, 22.514, 2.88, 'Gemini', 0], ['Wasat', 'δ Gem', 7.335, 21.982, 3.53, 'Gemini', 0],
  ['Asellus Australis', 'δ Cnc', 8.745, 18.154, 3.94, 'Cancer', 8], ['Tarf', 'β Cnc', 8.275, 9.186, 3.52, 'Cancer', 0],
  ['Asellus Borealis', 'γ Cnc', 8.721, 21.469, 4.66, 'Cancer', 0],
  ['ε Hydrae', 'ε Hya', 8.78, 6.419, 3.38, 'Hydra', 9],
  ['Denebola', 'β Leo', 11.818, 14.572, 2.14, 'Leo', 12], ['Zosma', 'δ Leo', 11.235, 20.524, 2.56, 'Leo', 11],
  ['Algieba', 'γ Leo', 10.333, 19.842, 2.08, 'Leo', 0], ['Chertan', 'θ Leo', 11.237, 15.43, 3.33, 'Leo', 0],
  ['Adhafera', 'ζ Leo', 10.278, 23.417, 3.43, 'Leo', 0], ['Rasalas', 'μ Leo', 9.879, 26.007, 3.88, 'Leo', 0],
  ['Algenubi', 'ε Leo', 9.764, 23.774, 2.98, 'Leo', 0], ['η Leonis', 'η Leo', 10.122, 16.763, 3.49, 'Leo', 0],
  ['Gienah', 'γ Crv', 12.263, -17.542, 2.59, 'Corvus', 0], ['Algorab', 'δ Crv', 12.498, -16.515, 2.95, 'Corvus', 13],
  ['Kraz', 'β Crv', 12.573, -23.397, 2.65, 'Corvus', 0], ['Minkar', 'ε Crv', 12.169, -22.62, 3.0, 'Corvus', 0],
  ['Porrima', 'γ Vir', 12.694, -1.449, 2.74, 'Virgo', 0], ['Vindemiatrix', 'ε Vir', 13.036, 10.959, 2.83, 'Virgo', 0],
  ['Minelauva', 'δ Vir', 12.927, 3.397, 3.38, 'Virgo', 0], ['Zavijava', 'β Vir', 11.845, 1.765, 3.6, 'Virgo', 0],
  ['Heze', 'ζ Vir', 13.578, -0.596, 3.37, 'Virgo', 0],
  ['Zubenelgenubi', 'α Lib', 14.848, -16.042, 2.75, 'Libra', 16], ['Zubeneschamali', 'β Lib', 15.283, -9.383, 2.61, 'Libra', 0],
  ['Dschubba', 'δ Sco', 16.006, -22.622, 2.29, 'Scorpius', 17], ['Acrab', 'β Sco', 16.091, -19.806, 2.62, 'Scorpius', 0],
  ['Fang', 'π Sco', 15.981, -26.114, 2.89, 'Scorpius', 0], ['Alniyat', 'τ Sco', 16.598, -28.216, 2.82, 'Scorpius', 0],
  ['Larawag', 'ε Sco', 16.836, -34.293, 2.29, 'Scorpius', 0], ['Xamidimura', 'μ1 Sco', 16.864, -38.047, 3.0, 'Scorpius', 0],
  ['η Scorpii', 'η Sco', 17.202, -43.239, 3.33, 'Scorpius', 0], ['Sargas', 'θ Sco', 17.622, -42.998, 1.86, 'Scorpius', 0],
  ['Girtab', 'κ Sco', 17.708, -39.03, 2.39, 'Scorpius', 0], ['Shaula', 'λ Sco', 17.56, -37.104, 1.62, 'Scorpius', 19],
  ['Kaus Australis', 'ε Sgr', 18.403, -34.385, 1.85, 'Sagittarius', 0], ['Kaus Media', 'δ Sgr', 18.35, -29.828, 2.7, 'Sagittarius', 20],
  ['Kaus Borealis', 'λ Sgr', 18.466, -25.422, 2.81, 'Sagittarius', 0], ['Nunki', 'σ Sgr', 18.921, -26.297, 2.05, 'Sagittarius', 21],
  ['Ascella', 'ζ Sgr', 19.043, -29.88, 2.6, 'Sagittarius', 0], ['Alnasl', 'γ Sgr', 18.097, -30.424, 2.99, 'Sagittarius', 0],
  ['φ Sagittarii', 'φ Sgr', 18.761, -26.991, 3.17, 'Sagittarius', 0], ['τ Sagittarii', 'τ Sgr', 19.116, -27.671, 3.32, 'Sagittarius', 0],
  ['Rotanev', 'β Del', 20.626, 14.595, 3.63, 'Delphinus', 23], ['Sualocin', 'α Del', 20.661, 15.912, 3.77, 'Delphinus', 0],
  ['Sadalsuud', 'β Aqr', 21.526, -5.571, 2.87, 'Aquarius', 0], ['Sadalmelik', 'α Aqr', 22.097, -0.32, 2.95, 'Aquarius', 0],
  ['Hydor', 'λ Aqr', 22.877, -7.58, 3.73, 'Aquarius', 24],
  ['Markab', 'α Peg', 23.079, 15.205, 2.49, 'Pegasus', 25], ['Scheat', 'β Peg', 23.063, 28.083, 2.42, 'Pegasus', 0],
  ['Algenib', 'γ Peg', 0.221, 15.184, 2.83, 'Pegasus', 26], ['Alpheratz', 'α And', 0.14, 29.091, 2.06, 'Andromeda', 0],
  ['ζ Piscium', 'ζ Psc', 1.229, 7.575, 5.2, 'Pisces', 27],
].map(([name, bayer, ra, dec, mag, constellation, yogatara]) => ({ name, bayer, ra, dec, mag, constellation, yogatara })));

// Stick figures (by star name). Western figures, compared against the nakshatra sectors.
export const CONSTELLATIONS = Object.freeze({
  Orion: Object.freeze({ nak: 5, lines: [['Meissa', 'Betelgeuse'], ['Meissa', 'Bellatrix'], ['Betelgeuse', 'Alnitak'], ['Bellatrix', 'Mintaka'], ['Mintaka', 'Alnilam'], ['Alnilam', 'Alnitak'], ['Alnitak', 'Saiph'], ['Mintaka', 'Rigel']],
    note: 'Mrigashira, the deer\'s head, sits in Orion\'s head (Meissa); Ardra is Betelgeuse on its shoulder.' }),
  Taurus: Object.freeze({ nak: 4, lines: [['Aldebaran', 'Prima Hyadum'], ['Prima Hyadum', 'Ain'], ['Ain', 'Elnath'], ['Aldebaran', 'Tianguan'], ['Prima Hyadum', 'Alcyone']],
    note: 'Rohini is Aldebaran, the red eye of the bull; Krittika is the Pleiades cluster on its shoulder.' }),
  Aries: Object.freeze({ nak: 1, lines: [['Mesarthim', 'Sheratan'], ['Sheratan', 'Hamal'], ['Hamal', '41 Arietis']],
    note: 'Ashwini, the horse-headed twins, are Sheratan and Mesarthim; Bharani is the faint triangle at 41 Arietis.' }),
  Gemini: Object.freeze({ nak: 7, lines: [['Castor', 'Pollux'], ['Castor', 'Mebsuta'], ['Mebsuta', 'Tejat'], ['Pollux', 'Wasat'], ['Wasat', 'Alhena']],
    note: 'Punarvasu, "return of the light", is marked by the twin heads Castor and Pollux.' }),
  Cancer: Object.freeze({ nak: 8, lines: [['Tarf', 'Asellus Australis'], ['Asellus Australis', 'Asellus Borealis']],
    note: 'Pushya, the nourisher, is the faint Asellus pair around the Beehive cluster.' }),
  Leo: Object.freeze({ nak: 10, lines: [['Regulus', 'η Leonis'], ['η Leonis', 'Algieba'], ['Algieba', 'Adhafera'], ['Adhafera', 'Rasalas'], ['Rasalas', 'Algenubi'], ['Algieba', 'Zosma'], ['Zosma', 'Denebola'], ['Denebola', 'Chertan'], ['Chertan', 'Regulus'], ['Zosma', 'Chertan']],
    note: 'Magha is Regulus, the royal throne; the Phalgunis are the couch-legs Zosma and Denebola.' }),
  Virgo: Object.freeze({ nak: 14, lines: [['Zavijava', 'Porrima'], ['Porrima', 'Spica'], ['Porrima', 'Minelauva'], ['Minelauva', 'Vindemiatrix'], ['Spica', 'Heze'], ['Heze', 'Minelauva']],
    note: 'Chitra is Spica — the bright jewel exactly opposite the Lahiri zero point.' }),
  Corvus: Object.freeze({ nak: 13, lines: [['Gienah', 'Algorab'], ['Algorab', 'Kraz'], ['Kraz', 'Minkar'], ['Minkar', 'Gienah']],
    note: 'Hasta, the hand: five stars of Corvus, the open palm of Savitr.' }),
  Scorpius: Object.freeze({ nak: 18, lines: [['Acrab', 'Dschubba'], ['Dschubba', 'Fang'], ['Dschubba', 'Antares'], ['Antares', 'Alniyat'], ['Alniyat', 'Larawag'], ['Larawag', 'Xamidimura'], ['Xamidimura', 'η Scorpii'], ['η Scorpii', 'Sargas'], ['Sargas', 'Girtab'], ['Girtab', 'Shaula']],
    note: 'Anuradha is the claws, Jyeshtha is Antares (the eldest), Mula is the stinger Shaula.' }),
  Sagittarius: Object.freeze({ nak: 20, lines: [['Alnasl', 'Kaus Media'], ['Kaus Media', 'Kaus Australis'], ['Kaus Media', 'Kaus Borealis'], ['Kaus Borealis', 'φ Sagittarii'], ['φ Sagittarii', 'Nunki'], ['Nunki', 'τ Sagittarii'], ['τ Sagittarii', 'Ascella'], ['Ascella', 'φ Sagittarii'], ['Kaus Australis', 'Ascella']],
    note: 'The two Ashadhas are the teapot: Kaus Media for Purva, Nunki for Uttara.' }),
  'Ursa Major': Object.freeze({ nak: 0, lines: [['Dubhe', 'Merak'], ['Merak', 'Phecda'], ['Phecda', 'Megrez'], ['Megrez', 'Dubhe'], ['Megrez', 'Alioth'], ['Alioth', 'Mizar'], ['Mizar', 'Alkaid']],
    note: 'The Saptarishi — the seven sages — circling the pole; not a nakshatra, but the oldest sky clock in the Vedas.' }),
  Pegasus: Object.freeze({ nak: 25, lines: [['Markab', 'Scheat'], ['Scheat', 'Alpheratz'], ['Alpheratz', 'Algenib'], ['Algenib', 'Markab']],
    note: 'The great square is the bed of the Bhadrapadas: Markab–Scheat Purva, Algenib–Alpheratz Uttara.' }),
});

// Bundled city table. Fixed standard offsets (the engine takes a fixed tz; DST is not modelled).
export const CITIES = deepFreeze([
  ['Chennai', 13.0827, 80.2707, 5.5, 'IST'], ['Varanasi', 25.3176, 83.0104, 5.5, 'IST'], ['New Delhi', 28.6139, 77.209, 5.5, 'IST'],
  ['Mumbai', 19.076, 72.8777, 5.5, 'IST'], ['Bengaluru', 12.9716, 77.5946, 5.5, 'IST'], ['Kolkata', 22.5726, 88.3639, 5.5, 'IST'],
  ['Hyderabad', 17.385, 78.4867, 5.5, 'IST'], ['Madurai', 9.9252, 78.1198, 5.5, 'IST'], ['Tiruchirappalli', 10.7905, 78.7047, 5.5, 'IST'],
  ['Coimbatore', 11.0168, 76.9558, 5.5, 'IST'], ['Kanchipuram', 12.8342, 79.7036, 5.5, 'IST'], ['Rameswaram', 9.2881, 79.3129, 5.5, 'IST'],
  ['Ujjain', 23.1765, 75.7885, 5.5, 'IST'], ['Haridwar', 29.9457, 78.1642, 5.5, 'IST'], ['Puri', 19.8135, 85.8312, 5.5, 'IST'],
  ['Tirupati', 13.6288, 79.4192, 5.5, 'IST'], ['Ahmedabad', 23.0225, 72.5714, 5.5, 'IST'], ['Pune', 18.5204, 73.8567, 5.5, 'IST'],
  ['Kathmandu', 27.7172, 85.324, 5.75, 'NPT'], ['Colombo', 6.9271, 79.8612, 5.5, 'SLST'], ['Dhaka', 23.8103, 90.4125, 6, 'BST'],
  ['Singapore', 1.3521, 103.8198, 8, 'SGT'], ['Kuala Lumpur', 3.139, 101.6869, 8, 'MYT'], ['Bali (Denpasar)', -8.65, 115.2167, 8, 'WITA'],
  ['Dubai', 25.2048, 55.2708, 4, 'GST'], ['Nairobi', -1.2921, 36.8219, 3, 'EAT'], ['Durban', -29.8587, 31.0218, 2, 'SAST'],
  ['London', 51.5074, -0.1278, 0, 'GMT'], ['Leicester', 52.6369, -1.1398, 0, 'GMT'], ['Paris', 48.8566, 2.3522, 1, 'CET'],
  ['New York', 40.7128, -74.006, -5, 'EST'], ['Chicago', 41.8781, -87.6298, -6, 'CST'], ['Houston', 29.7604, -95.3698, -6, 'CST'],
  ['San Francisco', 37.7749, -122.4194, -8, 'PST'], ['Toronto', 43.6532, -79.3832, -5, 'EST'], ['Port of Spain', 10.6596, -61.5089, -4, 'AST'],
  ['Georgetown', 6.8013, -58.1551, -4, 'GYT'], ['Suva', -18.1248, 178.4501, 12, 'FJT'], ['Sydney', -33.8688, 151.2093, 10, 'AEST'],
  ['Tokyo', 35.6762, 139.6503, 9, 'JST'], ['Reykjavík', 64.1466, -21.9426, 0, 'GMT'],
].map(([name, lat, lon, tz, tzName]) => ({ name, lat, lon, tz, tzName })));

// Chaldean hora order (descending orbital period), used by the clock-mode hora hand.
export const HORA_ORDER = Object.freeze(['shani', 'guru', 'mangala', 'surya', 'shukra', 'budha', 'chandra']);

// ONE shared glossary. Every term rendered in the UI goes through it (UI.js `g()`).
export const GLOSSARY = Object.freeze({
  panchangam: 'The five-limbed almanac: vara, tithi, nakshatra, yoga and karana — time read from the Sun and Moon.',
  vara: 'The weekday, named after its ruling graha. In live mode the day turns at sunrise, not midnight.',
  tithi: 'One of 30 lunar days: each time the Moon gains another 12° on the Sun, a new tithi begins.',
  paksha: 'A lunar fortnight — 15 tithis of waxing (Shukla) or waning (Krishna) Moon.',
  shukla: 'Shukla paksha: the bright, waxing fortnight from new Moon to full Moon.',
  krishna: 'Krishna paksha: the dark, waning fortnight from full Moon back to new Moon.',
  nakshatra: 'One of 27 lunar mansions, 13°20′ of sky each; the one holding the Moon names the day\'s star.',
  pada: 'A quarter of a nakshatra (3°20′); 108 padas circle the zodiac.',
  yoga: 'One of 27 bands of the Sun + Moon longitude sum, each 13°20′ wide.',
  karana: 'Half a tithi — 6° of Moon–Sun separation. 60 of them fill a lunar month.',
  shubha: 'Shubha: traditionally benefic, favourable for beginnings.',
  ashubha: 'Ashubha: traditionally malefic, commonly avoided for new undertakings.',
  vishti: 'Vishti (Bhadra): the seventh movable karana, traditionally avoided for auspicious events.',
  chara: 'Chara (movable) karanas: the seven that cycle eight times through the month.',
  sthira: 'Sthira (fixed) karanas: the four that occur once a month, around the new Moon.',
  rashi: 'One of 12 zodiac signs, 30° each, counted from Mesha in the sidereal zodiac.',
  graha: 'A "seizer" — a body that moves against the stars: Sun, Moon, five planets and the nodes Rahu/Ketu.',
  ayanamsha: 'The angle between the tropical and sidereal zodiacs (about 24° today); Lahiri is the Indian standard.',
  sidereal: 'Nirayana: measured against the fixed stars (Spica opposite 0°), not the drifting equinox.',
  elongation: 'ΔL — how far the Moon is east of the Sun along the ecliptic, 0°–360°.',
  ecliptic: 'The Sun\'s yearly path across the stars; all the grahas stay near it.',
  vinazhigai: 'Vināḻigai: 1/60 of a nāḻigai, about 24 seconds — the fine ticks in the hour view.',
  tamilmonth: 'A Tamil solar month: the time the Sun spends in one sidereal rashi, starting at its saṅkrānti.',
  script: 'Which script shows the primary names: Devanagari, IAST (romanised Sanskrit) or Tamil.',
  nazhigai: 'Nāḻigai (ghaṭikā): 1/60 of a sunrise-to-sunrise day, about 24 minutes; 60 vināḻigai each.',
  hora: 'One of 24 planetary hours from sunrise, cycling in Chaldean order from the day-lord.',
  rahukalam: 'Rāhu kālam: one eighth of daytime ruled by Rahu, commonly avoided for new starts.',
  yamagandam: 'Yamagaṇḍam: another eighth of daytime, traditionally avoided for beginnings.',
  gulika: 'Kuḷikai (Gulika kālam): the eighth-part of daytime ruled by Saturn\'s son Gulika.',
  abhijit: 'Abhijit: the 8th of 15 daytime muhūrtas around local noon, widely held favourable.',
  muhurta: 'An electional moment — choosing a time whose five limbs suit the work.',
  amavasya: 'Amāvāsyā: the new Moon, tithi 30, when Sun and Moon share a longitude.',
  purnima: 'Pūrṇimā: the full Moon, tithi 15, with the Moon opposite the Sun.',
  ekadashi: 'Ekādaśī: the 11th tithi of each paksha, widely kept as a fast day.',
  sankranti: 'Saṅkrānti: the Sun entering a new rashi — the start of a solar month.',
  rahu: 'Rahu: the Moon\'s ascending node, a shadow graha; eclipses occur near it.',
  ketu: 'Ketu: the descending node, always opposite Rahu.',
  nirayana: 'Nirayana: sidereal, "without precession".',
  deity: 'The presiding devata whose character colours the nakshatra.',
  temperament: 'A nakshatra\'s nature (swift, fixed, gentle, sharp, fierce, movable, mixed) used in muhūrta.',
  yogatara: 'The "junction star" that marks a nakshatra in the sky.',
  kalacakra: 'Kālacakra: the wheel of time — here, the clock face of the day.',
  lagna: 'The rising sign at a moment and place; not modelled by this tool.',
  navagraha: 'The nine grahas: Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu and Ketu.',
  eclipse: 'Grahaṇa: when the Sun or Moon stands near a node at new or full Moon.',
  sunrise: 'The Hindu day begins at sunrise (upper limb on the horizon, with refraction).',
  lahiri: 'Lahiri (Chitrapaksha) ayanamsha: puts Spica at 180°, the Government of India standard.',
  // agent C: bodies
  deepsky: 'Deep-sky object: a star cluster, nebula or galaxy far beyond the Solar System, fixed among the stars.',
  dwarfplanet: 'Dwarf planet: a round body orbiting the Sun that has not cleared its orbit (Pluto, Ceres).',
  outerplanet: 'Outer planet: Uranus and Neptune, found by telescope (1781, 1846) and so outside the classical navagraha.',
  satellite: 'A natural moon orbiting a planet.',
});

// ===== agent C: bodies — beyond the navagraha (not classical grahas; data for Bodies.js) =====
// Mean elements [a AU, e, L0, L1 (deg/century), ϖ0, ϖ1] — JPL approximate (Uranus, Neptune, Pluto);
// Ceres from approximate osculating elements (labelled approximate in the UI).
export const OUTER_BODIES = Object.freeze({
  uranus: Object.freeze({ name: 'अरुण', nameNote: 'modern Hindi name', iast: 'Uranus', kind: 'outerplanet', color: '#9FD6D2', size: 0.3, r: 18.8, period: 30687,
    el: [19.18916464, 0.04725744, 313.23810451, 428.48202785, 170.9542763, 0.40805281],
    science: 'Ice giant tipped on its side; at magnitude 5.7 it sits at the very limit of naked-eye visibility.',
    culture: 'Found by telescope in 1781 — not a classical graha and outside the navagraha.' }),
  neptune: Object.freeze({ name: 'वरुण', nameNote: 'modern Hindi name', iast: 'Neptune', kind: 'outerplanet', color: '#5B7FD9', size: 0.29, r: 20.2, period: 60190,
    el: [30.06992276, 0.00859048, -55.12002969, 218.45945325, 44.96476227, -0.32241464],
    science: 'The windiest planet, found in 1846 from its pull on Uranus; invisible to the naked eye.',
    culture: 'Not a classical graha — unknown to the Siddhantas and outside the navagraha.' }),
  pluto: Object.freeze({ name: 'यम', nameNote: 'modern Hindi name', iast: 'Pluto', kind: 'dwarfplanet', color: '#C9B39A', size: 0.14, r: 21.6, period: 90560,
    el: [39.48211675, 0.2488273, 238.92903833, 145.20780515, 224.06891629, -0.04062942],
    science: 'Dwarf planet of the Kuiper belt, with a heart-shaped nitrogen-ice plain; far below naked-eye reach.',
    culture: 'Not a classical graha — outside the navagraha.' }),
  ceres: Object.freeze({ name: null, iast: 'Ceres', kind: 'dwarfplanet', color: '#A8A095', size: 0.11, r: 15.1, period: 1681,
    el: [2.7675, 0.079, 160.6, 7826.0, 154.4, 0],
    science: 'Largest body in the asteroid belt between Mangala and Guru; binoculars only, never naked-eye.',
    culture: 'Not a classical graha — outside the navagraha.' }),
});

export const EXTRA_MOONS = Object.freeze({
  titan: Object.freeze({ name: 'Titan', host: 'shani', period: 15.945, r: 0.95, science: 'The only moon with a thick atmosphere and lakes of liquid methane.' }),
  phobos: Object.freeze({ name: 'Phobos', host: 'mangala', period: 0.319, r: 0.42, science: 'Mars\'s inner moon, spiralling slowly inward — it will break up in ~50 million years.' }),
  deimos: Object.freeze({ name: 'Deimos', host: 'mangala', period: 1.263, r: 0.62, science: 'Mars\'s small outer moon, likely a captured asteroid.' }),
});

// Deep-sky objects: RA h, Dec °, apparent size (scene units on the star sphere), style
export const DEEP_SKY = Object.freeze([
  { key: 'm45', name: 'कृत्तिका', iast: 'Krittika · Pleiades (M45)', ra: 3.79, dec: 24.12, size: 7, style: 'cluster', nak: 3,
    science: 'A young open cluster ~440 light-years away; six or seven stars are visible to the eye.',
    culture: 'The six Krittikas, foster-mothers of Kartikeya — nakshatra 3, ruled by Agni.' },
  { key: 'm42', name: null, iast: 'Orion Nebula (M42)', ra: 5.588, dec: -5.39, size: 6, style: 'nebula', color: [255, 120, 150],
    science: 'A stellar nursery 1,340 light-years away, visible as the fuzzy middle "star" of Orion\'s sword.' },
  { key: 'm31', name: null, iast: 'Andromeda Galaxy (M31)', ra: 0.712, dec: 41.27, size: 12, style: 'galaxy', color: [230, 220, 200],
    science: 'Our nearest large spiral galaxy, 2.5 million light-years away — the farthest thing the naked eye can see.' },
  { key: 'lmc', name: null, iast: 'Large Magellanic Cloud', ra: 5.392, dec: -69.76, size: 18, style: 'cloud', color: [210, 215, 235],
    science: 'A satellite galaxy of the Milky Way, 160,000 light-years away; a southern-sky naked-eye patch.' },
  { key: 'smc', name: null, iast: 'Small Magellanic Cloud', ra: 0.877, dec: -72.83, size: 10, style: 'cloud', color: [210, 215, 235],
    science: 'A dwarf satellite galaxy, 200,000 light-years away, companion to the Large Cloud.' },
  { key: 'm44', name: 'पुष्य', iast: 'Beehive (M44, Praesepe)', ra: 8.667, dec: 19.67, size: 5.5, style: 'cluster', nak: 8,
    science: 'An open cluster ~600 light-years away, a faint glow to the eye in dark skies.',
    culture: 'It lies within the Pushya nakshatra (Cancer), ruled by Brihaspati.' },
  { key: 'omegacen', name: null, iast: 'Omega Centauri', ra: 13.447, dec: -47.48, size: 5, style: 'globular', color: [255, 235, 200],
    science: 'The largest globular cluster of the Milky Way — ten million stars, 17,000 light-years away.' },
].map((o) => Object.freeze(o)));

