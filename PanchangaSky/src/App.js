// App.js — one time state (jd, place) for the whole app; the render loop; wiring UI ⇄ scene.
import { Renderer } from './Renderer.js';
import { UI, SPEEDS } from './UI.js';
import { CITIES, HORA_ORDER, VARA_TABLE, STARS } from './PanchangamData.js';
import { OUTER_BODIES, MOONS, EXTRA_MOONS } from './PanchangamData.js';   // agent C
import { Inset } from './Inset.js';
import { scanMonth } from './HolyDays.js';
import { Places } from './Places.js';   // agent A: compare slot + globe pin
// agent B: zoom ladder + script preference
import { buildHour, buildYear, zoomDomain } from './Timeline.js';
import { script, nameIn } from './Script.js';
import {
  computePanchangam, liveSky, limbEnd, gmstDeg, obliquity, norm360, localParts, jdFromLocal, dayBounds, fmtTime, rahuLon,
} from './PanchangamMath.js';

const P = window.Panchanga;
const nowJd = () => Date.now() / 86400000 + 2440587.5;
const $body = document.body;

const S = {
  jd: nowJd(),
  loc: { ...CITIES[0] },          // Chennai is the default observer (SPEC §6)
  speed: 'live', playing: true,
  manual: null,                   // { sun, moon } when the sliders own the angles
  view: 'both', domain: 'day',
  shown: { sun: null, moon: null }, // lerped display longitudes
};

const renderer = new Renderer(document.getElementById('stage'), document.getElementById('labels'));
const ui = new UI(document.getElementById('app'), {
  mode: (m) => setMode(m === 'toggle' ? (renderer.mode === 'clock' ? 'sky' : 'clock') : m),
  view: (v) => { S.view = v; $body.classList.remove('view-scientific', 'view-religious', 'view-both'); $body.classList.add(`view-${v}`); ui.setActive('[data-view]', 'view', v); },
  preset: (dL) => {
    const base = S.manual ? S.manual.sun : P.sidSun(S.jd);
    S.manual = { sun: base, moon: norm360(base + dL) };
  },
  slider: (k, v) => { if (!S.manual) S.manual = { sun: P.sidSun(S.jd), moon: P.sidMoon(S.jd) }; S.manual[k] = v; },
  speed: (k) => {
    S.speed = k; S.playing = true; ui.setPlaying(true);
    if (k === 'live') { S.jd = nowJd(); S.manual = null; }
    ui.setActive('[data-speed]', 'speed', k);
  },
  play: () => {
    S.playing = !S.playing; ui.setPlaying(S.playing);
    if (S.playing && S.speed === 'live') S.jd = nowJd();
  },
  now: () => goNow(),
  domain: (d) => { S.domain = d; ui.setActive('[data-domain]', 'domain', d); },
  zoom: (dir) => { const d = zoomDomain(S.domain, dir); if (d !== S.domain) { S.domain = d; ui.setActive('[data-domain]', 'domain', d); } },
  script: (sc) => { script.current = sc; ui.setActive('[data-script]', 'script', sc); document.body.dataset.script = sc; renderer.relabelNames((k, rec) => nameIn(k, rec)); },
  lock: (k) => { renderer.setLock(k); ui.setActive('[data-lock]', 'lock', k); },
  place: (v) => {
    if (v === 'geo') {
      navigator.geolocation?.getCurrentPosition((pos) => {
        S.loc = { name: 'My location', lat: pos.coords.latitude, lon: pos.coords.longitude, tz: -new Date().getTimezoneOffset() / 60, tzName: 'local' };
        invalidate();
      }, () => {});
      return;
    }
    S.loc = { ...CITIES[+v] }; invalidate();
    $body.classList.remove('place-flash'); void $body.offsetWidth; $body.classList.add('place-flash');
  },
  jumpLocal: (str) => {
    const [d, t] = str.split('T'); const [y, m, dd] = d.split('-').map(Number); const [hh, mm] = t.split(':').map(Number);
    S.jd = jdFromLocal(y, m, dd, hh, mm, S.loc.tz); pauseForScrub();
  },
  scrub: (f) => { S.jd = win.start + f * (win.end - win.start); pauseForScrub(); },
  layer: (k, on) => { renderer.layers[k] = on; },
  chip: (kind, arg) => onChip(kind, arg),
  finderOpen: (refresh) => {
    const F = ui.finder;
    if (!refresh) { const lp = localParts(S.jd, S.loc.tz); F.y = lp.y; F.m = lp.m; F.pinned = null; }
    F.pinned = null;
    ui.renderFinder(scanMonth(F.y, F.m, S.loc, F.act), F.y, F.m, S.loc);
  },
  scrubTo: (jd) => {
    S.jd = jd; pauseForScrub();
    // the sky shows *why*: lift off (if needed) and lock the Moon's nakshatra
    if (renderer.mode === 'clock') setMode('sky');
    renderer.setLock('nakshatra'); ui.setActive('[data-lock]', 'lock', 'nakshatra');
  },
});

