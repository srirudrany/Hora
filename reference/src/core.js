// ===== core: utilities, palette, textures, reusable 3D objects =====
const P = window.Panchanga, T = THREE;
const W = 1280, H = 720, D2R = Math.PI / 180;
const Q = new URLSearchParams(location.search);
const CAPTURE = Q.has('capture');
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const seg = (x, a, b) => clamp((x - a) / (b - a));
const pulse = (x, a, b, f = 0.5) => sm(a, a + f, x) * (1 - sm(b - f, b, x));
function rng(seed) { return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const $ = (s, el = document) => el.querySelector(s);

const COL = { ink: '#0A0D1C', lapis: '#16204A', lapis2: '#24336B', gold: '#E3AE4A', goldSoft: '#F3D491', star: '#EFE8D8',
  moon: '#CBD5DE', kumkum: '#D9483E', copper: '#C07A43', teal: '#63B8B2', plum: '#8F6BB8', muted: '#8A91B0', leaf: '#7FB069' };
const F = { skt: "'TiroSkt', 'Noto Serif', serif", ta: "'TiroTa', 'TiroSkt', serif", sans: "'NotoS', system-ui, sans-serif", mono: "'Plex', ui-monospace, monospace" };

// ---------- film-day data (Chennai, 26 Sep 2026) ----------
const LOC = { name: 'Chennai', lat: 13.0827, lon: 80.2707, tz: 5.5 };
const PD = P.panchanga(2026, 9, 26, LOC);
const JD0 = PD.sunrise;
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function civ(jd, tz = LOC.tz) { const d = P.dateFromJd(jd + tz / 24); return { h: d.getUTCHours(), m: d.getUTCMinutes(), d: d.getUTCDate(), mo: d.getUTCMonth(), y: d.getUTCFullYear(), wd: d.getUTCDay() }; }
function fmt12(jd, tz = LOC.tz) { const c = civ(jd + 1 / 86400, tz); let h = c.h % 12; if (!h) h = 12; return `${h}:${String(c.m).padStart(2, '0')} ${c.h < 12 ? 'am' : 'pm'}`; }
function fmtDate(jd, tz = LOC.tz) { const c = civ(jd, tz); return `${c.d} ${MON[c.mo]}`; }
function vinazh(jd, sr) { return Math.round((jd - sr) * 86400 / 24); }
function nzStr(jd, sr) { const v = vinazh(jd, sr); return `${Math.floor(v / 60)} nāḻigai ${v % 60} vināḻigai`; }
function degStr(x) { const d = Math.floor(x), m = Math.round((x - d) * 60); return m === 60 ? `${d + 1}°00′` : `${d}°${String(m).padStart(2, '0')}′`; }

// ---------- canvas helpers ----------
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
let MAXANISO = 1;
function tex(c) { const t = new T.CanvasTexture(c); t.anisotropy = MAXANISO; t.needsUpdate = true; return t; }
function fontPx(f) { return parseFloat(f.match(/([\d.]+)px/)[1]); }
// lines: [{t, f, c}]
function textCanvas(lines, o = {}) {
  const pad = o.pad ?? 14; const c = mkCanvas(8, 8); let g = c.getContext('2d');
  let w = 0, h = pad * 2; const lh = [];
  for (const L of lines) { g.font = L.f; w = Math.max(w, g.measureText(L.t).width); const x = fontPx(L.f) * (L.lh || 1.3); lh.push(x); h += x; }
  c.width = Math.ceil(w + pad * 2); c.height = Math.ceil(h); g = c.getContext('2d');
  let y = pad;
  lines.forEach((L, i) => {
    g.font = L.f; g.textBaseline = 'middle'; g.textAlign = o.align || 'center';
    const x = o.align === 'left' ? pad : o.align === 'right' ? c.width - pad : c.width / 2;
    g.shadowColor = 'rgba(3,5,14,0.9)'; g.shadowBlur = o.shadow ?? 10; g.fillStyle = L.c || COL.star;
    g.fillText(L.t, x, y + lh[i] / 2); y += lh[i];
  });
  return c;
}
function label(lines, worldH, o = {}) {
  const c = textCanvas(lines, o); const m = new T.SpriteMaterial({ map: tex(c), transparent: true, depthWrite: false, depthTest: o.depthTest ?? false });
  const s = new T.Sprite(m); const k = worldH / c.height; s.scale.set(c.width * k, c.height * k, 1);
  if (o.center) s.center.set(o.center[0], o.center[1]);
  s.renderOrder = 10; return s;
}
function glowCanvas(stops) {
  const c = mkCanvas(256, 256), g = c.getContext('2d'); const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  stops.forEach(([o, col]) => gr.addColorStop(o, col)); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); return c;
}
let TX = {};
function initTextures() {
  TX.dot = tex(glowCanvas([[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,0.8)'], [0.6, 'rgba(255,255,255,0.12)'], [1, 'rgba(255,255,255,0)']]));
  TX.glow = tex(glowCanvas([[0, 'rgba(255,236,190,1)'], [0.12, 'rgba(255,214,140,0.85)'], [0.35, 'rgba(240,160,70,0.22)'], [1, 'rgba(200,110,40,0)']]));
  TX.soft = tex(glowCanvas([[0, 'rgba(255,255,255,0.9)'], [0.4, 'rgba(255,255,255,0.25)'], [1, 'rgba(255,255,255,0)']]));
  TX.earth = tex(earthCanvas(false)); TX.earthGlow = tex(earthCanvas(true));
  TX.moon = tex(moonCanvas());
  TX.zodiac = tex(zodiacCanvas('nak'));
  TX.nature = tex(zodiacCanvas('nature'));
  TX.yoga = tex(zodiacCanvas('yoga'));
  TX.tithiDial = tex(tithiDialCanvas());
}

// ---------- Earth (stylised lapis instrument globe) ----------
const INDIA = [[68.2,23.7],[69.1,22.4],[70.0,21.0],[72.6,21.3],[72.8,19.0],[73.3,17.0],[73.8,15.4],[74.5,13.5],[75.2,11.8],[76.2,10.0],[76.9,8.5],[77.5,8.1],[78.2,8.9],[79.1,9.3],[79.3,10.3],[79.9,10.8],[80.0,12.0],[80.3,13.1],[80.1,15.2],[81.2,16.3],[82.3,16.6],[83.4,17.7],[85.0,19.3],[86.5,20.0],[87.0,21.5],[88.2,21.7],[89.0,21.9],[90.5,22.5],[91.8,22.3],[92.3,20.7],[92.6,21.9],[92.5,24.0],[94.0,25.0],[95.5,27.5],[97.0,28.3],[93.0,28.5],[91.0,28.0],[88.0,27.8],[85.0,28.2],[82.0,29.8],[80.0,30.5],[78.5,32.0],[77.5,35.0],[75.0,36.5],[72.5,36.0],[71.0,34.0],[70.5,33.0],[69.5,30.0],[67.5,28.0],[66.5,25.5],[67.2,24.8]];
const LANKA = [[79.9,9.8],[80.9,9.0],[81.9,7.5],[81.6,6.4],[80.6,5.9],[80.0,6.7],[79.8,8.2]];
function earthCanvas(glowOnly) {
  const w = 2048, h = 1024, c = mkCanvas(w, h), g = c.getContext('2d');
  const X = (lon) => (lon + 180) / 360 * w, Y = (lat) => (90 - lat) / 180 * h;
  if (!glowOnly) {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1d2b5c'); gr.addColorStop(0.5, '#243a78'); gr.addColorStop(1, '#1d2b5c');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const r = rng(11); // soft cloud-like mottling
    for (let i = 0; i < 900; i++) { const x = r() * w, y = h * (0.1 + 0.8 * r()), rr = 8 + r() * 40; g.fillStyle = `rgba(120,150,210,${0.02 + r() * 0.03})`; g.beginPath(); g.ellipse(x, y, rr * 2.2, rr * 0.6, 0, 0, 7); g.fill(); }
    for (const poly of [INDIA, LANKA]) { g.beginPath(); poly.forEach(([lo, la], i) => i ? g.lineTo(X(lo), Y(la)) : g.moveTo(X(lo), Y(la))); g.closePath(); g.fillStyle = '#5a6a8e'; g.fill(); g.lineWidth = 3; g.strokeStyle = 'rgba(243,212,145,0.55)'; g.stroke(); }
  } else { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); }
  g.strokeStyle = glowOnly ? 'rgba(227,174,74,0.55)' : 'rgba(243,212,145,0.28)'; g.lineWidth = 2;
  for (let lon = -180; lon <= 180; lon += 15) { g.beginPath(); g.moveTo(X(lon), 0); g.lineTo(X(lon), h); g.stroke(); }
  for (let lat = -75; lat <= 75; lat += 15) { g.beginPath(); g.moveTo(0, Y(lat)); g.lineTo(w, Y(lat)); g.stroke(); }
  g.lineWidth = 4; g.strokeStyle = glowOnly ? 'rgba(227,174,74,0.8)' : 'rgba(243,212,145,0.5)'; g.beginPath(); g.moveTo(0, Y(0)); g.lineTo(w, Y(0)); g.stroke();
  if (glowOnly) for (const poly of [INDIA, LANKA]) { g.beginPath(); poly.forEach(([lo, la], i) => i ? g.lineTo(X(lo), Y(la)) : g.moveTo(X(lo), Y(la))); g.closePath(); g.lineWidth = 3; g.strokeStyle = 'rgba(243,212,145,0.7)'; g.stroke(); }
  return c;
}
function lonlat(lon, lat, r = 1) { return new T.Vector3(r * Math.cos(lat * D2R) * Math.cos(lon * D2R), r * Math.sin(lat * D2R), -r * Math.cos(lat * D2R) * Math.sin(lon * D2R)); }
function makeEarth(r = 1) {
  const grp = new T.Group();
  const m = new T.MeshStandardMaterial({ map: TX.earth, emissiveMap: TX.earthGlow, emissive: new T.Color(1, 1, 1), emissiveIntensity: 0.35, roughness: 0.85, metalness: 0 });
  const s = new T.Mesh(new T.SphereGeometry(r, 96, 64), m); grp.add(s);
  const atm = new T.Mesh(new T.SphereGeometry(r * 1.06, 64, 48), new T.ShaderMaterial({
    transparent: true, depthWrite: false, side: T.BackSide, blending: T.AdditiveBlending,
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
    fragmentShader: 'varying vec3 vN; varying vec3 vV; void main(){ float f=pow(1.0-abs(dot(vN,vV)),2.2); gl_FragColor=vec4(0.35,0.55,1.0,1.0)*f*0.9; }'
  }));
  grp.add(atm); grp.userData.mat = m; return grp;
}
// ---------- Moon ----------
function moonCanvas() {
  const w = 1024, h = 512, c = mkCanvas(w, h), g = c.getContext('2d'); g.fillStyle = '#b9b5ab'; g.fillRect(0, 0, w, h);
  const r = rng(5);
  for (let i = 0; i < 26; i++) { const x = r() * w, y = h * (0.2 + 0.55 * r()), rr = 30 + r() * 90; const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, 'rgba(70,72,80,0.55)'); gr.addColorStop(1, 'rgba(70,72,80,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rr * 1.4, rr, 0, 0, 7); g.fill(); }
  for (let i = 0; i < 420; i++) { const x = r() * w, y = r() * h, rr = 1.5 + Math.pow(r(), 3) * 16; g.strokeStyle = `rgba(230,228,220,${0.25 + r() * 0.3})`; g.lineWidth = 1 + rr * 0.15; g.beginPath(); g.arc(x, y, rr, 0.6, 3.6); g.stroke(); g.strokeStyle = 'rgba(60,60,64,0.35)'; g.beginPath(); g.arc(x, y, rr, 3.6, 6.9); g.stroke(); }
  return c;
}
function makeMoon(r = 0.27) { return new T.Mesh(new T.SphereGeometry(r, 64, 48), new T.MeshStandardMaterial({ map: TX.moon, roughness: 1, metalness: 0 })); }
function makeSun(r = 0.5, glow = 9) {
  const grp = new T.Group();
  grp.add(new T.Mesh(new T.SphereGeometry(r, 48, 32), new T.MeshBasicMaterial({ color: 0xffe2a0 })));
  const sp = new T.Sprite(new T.SpriteMaterial({ map: TX.glow, blending: T.AdditiveBlending, transparent: true, depthWrite: false }));
  sp.scale.setScalar(r * glow); grp.add(sp); grp.userData.glow = sp; return grp;
}
function makeStars(seed = 7) {
  const r = rng(seed), grp = new T.Group(); const R = 420; const buckets = [[[], []], [[], []], [[], []]];
  const push = (v, k, bright) => { const t = r(); const c = t < 0.14 ? [0.72, 0.8, 1] : t < 0.3 ? [1, 0.86, 0.7] : [1, 0.97, 0.92]; buckets[k][0].push(v.x, v.y, v.z); buckets[k][1].push(c[0] * bright, c[1] * bright, c[2] * bright); };
  for (let i = 0; i < 3400; i++) { const u = r() * 2 - 1, th = r() * 6.2832, s = Math.sqrt(1 - u * u); const v = new T.Vector3(R * s * Math.cos(th), R * u, R * s * Math.sin(th)); const m = r(); const k = m < 0.82 ? 0 : m < 0.975 ? 1 : 2; push(v, k, k ? 0.65 + 0.35 * r() : 0.25 + 0.45 * r()); }
  const q = new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0.4).normalize(), 62 * D2R);
  for (let i = 0; i < 4200; i++) { const th = r() * 6.2832; const gs = (r() + r() + r() - 1.5) * 0.16; const v = new T.Vector3(Math.cos(th) * Math.cos(gs), Math.sin(gs), Math.sin(th) * Math.cos(gs)).multiplyScalar(R).applyQuaternion(q); push(v, 0, 0.12 + 0.3 * r()); }
  buckets.forEach(([p, c], k) => {
    const gg = new T.BufferGeometry(); gg.setAttribute('position', new T.Float32BufferAttribute(p, 3)); gg.setAttribute('color', new T.Float32BufferAttribute(c, 3));
    const m = new T.PointsMaterial({ size: [1.5, 2.6, 4.2][k], sizeAttenuation: false, vertexColors: true, map: TX.dot, transparent: true, depthWrite: false, blending: T.AdditiveBlending });
    m.userData.base = m.size; STARMATS.push(m); grp.add(new T.Points(gg, m));
  });
  return grp;
}
const STARMATS = [];
// flat annulus sector in the XZ plane (λ counter-clockwise from +x seen from above)
function sector(r0, r1, a0, a1, color, op = 0.35, add = true) {
  const m = new T.Mesh(new T.RingGeometry(r0, r1, Math.max(8, Math.ceil(Math.abs(a1 - a0) / 2)), 1, a0 * D2R, (a1 - a0) * D2R),
    new T.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false, side: T.DoubleSide, blending: add ? T.AdditiveBlending : T.NormalBlending }));
  m.rotation.x = -Math.PI / 2; return m;
}
function setSector(m, r0, r1, a0, a1) { m.geometry.dispose(); m.geometry = new T.RingGeometry(r0, r1, Math.max(8, Math.ceil(Math.abs(a1 - a0) / 2)), 1, a0 * D2R, Math.max(0.0001, (a1 - a0)) * D2R); }
function ringLine(r, color, op = 0.6, tube = 0.02, seg = 256) {
  const m = new T.Mesh(new T.TorusGeometry(r, tube, 6, seg), new T.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false }));
  m.rotation.x = Math.PI / 2; return m;
}
function rod(color, op = 1, rad = 0.02) { // unit rod along +y from origin; place with setRod
  const g = new T.CylinderGeometry(rad, rad, 1, 8, 1); g.translate(0, 0.5, 0);
  return new T.Mesh(g, new T.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false }));
}
const _up = new T.Vector3(0, 1, 0);
function setRod(m, a, b) { const d = new T.Vector3().subVectors(b, a); const L = d.length(); m.position.copy(a); m.scale.set(1, Math.max(L, 1e-4), 1); if (L > 1e-6) m.quaternion.setFromUnitVectors(_up, d.normalize()); }
const onRing = (r, lamDeg, y = 0) => new T.Vector3(r * Math.cos(lamDeg * D2R), y, -r * Math.sin(lamDeg * D2R));
function camOrbit(cam, tgt, dist, az, el) { cam.position.set(tgt.x + dist * Math.cos(el * D2R) * Math.cos(az * D2R), tgt.y + dist * Math.sin(el * D2R), tgt.z - dist * Math.cos(el * D2R) * Math.sin(az * D2R)); cam.lookAt(tgt); }
function shiftView(cam, dx = 0, dy = 0) { cam.setViewOffset(W, H, dx, dy, W, H); }
function setOpacity(obj, op) { obj.traverse((o) => { if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach((m) => { if (m.userData.op === undefined) m.userData.op = m.opacity; m.transparent = true; m.opacity = m.userData.op * op; }); } }); obj.visible = op > 0.002; }

