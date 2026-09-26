// UI.js — HTML overlay: readout cards, sliders + presets, mode/view toggles, place picker,
// the "Sky conditions" dock with the time scrubber, glossary hover and the pick tooltip.
import { GLOSSARY, CITIES, GRAHAS, NAKSHATRA_TABLE, RASHI_TABLE, TITHI_TABLE, TITHI_CATEGORY_INFO, VARA_TABLE, HORA_ORDER, CONSTELLATIONS, STARS } from './PanchangamData.js';
import { ACTIVITIES, scanMonth, DISCLAIMER } from './HolyDays.js';
import { nameHTML } from './Script.js';   // agent B: primary names follow the script preference
const nm = (kind, rec) => nameHTML(kind, rec);
import { fmtTime, fmtDate, fmtDeg, localParts, jdFromLocal, pad2 } from './PanchangamMath.js';

// Phosphor-style inline icons (no emoji anywhere)
const I = {
  sun: '<svg viewBox="0 0 256 256"><circle cx="128" cy="128" r="52" fill="none" stroke="currentColor" stroke-width="16"/><path d="M128 20v28M128 208v28M20 128h28M208 128h28M52 52l20 20M184 184l20 20M52 204l20-20M184 72l20-20" stroke="currentColor" stroke-width="16" stroke-linecap="round"/></svg>',
  moon: '<svg viewBox="0 0 256 256"><path d="M216 150A88 88 0 1 1 106 40a72 72 0 0 0 110 110Z" fill="none" stroke="currentColor" stroke-width="16" stroke-linejoin="round"/></svg>',
  play: '<svg viewBox="0 0 256 256"><path d="M76 44v168l136-84Z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 256 256"><rect x="64" y="44" width="40" height="168" rx="8" fill="currentColor"/><rect x="152" y="44" width="40" height="168" rx="8" fill="currentColor"/></svg>',
  target: '<svg viewBox="0 0 256 256"><circle cx="128" cy="128" r="88" fill="none" stroke="currentColor" stroke-width="16"/><circle cx="128" cy="128" r="36" fill="none" stroke="currentColor" stroke-width="16"/></svg>',
  pin: '<svg viewBox="0 0 256 256"><path d="M128 232s72-64 72-128a72 72 0 0 0-144 0c0 64 72 128 72 128Z" fill="none" stroke="currentColor" stroke-width="16"/><circle cx="128" cy="104" r="24" fill="currentColor"/></svg>',
  x: '<svg viewBox="0 0 256 256"><path d="M64 64l128 128M192 64L64 192" stroke="currentColor" stroke-width="18" stroke-linecap="round"/></svg>',
  caret: '<svg viewBox="0 0 256 256"><path d="M64 160l64-64 64 64" fill="none" stroke="currentColor" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  rocket: '<svg viewBox="0 0 256 256"><path d="M128 24c40 24 56 72 48 120l-20 32h-56l-20-32c-8-48 8-96 48-120Z M100 176l-28 36 44-8M156 176l28 36-44-8" fill="none" stroke="currentColor" stroke-width="14" stroke-linejoin="round"/><circle cx="128" cy="96" r="16" fill="currentColor"/></svg>',
  horizon: '<svg viewBox="0 0 256 256"><path d="M24 168h208M56 200h144" stroke="currentColor" stroke-width="16" stroke-linecap="round"/><path d="M72 168a56 56 0 0 1 112 0" fill="none" stroke="currentColor" stroke-width="16"/></svg>',
  calendar: '<svg viewBox="0 0 256 256"><rect x="40" y="48" width="176" height="168" rx="12" fill="none" stroke="currentColor" stroke-width="16"/><path d="M40 96h176M88 32v32M168 32v32" stroke="currentColor" stroke-width="16" stroke-linecap="round"/><circle cx="128" cy="152" r="14" fill="currentColor"/></svg>',
  arrow: '<svg viewBox="0 0 256 256"><path d="M56 128h144M144 72l56 56-56 56" fill="none" stroke="currentColor" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  left: '<svg viewBox="0 0 256 256"><path d="M160 56l-72 72 72 72" fill="none" stroke="currentColor" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  right: '<svg viewBox="0 0 256 256"><path d="M96 56l72 72-72 72" fill="none" stroke="currentColor" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  clock: '<svg viewBox="0 0 256 256"><circle cx="128" cy="128" r="92" fill="none" stroke="currentColor" stroke-width="16"/><path d="M128 72v56l40 24" fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round"/></svg>',
};

/** Glossary-backed term: dotted underline + plain-language hover. Every UI term goes through here. */
export function g(key, label) {
  if (!GLOSSARY[key]) throw new Error(`glossary entry missing: ${key}`);
  return `<span class="g" data-g="${key}" tabindex="0">${label ?? key}</span>`;
}
/** "22:18", or "11:08 +1d" when the end falls on a later civil date than the cursor. */
function endStamp(jd, s) {
  const a = localParts(s.jd, s.loc.tz), b = localParts(jd, s.loc.tz);
  const days = Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86400000);
  return `${fmtTime(jd, s.loc.tz)}${days > 0 ? ` +${days}d` : ''}`;
}
const DEV_DIGITS = '०१२३४५६७८९';
const dev = (n) => String(n).replace(/\d/g, (d) => DEV_DIGITS[d]);