// ---- agent A: places (compare slot + globe pin-drop) ----
const places = new Places({ getLoc: () => S.loc, setPrimary: (loc) => { S.loc = loc; invalidate(); } });
// ---- end agent A ----

const LOCK_OF = { surya: 'sun', chandra: 'moon' };
function onChip(kind, arg) {
  if (kind === 'find') {
    if (renderer.mode === 'clock') setMode('sky');
    const k = LOCK_OF[arg] ?? arg; renderer.setLock(k); ui.setActive('[data-lock]', 'lock', k); ui.hideCard(); return;
  }
  if (kind === 'close') { ui.hideCard(); renderer.constellations.highlight(null); renderer.stars.setHighlight([]); return; }
  ui.hidePick();
  if (kind === 'constellation') {
    const name = arg.split('|')[0];
    renderer.constellations.highlight(name);
    renderer.stars.setHighlight(STARS.filter((st) => st.constellation === name).map((st) => st.name));
    if (!renderer.layers.constellations) { renderer.layers.constellations = true; document.querySelector('[data-layer="constellations"]').classList.add('on'); }
  }
  ui.showCard(kind, arg, { ...current, rahu: rahuLon(S.jd) });
}
const inset = new Inset(document.querySelector('[data-f="inset"]'));

function pauseForScrub() {
  S.manual = null;
  if (S.speed === 'live') { S.speed = '1x'; ui.setActive('[data-speed]', 'speed', '1x'); }
  S.playing = false; ui.setPlaying(false);
}
function goNow() {
  S.jd = nowJd(); S.manual = null; S.speed = 'live'; S.playing = true;
  ui.setPlaying(true); ui.setActive('[data-speed]', 'speed', 'live');
}

// ---------- lift-off ----------
function setMode(m) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lift = (renderer.mode === 'clock') !== (m === 'clock');
  // anticipation beat: the face scales 1 → 0.97 for 50 ms before the lift
  $body.classList.add('antic');
  setTimeout(() => {
    $body.classList.remove('antic');
    const busy = !!renderer.anim || !!renderer.pov.dir;
    const ok = renderer.setMode(m, () => applyModeClasses(m));
    if (!ok) return;
    ui.setActive('[data-mode]', 'mode', m);
    if (busy || !lift) return;
    $body.classList.add(reduced ? 'xfade' : 'warp');
    setTimeout(() => $body.classList.remove('warp', 'xfade'), reduced ? 320 : 1650);
  }, 50);
}

