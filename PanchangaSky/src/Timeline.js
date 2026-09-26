// Timeline.js — the zoomable scrubber ladder (SPEC §5): hour ⇄ day ⇄ month ⇄ year.
// Day and month windows live in App.js; this module builds hour and year windows and owns the ladder.
import { localParts, jdFromLocal, fmtTime, pad2 } from './PanchangamMath.js';

const P = () => globalThis.Panchanga;
export const LADDER = Object.freeze(['hour', 'day', 'month', 'year']);
const MIN = 1 / 1440;

/** One rung narrower (dir < 0) or wider (dir > 0). */
export function zoomDomain(cur, dir) {
  const i = LADDER.indexOf(cur);
  return LADDER[Math.max(0, Math.min(LADDER.length - 1, i + Math.sign(dir)))];
}

/** Hour: ±30 min around the cursor; re-centres only when the cursor leaves the middle band. */
export function buildHour(win, jd, loc, day) {
  const inside = win.key.startsWith('hour|') && jd > win.start + 8 * MIN && jd < win.end - 8 * MIN;
  if (inside && win.key.endsWith(`|${loc.lat},${loc.lon}`)) return;
  const start = Math.round((jd - 30 * MIN) / MIN) * MIN;
  Object.assign(win, { key: `hour|${start.toFixed(6)}|${loc.lat},${loc.lon}`, start, end: start + 60 * MIN });
  win.bands = [];
  win.ticks = [];
  for (let n = 0; n <= 60; n++) {
    const at = start + n * MIN, p = localParts(at + 1e-6, loc.tz);
    win.ticks.push({ at, major: p.mm % 5 === 0, label: p.mm % 10 === 0 ? `${pad2(p.hh)}:${pad2(p.mm)}` : '' });
  }
  // vināḻigai ticks (1/3600 of the sunrise-to-sunrise day, ≈ 24 s) as a fine lane; nāḻigai boundaries marked
  const span = day.nextSunrise - day.sunrise, vin = span / 3600;
  win.marks = [];
  const first = Math.ceil((start - day.sunrise) / vin), last = Math.floor((win.end - day.sunrise) / vin);
  for (let v = first; v <= last; v++) {
    const at = day.sunrise + v * vin;
    if (v % 60 === 0) win.marks.push({ at, cls: 'm-nazhigai', title: `Nāḻigai ${v / 60} begins · ${fmtTime(at, loc.tz)}`, label: `${v / 60}` });
    else if (v % 5 === 0) win.marks.push({ at, cls: 'm-vin', title: `${Math.floor(v / 60)}:${pad2(v % 60)} nāḻigai` });
  }
  if (day.sunset > start && day.sunset < win.end) win.marks.push({ at: day.sunset, cls: 'm-sun', title: `Sunset ${fmtTime(day.sunset, loc.tz)}`, label: 'sunset' });
}

/** Year: Jan 1 → Jan 1 local; month ticks, saṅkrānti boundaries with Tamil month names, Pūrṇimā/Amāvāsyā dots. */
export function buildYear(win, jd, loc) {
  const y = localParts(jd, loc.tz).y, key = `year|${y}|${loc.lat},${loc.lon},${loc.tz}`;
  if (win.key === key) return;
  const E = P(), start = jdFromLocal(y, 1, 1, 0, 0, loc.tz), end = jdFromLocal(y + 1, 1, 1, 0, 0, loc.tz);
  Object.assign(win, { key, start, end, bands: [], ticks: [], marks: [] });
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  for (let m = 1; m <= 12; m++) win.ticks.push({ at: jdFromLocal(y, m, 1, 0, 0, loc.tz), major: true, label: MON[m - 1] });
  win.ticks.push({ at: end, major: true, label: '' });
  // one engine sample per day at local noon; exact instants refined with angaEnd only at transitions
  let prevSolar = null, prevT = null, bandStart = start, bandIdx = null;
  for (let t = start + 0.5; t < end; t += 1) {
    const solar = E.angaAt('solar', t), ti = E.angaAt('tithi', t);
    if (prevSolar !== null && solar !== prevSolar) {
      const at = E.angaEnd('solar', t - 1);
      win.bands.push({ a: bandStart, b: at, cls: `b-smonth ${bandIdx % 2 ? 'odd' : ''}`, title: E.N.monthTaLat[bandIdx] });
      win.marks.push({ at, cls: 'm-sank', title: `Saṅkrānti — ${E.N.monthTaLat[solar]} begins (Sun enters ${E.N.rasi[solar]}) · ${fmtTime(at, loc.tz)}`, label: E.N.monthTaLat[solar] });
      bandStart = at;
    }
    if (bandIdx === null || (prevSolar !== null && solar !== prevSolar)) bandIdx = solar;
    if (prevT !== null && ti !== prevT && (ti === 14 || ti === 29)) {
      const at = E.angaEnd('tithi', t - 1);
      win.marks.push({ at, cls: ti === 14 ? 'f-purnima' : 'f-amavasya', title: `${ti === 14 ? 'Pūrṇimā' : 'Amāvāsyā'} begins · ${localParts(at, loc.tz).d}/${localParts(at, loc.tz).m} ${fmtTime(at, loc.tz)}` });
    }
    prevSolar = solar; prevT = ti;
  }
  win.bands.push({ a: bandStart, b: end, cls: `b-smonth ${bandIdx % 2 ? 'odd' : ''}`, title: E.N.monthTaLat[bandIdx] });
}
