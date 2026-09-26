// Places.js — the place-view extras (SPEC §6.1): a second "compare" slot that diffs two skies at the
// same instant, and a small orthographic globe for dropping a pin anywhere on Earth.
// Self-contained: injects its own DOM next to the place chip; App.js calls tick() at the 4 Hz HUD cadence.
import { CITIES } from './PanchangamData.js';
import { liveSky, limbEnd, fmtTime, localParts } from './PanchangamMath.js';
import { g } from './UI.js';

const D2R = Math.PI / 180;
const KINDS = ['tithi', 'nakshatra', 'yoga', 'karana'];
const LABEL = { tithi: 'Tithi', nakshatra: 'Nakṣatra', yoga: 'Yoga', karana: 'Karaṇa' };
const ICON = {
  globe: '<svg viewBox="0 0 256 256"><circle cx="128" cy="128" r="96" fill="none" stroke="currentColor" stroke-width="16"/><path d="M32 128h192M128 32c-32 32-32 160 0 192M128 32c32 32 32 160 0 192" fill="none" stroke="currentColor" stroke-width="14"/></svg>',
  compare: '<svg viewBox="0 0 256 256"><rect x="32" y="48" width="80" height="160" rx="12" fill="none" stroke="currentColor" stroke-width="16"/><rect x="144" y="48" width="80" height="160" rx="12" fill="none" stroke="currentColor" stroke-width="16"/></svg>',
  x: '<svg viewBox="0 0 256 256"><path d="M64 64l128 128M192 64L64 192" stroke="currentColor" stroke-width="18" stroke-linecap="round"/></svg>',
};

export function pinLoc(lat, lon) {
  const f = (v, p, n) => `${Math.abs(v).toFixed(2)}°${v >= 0 ? p : n}`;
  const tz = Math.round((lon / 15) * 2) / 2;
  return { name: `Pin ${f(lat, 'N', 'S')} ${f(lon, 'E', 'W')}`, lat, lon, tz, tzName: `UTC${tz >= 0 ? '+' : '−'}${Math.abs(tz)} approx. solar tz` };
}
const coords = (l) => `${Math.abs(l.lat).toFixed(2)}°${l.lat >= 0 ? 'N' : 'S'} ${Math.abs(l.lon).toFixed(2)}°${l.lon >= 0 ? 'E' : 'W'}`;

/** Orthographic globe on a 2D canvas: graticule, dotted sphere, city dots, two pins. */
class Globe {
  constructor(canvas, onPick) {
    this.cv = canvas; this.c = canvas.getContext('2d'); this.onPick = onPick;
    this.lon0 = 80; this.lat0 = 15; this.pins = {};
    let down = null, moved = false;
    canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); down = [e.clientX, e.clientY]; moved = false; });
    canvas.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - down[0], dy = e.clientY - down[1];
      if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
      this.lon0 -= dx * 0.5; this.lat0 = Math.max(-80, Math.min(80, this.lat0 + dy * 0.5));
      down = [e.clientX, e.clientY]; this.draw();
    });
    canvas.addEventListener('pointerup', (e) => {
      if (down && !moved) { const p = this.unproject(e); if (p) this.onPick(p.lat, p.lon); }
      down = null;
    });
  }
  geom() { const w = this.cv.clientWidth, h = this.cv.clientHeight; return { w, h, cx: w / 2, cy: h / 2, R: Math.min(w, h) / 2 - 6 }; }
  project(lat, lon) {
    const { cx, cy, R } = this.geom(), p = lat * D2R, l = (lon - this.lon0) * D2R, p0 = this.lat0 * D2R;
    const cosc = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l);
    return { x: cx + R * Math.cos(p) * Math.sin(l), y: cy - R * (Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l)), vis: cosc > 0 };
  }
  unproject(e) {
    const r = this.cv.getBoundingClientRect(), { cx, cy, R } = this.geom();
    const x = (e.clientX - r.left - cx) / R, y = -(e.clientY - r.top - cy) / R, rho = Math.hypot(x, y);
    if (rho > 1) return null;
    const c = Math.asin(rho), p0 = this.lat0 * D2R;
    if (rho < 1e-9) return { lat: this.lat0, lon: this.lon0 };
    const lat = Math.asin(Math.cos(c) * Math.sin(p0) + (y * Math.sin(c) * Math.cos(p0)) / rho) / D2R;
    const lon = this.lon0 + Math.atan2(x * Math.sin(c), rho * Math.cos(c) * Math.cos(p0) - y * Math.sin(c) * Math.sin(p0)) / D2R;
    return { lat, lon: ((lon + 540) % 360) - 180 };
  }
  draw() {
    const { cv, c } = this, { w, h, cx, cy, R } = this.geom();
    if (!w) return;
    const dpr = Math.min(devicePixelRatio, 2);
    if (cv.width !== w * dpr) { cv.width = w * dpr; cv.height = h * dpr; }
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
    const sph = c.createRadialGradient(cx - R * 0.35, cy - R * 0.35, R * 0.1, cx, cy, R);
    sph.addColorStop(0, '#24336B'); sph.addColorStop(1, '#0A0D1C');
    c.fillStyle = sph; c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(227,174,74,.45)'; c.lineWidth = 1; c.stroke();
    // dotted sphere
    c.fillStyle = 'rgba(138,145,176,.35)';
    for (let lat = -80; lat <= 80; lat += 10) for (let lon = -180; lon < 180; lon += 10 / Math.max(0.2, Math.cos(lat * D2R))) {
      const p = this.project(lat, lon); if (p.vis) c.fillRect(p.x - 0.5, p.y - 0.5, 1, 1);
    }
    // graticule
    const line = (pts) => { c.beginPath(); let pen = false; for (const [la, lo] of pts) { const p = this.project(la, lo); if (!p.vis) { pen = false; continue; } pen ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y); pen = true; } c.stroke(); };
    c.strokeStyle = 'rgba(227,174,74,.16)';
    for (let lat = -60; lat <= 60; lat += 30) line(Array.from({ length: 73 }, (_, i) => [lat, -180 + i * 5]));
    for (let lon = -180; lon < 180; lon += 30) line(Array.from({ length: 37 }, (_, i) => [-90 + i * 5, lon]));
    c.strokeStyle = 'rgba(227,174,74,.35)'; line(Array.from({ length: 73 }, (_, i) => [0, -180 + i * 5]));
    for (const city of CITIES) {
      const p = this.project(city.lat, city.lon); if (!p.vis) continue;
      c.fillStyle = 'rgba(239,232,216,.75)'; c.beginPath(); c.arc(p.x, p.y, 1.8, 0, Math.PI * 2); c.fill();
    }
    for (const [slot, col] of [['primary', '#F3D491'], ['compare', '#63B8B2']]) {
      const l = this.pins[slot]; if (!l) continue;
      const p = this.project(l.lat, l.lon); if (!p.vis) continue;
      c.fillStyle = col; c.shadowColor = col; c.shadowBlur = 10;
      c.beginPath(); c.arc(p.x, p.y, 4.5, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0;
      c.strokeStyle = col; c.beginPath(); c.arc(p.x, p.y, 8, 0, Math.PI * 2); c.stroke();
    }
  }
}

