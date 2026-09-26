import {
  TITHI_TABLE,
  NAKSHATRA_TABLE,
  YOGA_TABLE,
  KARANA_TABLE,
  VARA_TABLE,
} from "./PanchangamData.js";

// Elongation: (moonLon - sunLon) mod 360, result in [0, 360)
export function elongation(lSun, lMoon) {
  const raw = lMoon - lSun;
  return raw < 0 ? raw + 360 : raw;
}

// Tithi index 1..30 (12° each)
export function tithiIndex(dL) {
  return Math.min(Math.floor(dL / 12) + 1, 30);
}

// Nakshatra index 1..27 (13°20' = 40/3° each)
export function nakshatraIndex(moonLon) {
  return Math.min(Math.floor(moonLon / (40 / 3)) + 1, 27);
}

// Nakshatra pada 1..4 (3°20' each)
export function nakshatraPada(moonLon) {
  const spanPerNakshatra = 40 / 3;
  const posInNakshatra =
    ((moonLon % spanPerNakshatra) + spanPerNakshatra) % spanPerNakshatra;
  const padaSpan = spanPerNakshatra / 4;
  return Math.min(Math.floor(posInNakshatra / padaSpan) + 1, 4);
}

// Yoga index 1..27 (13°20' each of (sun+moon) mod 360)
export function yogaIndex(sunLon, moonLon) {
  const sum = (sunLon + moonLon) % 360;
  return Math.min(Math.floor(sum / (40 / 3)) + 1, 27);
}

// Karana index 1..60 (6° each)
export function karanaIndex(dL) {
  return Math.min(Math.floor(dL / 6) + 1, 60);
}

// Vara 1..7 from Date (Sunday=1..Saturday=7)
export function varaFromDate(date) {
  return date.getDay() + 1;
}

// Tithi category
export function tithiCategory(tithiIdx) {
  const cats = ["Nanda", "Bhadra", "Jaya", "Rikta", "Purna"];
  return cats[(tithiIdx - 1) % 5];
}

// Paksha
export function paksha(tithiIdx) {
  return tithiIdx <= 15 ? "Shukla" : "Krishna";
}

// Is yoga shubha?
export function isShubhaYoga(yogaIdx) {
  const ashubha = new Set([1, 6, 9, 10, 13, 15, 17, 19, 27]);
  return !ashubha.has(yogaIdx);
}

// Karana type
export function karanaType(karanaIdx) {
  return karanaIdx >= 58 || karanaIdx === 1 ? "Fixed" : "Movable";
}

// Main computation — returns a complete Panchangam object
export function computePanchangam(sunLon, moonLon, date) {
  const dL = elongation(sunLon, moonLon);

  const varaIdx = varaFromDate(date);
  const tithiIdx = tithiIndex(dL);
  const nakIdx = nakshatraIndex(moonLon);
  const yogaIdx = yogaIndex(sunLon, moonLon);
  const karIdx = karanaIndex(dL);
  const padaValue = nakshatraPada(moonLon);

  return {
    vara: VARA_TABLE[varaIdx - 1],
    tithi: TITHI_TABLE[tithiIdx - 1],
    nakshatra: NAKSHATRA_TABLE[nakIdx - 1],
    yoga: YOGA_TABLE[yogaIdx - 1],
    karana: KARANA_TABLE[karIdx - 1],
    elongation: dL,
    sunLon,
    moonLon,
    pada: padaValue,
  };
}

// Overall auspiciousness based on majority of three factors:
//   1. Yoga classification (Shubha vs Ashubha)
//   2. Tithi category is not Rikta
//   3. Karana is not Vishti (Bhadra)
export function overallAuspiciousness(panchangam) {
  let auspiciousCount = 0;

  // Factor 1: Yoga
  const yogaIdx = yogaIndex(panchangam.sunLon, panchangam.moonLon);
  if (isShubhaYoga(yogaIdx)) {
    auspiciousCount++;
  }

  // Factor 2: Tithi category is not Rikta
  const dL = panchangam.elongation;
  const tIdx = tithiIndex(dL);
  if (tithiCategory(tIdx) !== "Rikta") {
    auspiciousCount++;
  }

  // Factor 3: Karana is not Vishti
  const kIdx = karanaIndex(dL);
  // Vishti is the 7th movable karana (index 6 in the 0-based cycle).
  // For movable karanas (k 2..57): name index = (k - 2) % 7
  // Vishti occurs when (k - 2) % 7 === 6, i.e. k = 8, 15, 22, 29, 36, 43, 50, 57
  const isVishti =
    kIdx >= 2 && kIdx <= 57 && (kIdx - 2) % 7 === 6;
  if (!isVishti) {
    auspiciousCount++;
  }

  // Majority: at least 2 out of 3
  return auspiciousCount >= 2 ? "Shubha" : "Ashubha";
}