// ---------- per-day tables (cached; the limbs themselves are recomputed every frame) ----------
let dayCache = { key: '' }, ends = {}, endKey = {};
function invalidate() { dayCache = { key: '' }; ends = {}; endKey = {}; win.key = ''; }
function dayInfo(jd) {
  const day = dayBounds(jd, S.loc);
  const key = `${day.y}-${day.m}-${day.d}|${S.loc.lat},${S.loc.lon},${S.loc.tz}`;
  if (dayCache.key === key) return dayCache;
  const part = (day.sunset - day.sunrise) / 8, seg = (n) => [day.sunrise + (n - 1) * part, day.sunrise + n * part];
  const full = P.panchanga(day.y, day.m, day.d, S.loc);   // limb transitions across the day, for the timeline
  dayCache = { key, day, rahu: seg(P.RAHU[day.weekday]), yama: seg(P.YAMA[day.weekday]), gulika: seg(P.GULIKA[day.weekday]),
    abhijit: [day.sunrise + 7 * (day.sunset - day.sunrise) / 15, day.sunrise + 8 * (day.sunset - day.sunrise) / 15], full };
  return dayCache;
}
function refreshEnds(s) {
  for (const k of ['tithi', 'nakshatra', 'yoga', 'karana']) {
    const idx = s.pan[k].index;
    if (endKey[k] === idx && ends[k] && s.jd < ends[k] && ends[k] - s.jd < 3) continue;
    ends[k] = limbEnd(k, s.jd); endKey[k] = idx;
  }
}

// ---------- timeline window ----------
const win = { key: '', start: 0, end: 1, bands: [], ticks: [], marks: [] };
function buildWindow(info) {
  const tz = S.loc.tz;
  if (S.domain === 'hour') return buildHour(win, S.jd, S.loc, info.day);
  if (S.domain === 'year') return buildYear(win, S.jd, S.loc);
  if (S.domain === 'day') {
    const d = info.day, key = `day|${info.key}`;
    if (win.key === key) return;
    Object.assign(win, { key, start: d.sunrise, end: d.nextSunrise });
    win.bands = [
      { a: d.sunrise, b: d.sunset, cls: 'b-day' }, { a: d.sunset, b: d.nextSunrise, cls: 'b-night' },
      { a: info.rahu[0], b: info.rahu[1], cls: 'b-rahu', title: `Rāhu kālam ${fmtTime(info.rahu[0], tz)}–${fmtTime(info.rahu[1], tz)}` },
      { a: info.yama[0], b: info.yama[1], cls: 'b-yama', title: 'Yamagaṇḍam' },
      { a: info.gulika[0], b: info.gulika[1], cls: 'b-gulika', title: 'Kuḷikai' },
      { a: info.abhijit[0], b: info.abhijit[1], cls: 'b-abhijit', title: 'Abhijit muhūrta' },
    ];
    win.ticks = Array.from({ length: 61 }, (_, n) => ({ at: d.sunrise + (n / 60) * (d.nextSunrise - d.sunrise), major: n % 5 === 0, label: n % 10 === 0 && n < 60 ? String(n) : '' }));
    win.marks = [];
    const names = { tithi: 'Tithi', nakshatra: 'Nakṣatra', yoga: 'Yoga', karana: 'Karaṇa' };
    for (const k of Object.keys(names)) for (const e of info.full[k]) if (e.end < d.nextSunrise) win.marks.push({ at: e.end, cls: `m-${k}`, title: `${names[k]} changes · ${fmtTime(e.end, tz)}` });
    win.marks.push({ at: d.sunset, cls: 'm-sun', title: `Sunset ${fmtTime(d.sunset, tz)}`, label: 'sunset' });
  } else {
    // month domain: ±15 days, festival lane from pure functions of the limbs (SPEC §6.2 A)
    const lp = localParts(S.jd, tz), anchor = jdFromLocal(lp.y, lp.m, lp.d, 0, 0, tz);
    const key = `month|${Math.round(anchor)}|${S.loc.lat}`;
    if (win.key === key) return;
    Object.assign(win, { key, start: anchor - 15, end: anchor + 16 });
    win.bands = []; win.ticks = []; win.marks = [];
    let prevSolar = null;
    for (let i = 0; i <= 31; i++) {
      const dayJd = win.start + i, p = localParts(dayJd + 0.5, tz);
      win.ticks.push({ at: dayJd, major: p.d === 1 || i % 5 === 0, label: i % 5 === 0 || p.d === 1 ? `${p.d}/${p.m}` : '' });
      if (i === 31) break;
      const sr = P.sunriseOn(p.y, p.m, p.d, S.loc);
      const t = P.angaAt('tithi', sr) + 1, solar = P.angaAt('solar', sr);
      const add = (cls, title, label) => win.marks.push({ at: sr, cls, title: `${title} · ${p.d}/${p.m}`, label });
      if (t === 11 || t === 26) add('f-ekadashi', 'Ekādaśī', 'Ek');
      if (t === 15) add('f-purnima', 'Pūrṇimā', '');
      if (t === 30) add('f-amavasya', 'Amāvāsyā', '');
      if (prevSolar !== null && solar !== prevSolar) add('f-sankranti', `Saṅkrānti — Sun enters ${P.N.rasi[solar]}`, 'S');
      prevSolar = solar;
      const nak = P.angaAt('nakshatra', sr);
      for (const f of [{ n: 'Kārttikai Dīpam', m: 7, k: 2 }, { n: 'Thai Pūsam', m: 9, k: 7 }, { n: 'Paṅguni Uttiram', m: 11, k: 11 }, { n: 'Vaikāsi Visākam', m: 1, k: 15 }])
        if (solar === f.m && nak === f.k) add('f-fest', `${f.n} — solar month + Moon's nakshatra`, '');
    }
  }
}