export const SPEEDS = [
  { key: 'live', label: 'Live', rate: 1 },
  { key: '1x', label: '1×', rate: 1 },
  { key: '60x', label: '60×', rate: 60 },
  { key: '600x', label: '600×', rate: 600 },
  { key: 'day', label: '1 day/s', rate: 86400 },
  { key: 'month', label: '1 month/s', rate: 86400 * 30 },
];
const PRESETS = [
  { key: 'amavasya', label: 'Amāvāsyā', term: 'amavasya', dL: 359.999, sub: 'New Moon' },
  { key: 'q1', label: 'First Quarter', dL: 90, sub: 'ΔL 90°' },
  { key: 'purnima', label: 'Pūrṇimā', term: 'purnima', dL: 179.999, sub: 'Full Moon' },
  { key: 'q3', label: 'Third Quarter', dL: 270, sub: 'ΔL 270°' },
];

function moonPhaseSVG(dL) {
  // terminator as an ellipse: illuminated fraction from elongation, waxing lit on the right
  const k = Math.cos(dL * Math.PI / 180); // 1 new, -1 full
  const rx = Math.abs(k) * 20, waxing = dL < 180;
  const lit = waxing ? 1 : 0;
  const sweepOuter = lit; const sweepInner = k > 0 ? (waxing ? 0 : 1) : (waxing ? 1 : 0);
  return `<svg viewBox="-24 -24 48 48" class="phase"><circle r="20" fill="#141a3a"/>
    <path d="M0 -20 A20 20 0 0 ${sweepOuter} 0 20 A${rx.toFixed(2)} 20 0 0 ${sweepInner} 0 -20Z" fill="#dfe6ee"/>
    <circle r="20" fill="none" stroke="rgba(203,213,222,.35)" stroke-width="1"/></svg>`;
}

export class UI {
  constructor(root, handlers) {
    this.root = root; this.h = handlers;
    root.innerHTML = this.template();
    this.$ = (s) => root.querySelector(s);
    this.$$ = (s) => [...root.querySelectorAll(s)];
    this.tip = document.createElement('div'); this.tip.className = 'gtip'; this.tip.setAttribute('role', 'tooltip'); document.body.appendChild(this.tip);
    this.bind();
    this.last = {};
  }

