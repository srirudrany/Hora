// BodiesMath.js — pure orbit math for bodies beyond the navagraha (no three.js; testable in Node).
import { OUTER_BODIES } from './PanchangamData.js';
import { helio, norm360 } from './PanchangamMath.js';

const D2R = Math.PI / 180;
export const OUTER_KEYS = Object.freeze(Object.keys(OUTER_BODIES));

/** Heliocentric ecliptic position from mean elements (same method as PanchangamMath.helio). */
export function outerHelio(key, jd) {
  const T = (jd - 2451545) / 36525;
  const [a, e, L0, L1, w0, w1] = OUTER_BODIES[key].el;
  const w = w0 + w1 * T, M = norm360(L0 + L1 * T - w) * D2R;
  let E = M;
  for (let i = 0; i < 8; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
  const r = a * (1 - e * Math.cos(E)), lon = nu + w * D2R;
  return { x: r * Math.cos(lon), y: r * Math.sin(lon), r, lon: norm360(lon / D2R) };
}
/** Any body's heliocentric position — classical keys go to PanchangamMath.helio. */
export const anyHelio = (key, jd) => (OUTER_BODIES[key] ? outerHelio(key, jd) : helio(key, jd));
/** Geocentric tropical longitude (deg). */
export function outerTropicalLon(key, jd) {
  const p = outerHelio(key, jd), e = helio('earth', jd);
  return norm360(Math.atan2(p.y - e.y, p.x - e.x) / D2R);
}
export const outerLon = (key, jd) => norm360(outerTropicalLon(key, jd) - globalThis.Panchanga.ayanamsa(jd));