// ---------- canvas picking ----------
const canvas = renderer.renderer.domElement;
let downAt = null;
let dragAt = null;
canvas.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; dragAt = [e.clientX, e.clientY]; });
canvas.addEventListener('pointermove', (e) => {
  if (!dragAt || renderer.mode !== 'pov') return;
  renderer.povDrag(e.clientX - dragAt[0], e.clientY - dragAt[1]); dragAt = [e.clientX, e.clientY];
});
addEventListener('pointerup', () => { dragAt = null; });
canvas.addEventListener('wheel', (e) => { if (renderer.mode === 'pov') renderer.povFov = Math.min(90, Math.max(20, (renderer.povFov ?? 62) + e.deltaY * 0.03)); }, { passive: true });
canvas.addEventListener('pointerup', (e) => {
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5) return;
  const hit = renderer.pick(e.clientX, e.clientY);
  if (!hit) { ui.hidePick(); return; }
  if (hit.kind === 'graha' && renderer.planets.lons[hit.key] !== undefined) hit.lon = renderer.planets.lons[hit.key];
  // agent C: bodies beyond the navagraha
  if (hit.kind === 'graha' && OUTER_BODIES[hit.key]) { hit.kind = 'outer'; hit.lon = renderer.extra.lons[hit.key]; }
  else if (hit.kind === 'graha' && (MOONS[hit.key] || EXTRA_MOONS[hit.key])) hit.kind = 'moon';
  if (renderer.mode === 'clock' && hit.kind !== 'graha') {
    // a deep interaction on the face just lifts off and locks the target
    ui.showPick(hit, { x: e.clientX, y: e.clientY }, current);
    setMode('sky'); renderer.setLock(hit.kind === 'rashi' ? 'nakshatra' : hit.kind); return;
  }
  ui.showPick(hit, { x: e.clientX, y: e.clientY }, current);
});
addEventListener('keydown', (e) => {
  if (e.target.matches('input, select, textarea')) return;
  if (e.key === 'l' || e.key === 'L') goNow();
  if (e.key === ' ') { e.preventDefault(); setMode(renderer.mode === 'clock' ? 'sky' : 'clock'); }
  if (e.key === 'Escape') ui.hidePick();
});

// ---------- the loop ----------
let current = null, lastT = performance.now(), hudT = 0;
const lerpAng = (a, b, k) => (a === null ? b : norm360(a + (((b - a + 540) % 360) - 180) * k));

