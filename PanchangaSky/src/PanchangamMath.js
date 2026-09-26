// PanchangamMath.js — pure functions. Index formulas follow docs/SPEC.md §2 exactly;
// live sky longitudes come from Hora's verified engine (vendor/panchanga.js, window.Panchanga).
import { TITHI_TABLE, NAKSHATRA_TABLE, YOGA_TABLE, KARANA_TABLE, VARA_TABLE, RASHI_TABLE } from './PanchangamData.js';

const SPAN27 = 40 / 3;
export const norm360 = (x) => ((x % 360) + 360) % 360;

export function elongation(lSun, lMoon) {
  const raw = lMoon - lSun;
  return raw < 0 ? raw + 360 : raw;
}
export function tithiIndex(dL) { return Math.min(Math.floor(dL / 12) + 1, 30); }
export function nakshatraIndex(moonLon) { return Math.min(Math.floor(moonLon / SPAN27) + 1, 27); }
export function padaIndex(moonLon) { return Math.min(Math.floor((moonLon % SPAN27) / (10 / 3)) + 1, 4); }
export function yogaIndex(sunLon, moonLon) {
  const sum = (sunLon + moonLon) % 360;
  return Math.min(Math.floor(sum / SPAN27) + 1, 27);
}
export function karanaIndex(dL) { return Math.min(Math.floor(dL / 6) + 1, 60); }
export function rashiIndex(lon) { return Math.min(Math.floor(lon / 30) + 1, 12); }
export function varaFromDate(date) { return date.getDay() + 1; }

/** Main computation. `vara` may be passed explicitly (sunrise-anchored in live mode). */
export function computePanchangam(sunLon, moonLon, date, vara) {
  sunLon = norm360(sunLon); moonLon = norm360(moonLon);
  const dL = elongation(sunLon, moonLon);
  const t = tithiIndex(dL), n = nakshatraIndex(moonLon), y = yogaIndex(sunLon, moonLon), k = karanaIndex(dL);
  const v = vara ?? varaFromDate(date);
  const tithi = TITHI_TABLE[t - 1], yoga = YOGA_TABLE[y - 1], karana = KARANA_TABLE[k - 1];
  const nakshatra = NAKSHATRA_TABLE[n - 1];
  // Overall assessment: majority of the judged limbs (tithi family, yoga, karana, nakshatra nature).
  const votes = [
    tithi.category !== 'Rikta' && t !== 30,
    yoga.classification === 'Shubha',
    !karana.avoid,
    !['ugra', 'tiksna'].includes(nakshatra.nature),
  ];
  const shubhaCount = votes.filter(Boolean).length;
  return Object.freeze({
    vara: VARA_TABLE[v - 1], tithi, nakshatra, yoga, karana,
    pada: padaIndex(moonLon), rashiMoon: RASHI_TABLE[rashiIndex(moonLon) - 1], rashiSun: RASHI_TABLE[rashiIndex(sunLon) - 1],
    elongation: dL, sunLon, moonLon, yogaSum: (sunLon + moonLon) % 360,
    shubhaCount, auspicious: shubhaCount >= 3,
  });
}

// ---------- time & place (wrapping Hora's engine) ----------
const E = () => globalThis.Panchanga;

/** Civil date {y,m,d,h} of a JD in a fixed tz offset (hours). */
export function localParts(jd, tz) {
  const d = new Date((jd - 2440587.5) * 86400000 + tz * 3600000);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), hh: d.getUTCHours(), mm: d.getUTCMinutes(), ss: d.getUTCSeconds(), dow: d.getUTCDay() };
}
export function jdFromLocal(y, m, d, hh, mm, tz) { return Date.UTC(y, m - 1, d, hh, mm) / 86400000 + 2440587.5 - tz / 24; }
export const pad2 = (n) => String(n).padStart(2, '0');
export function fmtTime(jd, tz) { const p = localParts(jd + 1 / 2880, tz); return `${pad2(p.hh)}:${pad2(p.mm)}`; }
export function fmtDate(jd, tz) {
  const p = localParts(jd, tz);
  return `${p.d} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][p.m - 1]} ${p.y}`;
}
export function fmtDeg(x) {
  const d = Math.floor(x), m = Math.floor((x - d) * 60);
  return `${d}°${pad2(m)}′`;
}