export class Places {
  /** hooks: { getLoc(), setPrimary(loc) } */
  constructor(hooks) {
    this.h = hooks; this.compare = null; this.slot = 'primary';
    this.cache = { primary: {}, compare: {} };
    const chip = document.querySelector('.place');
    const btns = document.createElement('div'); btns.className = 'place-tools';
    btns.innerHTML = `<button data-pl="globe" title="Drop a pin on the globe">${ICON.globe}<span>Globe</span></button>
      <button data-pl="compare" title="Compare with a second place">${ICON.compare}<span>Compare</span></button>`;
    chip.after(btns);

    this.panel = document.createElement('section'); this.panel.className = 'placepanel';
    this.panel.innerHTML = `<header><span class="cap">Place view</span><button class="icon close" data-pl="close" aria-label="Close">${ICON.x}</button></header>
      <div class="seg small pl-slot"><button data-slot="primary" class="on">Observer</button><button data-slot="compare">Compare with</button></div>
      <canvas class="globe"></canvas>
      <p class="fine">Drag to turn the Earth · click to drop a pin. Pins use an approximate solar time zone (longitude ÷ 15°).</p>
      <label class="pl-row"><span class="cap">Compare with</span><select data-pl="csel"><option value="">— none —</option>${CITIES.map((c, i) => `<option value="${i}">${c.name}</option>`).join('')}</select></label>`;
    document.body.appendChild(this.panel);

    this.strip = document.createElement('section'); this.strip.className = 'cmpstrip';
    document.body.appendChild(this.strip);

    this.globe = new Globe(this.panel.querySelector('.globe'), (lat, lon) => this.drop(lat, lon));
    btns.addEventListener('click', (e) => {
      const b = e.target.closest('[data-pl]'); if (!b) return;
      if (b.dataset.pl === 'globe') this.openPanel('primary');
      else this.openPanel('compare');
    });
    this.panel.addEventListener('click', (e) => {
      if (e.target.closest('[data-pl="close"]')) this.panel.classList.remove('on');
      const s = e.target.closest('[data-slot]'); if (s) this.setSlot(s.dataset.slot);
    });
    this.panel.querySelector('[data-pl="csel"]').addEventListener('change', (e) => {
      this.setCompare(e.target.value === '' ? null : { ...CITIES[+e.target.value] });
    });
    this.strip.addEventListener('click', (e) => { if (e.target.closest('[data-pl="cclose"]')) this.setCompare(null); });
  }