  template() {
    const card = (k, title, term) => `
      <article class="card" data-card="${k}">
        <header><span class="cap">${g(term, title)}</span><span class="idx mono" data-f="idx"></span></header>
        <div class="dvn" data-f="dv"></div>
        <div class="iast" data-f="iast"></div>
        <div class="meta" data-f="meta"></div>
        <div class="ctx rel-only" data-f="ctx"></div>
        <div class="ends mono" data-f="ends"></div>
        <i class="aus" data-f="aus"></i>
      </article>`;
    return `
    <header class="topbar">
      <div class="brand"><span class="dv-brand">पञ्चाङ्ग</span><span class="brand-t">Panchanga Sky<em>the five limbs of time, made visible</em></span></div>
      <nav class="modes" aria-label="Mode">
        <button class="pill" data-mode="clock">${I.clock}<span>Clock</span></button>
        <button class="liftoff" data-act="lift" title="Lift off into the sky (Space)">${I.rocket}<span>Lift off</span></button>
        <button class="pill" data-mode="sky">${I.target}<span>Sky</span></button>
        <button class="pill" data-mode="pov" title="Stand here: the sky from the selected place">${I.horizon}<span>Stand here</span></button>
      </nav>
      <div class="right">
        <button class="finder-btn" data-act="finder">${I.calendar}<span>Find a day</span></button>
        <div class="seg" role="group" aria-label="View">
          <button data-view="scientific">Scientific</button><button data-view="religious">Religious</button><button data-view="both">Both</button>
        </div>
        <label class="place">${I.pin}<select data-f="place" aria-label="Observer place">${CITIES.map((c, i) => `<option value="${i}">${c.name}</option>`).join('')}<option value="geo">My location…</option></select>
          <span class="mono place-coords" data-f="coords"></span></label>
      </div>
    </header>

    <section class="cards" aria-label="${'Panchangam'} readout">
      <div class="cards-head"><span class="cap">${g('panchangam', 'Pañcāṅga')}</span><span class="ausdot" data-f="ausdot" title="Overall assessment"><i></i><b data-f="ausword"></b></span></div>
      ${card('vara', 'Vāra', 'vara')}${card('tithi', 'Tithi', 'tithi')}${card('nakshatra', 'Nakṣatra', 'nakshatra')}${card('yoga', 'Yoga', 'yoga')}${card('karana', 'Karaṇa', 'karana')}
    </section>

    <aside class="geo" aria-label="Geometry">
      <div class="geo-head"><span class="cap">Two angles drive everything</span><span class="badge" data-f="srcbadge">Live sky</span></div>
      <div class="scriptrow"><span class="cap">${g('script', 'Script')}</span><div class="seg small script" role="group" aria-label="Script"><button data-script="dev" class="sc-dv">देव</button><button data-script="iast">IAST</button><button data-script="ta" class="sc-ta">தமிழ்</button></div></div>
      <label class="slider sun">${I.sun}<span class="sl-name">${g('graha', 'Sūrya')} <i>L☉</i></span><span class="mono sl-val" data-f="sunval"></span>
        <input type="range" min="0" max="359.999" step="0.001" data-f="sun" aria-label="Sun sidereal longitude"></label>
      <label class="slider moon">${I.moon}<span class="sl-name">${g('graha', 'Candra')} <i>L☾</i></span><span class="mono sl-val" data-f="moonval"></span>
        <input type="range" min="0" max="359.999" step="0.001" data-f="moon" aria-label="Moon sidereal longitude"></label>
      <div class="dl"><span>${g('elongation', 'ΔL')} = (L☾ − L☉) mod 360°</span><b class="mono" data-f="dl"></b></div>
      <div class="dl sub"><span>${g('yoga', 'Yoga')} sum (L☉ + L☾) mod 360°</span><b class="mono" data-f="ysum"></b></div>
      <div class="presets">${PRESETS.map((p) => `<button data-preset="${p.key}"><b>${p.term ? g(p.term, p.label) : p.label}</b><small>${p.sub}</small></button>`).join('')}</div>
      <p class="fine">All longitudes ${g('sidereal', 'sidereal')}, ${g('lahiri', 'Lahiri')} ${g('ayanamsha', 'ayanāṃśa')} <span class="mono" data-f="ayan"></span></p>
      <div class="locks sky-only">
        <span class="cap">Camera lock</span>
        <div class="lockrow">${['overview', 'earth', 'sun', 'moon', 'nakshatra', 'tithi', 'yoga', 'karana'].map((k) => `<button data-lock="${k}">${k}</button>`).join('')}</div>
        <div class="lockrow grahas">${['budha', 'shukra', 'mangala', 'guru', 'shani', 'rahu', 'ketu'].map((k) => `<button data-lock="${k}"><i style="background:${GRAHAS[k].color}"></i>${GRAHAS[k].iast}</button>`).join('')}</div>
        <span class="cap">Overlays</span>
        <div class="toggles">${[['constellations', 'Constellations'], ['grahas', 'Navagraha'], ['nakshatra', 'Nakṣatra band'], ['rashi', 'Rāśi wheel']].map(([k, l]) => `<button class="on" data-layer="${k}">${l}</button>`).join('')}</div>
        <div class="inset-wrap"><span class="cap">${g('graha', 'Grahas')} around the Sun</span><canvas class="inset" data-f="inset"></canvas></div>
        <p class="fine eclipse" data-f="eclipse"></p>
      </div>
    </aside>

    <section class="dock" data-open="true" aria-label="Sky conditions and time">
      <button class="dock-tab" data-act="dock">${I.caret}<span>Sky conditions</span></button>
      <div class="dock-body">
        <div class="timebar">
          <div class="now-block">
            <div class="clock-big mono" data-f="clock"></div>
            <div class="clock-sub"><span data-f="date"></span> · <span class="mono" data-f="nazhigai"></span> ${g('nazhigai', 'nāḻigai')} · ${g('hora', 'hora')} <span data-f="hora"></span></div>
          </div>
          <div class="speeds" role="group" aria-label="Playback speed">
            <button class="icon" data-act="play" aria-label="Play or pause">${I.pause}</button>
            ${SPEEDS.map((s) => `<button data-speed="${s.key}">${s.label}</button>`).join('')}
          </div>
          <div class="jump">
            <input type="datetime-local" data-f="dt" aria-label="Jump to date and time" />
            <div class="seg small" role="group" aria-label="Timeline domain" title="Shift+scroll or pinch over the timeline to zoom"><button data-domain="hour">Hour</button><button data-domain="day">Day</button><button data-domain="month">Month</button><button data-domain="year">Year</button></div>
            <button class="nowbtn" data-act="now" title="Snap back to now (L)">Now</button>
          </div>
        </div>
        <div class="timeline" data-f="timeline" aria-label="Scrub time">
          <div class="tl-bands" data-f="bands"></div>
          <div class="tl-ticks" data-f="ticks"></div>
          <div class="tl-marks" data-f="marks"></div>
          <div class="tl-handle" data-f="handle"><i></i></div>
        </div>
        <div class="conds" data-f="conds"></div>
      </div>
    </section>

    <div class="pickbox" data-f="pick" role="dialog" aria-live="polite"></div>
    <div class="pickchip" data-f="chip"></div>
    <aside class="ccard" data-f="ccard" aria-live="polite"></aside>
    <section class="finder" data-f="finder" aria-label="Holy-day finder">
      <header><div><span class="cap">${g('muhurta', 'Muhūrta')} finder</span><h3>When is it traditionally good to…</h3></div>
        <button class="icon close" data-act="finder-close" aria-label="Close">${I.x}</button></header>
      <div class="fcontrols">
        <select data-f="activity" aria-label="Activity">${ACTIVITIES.map((a) => `<option value="${a.key}">${a.label}</option>`).join('')}</select>
        <div class="mnav"><button class="icon" data-act="mprev" aria-label="Previous month">${I.left}</button><b data-f="mlabel"></b><button class="icon" data-act="mnext" aria-label="Next month">${I.right}</button></div>
      </div>
      <div class="fgrid" data-f="fgrid"></div>
      <div class="freason" data-f="freason"><span class="fine">Hover or tap a day to see why. Click “Show in the sky” to scrub there.</span></div>
      <p class="disclaimer">${DISCLAIMER} Rules from Hora <span class="mono">data/rules.json</span>; judged at local ${g('sunrise', 'sunrise')}.</p>
    </section>
    <footer class="credit">Engine &amp; name tables: <b>Hora</b> (srirudrany) · Meeus + Lahiri</footer>`;
  }