/** Sunrise-anchored "panchang day": the sunrise at or before jd, and the next one. */
export function dayBounds(jd, loc) {
  const P = E();
  let p = localParts(jd, loc.tz);
  let sr = P.sunriseOn(p.y, p.m, p.d, loc);
  if (jd < sr) { p = localParts(jd - 1, loc.tz); sr = P.sunriseOn(p.y, p.m, p.d, loc); }
  const n = localParts(sr + 1, loc.tz);
  const next = P.sunriseOn(n.y, n.m, n.d, loc);
  const ss = P.sunsetOn(p.y, p.m, p.d, loc);
  return { y: p.y, m: p.m, d: p.d, sunrise: sr, sunset: ss, nextSunrise: next, weekday: localParts(sr, loc.tz).dow };
}

/** Everything the UI needs for the live sky at (jd, loc). */
export function liveSky(jd, loc) {
  const P = E();
  const day = dayBounds(jd, loc);
  const sunLon = P.sidSun(jd), moonLon = P.sidMoon(jd);
  const pan = computePanchangam(sunLon, moonLon, null, day.weekday + 1);
  return { jd, day, sunLon, moonLon, ayanamsa: P.ayanamsa(jd), pan };
}

/** End time (JD) of the current limb at jd — engine bisection. */
export function limbEnd(kind, jd) { return E().angaEnd(kind, jd + 1e-7); }

export function gmstDeg(jd) {
  const T = (jd - 2451545) / 36525;
  return norm360(280.46061837 + 360.98564736629 * (jd - 2451545) + 0.000387933 * T * T);
}
export function obliquity(jd) { return 23.439291 - 0.0130042 * (jd - 2451545) / 36525; }

// Rahu = mean ascending node of the Moon (sidereal); Ketu opposite.
export function rahuLon(jd) {
  const T = (jd - 2451545) / 36525;
  return norm360(125.04452 - 1934.136261 * T - E().ayanamsa(jd));
}

// Planets: JPL approximate mean elements (J2000, per century). Longitudes labelled "approximate".
const EL = {
  budha: [0.38709927, 0.20563593, 252.2503235, 149472.67411175, 77.45779628, 0.16047689],
  shukra: [0.72333566, 0.00677672, 181.9790995, 58517.81538729, 131.60246718, 0.00268329],
  earth: [1.00000261, 0.01671123, 100.46457166, 35999.37244981, 102.93768193, 0.32327364],
  mangala: [1.52371034, 0.0933941, -4.55343205, 19140.30268499, -23.94362959, 0.44441088],
  guru: [5.202887, 0.04838624, 34.39644051, 3034.74612775, 14.72847983, 0.21252668],
  shani: [9.53667594, 0.05386179, 49.95424423, 1222.49362201, 92.59887831, -0.41897216],
};
export function helio(key, jd) {
  const T = (jd - 2451545) / 36525;
  const [a, e, L0, L1, w0, w1] = EL[key];
  const L = L0 + L1 * T, w = w0 + w1 * T;
  const M = norm360(L - w) * Math.PI / 180;
  let Ea = M;
  for (let i = 0; i < 6; i++) Ea -= (Ea - e * Math.sin(Ea) - M) / (1 - e * Math.cos(Ea));
  const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(Ea / 2), Math.sqrt(1 - e) * Math.cos(Ea / 2));
  const r = a * (1 - e * Math.cos(Ea));
  const lon = nu + w * Math.PI / 180;
  return { x: r * Math.cos(lon), y: r * Math.sin(lon), r, lon: norm360(lon * 180 / Math.PI) };
}
/** Geocentric sidereal longitude of a planet (approximate). */
export function planetLon(key, jd) {
  const p = helio(key, jd), e = helio('earth', jd);
  return norm360(Math.atan2(p.y - e.y, p.x - e.x) * 180 / Math.PI - E().ayanamsa(jd));
}
export const PLANET_KEYS = Object.freeze(['budha', 'shukra', 'mangala', 'guru', 'shani']);

/** Nearest angular distance on the circle. */
export const angDist = (a, b) => { const d = Math.abs(norm360(a - b)); return d > 180 ? 360 - d : d; };
