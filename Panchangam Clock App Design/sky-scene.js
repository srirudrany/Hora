// Pañcāṅga sky scene — three.js (r149, global THREE) + window.Panchanga engine.
// Ported from Hora/reference/src/core.js + chapters2.js (buildClock/updateClock).
// window.PanchangaSky.create(el, opts) -> Promise<ctrl>
(function () {
  const D2R = Math.PI / 180;
  const COL = { ink: '#0A0D1C', lapis: '#16204A', lapis2: '#24336B', gold: '#E3AE4A', goldSoft: '#F3D491', star: '#EFE8D8',
    moon: '#CBD5DE', kumkum: '#D9483E', copper: '#C07A43', teal: '#63B8B2', plum: '#8F6BB8', muted: '#8A91B0' };
  const F = { skt: "'Tiro Devanagari Sanskrit', 'Noto Serif', serif", ta: "'Tiro Tamil', 'Tiro Devanagari Sanskrit', serif", sans: "'Noto Sans', system-ui, sans-serif", mono: "'IBM Plex Mono', ui-monospace, monospace" };
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const sm = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const angNear = (from, to) => from + ((((to - from) % 360) + 540) % 360 - 180);
  function rng(seed) { return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  let T, P, TX = null, CV = null, MAXANISO = 1;

  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function tex(c) { const t = new T.CanvasTexture(c); t.anisotropy = MAXANISO; t.needsUpdate = true; return t; }
  function fontPx(f) { return parseFloat(f.match(/([\d.]+)px/)[1]); }
  function textCanvas(lines, o = {}) {
    const pad = o.pad ?? 14; const c = mkCanvas(8, 8); let g = c.getContext('2d');
    let w = 0, h = pad * 2; const lh = [];
    for (const L of lines) { g.font = L.f; w = Math.max(w, g.measureText(L.t).width); const x = fontPx(L.f) * (L.lh || 1.3); lh.push(x); h += x; }
    c.width = Math.ceil(w + pad * 2); c.height = Math.ceil(h); g = c.getContext('2d');
    let y = pad;
    lines.forEach((L, i) => { g.font = L.f; g.textBaseline = 'middle'; g.textAlign = 'center'; g.shadowColor = 'rgba(3,5,14,0.9)'; g.shadowBlur = o.shadow ?? 10; g.fillStyle = L.c || COL.star; g.fillText(L.t, c.width / 2, y + lh[i] / 2); y += lh[i]; });
    return c;
  }
  function label(lines, worldH, o = {}) {
    const c = textCanvas(lines, o); const m = new T.SpriteMaterial({ map: tex(c), transparent: true, depthWrite: false, depthTest: o.depthTest ?? false });
    const s = new T.Sprite(m); const k = worldH / c.height; s.scale.set(c.width * k, c.height * k, 1); s.renderOrder = 10; return s;
  }
  function glowCanvas(stops) { const c = mkCanvas(256, 256), g = c.getContext('2d'); const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); stops.forEach(([o, col]) => gr.addColorStop(o, col)); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); return c; }

  // ---------- Earth ----------
  const INDIA = [[68.2,23.7],[69.1,22.4],[70.0,21.0],[72.6,21.3],[72.8,19.0],[73.3,17.0],[73.8,15.4],[74.5,13.5],[75.2,11.8],[76.2,10.0],[76.9,8.5],[77.5,8.1],[78.2,8.9],[79.1,9.3],[79.3,10.3],[79.9,10.8],[80.0,12.0],[80.3,13.1],[80.1,15.2],[81.2,16.3],[82.3,16.6],[83.4,17.7],[85.0,19.3],[86.5,20.0],[87.0,21.5],[88.2,21.7],[89.0,21.9],[90.5,22.5],[91.8,22.3],[92.3,20.7],[92.6,21.9],[92.5,24.0],[94.0,25.0],[95.5,27.5],[97.0,28.3],[93.0,28.5],[91.0,28.0],[88.0,27.8],[85.0,28.2],[82.0,29.8],[80.0,30.5],[78.5,32.0],[77.5,35.0],[75.0,36.5],[72.5,36.0],[71.0,34.0],[70.5,33.0],[69.5,30.0],[67.5,28.0],[66.5,25.5],[67.2,24.8]];
  const LANKA = [[79.9,9.8],[80.9,9.0],[81.9,7.5],[81.6,6.4],[80.6,5.9],[80.0,6.7],[79.8,8.2]];
  function earthCanvas(glowOnly) {
    const w = 2048, h = 1024, c = mkCanvas(w, h), g = c.getContext('2d');
    const X = (lon) => (lon + 180) / 360 * w, Y = (lat) => (90 - lat) / 180 * h;
    if (!glowOnly) {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1d2b5c'); gr.addColorStop(0.5, '#243a78'); gr.addColorStop(1, '#1d2b5c');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      const r = rng(11);
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
  function makeEarth(r = 1) {
    const grp = new T.Group();
    const m = new T.MeshStandardMaterial({ map: TX.earth, emissiveMap: TX.earthGlow, emissive: new T.Color(1, 1, 1), emissiveIntensity: 0.35, roughness: 0.85, metalness: 0 });
    grp.add(new T.Mesh(new T.SphereGeometry(r, 96, 64), m));
    grp.add(new T.Mesh(new T.SphereGeometry(r * 1.06, 64, 48), new T.ShaderMaterial({ transparent: true, depthWrite: false, side: T.BackSide, blending: T.AdditiveBlending,
      vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
      fragmentShader: 'varying vec3 vN; varying vec3 vV; void main(){ float f=pow(1.0-abs(dot(vN,vV)),2.2); gl_FragColor=vec4(0.35,0.55,1.0,1.0)*f*0.9; }' })));
    return grp;
  }
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
    sp.scale.setScalar(r * glow); grp.add(sp); return grp;
  }
  function makeStars(seed, mats) {
    const r = rng(seed), grp = new T.Group(); const R = 420; const buckets = [[[], []], [[], []], [[], []]];
    const push = (v, k, bright) => { const t = r(); const c = t < 0.14 ? [0.72, 0.8, 1] : t < 0.3 ? [1, 0.86, 0.7] : [1, 0.97, 0.92]; buckets[k][0].push(v.x, v.y, v.z); buckets[k][1].push(c[0] * bright, c[1] * bright, c[2] * bright); };
    for (let i = 0; i < 3400; i++) { const u = r() * 2 - 1, th = r() * 6.2832, s = Math.sqrt(1 - u * u); const v = new T.Vector3(R * s * Math.cos(th), R * u, R * s * Math.sin(th)); const m = r(); const k = m < 0.82 ? 0 : m < 0.975 ? 1 : 2; push(v, k, k ? 0.65 + 0.35 * r() : 0.25 + 0.45 * r()); }
    const q = new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0.4).normalize(), 62 * D2R);
    for (let i = 0; i < 4200; i++) { const th = r() * 6.2832; const gs = (r() + r() + r() - 1.5) * 0.16; const v = new T.Vector3(Math.cos(th) * Math.cos(gs), Math.sin(gs), Math.sin(th) * Math.cos(gs)).multiplyScalar(R).applyQuaternion(q); push(v, 0, 0.12 + 0.3 * r()); }
    buckets.forEach(([p, c], k) => {
      const gg = new T.BufferGeometry(); gg.setAttribute('position', new T.Float32BufferAttribute(p, 3)); gg.setAttribute('color', new T.Float32BufferAttribute(c, 3));
      const m = new T.PointsMaterial({ size: [1.5, 2.6, 4.2][k], sizeAttenuation: false, vertexColors: true, map: TX.dot, transparent: true, depthWrite: false, blending: T.AdditiveBlending });
      m.userData.base = m.size; mats.push(m); grp.add(new T.Points(gg, m));
    });
    return grp;
  }
  function sector(r0, r1, a0, a1, color, op = 0.35) {
    const m = new T.Mesh(new T.RingGeometry(r0, r1, 16, 1, a0 * D2R, (a1 - a0) * D2R), new T.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending }));
    m.rotation.x = -Math.PI / 2; return m;
  }
  function setSector(m, r0, r1, a0, a1) { m.geometry.dispose(); m.geometry = new T.RingGeometry(r0, r1, 16, 1, a0 * D2R, Math.max(0.0001, (a1 - a0)) * D2R); }
  function ringLine(r, color, op = 0.6, tube = 0.02, seg = 256) { const m = new T.Mesh(new T.TorusGeometry(r, tube, 6, seg), new T.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false })); m.rotation.x = Math.PI / 2; return m; }
  function rod(color, op = 1, rad = 0.02) { const g = new T.CylinderGeometry(rad, rad, 1, 8, 1); g.translate(0, 0.5, 0); return new T.Mesh(g, new T.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false })); }
  let _up;
  function setRod(m, a, b) { const d = new T.Vector3().subVectors(b, a); const L = d.length(); m.position.copy(a); m.scale.set(1, Math.max(L, 1e-4), 1); if (L > 1e-6) m.quaternion.setFromUnitVectors(_up, d.normalize()); }
  const onRing = (r, lam, y = 0) => new T.Vector3(r * Math.cos(lam * D2R), y, -r * Math.sin(lam * D2R));
  function setOpacity(obj, op) { obj.traverse((o) => { if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach((m) => { if (m.uniforms && m.uniforms.uOp) { m.uniforms.uOp.value = op; return; } if (m.userData.op === undefined) m.userData.op = m.opacity; m.transparent = true; m.opacity = m.userData.op * op; }); } }); obj.visible = op > 0.002; }

  // ---------- zodiac textures ----------
  const ZR = { outer: 10.5, ta0: 6.0, ta1: 7.0, ra0: 7.0, ra1: 8.4, nk0: 8.4, nk1: 10.5 };
  function zodiacCanvas(mode) {
    const S = 3072, k = S / 4096, c = mkCanvas(S, S), g = c.getContext('2d'), cx = S / 2, s = S / 2 / ZR.outer;
    const P2 = (r, th) => [cx + r * s * Math.cos(th * D2R), cx - r * s * Math.sin(th * D2R)];
    const band = (r0, r1, a0, a1, fill) => { g.beginPath(); g.arc(cx, cx, r1 * s, -a0 * D2R, -a1 * D2R, true); g.arc(cx, cx, r0 * s, -a1 * D2R, -a0 * D2R, false); g.closePath(); g.fillStyle = fill; g.fill(); };
    const tText = (t, r, th, font, col) => { g.save(); const [x, y] = P2(r, th); g.translate(x, y); let a = Math.PI / 2 - th * D2R; if (Math.sin(th * D2R) < -0.05) a += Math.PI; g.rotate(a); g.font = font; g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, 0, 0); g.restore(); };
    const rText = (t, r, th, size, family, col, maxW) => { g.save(); const [x, y] = P2(r, th); g.translate(x, y); let a = -th * D2R; if (Math.cos(th * D2R) < 0) a += Math.PI; g.rotate(a); let fs = size; g.font = `${fs}px ${family}`; while (g.measureText(t).width > maxW && fs > 10) { fs -= 1; g.font = `${fs}px ${family}`; } g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, 0, 0); g.restore(); };
    const line = (r0, r1, th, col, w) => { const [x0, y0] = P2(r0, th), [x1, y1] = P2(r1, th); g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
    const circ = (r, col, w) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.arc(cx, cx, r * s, 0, 7); g.stroke(); };
    const px = (n) => Math.round(n * k);
    const names = mode === 'yoga' ? P.N.yoga : P.N.nakshatra;
    if (mode === 'nak') {
      for (let i = 0; i < 12; i++) {
        band(ZR.ta0, ZR.ta1, 30 * i, 30 * i + 30, i % 2 ? 'rgba(20,28,62,0.86)' : 'rgba(27,37,80,0.86)');
        band(ZR.ra0, ZR.ra1, 30 * i, 30 * i + 30, i % 2 ? 'rgba(26,35,82,0.9)' : 'rgba(34,46,100,0.9)');
        tText(P.N.monthTa[i], 6.5, 30 * i + 15, `${px(60)}px ${F.ta}`, COL.goldSoft);
        tText(P.N.rasiDev[i], 7.9, 30 * i + 15, `${px(84)}px ${F.skt}`, COL.star);
        tText(P.N.rasi[i], 7.33, 30 * i + 15, `italic ${px(46)}px ${F.skt}`, COL.goldSoft);
        line(ZR.ta0, ZR.ra1, 30 * i, 'rgba(227,174,74,0.9)', 5 * k);
      }
      circ(ZR.ta0, 'rgba(227,174,74,0.9)', 5 * k); circ(ZR.ra0, 'rgba(227,174,74,0.6)', 3 * k);
    }
    for (let j = 0; j < 27; j++) {
      const a0 = j * 360 / 27, a1 = a0 + 360 / 27, mid = a0 + 180 / 27;
      let fill = j % 2 ? 'rgba(15,21,50,0.9)' : 'rgba(22,30,66,0.9)';
      if (mode === 'yoga' && (j === 16 || j === 26)) fill = 'rgba(130,38,34,0.92)';
      band(ZR.nk0, ZR.nk1, a0, a1, fill);
      line(ZR.nk0, ZR.nk1, a0, 'rgba(227,174,74,0.55)', 3 * k);
      tText(String(j + 1), 8.72, mid, `500 ${px(38)}px ${F.mono}`, COL.muted);
      rText(names[j], 9.72, mid, px(46), F.skt, COL.star, px(250));
    }
    for (let d = 0; d < 360; d++) line(d % 10 ? 10.36 : 10.2, 10.5, d, 'rgba(243,212,145,0.55)', (d % 10 ? 2 : 3) * k);
    circ(ZR.nk0, 'rgba(227,174,74,0.9)', 5 * k); circ(ZR.nk1 - 0.02, 'rgba(227,174,74,0.9)', 6 * k);
    return c;
  }
  function zodiacMesh(map, nakOnly) {
    const mat = new T.ShaderMaterial({ transparent: true, depthWrite: false, side: T.DoubleSide, uniforms: { map: { value: map }, uOp: { value: 1 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'uniform sampler2D map; uniform float uOp; varying vec2 vUv; void main(){ vec4 c=texture2D(map,vUv); gl_FragColor=vec4(c.rgb, c.a*uOp); }' });
    const mesh = new T.Mesh(new T.RingGeometry(nakOnly ? ZR.nk0 : ZR.ta0, ZR.nk1, 360, 1), mat); mesh.rotation.x = -Math.PI / 2; return mesh;
  }
  function phaseIcon(g, x, y, R, e) {
    g.save(); g.fillStyle = 'rgba(12,14,30,0.95)'; g.beginPath(); g.arc(x, y, R, 0, 7); g.fill();
    g.fillStyle = COL.moon; const kk = Math.cos(e * D2R); const right = ((e % 360) + 360) % 360 < 180;
    g.beginPath();
    if (right) { g.arc(x, y, R, -Math.PI / 2, Math.PI / 2, false); g.ellipse(x, y, Math.abs(kk) * R, R, 0, Math.PI / 2, -Math.PI / 2, kk > 0); }
    else { g.arc(x, y, R, Math.PI / 2, -Math.PI / 2, false); g.ellipse(x, y, Math.abs(kk) * R, R, 0, -Math.PI / 2, Math.PI / 2, kk > 0); }
    g.fill(); g.strokeStyle = 'rgba(203,213,222,0.35)'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, R, 0, 7); g.stroke(); g.restore();
  }
  function tithiDialCanvas() {
    const S = 2048, c = mkCanvas(S, S), g = c.getContext('2d'), cx = S / 2, s = S / 2 / 4.9;
    const P2 = (r, th) => [cx + r * s * Math.cos(th * D2R), cx - r * s * Math.sin(th * D2R)];
    for (let j = 0; j < 30; j++) {
      const a0 = 12 * j, a1 = a0 + 12, mid = a0 + 6;
      g.beginPath(); g.arc(cx, cx, 4.9 * s, -a0 * D2R, -a1 * D2R, true); g.arc(cx, cx, 3.7 * s, -a1 * D2R, -a0 * D2R, false); g.closePath();
      g.fillStyle = j < 15 ? (j % 2 ? 'rgba(54,66,112,0.9)' : 'rgba(62,76,126,0.9)') : (j % 2 ? 'rgba(14,17,40,0.92)' : 'rgba(20,24,52,0.92)'); g.fill();
      const [x0, y0] = P2(3.7, a0), [x1, y1] = P2(4.9, a0); g.strokeStyle = j % 15 === 0 ? COL.gold : 'rgba(227,174,74,0.45)'; g.lineWidth = j % 15 === 0 ? 6 : 3; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      const [tx, ty] = P2(4.0, mid); g.font = `600 40px ${F.mono}`; g.fillStyle = j < 15 ? COL.star : COL.muted; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(j % 15 + 1), tx, ty);
      const [px, py] = P2(4.55, mid); phaseIcon(g, px, py, 22, mid);
    }
    g.strokeStyle = COL.gold; g.lineWidth = 5; for (const r of [3.7, 4.88]) { g.beginPath(); g.arc(cx, cx, r * s, 0, 7); g.stroke(); }
    return c;
  }
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

  // ---------- clock (chapters2.js) ----------
  function clockFaceCanvas() {
    const S = 2048, c = mkCanvas(S, S), g = c.getContext('2d'), cx = S / 2, s = S / 2 / 5.0;
    const P2 = (r, th) => [cx + r * s * Math.cos(th * D2R), cx - r * s * Math.sin(th * D2R)];
    const band = (r0, r1, a0, a1, fill) => { g.beginPath(); g.arc(cx, cx, r1 * s, -a0 * D2R, -a1 * D2R, true); g.arc(cx, cx, r0 * s, -a1 * D2R, -a0 * D2R, false); g.closePath(); g.fillStyle = fill; g.fill(); };
    const line = (r0, r1, th, col, w) => { const [x0, y0] = P2(r0, th), [x1, y1] = P2(r1, th); g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
    const circ = (r, col, w) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.arc(cx, cx, r * s, 0, 7); g.stroke(); };
    const txt = (t, r, th, font, col) => { const [x, y] = P2(r, th); g.font = font; g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, x, y); };
    const gr = g.createRadialGradient(cx, cx, 0, cx, cx, 5 * s); gr.addColorStop(0, '#1b2754'); gr.addColorStop(0.7, '#141c40'); gr.addColorStop(1, '#0d1330');
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cx, 5 * s, 0, 7); g.fill();
    for (let i = 0; i < 240; i++) { const th = 90 - i * 1.5; const maj = i % 4 === 0, five = i % 20 === 0; line(five ? 4.62 : maj ? 4.74 : 4.84, 4.97, th, five ? COL.goldSoft : maj ? 'rgba(239,232,216,0.8)' : 'rgba(138,145,176,0.6)', five ? 6 : maj ? 3.5 : 2); }
    for (let n = 0; n < 60; n += 5) txt(String(n), 4.44, 90 - n * 6, `600 52px ${F.mono}`, n === 0 ? COL.gold : COL.star);
    circ(4.3, 'rgba(227,174,74,0.8)', 4); circ(4.99, 'rgba(227,174,74,0.9)', 5);
    for (let j = 0; j < 27; j++) { const a0 = 90 + j * 360 / 27; band(3.35, 4.2, a0, a0 + 360 / 27, j % 2 ? 'rgba(16,22,52,0.95)' : 'rgba(26,35,76,0.95)'); line(3.35, 4.2, a0, 'rgba(227,174,74,0.35)', 2); txt(String(j + 1), 3.52, a0 + 180 / 27, `36px ${F.mono}`, COL.muted); }
    for (let i = 0; i < 12; i++) { line(3.3, 4.25, 90 + i * 30, COL.gold, 5); txt(P.N.rasiDev[i], 4.07, 90 + i * 30 + 15, `40px ${F.skt}`, 'rgba(243,212,145,0.75)'); }
    circ(3.35, 'rgba(227,174,74,0.7)', 3); circ(4.2, 'rgba(227,174,74,0.7)', 3);
    for (let j = 0; j < 27; j++) { const a0 = 90 + j * 360 / 27; band(1.75, 2.35, a0, a0 + 360 / 27, j === 16 || j === 26 ? 'rgba(120,36,32,0.95)' : j % 2 ? 'rgba(18,24,54,0.95)' : 'rgba(28,38,80,0.95)'); line(1.75, 2.35, a0, 'rgba(227,174,74,0.3)', 2); txt(String(j + 1), 2.05, a0 + 180 / 27, `28px ${F.mono}`, COL.muted); }
    circ(1.75, 'rgba(227,174,74,0.6)', 3); circ(2.35, 'rgba(227,174,74,0.6)', 3);
    const arcTxt = (t, r, th0, font, col) => { g.save(); g.font = font; g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; let th = th0; for (const ch of t) { const w = g.measureText(ch).width; const dth = w / (r * s) / D2R; th -= dth / 2; const [x, y] = P2(r, th); g.save(); g.translate(x, y); g.rotate(Math.PI / 2 - th * D2R); g.fillText(ch, 0, 0); g.restore(); th -= dth / 2; } g.restore(); };
    arcTxt('NAKṢATRA', 3.28 - 0.06, 90 + 20, `600 22px ${F.sans}`, 'rgba(138,145,176,0.9)');
    arcTxt('YOGA', 2.42, 90 + 12, `600 20px ${F.sans}`, 'rgba(138,145,176,0.9)');
    return c;
  }
  function tithiRingCanvas() {
    const S = 1024, c = mkCanvas(S, S), g = c.getContext('2d'), cx = S / 2, s = S / 2 / 3.25;
    const P2 = (r, th) => [cx + r * s * Math.cos(th * D2R), cx - r * s * Math.sin(th * D2R)];
    for (let j = 0; j < 30; j++) {
      const a0 = 90 + 12 * j; g.beginPath(); g.arc(cx, cx, 3.25 * s, -a0 * D2R, -(a0 + 12) * D2R, true); g.arc(cx, cx, 2.45 * s, -(a0 + 12) * D2R, -a0 * D2R, false); g.closePath();
      g.fillStyle = j === 14 ? 'rgba(200,170,110,0.95)' : j === 29 ? 'rgba(8,10,22,0.98)' : j < 15 ? (j % 2 ? 'rgba(66,80,130,0.95)' : 'rgba(78,94,146,0.95)') : (j % 2 ? 'rgba(16,20,46,0.95)' : 'rgba(24,29,62,0.95)'); g.fill();
      const [x0, y0] = P2(2.45, a0), [x1, y1] = P2(3.25, a0); g.strokeStyle = j % 15 === 0 ? COL.gold : 'rgba(227,174,74,0.4)'; g.lineWidth = j % 15 === 0 ? 4 : 1.5; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      const [m0, n0] = P2(3.1, a0 + 6), [m1, n1] = P2(3.25, a0 + 6); g.strokeStyle = 'rgba(239,232,216,0.45)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(m0, n0); g.lineTo(m1, n1); g.stroke();
      const [tx, ty] = P2(2.78, a0 + 6); g.font = `600 22px ${F.mono}`; g.fillStyle = j === 14 ? '#1a1406' : j < 15 ? COL.star : COL.muted; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(j % 15 + 1), tx, ty);
    }
    g.strokeStyle = 'rgba(227,174,74,0.8)'; g.lineWidth = 3; for (const r of [2.45, 3.24]) { g.beginPath(); g.arc(cx, cx, r * s, 0, 7); g.stroke(); }
    return c;
  }
  const cpos = (r, th, z = 0) => new T.Vector3(r * Math.cos(th * D2R), r * Math.sin(th * D2R), z);
  function buildClock(parent) {
    const C = {}; C.g = new T.Group(); parent.add(C.g);
    const back = new T.Mesh(new T.CylinderGeometry(5.35, 5.45, 0.5, 128), new T.MeshStandardMaterial({ color: 0x141a36, roughness: 0.6, metalness: 0.3 })); back.rotation.x = Math.PI / 2; back.position.z = -0.27; C.g.add(back);
    C.g.add(new T.Mesh(new T.TorusGeometry(5.12, 0.16, 24, 160), new T.MeshStandardMaterial({ color: 0xc8924a, roughness: 0.3, metalness: 0.75, emissive: 0x3a2008, emissiveIntensity: 0.5 })));
    C.face = new T.Mesh(new T.CircleGeometry(5.0, 160), new T.MeshBasicMaterial({ map: TX.face })); C.g.add(C.face);
    C.nz = new T.Mesh(new T.RingGeometry(4.3, 5.0, 240, 1), new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending,
      uniforms: { uDay: { value: 0.5 }, uR: { value: new T.Vector2() }, uY: { value: new T.Vector2() }, uG: { value: new T.Vector2() }, uNow: { value: 0 }, uHi: { value: 0 }, uOp: { value: 1 } },
      vertexShader: 'varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `uniform float uDay,uNow,uHi,uOp; uniform vec2 uR,uY,uG; varying vec2 vP;
        bool inr(float f, vec2 r){ return f>=r.x && f<r.y; }
        void main(){ float a=atan(vP.y,vP.x); float f=fract(0.25-a/6.2831853); float r=length(vP);
          vec3 c = f<uDay ? vec3(0.42,0.30,0.08) : vec3(0.06,0.10,0.30);
          float strip = smoothstep(4.3,4.34,r)*(1.0-smoothstep(4.58,4.62,r));
          vec3 k=vec3(0.0); if(inr(f,uR)) k=vec3(0.75,0.12,0.08); else if(inr(f,uY)) k=vec3(0.36,0.2,0.5); else if(inr(f,uG)) k=vec3(0.5,0.26,0.08);
          float el = f<uNow ? 1.0 : 0.55;
          gl_FragColor=vec4((c*el*0.9 + k*strip*(0.9+0.5*uHi))*uOp, 1.0); }` }));
    C.nz.position.z = 0.004; C.g.add(C.nz);
    C.tr = new T.Mesh(new T.RingGeometry(2.45, 3.25, 180, 1), new T.MeshBasicMaterial({ map: TX.tithiRing, transparent: true })); C.tr.position.z = 0.02; C.g.add(C.tr);
    C.trHi = new T.Mesh(new T.RingGeometry(2.45, 3.25, 16, 1, 0, 0.2), new T.MeshBasicMaterial({ color: COL.goldSoft, transparent: true, opacity: 0.35, blending: T.AdditiveBlending, depthWrite: false })); C.trHi.position.z = 0.01; C.tr.add(C.trHi);
    C.nkHi = new T.Mesh(new T.RingGeometry(3.35, 4.2, 16, 1, 0, 0.2), new T.MeshBasicMaterial({ color: 0xbcd0f0, transparent: true, opacity: 0.28, blending: T.AdditiveBlending, depthWrite: false })); C.nkHi.position.z = 0.03; C.g.add(C.nkHi);
    C.yHi = new T.Mesh(new T.RingGeometry(1.75, 2.35, 16, 1, 0, 0.2), new T.MeshBasicMaterial({ color: COL.goldSoft, transparent: true, opacity: 0.35, blending: T.AdditiveBlending, depthWrite: false })); C.yHi.position.z = 0.03; C.g.add(C.yHi);
    C.moonD = new T.Mesh(new T.CircleGeometry(1.45, 96), new T.ShaderMaterial({ transparent: true, uniforms: { map: { value: TX.moon }, uE: { value: 1 }, uOp: { value: 1 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `uniform sampler2D map; uniform float uE, uOp; varying vec2 vUv;
        void main(){ vec2 p=vUv*2.0-1.0; float r2=dot(p,p); if(r2>1.0) discard; vec3 n=vec3(p,sqrt(1.0-r2)); vec3 L=vec3(sin(uE),0.0,-cos(uE));
          float d=dot(n,L); float lit=smoothstep(-0.02,0.06,d);
          vec2 uv=vec2(0.5+atan(n.x,n.z)/6.2831853, 0.5+asin(n.y)/3.14159265); vec3 t=texture2D(map,uv).rgb;
          vec3 col=t*(0.07+lit*(0.35+0.75*max(d,0.0))) + vec3(0.25,0.3,0.45)*pow(1.0-n.z,3.0)*0.35;
          gl_FragColor=vec4(col,uOp); }` }));
    C.moonD.position.z = 0.05; C.g.add(C.moonD);
    C.hub = new T.Mesh(new T.TorusGeometry(1.52, 0.05, 12, 96), new T.MeshStandardMaterial({ color: 0xd9a55a, metalness: 0.7, roughness: 0.3 })); C.hub.position.z = 0.32; C.g.add(C.hub);
    C.hand = new T.Group(); C.hand.position.z = 0.34; C.g.add(C.hand);
    const hm = new T.MeshStandardMaterial({ color: 0xf0c56c, metalness: 0.6, roughness: 0.28, emissive: 0x4a2c06, emissiveIntensity: 0.6 });
    const bar = new T.Mesh(new T.BoxGeometry(0.07, 3.35, 0.05), hm); bar.position.y = 1.52 + 3.35 / 2; C.hand.add(bar);
    const tip = new T.Mesh(new T.ConeGeometry(0.13, 0.36, 3), hm); tip.position.y = 4.98; C.hand.add(tip);
    const tail = new T.Mesh(new T.SphereGeometry(0.11, 16, 12), hm); tail.position.y = -1.52; C.hand.add(tail);
    C.sun = makeSun(0.2, 8); C.g.add(C.sun); C.moon = makeMoon(0.19); C.g.add(C.moon);
    C.sunLine = rod(COL.gold, 0.85, 0.018); C.moonLine = rod(0xdbe6f2, 0.85, 0.018); C.g.add(C.sunLine, C.moonLine);
    C.yPtr = new T.Mesh(new T.SphereGeometry(0.11, 16, 12), new T.MeshBasicMaterial({ color: COL.goldSoft })); C.g.add(C.yPtr);
    C.yRod = rod(COL.goldSoft, 0.9, 0.02); C.g.add(C.yRod);
    C.last = {};
    return C;
  }
  function updateClock(C, jd, day) {
    const len = day.nextSunrise - day.sunrise; const f = (jd - day.sunrise) / len;
    const U = C.nz.material.uniforms; U.uDay.value = (day.sunset - day.sunrise) / len; const fr = (x) => (x - day.sunrise) / len;
    U.uR.value.set(fr(day.rahu[0]), fr(day.rahu[1])); U.uY.value.set(fr(day.yama[0]), fr(day.yama[1])); U.uG.value.set(fr(day.gulika[0]), fr(day.gulika[1])); U.uNow.value = f;
    U.uHi.value = jd >= day.rahu[0] && jd < day.rahu[1] ? 1 : 0;
    C.hand.rotation.z = -f * 2 * Math.PI;
    const ls = P.sidSun(jd), lm = P.sidMoon(jd), el = P.elong(jd);
    C.sun.position.copy(cpos(3.95, 90 + ls, 0.22)); C.moon.position.copy(cpos(3.95, 90 + lm, 0.22));
    setRod(C.sunLine, cpos(1.55, 90 + ls, 0.2), cpos(3.8, 90 + ls, 0.2)); setRod(C.moonLine, cpos(1.55, 90 + lm, 0.21), cpos(3.8, 90 + lm, 0.21));
    C.tr.rotation.z = ls * D2R; C.moonD.material.uniforms.uE.value = el * D2R;
    const ys = (ls + lm) % 360; C.yPtr.position.copy(cpos(2.05, 90 + ys, 0.22)); setRod(C.yRod, cpos(1.72, 90 + ys, 0.2), cpos(2.38, 90 + ys, 0.2));
    const ti = Math.floor(el / 12), ni = Math.floor(lm / (360 / 27)), yi = Math.floor(ys / (360 / 27));
    if (C.last.t !== ti) { C.last.t = ti; C.trHi.geometry.dispose(); C.trHi.geometry = new T.RingGeometry(2.45, 3.25, 16, 1, (90 + 12 * ti) * D2R, 12 * D2R); }
    if (C.last.n !== ni) { C.last.n = ni; C.nkHi.geometry.dispose(); C.nkHi.geometry = new T.RingGeometry(3.35, 4.2, 16, 1, (90 + ni * 360 / 27) * D2R, 360 / 27 * D2R); }
    if (C.last.y !== yi) { C.last.y = yi; C.yHi.geometry.dispose(); C.yHi.geometry = new T.RingGeometry(1.75, 2.35, 16, 1, (90 + yi * 360 / 27) * D2R, 360 / 27 * D2R); }
  }

  // ---------- horizon helpers ----------
  function moonLat(jd) { const T_ = (jd - 2451545) / 36525; const om = 125.04452 - 1934.136261 * T_; return 5.145 * Math.sin((P.moonLon(jd) - om) * D2R); }
  function altaz(lamSid, beta, jd, loc) {
    const lam = (lamSid + P.ayanamsa(jd)) * D2R, b = beta * D2R, eps = 23.4393 * D2R;
    const dec = Math.asin(Math.sin(b) * Math.cos(eps) + Math.cos(b) * Math.sin(eps) * Math.sin(lam));
    const ra = Math.atan2(Math.sin(lam) * Math.cos(eps) - Math.tan(b) * Math.sin(eps), Math.cos(lam));
    const gmst = (280.46061837 + 360.98564736629 * (jd - 2451545)) % 360;
    const H = (gmst + loc.lon) * D2R - ra, phi = loc.lat * D2R;
    const alt = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
    const az = Math.atan2(-Math.sin(H) * Math.cos(dec), Math.cos(phi) * Math.sin(dec) - Math.sin(phi) * Math.cos(dec) * Math.cos(H));
    return { alt: alt / D2R, az: ((az / D2R) + 360) % 360, lst: (gmst + loc.lon + 360) % 360 };
  }
  const dirV = (alt, az, r = 1) => new T.Vector3(r * Math.cos(alt * D2R) * Math.sin(az * D2R), r * Math.sin(alt * D2R), -r * Math.cos(alt * D2R) * Math.cos(az * D2R));

  function initTextures(renderer) {
    MAXANISO = renderer.capabilities.getMaxAnisotropy();
    if (!CV) CV = { dot: glowCanvas([[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,0.8)'], [0.6, 'rgba(255,255,255,0.12)'], [1, 'rgba(255,255,255,0)']]),
      glow: glowCanvas([[0, 'rgba(255,236,190,1)'], [0.12, 'rgba(255,214,140,0.85)'], [0.35, 'rgba(240,160,70,0.22)'], [1, 'rgba(200,110,40,0)']]),
      earth: earthCanvas(false), earthGlow: earthCanvas(true), moon: moonCanvas(), zodiac: zodiacCanvas('nak'), yoga: zodiacCanvas('yoga'), tithiDial: tithiDialCanvas(), face: clockFaceCanvas(), tithiRing: tithiRingCanvas() };
    if (!TX) { TX = {}; for (const k in CV) TX[k] = tex(CV[k]); }
  }

  async function create(el, opts = {}) {
    T = window.THREE; P = window.Panchanga; _up = new T.Vector3(0, 1, 0);
    await Promise.all(['40px "Tiro Devanagari Sanskrit"', 'italic 40px "Tiro Devanagari Sanskrit"', '40px "Tiro Tamil"', '500 40px "IBM Plex Mono"', '600 40px "IBM Plex Mono"', '600 22px "Noto Sans"'].map((f) => document.fonts.load(f).catch(() => {})));
    const loc = opts.loc || { name: 'Chennai', lat: 13.0827, lon: 80.2707, tz: 5.5 };
    const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.setClearColor(0x04060D);
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;cursor:grab';
    el.appendChild(renderer.domElement);
    initTextures(renderer);
    const starMats = [];
    // ----- orbital scene -----
    const scene = new T.Scene();
    const cam = new T.PerspectiveCamera(40, 1, 0.05, 2000);
    const stars = makeStars(7, starMats); scene.add(stars);
    const amb = new T.AmbientLight(0x6070a0, 0.25); scene.add(amb);
    const sunLight = new T.PointLight(0xfff0dc, 1.7, 0, 0); scene.add(sunLight);
    const cl1 = new T.DirectionalLight(0xfff0dc, 1.2); cl1.position.set(-4, 6, 10); const cl2 = new T.DirectionalLight(0x9fb8ff, 0.4); cl2.position.set(6, -3, 4); const clAmb = new T.AmbientLight(0x6070a0, 0.6); scene.add(cl1, cl2, clAmb);
    const sky = new T.Group(); scene.add(sky);
    const earth = makeEarth(1); sky.add(earth);
    const zod = zodiacMesh(TX.zodiac, false); sky.add(zod);
    const zodY = zodiacMesh(TX.yoga, true); zodY.position.y = 0.012; zodY.material.uniforms.uOp.value = 0; sky.add(zodY);
    const nkHi = sector(ZR.nk0, ZR.nk1, 0, 13.33, 0xbcd0f0, 0.28); nkHi.position.y = 0.02; sky.add(nkHi);
    const dial = new T.Mesh(new T.RingGeometry(2.9 * 3.7 / 4.9, 2.9, 180, 1), new T.MeshBasicMaterial({ map: TX.tithiDial, transparent: true, depthWrite: false, side: T.DoubleSide })); dial.rotation.x = -Math.PI / 2; sky.add(dial);
    const tiHi = sector(2.19, 2.9, 0, 12, COL.goldSoft, 0.35); tiHi.position.y = 0.02; sky.add(tiHi);
    const elArc = arcMesh(1.35, 1.8, COL.gold, 0.55); elArc.position.y = 0.01; sky.add(elArc);
    const ecl = ringLine(ZR.nk1 + 0.05, COL.gold, 0.35, 0.02); sky.add(ecl);
    const moonOrbit = ringLine(3.5, 0x9aa6c0, 0.22, 0.012); sky.add(moonOrbit);
    const moon = makeMoon(0.34); sky.add(moon);
    const sun = makeSun(0.9, 10); sky.add(sun);
    const sunRod = rod(COL.gold, 0.8, 0.025), moonRod = rod(0xdbe6f2, 0.8, 0.022), yRod = rod(COL.goldSoft, 0.9, 0.03); sky.add(sunRod, moonRod, yRod);
    const yPtr = new T.Mesh(new T.SphereGeometry(0.2, 16, 12), new T.MeshBasicMaterial({ color: COL.goldSoft })); sky.add(yPtr);
    // lift-off clock
    const lift = new T.Group(); scene.add(lift);
    const C = buildClock(lift);
    // ----- horizon scene -----
    const H = {}; H.scene = new T.Scene(); H.bg = new T.Color(0x04060D); H.scene.background = H.bg;
    H.stars = makeStars(9, starMats); H.scene.add(H.stars);
    H.scene.add(new T.AmbientLight(0x404a70, 0.2));
    H.sunL = new T.DirectionalLight(0xfff0dc, 1.8); H.scene.add(H.sunL, H.sunL.target);
    H.ground = new T.Mesh(new T.SphereGeometry(95, 64, 24, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new T.MeshBasicMaterial({ color: 0x070912, side: T.BackSide })); H.scene.add(H.ground);
    H.scene.add(ringLine(94, COL.gold, 0.7, 0.09));
    for (const a of [30, 60]) { const rl = ringLine(94 * Math.cos(a * D2R), 0x8a91b0, 0.18, 0.05); rl.position.y = 94 * Math.sin(a * D2R); H.scene.add(rl); }
    { const pts = []; for (let a = 0; a < 360; a += 5) { const r0 = a % 30 ? 0.9 : 2.2; pts.push(dirV(0, a, 93.5), dirV(r0, a, 93.5)); } const gg = new T.BufferGeometry().setFromPoints(pts); H.scene.add(new T.LineSegments(gg, new T.LineBasicMaterial({ color: COL.goldSoft, transparent: true, opacity: 0.6 }))); }
    [['N', 0], ['E', 90], ['S', 180], ['W', 270]].forEach(([t, a]) => { const s = label([{ t, f: `600 56px ${F.sans}`, c: COL.goldSoft }], 4.2); s.position.copy(dirV(3.4, a, 88)); H.scene.add(s); });
    H.eclGeo = new T.BufferGeometry(); H.eclGeo.setAttribute('position', new T.Float32BufferAttribute(new Float32Array(361 * 3), 3));
    H.scene.add(new T.Line(H.eclGeo, new T.LineBasicMaterial({ color: COL.gold, transparent: true, opacity: 0.85 })));
    H.tickGeo = new T.BufferGeometry(); H.tickGeo.setAttribute('position', new T.Float32BufferAttribute(new Float32Array(27 * 2 * 3), 3));
    H.scene.add(new T.LineSegments(H.tickGeo, new T.LineBasicMaterial({ color: COL.goldSoft, transparent: true, opacity: 0.7 })));
    H.nak = P.N.nakshatra.map((n, i) => { const s = label([{ t: String(i + 1), f: `500 30px ${F.mono}`, c: COL.muted, lh: 1.1 }, { t: n, f: `italic 44px ${F.skt}`, c: COL.star }], 3.4); H.scene.add(s); return s; });
    H.rasi = P.N.rasiDev.map((n) => { const s = label([{ t: n, f: `56px ${F.skt}`, c: COL.goldSoft }], 2.6); H.scene.add(s); return s; });
    H.sun = makeSun(2.6, 10); H.scene.add(H.sun);
    H.moon = makeMoon(1.9); H.scene.add(H.moon);

    // ----- state -----
    const S = { jd: opts.jd || P.jdFromDate(new Date()), dir: opts.direction || 'bridge', lift: opts.direction === 'liftoff' ? 0 : 1, liftGoal: opts.direction === 'liftoff' ? 0 : 1,
      tgt: new T.Vector3(), dist: 30, az: -60, el: 34, lock: 'overview', anim: null, yaw: 0, pitch: 20, hAnim: null, hLock: 'moon', warp: 0, shiftX: opts.shiftX || 0, shiftY: opts.shiftY || 0, day: null, lastW: 0, lastH: 0, dragging: false };
    const ctrl = { onFrame: null };
    const bodies = () => {
      const ls = P.sidSun(S.jd), lm = P.sidMoon(S.jd), e = P.elong(S.jd); return { ls, lm, e, ys: (ls + lm) % 360 };
    };
    function dayFor(jd) {
      if (S.day && jd >= S.day.sunrise && jd < S.day.nextSunrise) return S.day;
      const d = P.dateFromJd(jd + loc.tz / 24); let p = P.panchanga(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), loc);
      if (jd < p.sunrise) { const d2 = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - 1)); p = P.panchanga(d2.getUTCFullYear(), d2.getUTCMonth() + 1, d2.getUTCDate(), loc); }
      S.day = p; return p;
    }
    const GOALS = {
      overview: (b) => ({ t: new T.Vector3(), dist: 30, el: 36, az: b.lm - 110 }),
      earth: (b) => ({ t: new T.Vector3(), dist: 4.4, el: 14, az: b.ls + 50 }),
      moon: (b) => ({ t: onRing(3.5, b.lm), dist: 2.2, el: 10, az: b.lm + 205 }),
      sun: (b) => ({ t: onRing(14, b.ls), dist: 10, el: 10, az: b.ls + 25 }),
      nakshatra: (b) => ({ t: onRing(9.45, b.lm), dist: 8, el: 40, az: b.lm - 20 }),
      tithi: (b) => ({ t: new T.Vector3(), dist: 9.5, el: 80, az: b.ls - 90 }),
      yoga: (b) => ({ t: new T.Vector3(), dist: 28, el: 64, az: b.ys - 90 }),
    };
    function lockTo(key, instant) {
      const b = bodies(); const g = GOALS[key](b);
      S.anim = { t0: performance.now(), dur: instant ? 1 : (key === S.lock ? 900 : 1700), from: { t: S.tgt.clone(), dist: S.dist, az: S.az, el: S.el }, key, gaz: angNear(S.az, g.az) };
      S.lock = key;
    }
    function hLockTo(key, instant) { S.hLock = key; S.hAnim = { t0: performance.now(), dur: instant ? 1 : 1500, fy: S.yaw, fp: S.pitch }; }
    function hTarget(key) {
      const b = bodies();
      if (key === 'sun') return altaz(b.ls, 0, S.jd, loc);
      if (key === 'moon') return altaz(b.lm, moonLat(S.jd), S.jd, loc);
      if (key === 'nakshatra') { const n = Math.floor(b.lm / (360 / 27)); return altaz(n * 360 / 27 + 180 / 27, 0, S.jd, loc); }
      const z = altaz(b.ls, 0, S.jd, loc); return { alt: 20, az: z.az };
    }
    // ----- input -----
    const cv = renderer.domElement; let px = 0, py = 0;
    cv.addEventListener('pointerdown', (e) => { S.dragging = true; px = e.clientX; py = e.clientY; cv.setPointerCapture(e.pointerId); cv.style.cursor = 'grabbing'; });
    cv.addEventListener('pointermove', (e) => {
      if (!S.dragging) return; const dx = e.clientX - px, dy = e.clientY - py; px = e.clientX; py = e.clientY;
      if (S.dir === 'horizon') { S.hAnim = null; S.yaw = (S.yaw - dx * 0.15 + 360) % 360; S.pitch = clamp(S.pitch + dy * 0.15, -20, 88); }
      else if (S.lift > 0.5) { if (S.anim) { S.anim = null; } S.az -= dx * 0.3; S.el = clamp(S.el + dy * 0.2, -10, 88); }
    });
    const up = () => { S.dragging = false; cv.style.cursor = 'grab'; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', (e) => { e.preventDefault(); if (S.dir !== 'horizon' && S.lift > 0.5) S.dist = clamp(S.dist * (1 + e.deltaY * 0.001), 1.6, 60); else if (S.dir === 'horizon') { cam.userData.hfov = clamp((cam.userData.hfov || 70) * (1 + e.deltaY * 0.001), 20, 100); } }, { passive: false });
    // ----- resize -----
    const ro = new ResizeObserver(() => { const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); cam.aspect = w / h; S.lastW = w; S.lastH = h; });
    ro.observe(el);
    // ----- frame -----
    const proj = (v) => { const p = v.clone().project(cam); return { x: (p.x * 0.5 + 0.5) * S.lastW - (cam.view && cam.view.enabled ? 0 : 0), y: (-p.y * 0.5 + 0.5) * S.lastH, vis: p.z < 1 && p.z > -1 && Math.abs(p.x) < 1.1 && Math.abs(p.y) < 1.1 }; };
    let raf = 0, lastT = performance.now();
    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
      if (el.clientWidth !== S.lastW || el.clientHeight !== S.lastH) { const w = el.clientWidth, h = el.clientHeight; if (w && h) { renderer.setSize(w, h, false); cam.aspect = w / h; S.lastW = w; S.lastH = h; } }
      if (!S.lastW) return;
      const b = bodies(); const day = dayFor(S.jd);
      let info = { dir: S.dir, lock: S.lock, hLock: S.hLock, warp: 0, lift: S.lift, pos: {} };
      if (S.dir === 'horizon') {
        // update horizon objects
        const pos = H.eclGeo.attributes.position; let lstv = 0;
        for (let i = 0; i <= 360; i++) { const a = altaz(i, 0, S.jd, loc); lstv = a.lst; const v = dirV(a.alt, a.az, 90); pos.setXYZ(i, v.x, v.y, v.z); }
        pos.needsUpdate = true;
        const tp = H.tickGeo.attributes.position;
        for (let i = 0; i < 27; i++) { const lam = i * 360 / 27; const a = altaz(lam, 1.6, S.jd, loc), b2 = altaz(lam, -1.6, S.jd, loc); const v1 = dirV(a.alt, a.az, 90), v2 = dirV(b2.alt, b2.az, 90); tp.setXYZ(i * 2, v1.x, v1.y, v1.z); tp.setXYZ(i * 2 + 1, v2.x, v2.y, v2.z); const m = altaz(lam + 180 / 27, 4.2, S.jd, loc); H.nak[i].position.copy(dirV(m.alt, m.az, 86)); H.nak[i].material.opacity = Math.floor(b.lm / (360 / 27)) === i ? 1 : 0.62; }
        tp.needsUpdate = true;
        for (let i = 0; i < 12; i++) { const m = altaz(i * 30 + 15, -5.5, S.jd, loc); H.rasi[i].position.copy(dirV(m.alt, m.az, 86)); }
        const sa = altaz(b.ls, 0, S.jd, loc), ma = altaz(b.lm, moonLat(S.jd), S.jd, loc);
        H.sun.position.copy(dirV(sa.alt, sa.az, 80)); H.moon.position.copy(dirV(ma.alt, ma.az, 80));
        H.sunL.position.copy(H.sun.position); H.sunL.target.position.copy(H.moon.position);
        // stars follow sidereal rotation about the celestial pole
        const pole = new T.Vector3(0, Math.sin(loc.lat * D2R), -Math.cos(loc.lat * D2R)).normalize();
        H.stars.quaternion.setFromAxisAngle(pole, -lstv * D2R);
        const day2 = clamp((sa.alt + 8) / 14); H.bg.setRGB(lerp(0.016, 0.07, day2), lerp(0.024, 0.11, day2), lerp(0.05, 0.26, day2));
        starMats.forEach((m) => { m.opacity = 1 - day2 * 0.85; });
        H.ground.material.color.setRGB(lerp(0.027, 0.06, day2), lerp(0.035, 0.07, day2), lerp(0.07, 0.13, day2));
        if (S.hAnim) { const tg = hTarget(S.hLock); const k = ease(clamp((now - S.hAnim.t0) / S.hAnim.dur)); S.yaw = lerp(S.hAnim.fy, angNear(S.hAnim.fy, tg.az), k); S.pitch = lerp(S.hAnim.fp, clamp(tg.alt, -15, 80), k); if (k >= 1) { S.hAnim = null; S.yaw = ((S.yaw % 360) + 360) % 360; } }
        cam.fov = cam.userData.hfov || 70; cam.position.set(0, 0, 0); cam.up.set(0, 1, 0); cam.lookAt(dirV(S.pitch, S.yaw, 10)); cam.clearViewOffset(); cam.updateProjectionMatrix();
        renderer.render(H.scene, cam);
        info.pos = { sun: proj(H.sun.position), moon: proj(H.moon.position), nakshatra: proj(H.nak[Math.floor(b.lm / (360 / 27))].position) };
        info.alt = { sun: sa, moon: ma }; info.heading = S.yaw; info.pitch = S.pitch; info.lst = lstv;
      } else {
        // lift animation
        if (S.lift !== S.liftGoal) { const sp = dt / 2.6; S.lift = S.liftGoal > S.lift ? Math.min(S.liftGoal, S.lift + sp) : Math.max(S.liftGoal, S.lift - sp); }
        const e = ease(S.lift);
        // bodies
        const mp = onRing(3.5, b.lm), sp2 = onRing(14, b.ls);
        moon.position.copy(mp); sun.position.copy(sp2); sunLight.position.copy(sp2);
        setRod(sunRod, onRing(1.05, b.ls), onRing(ZR.nk1, b.ls)); setRod(moonRod, onRing(1.05, b.lm), onRing(ZR.nk1, b.lm)); setRod(yRod, onRing(1.05, b.ys), onRing(ZR.nk1, b.ys)); yPtr.position.copy(onRing(ZR.nk1 + 0.3, b.ys));
        dial.rotation.z = b.ls * D2R;
        const ti = Math.floor(b.e / 12), ni = Math.floor(b.lm / (360 / 27));
        setSector(tiHi, 2.19, 2.9, b.ls + ti * 12, b.ls + ti * 12 + 12); setSector(nkHi, ZR.nk0, ZR.nk1, ni * 360 / 27, (ni + 1) * 360 / 27);
        elArc.material.uniforms.uA0.value = b.ls * D2R; elArc.material.uniforms.uA1.value = (b.ls + b.e) * D2R;
        earth.rotation.y += dt * 0.05;
        const isY = S.lock === 'yoga' ? 1 : 0; S.yMix = lerp(S.yMix || 0, isY, dt * 3);
        // camera (orbit)
        if (S.anim) {
          const g = GOALS[S.anim.key](b); const k = clamp((now - S.anim.t0) / S.anim.dur); const q = ease(k);
          S.tgt.lerpVectors(S.anim.from.t, g.t, q); S.dist = lerp(S.anim.from.dist, g.dist, q); S.az = lerp(S.anim.from.az, S.anim.gaz, q); S.el = lerp(S.anim.from.el, g.el, q);
          S.warp = S.anim.dur > 1000 ? Math.sin(Math.PI * k) : 0; if (k >= 1) { S.anim = null; S.warp = 0; }
        } else { const g = GOALS[S.lock](b); S.tgt.lerp(g.t, Math.min(1, dt * 4)); }
        const orbitPos = new T.Vector3(S.tgt.x + S.dist * Math.cos(S.el * D2R) * Math.cos(S.az * D2R), S.tgt.y + S.dist * Math.sin(S.el * D2R), S.tgt.z - S.dist * Math.cos(S.el * D2R) * Math.sin(S.az * D2R));
        // clock pose (face-on) → orbit pose
        const t = now / 1000; const zc = Math.max(17.5, 11.8 / (2 * Math.tan(20 * D2R) * cam.aspect * (1 - 2 * Math.abs(S.shiftX))), 11.8 * (S.shiftY < 0 ? 1.5 : 1.3) / (2 * Math.tan(20 * D2R) * (1 - 2 * Math.abs(S.shiftY || 0)))); const clockPos = new T.Vector3(Math.sin(t * 0.05) * 0.6, -0.4 + Math.cos(t * 0.04) * 0.4, zc);
        cam.position.lerpVectors(clockPos, orbitPos, e); const look = new T.Vector3(0, 0.1, 0).lerp(S.tgt, e); cam.up.set(0, 1, 0); cam.lookAt(look);
        cam.fov = 40 + 28 * S.warp; 
        const w = S.lastW, h = S.lastH; const sx = S.shiftX * (1 - e), sy = (S.shiftY || 0) * (1 - e);
        if (sx || sy) cam.setViewOffset(w, h, sx * w, sy * h, w, h); else cam.clearViewOffset();
        cam.updateProjectionMatrix();
        lift.rotation.x = -Math.PI / 2 * e; C.g.rotation.z = -Math.PI / 2 * e; C.g.rotation.y = (Math.sin(t * 0.07) * 0.08 + 0.1) * (1 - e); lift.rotation.y = 0; lift.scale.setScalar(1 + 1.5 * e);
        const cOp = 1 - sm(0.5, 0.92, e); setOpacity(C.g, cOp); C.nz.material.uniforms.uOp.value = cOp; C.moonD.material.uniforms.uOp.value = cOp;
        updateClock(C, S.jd, day);
        const sOp = sm(0.35, 0.85, e); zod.material.uniforms.uOp.value = sOp * (1 - S.yMix); zodY.material.uniforms.uOp.value = sOp * S.yMix;
        [dial, tiHi, elArc, ecl, moonOrbit, sunRod, moonRod, nkHi].forEach((m) => { if (m.material.uniforms && m.material.uniforms.uOp) m.material.uniforms.uOp.value = 0.55 * sOp; else { if (m.userData.op === undefined) m.userData.op = m.material.opacity; m.material.opacity = m.userData.op * sOp; } m.visible = sOp > 0.01; });
        yRod.visible = yPtr.visible = S.yMix > 0.05 && sOp > 0.01; yRod.material.opacity = 0.9 * S.yMix;
        earth.visible = moon.visible = sun.visible = sOp > 0.01; earth.scale.setScalar(Math.max(0.001, sOp));
        cl1.intensity = 1.2 * (1 - e); cl2.intensity = 0.4 * (1 - e); clAmb.intensity = 0.6 * (1 - e); sunLight.intensity = 1.7 * e;
        starMats.forEach((m) => { m.size = m.userData.base * (1 + 2.2 * S.warp); m.opacity = 1; });
        renderer.render(scene, cam);
        info.warp = S.warp;
        info.pos = { sun: proj(sp2), moon: proj(mp), earth: proj(new T.Vector3()), nakshatra: proj(onRing(9.45, b.lm)), tithi: proj(onRing(2.55, b.ls + ti * 12 + 6)), yoga: proj(onRing(ZR.nk1 + 0.3, b.ys)) };
      }
      if (ctrl.onFrame) ctrl.onFrame(info);
    }
    raf = requestAnimationFrame(frame);
    lockTo(opts.lock || 'overview', true); hLockTo('moon', true);
    Object.assign(ctrl, {
      setTime(jd) { S.jd = jd; },
      setDirection(d) { if (d === S.dir) return; S.dir = d; if (d === 'liftoff') { S.liftGoal = 0; S.lift = 0; } else if (d === 'bridge') { S.liftGoal = 1; S.lift = 1; } if (d === 'horizon') hLockTo(S.hLock || 'moon', true); },
      liftOff(on) { S.liftGoal = on ? 1 : 0; if (on) lockTo('overview', true); },
      lock(k) { if (S.dir === 'horizon') hLockTo(k); else lockTo(k); },
      setShift(x, y) { S.shiftX = x; S.shiftY = y || 0; },
      bestHorizon() { const b = bodies(); return altaz(b.lm, moonLat(S.jd), S.jd, loc).alt > -2 ? 'moon' : 'sun'; },
      isLifted() { return S.liftGoal === 1; },
      dispose() { cancelAnimationFrame(raf); ro.disconnect(); renderer.dispose(); renderer.forceContextLoss && renderer.forceContextLoss(); cv.remove(); },
    });
    return ctrl;
  }
  window.PanchangaSky = { create };
})();