// ---------- ring textures (zodiac / nature / yoga) ----------
const ZR = { outer: 10.5, ta0: 6.0, ta1: 7.0, ra0: 7.0, ra1: 8.4, nk0: 8.4, nk1: 10.5 };
const NATURE = { dhruva: [3, 11, 20, 25], cara: [6, 14, 21, 22, 23], ksipra: [0, 7, 12], mrdu: [4, 13, 16, 26], ugra: [1, 9, 10, 19, 24], tiksna: [5, 8, 17, 18], misra: [2, 15] };
const NATCOL = { dhruva: '#3E7F7A', cara: '#3C5FA8', ksipra: '#C9962F', mrdu: '#A0698F', ugra: '#A63A32', tiksna: '#6B3A7E', misra: '#6E7488' };
const NATNAME = { dhruva: ['Dhruva', 'fixed'], cara: ['Cara', 'movable'], ksipra: ['Kṣipra', 'swift'], mrdu: ['Mṛdu', 'soft'], ugra: ['Ugra', 'fierce'], tiksna: ['Tīkṣṇa', 'sharp'], misra: ['Miśra', 'mixed'] };
function natureOf(k) { for (const n in NATURE) if (NATURE[n].includes(k)) return n; }
function zodiacCanvas(mode) {
  const S = 4096, c = mkCanvas(S, S), g = c.getContext('2d'), cx = S / 2, s = S / 2 / ZR.outer;
  const P2 = (r, th) => [cx + r * s * Math.cos(th * D2R), cx - r * s * Math.sin(th * D2R)];
  const band = (r0, r1, a0, a1, fill) => { g.beginPath(); g.arc(cx, cx, r1 * s, -a0 * D2R, -a1 * D2R, true); g.arc(cx, cx, r0 * s, -a1 * D2R, -a0 * D2R, false); g.closePath(); g.fillStyle = fill; g.fill(); };
  const tText = (t, r, th, font, col) => { g.save(); const [x, y] = P2(r, th); g.translate(x, y); let a = Math.PI / 2 - th * D2R; if (Math.sin(th * D2R) < -0.05) a += Math.PI; g.rotate(a); g.font = font; g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, 0, 0); g.restore(); };
  const rText = (t, r, th, size, family, col, maxW) => { g.save(); const [x, y] = P2(r, th); g.translate(x, y); let a = -th * D2R; if (Math.cos(th * D2R) < 0) a += Math.PI; g.rotate(a); let fs = size; g.font = `${fs}px ${family}`; while (g.measureText(t).width > maxW && fs > 12) { fs -= 1; g.font = `${fs}px ${family}`; } g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, 0, 0); g.restore(); };
  const line = (r0, r1, th, col, w) => { const [x0, y0] = P2(r0, th), [x1, y1] = P2(r1, th); g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
  const circ = (r, col, w) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.arc(cx, cx, r * s, 0, 7); g.stroke(); };
  const nkNames = mode === 'yoga' ? P.N.yoga : P.N.nakshatra;
  if (mode === 'nak') {
    for (let i = 0; i < 12; i++) {
      band(ZR.ta0, ZR.ta1, 30 * i, 30 * i + 30, i % 2 ? 'rgba(20,28,62,0.86)' : 'rgba(27,37,80,0.86)');
      band(ZR.ra0, ZR.ra1, 30 * i, 30 * i + 30, i % 2 ? 'rgba(26,35,82,0.9)' : 'rgba(34,46,100,0.9)');
      tText(P.N.monthTa[i], 6.5, 30 * i + 15, `60px ${F.ta}`, COL.goldSoft);
      tText(P.N.rasiDev[i], 7.9, 30 * i + 15, `84px ${F.skt}`, COL.star);
      tText(P.N.rasi[i], 7.33, 30 * i + 15, `italic 46px ${F.skt}`, COL.goldSoft);
      line(ZR.ta0, ZR.ra1, 30 * i, 'rgba(227,174,74,0.9)', 5);
    }
    circ(ZR.ta0, 'rgba(227,174,74,0.9)', 5); circ(ZR.ra0, 'rgba(227,174,74,0.6)', 3);
  }
  for (let k = 0; k < 27; k++) {
    const a0 = k * 360 / 27, a1 = a0 + 360 / 27, mid = a0 + 180 / 27;
    let fill = k % 2 ? 'rgba(15,21,50,0.9)' : 'rgba(22,30,66,0.9)';
    if (mode === 'nature') fill = NATCOL[natureOf(k)];
    if (mode === 'yoga' && (k === 16 || k === 26)) fill = 'rgba(130,38,34,0.92)';
    band(ZR.nk0, ZR.nk1, a0, a1, fill);
    line(ZR.nk0, ZR.nk1, a0, 'rgba(227,174,74,0.55)', 3);
    tText(String(k + 1), 8.72, mid, `500 38px ${F.mono}`, mode === 'nature' ? 'rgba(255,248,230,0.85)' : COL.muted);
    rText(nkNames[k], 9.72, mid, 46, F.skt, COL.star, 250);
  }
  for (let d = 0; d < 360; d++) line(d % 10 ? 10.36 : 10.2, 10.5, d, 'rgba(243,212,145,0.55)', d % 10 ? 2 : 3);
  circ(ZR.nk0, 'rgba(227,174,74,0.9)', 5); circ(ZR.nk1 - 0.02, 'rgba(227,174,74,0.9)', 6);
  return c;
}
function zodiacMesh(map, nakOnly = false) {
  const mat = new T.ShaderMaterial({
    transparent: true, depthWrite: false, side: T.DoubleSide,
    uniforms: { map: { value: map }, uOp: { value: 1 }, uA0: { value: 1 }, uA1: { value: 1 }, uA2: { value: 1 }, uSweep: { value: 7 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `uniform sampler2D map; uniform float uOp,uA0,uA1,uA2,uSweep; varying vec2 vUv;
      void main(){ vec2 p=(vUv-0.5)*2.0*${ZR.outer.toFixed(2)}; float r=length(p); float a=atan(p.y,p.x); if(a<0.0) a+=6.2831853;
        vec4 c=texture2D(map,vUv); float m = r<7.0 ? uA0 : (r<8.4 ? uA1 : uA2*(1.0-smoothstep(uSweep-0.04,uSweep,a)));
        gl_FragColor=vec4(c.rgb, c.a*m*uOp); }`
  });
  const mesh = new T.Mesh(new T.RingGeometry(nakOnly ? ZR.nk0 : ZR.ta0, ZR.nk1, 360, 1), mat); mesh.rotation.x = -Math.PI / 2; return mesh;
}
function phaseIcon(g, x, y, R, e) { // e: elongation deg; waxing lit on right
  g.save(); g.fillStyle = 'rgba(12,14,30,0.95)'; g.beginPath(); g.arc(x, y, R, 0, 7); g.fill();
  g.fillStyle = COL.moon; const k = Math.cos(e * D2R); const right = ((e % 360) + 360) % 360 < 180;
  g.beginPath();
  if (right) { g.arc(x, y, R, -Math.PI / 2, Math.PI / 2, false); g.ellipse(x, y, Math.abs(k) * R, R, 0, Math.PI / 2, -Math.PI / 2, k > 0); }
  else { g.arc(x, y, R, Math.PI / 2, -Math.PI / 2, false); g.ellipse(x, y, Math.abs(k) * R, R, 0, -Math.PI / 2, Math.PI / 2, k > 0); }
  g.fill(); g.strokeStyle = 'rgba(203,213,222,0.35)'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, R, 0, 7); g.stroke(); g.restore();
}
function tithiDialCanvas() {
  const S = 2048, c = mkCanvas(S, S), g = c.getContext('2d'), cx = S / 2, s = S / 2 / 4.9;
  const P2 = (r, th) => [cx + r * s * Math.cos(th * D2R), cx - r * s * Math.sin(th * D2R)];
  for (let k = 0; k < 30; k++) {
    const a0 = 12 * k, a1 = a0 + 12, mid = a0 + 6;
    g.beginPath(); g.arc(cx, cx, 4.9 * s, -a0 * D2R, -a1 * D2R, true); g.arc(cx, cx, 3.7 * s, -a1 * D2R, -a0 * D2R, false); g.closePath();
    g.fillStyle = k < 15 ? (k % 2 ? 'rgba(54,66,112,0.9)' : 'rgba(62,76,126,0.9)') : (k % 2 ? 'rgba(14,17,40,0.92)' : 'rgba(20,24,52,0.92)'); g.fill();
    const [x0, y0] = P2(3.7, a0), [x1, y1] = P2(4.9, a0); g.strokeStyle = k % 15 === 0 ? COL.gold : 'rgba(227,174,74,0.45)'; g.lineWidth = k % 15 === 0 ? 6 : 3; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    const [tx, ty] = P2(4.0, mid); g.font = `600 40px ${F.mono}`; g.fillStyle = k < 15 ? COL.star : COL.muted; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(k % 15 + 1), tx, ty);
    const [px, py] = P2(4.55, mid); phaseIcon(g, px, py, 22, mid);
  }
  g.strokeStyle = COL.gold; g.lineWidth = 5; for (const r of [3.7, 4.88]) { g.beginPath(); g.arc(cx, cx, r * s, 0, 7); g.stroke(); }
  return c;
}
// annular arc shader ring in XZ plane: fills angle [a0, a1] (radians, CCW from +x)
function arcMesh(r0, r1, color, op = 0.5) {
  const mat = new T.ShaderMaterial({ transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending,
    uniforms: { uA0: { value: 0 }, uA1: { value: 1 }, uCol: { value: new T.Color(color) }, uOp: { value: op }, uR0: { value: r0 }, uR1: { value: r1 } },
    vertexShader: 'varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `uniform float uA0,uA1,uOp,uR0,uR1; uniform vec3 uCol; varying vec2 vP;
      void main(){ float a=atan(vP.y,vP.x); if(a<0.0) a+=6.2831853; float r=length(vP);
        float lo=uA0, hi=uA1; float inside = (a>=lo && a<=hi) || (a+6.2831853>=lo && a+6.2831853<=hi) ? 1.0 : 0.0;
        float edge = smoothstep(uR0, uR0+0.03, r)*(1.0-smoothstep(uR1-0.03, uR1, r));
        gl_FragColor=vec4(uCol*uOp*inside*edge, 1.0); }` });
  const m = new T.Mesh(new T.RingGeometry(r0, r1, 256, 1), mat); m.rotation.x = -Math.PI / 2; return m;
}