  openPanel(slot) {
    this.panel.classList.add('on'); this.setSlot(slot);
    const l = slot === 'compare' ? this.compare ?? this.h.getLoc() : this.h.getLoc();
    this.globe.lon0 = l.lon; this.globe.lat0 = Math.max(-60, Math.min(60, l.lat));
    requestAnimationFrame(() => this.globe.draw());
  }
  setSlot(slot) {
    this.slot = slot;
    this.panel.querySelectorAll('[data-slot]').forEach((b) => b.classList.toggle('on', b.dataset.slot === slot));
  }
  drop(lat, lon) {
    const loc = pinLoc(lat, lon);
    if (this.slot === 'compare') this.setCompare(loc);
    else {
      const sel = document.querySelector('[data-f="place"]');
      let opt = sel.querySelector('option[value="pin"]');
      if (!opt) { opt = document.createElement('option'); opt.value = 'pin'; sel.insertBefore(opt, sel.querySelector('option[value="geo"]')); }
      opt.textContent = loc.name; sel.value = 'pin';
      this.h.setPrimary(loc);
    }
    this.globe.draw();
  }
  setCompare(loc) {
    this.compare = loc; this.cache.compare = {};
    this.strip.classList.toggle('on', !!loc);
    this.last = '';
    const sel = this.panel.querySelector('[data-pl="csel"]');
    if (!loc) sel.value = ''; else if (loc.name.startsWith('Pin')) sel.value = '';
    this.globe.draw();
  }

  ends(slot, sky) {
    const c = this.cache[slot];
    const key = `${sky.day.y}-${sky.day.m}-${sky.day.d}|${this.locKey(slot)}`;
    if (c.key !== key) { this.cache[slot] = { key }; }
    const cc = this.cache[slot];
    for (const k of KINDS) {
      const idx = sky.pan[k].index, e = cc[k];
      if (!e || e.idx !== idx || sky.jd >= e.end || e.end - sky.jd > 3) cc[k] = { idx, end: limbEnd(k, sky.jd) };
    }
    return cc;
  }
  locKey(slot) { const l = slot === 'compare' ? this.compare : this.h.getLoc(); return l ? `${l.lat},${l.lon},${l.tz}` : ''; }

  /** 4 Hz: redraw pins; recompute and diff the compare strip. `jd` is the shared scrubber instant. */
  tick(jd) {
    const loc = this.h.getLoc();
    this.globe.pins = { primary: loc, compare: this.compare };
    if (this.panel.classList.contains('on') && this.pinsKey !== this.locKey('primary') + this.locKey('compare')) {
      this.pinsKey = this.locKey('primary') + this.locKey('compare'); this.globe.draw();
    }
    if (!this.compare) return;
    const A = liveSky(jd, loc), B = liveSky(jd, this.compare);
    const eA = this.ends('primary', A), eB = this.ends('compare', B);
    const dayStr = (s, l) => { const p = localParts(s.day.sunrise, l.tz); return `${p.d}/${p.m}`; };
    const cell = (s, l, e, k) => `<span class="dv">${s.pan[k].name}</span><em>${s.pan[k].iast.replace(' (Krishna)', '')}</em><small class="mono">ends ${fmtTime(e[k].end, l.tz)}</small>`;
    const rows = [];
    const row = (label, a, b, diff) => rows.push(`<div class="cmp-row${diff ? ' diff' : ''}"><span class="cmp-l">${label}</span><span>${a}</span><span>${b}</span></div>`);
    row(g('sunrise', 'Sunrise'), `<b class="mono">${fmtTime(A.day.sunrise, loc.tz)}</b> · set ${fmtTime(A.day.sunset, loc.tz)}`,
      `<b class="mono">${fmtTime(B.day.sunrise, this.compare.tz)}</b> · set ${fmtTime(B.day.sunset, this.compare.tz)}`, false);
    row(g('vara', 'Vāra'), `<span class="dv">${A.pan.vara.name}</span><em>${A.pan.vara.iast} · day of ${dayStr(A, loc)}</em>`,
      `<span class="dv">${B.pan.vara.name}</span><em>${B.pan.vara.iast} · day of ${dayStr(B, this.compare)}</em>`, A.pan.vara.index !== B.pan.vara.index);
    for (const k of KINDS) row(g(k, LABEL[k]), cell(A, loc, eA, k), cell(B, this.compare, eB, k), A.pan[k].index !== B.pan[k].index);
    const varaNote = A.pan.vara.index !== B.pan.vara.index
      ? `<p class="cmp-note">Different ${g('vara', 'vāra')}: one place has already crossed its ${g('sunrise', 'sunrise')} into the next day.</p>`
      : `<p class="cmp-note">Same instant, same Sun and Moon — the limbs agree; only the local clock times differ.</p>`;
    const html = `<header><span class="cap">Compare · same instant</span><button class="icon close" data-pl="cclose" aria-label="Close compare">${ICON.x}</button></header>
      <div class="cmp-row head"><span></span><span><i class="dot a"></i>${loc.name}<small>${coords(loc)} · ${loc.tzName ?? ''}</small></span><span><i class="dot b"></i>${this.compare.name}<small>${coords(this.compare)} · ${this.compare.tzName ?? ''}</small></span></div>
      ${rows.join('')}${varaNote}`;
    if (html !== this.last) { this.last = html; this.strip.innerHTML = html; }
  }
}