  bind() {
    const h = this.h;
    this.$$('[data-mode]').forEach((b) => b.addEventListener('click', () => h.mode(b.dataset.mode)));
    this.$('[data-act="lift"]').addEventListener('click', () => h.mode('toggle'));
    this.$$('[data-view]').forEach((b) => b.addEventListener('click', () => h.view(b.dataset.view)));
    this.$$('[data-preset]').forEach((b) => b.addEventListener('click', () => h.preset(PRESETS.find((p) => p.key === b.dataset.preset).dL)));
    this.$$('[data-speed]').forEach((b) => b.addEventListener('click', () => h.speed(b.dataset.speed)));
    this.$$('[data-domain]').forEach((b) => b.addEventListener('click', () => h.domain(b.dataset.domain)));
    this.$$('[data-script]').forEach((b) => b.addEventListener('click', () => h.script(b.dataset.script)));
    // zoom ladder: shift/ctrl+wheel (trackpad pinch arrives as ctrl+wheel) steps hour ⇄ day ⇄ month ⇄ year
    let zoomT = 0;
    this.$('[data-f="timeline"]').addEventListener('wheel', (e) => {
      if (!e.shiftKey && !e.ctrlKey) return;
      e.preventDefault();
      const now = performance.now(); if (now - zoomT < 280) return; zoomT = now;
      const d = e.deltaY || e.deltaX; if (d) h.zoom(d > 0 ? 1 : -1);
    }, { passive: false });
    this.$$('[data-lock]').forEach((b) => b.addEventListener('click', () => h.lock(b.dataset.lock)));
    this.$('[data-act="play"]').addEventListener('click', () => h.play());
    this.$('[data-act="now"]').addEventListener('click', () => h.now());
    this.$('[data-act="dock"]').addEventListener('click', () => { const d = this.$('.dock'); d.dataset.open = d.dataset.open === 'true' ? 'false' : 'true'; });
    this.$('[data-f="place"]').addEventListener('change', (e) => h.place(e.target.value));
    this.$('[data-f="dt"]').addEventListener('change', (e) => { if (e.target.value) h.jumpLocal(e.target.value); });
    for (const k of ['sun', 'moon']) this.$(`[data-f="${k}"]`).addEventListener('input', (e) => h.slider(k, +e.target.value));

    // scrubber
    const tl = this.$('[data-f="timeline"]');
    const at = (e) => { const r = tl.getBoundingClientRect(); return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)); };
    tl.addEventListener('pointerdown', (e) => { tl.setPointerCapture(e.pointerId); this.scrubbing = true; tl.classList.add('drag'); h.scrub(at(e)); });
    tl.addEventListener('pointermove', (e) => { if (this.scrubbing) h.scrub(at(e)); else this.hoverTimeline(at(e)); });
    const end = () => { this.scrubbing = false; tl.classList.remove('drag'); };
    tl.addEventListener('pointerup', end); tl.addEventListener('pointercancel', end);

    // glossary hover (one shared structure)
    const show = (el) => {
      const key = el.dataset.g; this.tip.innerHTML = `<b>${el.textContent}</b>${GLOSSARY[key]}`;
      const r = el.getBoundingClientRect();
      const x = Math.min(innerWidth - 290, Math.max(10, r.left + r.width / 2 - 140)), y = r.top - 10;
      this.tip.style.transform = `translate3d(${x}px, ${y}px, 0) translateY(-100%)`;
      this.tip.classList.add('on');
    };
    document.addEventListener('pointerover', (e) => { const el = e.target.closest?.('[data-g]'); if (el) show(el); });
    document.addEventListener('pointerout', (e) => { if (e.target.closest?.('[data-g]')) this.tip.classList.remove('on'); });
    document.addEventListener('focusin', (e) => { if (e.target.dataset?.g) show(e.target); });
    document.addEventListener('focusout', () => this.tip.classList.remove('on'));
    this.$('[data-f="pick"]').addEventListener('click', (e) => { if (e.target.closest('[data-act="close"]')) this.hidePick(); });
    this.$$('[data-layer]').forEach((b) => b.addEventListener('click', () => { b.classList.toggle('on'); h.layer(b.dataset.layer, b.classList.contains('on')); }));
    this.$('[data-f="chip"]').addEventListener('click', (e) => { const b = e.target.closest('[data-chip]'); if (b) h.chip(b.dataset.chip, b.dataset.arg); });
    this.$('[data-f="ccard"]').addEventListener('click', (e) => { if (e.target.closest('[data-act="cclose"]')) h.chip('close'); const b = e.target.closest('[data-chip]'); if (b) h.chip(b.dataset.chip, b.dataset.arg); });
    this.$('[data-card="vara"]').addEventListener('click', (e) => { const b = e.target.closest('[data-chip]'); if (b) h.chip(b.dataset.chip, b.dataset.arg); });
    // finder
    const F = this.finder = { y: 0, m: 0, act: 'foundation', days: [] };
    this.$('[data-act="finder"]').addEventListener('click', () => { const on = !this.$('[data-f="finder"]').classList.contains('on'); this.$('[data-f="finder"]').classList.toggle('on', on); if (on) h.finderOpen(); });
    this.$('[data-act="finder-close"]').addEventListener('click', () => this.$('[data-f="finder"]').classList.remove('on'));
    this.$('[data-f="activity"]').addEventListener('change', (e) => { F.act = e.target.value; h.finderOpen(true); });
    this.$('[data-act="mprev"]').addEventListener('click', () => { F.m--; if (F.m < 1) { F.m = 12; F.y--; } h.finderOpen(true); });
    this.$('[data-act="mnext"]').addEventListener('click', () => { F.m++; if (F.m > 12) { F.m = 1; F.y++; } h.finderOpen(true); });
    const grid = this.$('[data-f="fgrid"]');
    grid.addEventListener('pointerover', (e) => { const c = e.target.closest('[data-day]'); if (c) this.finderReason(+c.dataset.day); });
    grid.addEventListener('click', (e) => { const c = e.target.closest('[data-day]'); if (c) this.finderReason(+c.dataset.day, true); });
    this.$('[data-f="freason"]').addEventListener('click', (e) => { const b = e.target.closest('[data-scrub]'); if (b) h.scrubTo(+b.dataset.scrub); });
  }

  hoverTimeline() {}

  setActive(sel, attr, val) { this.$$(sel).forEach((b) => b.classList.toggle('on', b.dataset[attr] === val)); }

  // ---------- readout cards (4 Hz; text only changes when the limb changes → no layout shift) ----------
  setField(card, f, html) {
    const key = `${card}.${f}`;
    if (this.last[key] === html) return;
    this.last[key] = html;
    const el = this.$(`[data-card="${card}"] [data-f="${f}"]`);
    el.innerHTML = html;
    if (f === 'dv') { const c = el.closest('.card'); c.classList.remove('roll'); void c.offsetWidth; c.classList.add('roll'); }
  }

  renderCards(s, ends, manual) {
    const p = s.pan;
    const aus = (card, good) => this.$(`[data-card="${card}"]`).dataset.aus = good ? 'shubha' : 'ashubha';
    const endTxt = (kind) => (manual || !ends[kind] ? '' : `ends ${endStamp(ends[kind], s)}`);

    this.setField('vara', 'idx', dev(p.vara.index));
    this.setField('vara', 'dv', nm('vara', p.vara));
    this.setField('vara', 'iast', `${p.vara.iast} · ${p.vara.day}`);
    this.setField('vara', 'meta', `Lord: ${p.vara.planet} <button class="xlink" data-chip="find" data-arg="${p.vara.graha}">find ${GRAHAS[p.vara.graha].iast} ${I.arrow}</button>`);
    this.setField('vara', 'ctx', p.vara.nature);
    this.setField('vara', 'ends', manual ? 'sunrise-anchored day' : `${g('sunrise', 'sunrise')} ${fmtTime(s.day.sunrise, s.loc.tz)} → ${fmtTime(s.day.nextSunrise, s.loc.tz)}`);
    aus('vara', true);

    const t = p.tithi, cat = TITHI_CATEGORY_INFO[t.category];
    this.setField('tithi', 'idx', dev(t.index));
    this.setField('tithi', 'dv', `${nm('tithi', t)} ${moonPhaseSVG(p.elongation)}`);
    this.setField('tithi', 'iast', `${t.iast.replace(' (Krishna)', '')} · ${g(t.paksha.toLowerCase(), t.paksha)} ${g('paksha', 'pakṣa')}`);
    this.setField('tithi', 'meta', `<span class="chip fam-${t.category}">${cat.name} ${t.category}</span> ${cat.quality}`);
    this.setField('tithi', 'ctx', `Suits: ${t.auspiciousFor.join(', ')}`);
    this.setField('tithi', 'ends', endTxt('tithi'));
    aus('tithi', t.category !== 'Rikta' && t.index !== 30);

    const n = p.nakshatra;
    this.setField('nakshatra', 'idx', `${dev(n.index)} · ${g('pada', 'pada')} ${dev(p.pada)}`);
    this.setField('nakshatra', 'dv', nm('nakshatra', n));
    this.setField('nakshatra', 'iast', `${n.iast} · ${fmtDeg(n.start)}–${fmtDeg(n.end)}`);
    this.setField('nakshatra', 'meta', `<span class="chip nat-${n.nature}">${n.temperament}</span> ${g('temperament', 'nature')}`);
    this.setField('nakshatra', 'ctx', `${g('deity', 'Deity')}: ${n.deity}`);
    this.setField('nakshatra', 'ends', endTxt('nakshatra'));
    aus('nakshatra', !['ugra', 'tiksna'].includes(n.nature));

    const y = p.yoga, sh = y.classification === 'Shubha';
    this.setField('yoga', 'idx', dev(y.index));
    this.setField('yoga', 'dv', nm('yoga', y));
    this.setField('yoga', 'iast', y.iast);
    this.setField('yoga', 'meta', `<span class="chip ${sh ? 'shubha' : 'ashubha'}">${g(sh ? 'shubha' : 'ashubha', y.classification)}</span>`);
    this.setField('yoga', 'ctx', y.nature);
    this.setField('yoga', 'ends', endTxt('yoga'));
    aus('yoga', sh);

    const k = p.karana;
    this.setField('karana', 'idx', dev(k.index));
    this.setField('karana', 'dv', nm('karana', k));
    this.setField('karana', 'iast', `${k.iast} · ${k.animal}`);
    this.setField('karana', 'meta', `<span class="chip ${k.avoid ? 'ashubha' : ''}">${k.type === 'Fixed' ? g('sthira', 'Sthira · Fixed') : g('chara', 'Chara · Movable')}</span> ${k.avoid ? g('vishti', 'avoid') : k.nature}`);
    this.setField('karana', 'ctx', k.application);
    this.setField('karana', 'ends', endTxt('karana'));
    aus('karana', !k.avoid);

    const dot = this.$('[data-f="ausdot"]');
    dot.dataset.aus = p.auspicious ? 'shubha' : 'ashubha';
    const word = `${p.auspicious ? 'Śubha' : 'Aśubha'} · ${p.shubhaCount}/4`;
    if (this.last.aus !== word) { this.last.aus = word; this.$('[data-f="ausword"]').innerHTML = g(p.auspicious ? 'shubha' : 'ashubha', word); }
  }

  renderGeometry(s, manual) {
    const p = s.pan;
    if (!this.dragging) {
      const su = this.$('[data-f="sun"]'), mo = this.$('[data-f="moon"]');
      if (document.activeElement !== su) su.value = s.sunLon;
      if (document.activeElement !== mo) mo.value = s.moonLon;
    }
    const txt = (f, v) => { const el = this.$(`[data-f="${f}"]`); if (el.textContent !== v) el.textContent = v; };
    txt('sunval', `${s.sunLon.toFixed(2)}° · ${p.rashiSun.iast}`);
    txt('moonval', `${s.moonLon.toFixed(2)}° · ${p.rashiMoon.iast}`);
    txt('dl', `${p.elongation.toFixed(3)}°`);
    txt('ysum', `${p.yogaSum.toFixed(3)}°`);
    txt('ayan', `${s.ayanamsa.toFixed(4)}°`);
    const b = this.$('[data-f="srcbadge"]');
    const bt = manual ? 'Manual angles' : 'Live sky'; if (b.textContent !== bt) { b.textContent = bt; b.classList.toggle('manual', manual); }
  }

  renderTime(s, info) {
    const txt = (f, v) => { const el = this.$(`[data-f="${f}"]`); if (el.textContent !== v) el.textContent = v; };
    const lp = localParts(s.jd, s.loc.tz);
    txt('clock', `${pad2(lp.hh)}:${pad2(lp.mm)}:${pad2(lp.ss)}`);
    txt('date', `${fmtDate(s.jd, s.loc.tz)} · ${s.loc.tzName ?? ''}`);
    const nz = (s.jd - s.day.sunrise) / (s.day.nextSunrise - s.day.sunrise) * 60;
    txt('nazhigai', `${pad2(Math.floor(nz))}:${pad2(Math.floor((nz % 1) * 60))}`);
    const hk = HORA_ORDER[info.horaLord];
    txt('hora', `${GRAHAS[hk].iast}`);
    txt('coords', `${Math.abs(s.loc.lat).toFixed(2)}°${s.loc.lat >= 0 ? 'N' : 'S'} ${Math.abs(s.loc.lon).toFixed(2)}°${s.loc.lon >= 0 ? 'E' : 'W'}`);
    const dt = this.$('[data-f="dt"]');
    if (document.activeElement !== dt) dt.value = `${lp.y}-${pad2(lp.m)}-${pad2(lp.d)}T${pad2(lp.hh)}:${pad2(lp.mm)}`;
  }

  /** Timeline: `win` = {start, end, bands:[{a,b,cls,title}], ticks:[{f,major,label}], marks:[{f,cls,title}]} */
  renderTimeline(win) {
    const key = `${win.start}|${win.end}|${win.marks.length}`;
    if (this.last.tl !== key) {
      this.last.tl = key;
      const span = win.end - win.start, pct = (x) => `${(((x - win.start) / span) * 100).toFixed(3)}%`;
      this.$('[data-f="bands"]').innerHTML = win.bands.map((b) => `<i class="${b.cls}" style="left:${pct(b.a)};width:${(((b.b - b.a) / span) * 100).toFixed(3)}%" title="${b.title ?? ''}"></i>`).join('');
      this.$('[data-f="ticks"]').innerHTML = win.ticks.map((t) => `<i class="${t.major ? 'mj' : ''}" style="left:${pct(t.at)}">${t.label ? `<span>${t.label}</span>` : ''}</i>`).join('');
      this.$('[data-f="marks"]').innerHTML = win.marks.map((m) => `<i class="${m.cls}" style="left:${pct(m.at)}" title="${m.title}"><span>${m.label ?? ''}</span></i>`).join('');
    }
    const f = Math.min(1, Math.max(0, (win.cursor - win.start) / (win.end - win.start)));
    const hd = this.$('[data-f="handle"]');
    const w = this.$('[data-f="timeline"]').clientWidth;
    hd.style.transform = `translate3d(${(f * w).toFixed(1)}px,0,0)`;
  }

  renderConditions(s, ends, info, manual) {
    const p = s.pan, tz = s.loc.tz;
    const e = (k) => (manual || !ends[k] ? '—' : endStamp(ends[k], s));
    const row = (term, label, dv, name, end, chip = '') => `<div class="crow"><span class="cl">${g(term, label)}</span><span class="cd">${dv}</span><span class="cn">${name}</span><span class="ce mono">${end === null ? '' : `ends ${end}`}</span><span class="cc">${chip}</span></div>`;
    const phase = p.elongation < 3 || p.elongation > 357 ? 'New' : Math.abs(p.elongation - 180) < 3 ? 'Full' : p.elongation < 180 ? 'Waxing' : 'Waning';
    const html = [
      row('tithi', 'Tithi', nm('tithi', p.tithi), `${p.tithi.iast.replace(' (Krishna)', '')} · ${p.tithi.paksha}`, e('tithi')),
      row('nakshatra', 'Nakṣatra', nm('nakshatra', p.nakshatra), p.nakshatra.iast, e('nakshatra')),
      row('yoga', 'Yoga', nm('yoga', p.yoga), p.yoga.iast, e('yoga'), `<span class="chip ${p.yoga.classification === 'Shubha' ? 'shubha' : 'ashubha'}">${p.yoga.classification}</span>`),
      row('karana', 'Karaṇa', nm('karana', p.karana), p.karana.iast, e('karana'), `<span class="chip ${p.karana.avoid ? 'ashubha' : ''}">${p.karana.type}</span>`),
      row('vara', 'Vāra', nm('vara', p.vara), `${p.vara.iast} (${p.vara.day.slice(0, 3)})`, null),
      `<div class="crow foot mono">${g('sunrise', 'Sunrise')} ${fmtTime(s.day.sunrise, tz)} · Sunset ${fmtTime(s.day.sunset, tz)} · Moon: ${phase} ·
        ${g('rahukalam', 'Rāhu kālam')} ${fmtTime(info.rahu[0], tz)}–${fmtTime(info.rahu[1], tz)} · ${g('yamagandam', 'Yamagaṇḍam')} ${fmtTime(info.yama[0], tz)}–${fmtTime(info.yama[1], tz)} ·
        ${g('abhijit', 'Abhijit')} ${fmtTime(info.abhijit[0], tz)}–${fmtTime(info.abhijit[1], tz)}</div>`,
    ].join('');
    if (this.last.conds !== html) { this.last.conds = html; this.$('[data-f="conds"]').innerHTML = html; }
  }

  // ---------- pick tooltip (Devanagari-first, one "why it matters" line, coordinates tie myth to math) ----------
  showPick(hit, at, s) {
    let h = '', chip = '';
    if (hit.kind === 'graha') {
      if (hit.key === 'earth') {
        h = `<h4><span class="dv">पृथ्वी</span> Pṛthvī</h4><p class="w">Earth — the fixed centre of this geocentric stage</p><p>The Panchangam is Earth-centred time: every limb is an angle measured from here.</p>`;
      } else {
        const G = GRAHAS[hit.key], lon = hit.key === 'surya' ? s.sunLon : hit.key === 'chandra' ? s.moonLon : hit.lon;
        const vara = G.vara ? VARA_TABLE[G.vara - 1] : null;
        const approx = ['surya', 'chandra'].includes(hit.key) ? '' : ' (approximate)';
        h = `<h4><span class="dv">${G.name}</span> ${G.iast}</h4><p class="w">${G.western}${['rahu', 'ketu'].includes(hit.key) ? ` · ${g(hit.key, 'shadow graha')}` : ''}</p><p>${G.science}</p><p class="myth">${G.myth}</p>
          <p class="co mono">${g('sidereal', 'Sidereal')} λ ${fmtDeg(lon)}${approx} · ${RASHI_TABLE[Math.floor(lon / 30)].iast}${vara ? ` · rules ${vara.iast}` : ''}</p>`;
        const today = vara && s.pan.vara.index === vara.index;
        chip = ['rahu', 'ketu'].includes(hit.key)
          ? `<button data-chip="system" data-arg="${hit.key}">Lunar nodes · ${g('eclipse', 'eclipses')} — view ${I.arrow}</button>`
          : `<button data-chip="system" data-arg="${hit.key}">Solar System — view ${I.arrow}</button>${today ? `<button data-chip="find" data-arg="${hit.key}">${G.iast} rules today</button>` : ''}`;
      }
    } else if (hit.kind === 'star') {
      const st = hit.star, n = NAKSHATRA_TABLE[hit.nak - 1], C = CONSTELLATIONS[st.constellation];
      h = `<h4><span class="dv">${st.yogatara ? n.name : '★'}</span> ${st.name}</h4><p class="w">${st.bayer} · ${st.constellation} · mag ${st.mag.toFixed(2)}</p>
        <p>${st.yogatara ? `The ${g('yogatara', 'yogatārā')} of ${n.iast} — ${n.deity}, ${n.temperament.toLowerCase()}.` : `Sits over the ${n.iast} sector of the ecliptic (${n.deity}).`}</p>
        <p class="co mono">${g('ecliptic', 'Ecliptic')} λ ${fmtDeg(hit.lon)} β ${hit.lat.toFixed(1)}° · ${g('sidereal', 'sidereal')}</p>`;
      chip = `<button data-chip="constellation" data-arg="${C ? st.constellation : ''}|${hit.nak}">Part of ${n.iast}${C ? ` (${st.constellation})` : ''} — view ${I.arrow}</button>`;
    } else if (hit.kind === 'nakshatra') {
      const n = NAKSHATRA_TABLE[hit.index - 1];
      h = `<h4><span class="dv">${nm('nakshatra', n)}</span> ${n.iast}</h4><p class="w">${g('nakshatra', 'Nakṣatra')} ${n.index} of 27</p>
        <p>${g('deity', 'Deity')}: ${n.deity} · ${g('temperament', 'Temperament')}: ${n.temperament}</p>
        <p class="co mono">${g('ecliptic', 'Ecliptic')} ${fmtDeg(n.start)}–${fmtDeg(n.end)} · ${RASHI_TABLE[Math.floor(n.start / 30)].iast}</p>`;
    } else if (hit.kind === 'rashi') {
      const r = RASHI_TABLE[hit.index - 1];
      h = `<h4><span class="dv">${nm('rashi', r)}</span> ${r.iast}</h4><p class="w">${r.western} · ${g('rashi', 'Rāśi')} ${r.index} of 12</p>
        <p>Ruled by ${r.lord}.</p><p class="co mono">${g('ecliptic', 'Ecliptic')} ${r.start}°–${r.start + 30}°</p>`;
    } else if (hit.kind === 'tithi') {
      const t = TITHI_TABLE[hit.index - 1];
      h = `<h4><span class="dv">${nm('tithi', t)}</span> ${t.iast}</h4><p class="w">${g('tithi', 'Tithi')} ${t.index} · ${t.paksha} · ${t.category}</p>
        <p>Traditionally suits ${t.auspiciousFor.join(', ').toLowerCase()}.</p><p class="co mono">${g('elongation', 'ΔL')} ${(t.index - 1) * 12}°–${t.index * 12}°</p>`;
    }
    const box = this.$('[data-f="pick"]');
    box.innerHTML = `<button class="icon close" data-act="close" aria-label="Close">${I.x}</button>${h}`;
    const x = Math.min(innerWidth - 340, Math.max(12, at.x + 18)), y = Math.min(innerHeight - 220, Math.max(70, at.y - 40));
    box.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    box.classList.add('on');
    const ch = this.$('[data-f="chip"]');
    ch.innerHTML = chip;
    requestAnimationFrame(() => { const hgt = box.offsetHeight; ch.style.transform = `translate3d(${x}px, ${y + hgt + 8}px, 0)`; ch.classList.toggle('on', !!chip); });
  }
  hidePick() { this.$('[data-f="pick"]').classList.remove('on'); this.$('[data-f="chip"]').classList.remove('on'); }

  /** Constellation / system card — the second hop of the two-stage tooltip. */
  showCard(kind, arg, s) {
    const el = this.$('[data-f="ccard"]');
    let h = '';
    if (kind === 'constellation') {
      const [name, nakIdx] = arg.split('|'), n = NAKSHATRA_TABLE[(+nakIdx || 1) - 1], C = CONSTELLATIONS[name];
      const members = STARS.filter((st) => st.constellation === name);
      h = `<span class="cap">${name ? 'Constellation' : g('nakshatra', 'Nakṣatra')}</span><h3>${name || n.iast}${name ? ` <small>· ${n.iast}</small>` : ''}</h3>
        <p class="dvrow"><span class="dv">${n.name}</span> ${g('nakshatra', 'nakṣatra')} ${n.index} · ${g('deity', 'deity')} ${n.deity} · ${n.temperament}</p>
        ${C ? `<p>${C.note}</p>` : '<p>No western stick figure is drawn here; the sector is shown on the gold band.</p>'}
        ${members.length ? `<p class="members">${members.map((m) => `<span class="${m.yogatara ? 'yt' : ''}">${m.name}</span>`).join('')}</p>` : ''}
        <p class="co mono">${g('ecliptic', 'Ecliptic')} ${fmtDeg(n.start)}–${fmtDeg(n.end)}</p>`;
    } else if (kind === 'system') {
      const G = GRAHAS[arg], node = ['rahu', 'ketu'].includes(arg);
      h = node ? `<span class="cap">${g('rahu', 'Lunar nodes')}</span><h3>Rāhu · Ketu</h3>
          <p>The Moon's orbit is tilted 5° to the ecliptic; it crosses it at two points 180° apart. ${g('eclipse', 'Eclipses')} happen only when a new or full Moon falls near one of them — the swallowing of the myth.</p>
          <p class="co mono">Rāhu λ ${fmtDeg(s.rahu)} · Ketu λ ${fmtDeg((s.rahu + 180) % 360)} · regress ~19.3°/yr</p>`
        : `<span class="cap">Solar System</span><h3>${G.iast} <small>· ${G.western}</small></h3>
          <p>${G.science}</p><p class="myth">${G.myth}</p>
          <p>The inset in the sky panel shows it around the Sun — distances log-compressed, <b>not to scale</b>.${arg === 'guru' ? ' Lock on Guru to see the four Galilean moons.' : arg === 'shani' ? ' Lock on Shani to see its rings.' : ''}</p>
          <button class="xlink" data-chip="find" data-arg="${arg}">Lock camera on ${G.iast} ${I.arrow}</button>`;
    }
    el.innerHTML = `<button class="icon close" data-act="cclose" aria-label="Close">${I.x}</button>${h}`;
    el.classList.add('on');
  }
  hideCard() { this.$('[data-f="ccard"]').classList.remove('on'); }

  renderSkyExtras(s, eclipse) {
    const e = this.$('[data-f="eclipse"]');
    const txt = eclipse ? `The Sun is near ${GRAHAS[eclipse.node].iast} — eclipse season${s.pan.elongation < 15 || s.pan.elongation > 345 ? ' (new Moon: solar eclipse possible)' : Math.abs(s.pan.elongation - 180) < 15 ? ' (full Moon: lunar eclipse possible)' : ''}` : '';
    if (e.textContent !== txt) e.textContent = txt;
  }

  // ---------- holy-day finder ----------
  renderFinder(days, y, m, loc) {
    const F = this.finder; F.days = days; F.loc = loc;
    this.$('[data-f="mlabel"]').textContent = new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    const lead = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
    const head = ['Ravi', 'Soma', 'Maṅgala', 'Budha', 'Guru', 'Śukra', 'Śani'].map((d) => `<span class="wd">${d}</span>`).join('');
    const cells = Array.from({ length: lead }, () => '<i></i>').join('') + days.map((d) =>
      `<button class="fday v-${d.verdict}" data-day="${d.d}"><b>${d.d}</b><span class="dv">${d.limbs.nak.name}</span><small>${d.limbs.tithi.iast.replace(' (Krishna)', '').slice(0, 9)}</small></button>`).join('');
    this.$('[data-f="fgrid"]').innerHTML = head + cells;
  }
  finderReason(d, pin) {
    const F = this.finder, day = F.days.find((x) => x.d === d); if (!day) return;
    if (F.pinned && !pin) return; if (pin) F.pinned = d;
    const verdict = { fav: 'Traditionally favourable', neutral: 'Neutral', avoid: 'Commonly avoided' }[day.verdict];
    this.$$('.fday').forEach((b) => b.classList.toggle('sel', +b.dataset.day === d));
    this.$('[data-f="freason"]').innerHTML = `<div class="frhead"><b class="v-${day.verdict}">${d} · ${verdict}</b><button class="xlink" data-scrub="${day.jd}">Show in the sky ${I.arrow}</button></div>
      <div class="fchips">${day.chips.map((c) => `<span class="chip ${c.tone === 'fav' ? 'shubha' : c.tone === 'avoid' ? 'ashubha' : ''}"><em>${c.limb}</em> ${c.text}</span>`).join('')}</div>`;
  }

  setPlaying(playing) { this.$('[data-act="play"]').innerHTML = playing ? I.pause : I.play; }
}