function tick(now) {
  const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
  if (S.playing) {
    if (S.speed === 'live') S.jd = nowJd();
    else S.jd += (dt * SPEEDS.find((x) => x.key === S.speed).rate) / 86400;
  }
  const sky = liveSky(S.jd, S.loc);
  const target = S.manual ? { sun: S.manual.sun, moon: S.manual.moon } : { sun: sky.sunLon, moon: sky.moonLon };
  // lerp only the display (smooth slider/preset jumps); the readout uses exact target angles
  const fast = S.playing && ['day', 'month'].includes(S.speed);
  const k = fast ? 1 : 1 - Math.exp(-dt * 10);
  S.shown.sun = lerpAng(S.shown.sun, target.sun, k); S.shown.moon = lerpAng(S.shown.moon, target.moon, k);
  const pan = S.manual ? computePanchangam(target.sun, target.moon, null, sky.day.weekday + 1) : sky.pan;
  const shownPan = computePanchangam(S.shown.sun, S.shown.moon, null, sky.day.weekday + 1);
  current = { ...sky, pan, sunLon: target.sun, moonLon: target.moon, loc: S.loc };

  const info = dayInfo(S.jd);
  const frac = (S.jd - info.day.sunrise) / (info.day.nextSunrise - info.day.sunrise);
  const horaIdx = Math.min(23, Math.floor(frac * 24));
  info.horaLord = (HORA_ORDER.indexOf(VARA_TABLE[info.day.weekday].graha) + horaIdx) % 7;

  hudT += dt;
  if (hudT > 0.25 || !renderer.dialDrawn) {   // HUD text & dial at 4 Hz
    hudT = 0; renderer.dialDrawn = true;
    if (!S.manual) refreshEnds(current);
    ui.renderCards(current, ends, !!S.manual);
    ui.renderConditions(current, ends, info, !!S.manual);
    ui.renderTime(current, info);
    places.tick(S.jd);   // agent A
    const sunsetFrac = (info.day.sunset - info.day.sunrise) / (info.day.nextSunrise - info.day.sunrise);
    const f = (x) => (x - info.day.sunrise) / (info.day.nextSunrise - info.day.sunrise);
    if ($body.classList.contains('sky')) { inset.draw(S.jd, sky.ayanamsa, renderer.lock); ui.renderSkyExtras(current, renderer.planets.eclipse); }
    renderer.wheel.drawDial({ frac, sunsetFrac, rahu: info.rahu.map(f), yama: info.yama.map(f), gulika: info.gulika.map(f), horaIdx, horaCount: 24 });
  }
  ui.renderGeometry(current, !!S.manual);
  buildWindow(info); win.cursor = S.jd; ui.renderTimeline(win);

  renderer.frame({ sunLon: S.shown.sun, moonLon: S.shown.moon, pan: shownPan, gmst: gmstDeg(S.jd), obliquity: obliquity(S.jd), ayanamsa: sky.ayanamsa,
    jd: S.jd, lat: S.loc.lat, lon: S.loc.lon, dayLord: VARA_TABLE[sky.day.weekday].graha }, dt, S.view);
  requestAnimationFrame(tick);
}

function applyModeClasses(m) {
  $body.classList.toggle('sky', m !== 'clock'); $body.classList.toggle('clock', m === 'clock'); $body.classList.toggle('pov', m === 'pov');
}
renderer.onPending = (m) => ui.setActive('[data-mode]', 'mode', m);
function measureSafe() {
  const r = (sel) => document.querySelector(sel).getBoundingClientRect();
  const narrow = innerWidth <= 860;
  const top = r('.topbar').bottom, stageH = document.getElementById('stage').clientHeight;
  renderer.setSafeArea(narrow ? { top, bottom: stageH, left: 0, right: innerWidth }
    : { top, bottom: r('.dock').top, left: r('.cards').right + 10, right: r('.geo').left - 10 });
}
addEventListener('resize', measureSafe);
new ResizeObserver(measureSafe).observe(document.querySelector('.dock'));
measureSafe();

ui.setActive('[data-view]', 'view', 'both');
ui.setActive('[data-speed]', 'speed', 'live');
ui.setActive('[data-domain]', 'domain', 'day');
ui.setActive('[data-script]', 'script', 'dev');
ui.setActive('[data-mode]', 'mode', 'clock');
requestAnimationFrame((t) => { lastT = t; $body.classList.add('ready'); tick(t); });
// agent C: test hook — `?debug` exposes the renderer for headless verification
if (new URLSearchParams(location.search).has('debug')) window.__sky = { renderer };
