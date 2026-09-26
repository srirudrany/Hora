// ===== chapters: clock, muhūrta, close =====
// ---------- reusable Panchanga clock ----------
function clockFaceCanvas() {
  const S = 2048, c = mkCanvas(S, S), g = c.getContext('2d'), cx = S / 2, s = S / 2 / 5.0;
  const P2 = (r, th) => [cx + r * s * Math.cos(th * D2R), cx - r * s * Math.sin(th * D2R)];
  const band = (r0, r1, a0, a1, fill) => { g.beginPath(); g.arc(cx, cx, r1 * s, -a0 * D2R, -a1 * D2R, true); g.arc(cx, cx, r0 * s, -a1 * D2R, -a0 * D2R, false); g.closePath(); g.fillStyle = fill; g.fill(); };
  const line = (r0, r1, th, col, w) => { const [x0, y0] = P2(r0, th), [x1, y1] = P2(r1, th); g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
  const circ = (r, col, w) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.arc(cx, cx, r * s, 0, 7); g.stroke(); };
  const txt = (t, r, th, font, col) => { const [x, y] = P2(r, th); g.font = font; g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, x, y); };
  const gr = g.createRadialGradient(cx, cx, 0, cx, cx, 5 * s); gr.addColorStop(0, '#1b2754'); gr.addColorStop(0.7, '#141c40'); gr.addColorStop(1, '#0d1330');
  g.fillStyle = gr; g.beginPath(); g.arc(cx, cx, 5 * s, 0, 7); g.fill();
  // nāḻigai dial: 0 at top, clockwise
  for (let i = 0; i < 240; i++) { const th = 90 - i * 1.5; const maj = i % 4 === 0, five = i % 20 === 0; line(five ? 4.62 : maj ? 4.74 : 4.84, 4.97, th, five ? COL.goldSoft : maj ? 'rgba(239,232,216,0.8)' : 'rgba(138,145,176,0.6)', five ? 6 : maj ? 3.5 : 2); }
  for (let n = 0; n < 60; n += 5) txt(String(n), 4.44, 90 - n * 6, `600 52px ${F.mono}`, n === 0 ? COL.gold : COL.star);
  circ(4.3, 'rgba(227,174,74,0.8)', 4); circ(4.99, 'rgba(227,174,74,0.9)', 5);
  // nakṣatra band (sidereal, Meṣa 0° at top, counter-clockwise)
  for (let k = 0; k < 27; k++) { const a0 = 90 + k * 360 / 27; band(3.35, 4.2, a0, a0 + 360 / 27, k % 2 ? 'rgba(16,22,52,0.95)' : 'rgba(26,35,76,0.95)'); line(3.35, 4.2, a0, 'rgba(227,174,74,0.35)', 2); txt(String(k + 1), 3.52, a0 + 180 / 27, `36px ${F.mono}`, COL.muted); }
  for (let i = 0; i < 12; i++) { line(3.3, 4.25, 90 + i * 30, COL.gold, 5); txt(P.N.rasiDev[i], 4.07, 90 + i * 30 + 15, `40px ${F.skt}`, 'rgba(243,212,145,0.75)'); }
  circ(3.35, 'rgba(227,174,74,0.7)', 3); circ(4.2, 'rgba(227,174,74,0.7)', 3);
  // yoga band
  for (let k = 0; k < 27; k++) { const a0 = 90 + k * 360 / 27; band(1.75, 2.35, a0, a0 + 360 / 27, k === 16 || k === 26 ? 'rgba(120,36,32,0.95)' : k % 2 ? 'rgba(18,24,54,0.95)' : 'rgba(28,38,80,0.95)'); line(1.75, 2.35, a0, 'rgba(227,174,74,0.3)', 2); txt(String(k + 1), 2.05, a0 + 180 / 27, `28px ${F.mono}`, COL.muted); }
  circ(1.75, 'rgba(227,174,74,0.6)', 3); circ(2.35, 'rgba(227,174,74,0.6)', 3);
  // tiny ring captions
  const arcTxt = (t, r, th0, font, col) => { g.save(); g.font = font; g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; let th = th0; for (const ch of t) { const w = g.measureText(ch).width; const dth = w / (r * s) / D2R; th -= dth / 2; const [x, y] = P2(r, th); g.save(); g.translate(x, y); g.rotate(Math.PI / 2 - th * D2R); g.fillText(ch, 0, 0); g.restore(); th -= dth / 2; } g.restore(); };
  arcTxt('NAKṢATRA', 3.28 - 0.06, 90 + 20, `600 22px ${F.sans}`, 'rgba(138,145,176,0.9)');
  arcTxt('YOGA', 2.42, 90 + 12, `600 20px ${F.sans}`, 'rgba(138,145,176,0.9)');
  return c;
}
function tithiRingCanvas() {
  const S = 1024, c = mkCanvas(S, S), g = c.getContext('2d'), cx = S / 2, s = S / 2 / 3.25;
  const P2 = (r, th) => [cx + r * s * Math.cos(th * D2R), cx - r * s * Math.sin(th * D2R)];
  for (let k = 0; k < 30; k++) {
    const a0 = 90 + 12 * k; g.beginPath(); g.arc(cx, cx, 3.25 * s, -a0 * D2R, -(a0 + 12) * D2R, true); g.arc(cx, cx, 2.45 * s, -(a0 + 12) * D2R, -a0 * D2R, false); g.closePath();
    g.fillStyle = k === 14 ? 'rgba(200,170,110,0.95)' : k === 29 ? 'rgba(8,10,22,0.98)' : k < 15 ? (k % 2 ? 'rgba(66,80,130,0.95)' : 'rgba(78,94,146,0.95)') : (k % 2 ? 'rgba(16,20,46,0.95)' : 'rgba(24,29,62,0.95)'); g.fill();
    const [x0, y0] = P2(2.45, a0), [x1, y1] = P2(3.25, a0); g.strokeStyle = k % 15 === 0 ? COL.gold : 'rgba(227,174,74,0.4)'; g.lineWidth = k % 15 === 0 ? 4 : 1.5; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    const [m0, n0] = P2(3.1, a0 + 6), [m1, n1] = P2(3.25, a0 + 6); g.strokeStyle = 'rgba(239,232,216,0.45)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(m0, n0); g.lineTo(m1, n1); g.stroke();
    const [tx, ty] = P2(2.78, a0 + 6); g.font = `600 22px ${F.mono}`; g.fillStyle = k === 14 ? '#1a1406' : k < 15 ? COL.star : COL.muted; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(k % 15 + 1), tx, ty);
  }
  g.strokeStyle = 'rgba(227,174,74,0.8)'; g.lineWidth = 3; for (const r of [2.45, 3.24]) { g.beginPath(); g.arc(cx, cx, r * s, 0, 7); g.stroke(); }
  return c;
}
function buildClock(parent) {
  const C = {}; C.g = new T.Group(); parent.add(C.g);
  if (!TX.face) { TX.face = tex(clockFaceCanvas()); TX.tithiRing = tex(tithiRingCanvas()); }
  const back = new T.Mesh(new T.CylinderGeometry(5.35, 5.45, 0.5, 128), new T.MeshStandardMaterial({ color: 0x141a36, roughness: 0.6, metalness: 0.3 })); back.rotation.x = Math.PI / 2; back.position.z = -0.27; C.g.add(back);
  const bez = new T.Mesh(new T.TorusGeometry(5.12, 0.16, 24, 160), new T.MeshStandardMaterial({ color: 0xc8924a, roughness: 0.3, metalness: 0.75, emissive: 0x3a2008, emissiveIntensity: 0.5 })); C.g.add(bez);
  C.face = new T.Mesh(new T.CircleGeometry(5.0, 160), new T.MeshBasicMaterial({ map: TX.face })); C.g.add(C.face);
  C.nz = new T.Mesh(new T.RingGeometry(4.3, 5.0, 240, 1), new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending,
    uniforms: { uDay: { value: 0.5 }, uR: { value: new T.Vector2() }, uY: { value: new T.Vector2() }, uG: { value: new T.Vector2() }, uNow: { value: 0 }, uHi: { value: 0 } },
    vertexShader: 'varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `uniform float uDay,uNow,uHi; uniform vec2 uR,uY,uG; varying vec2 vP;
      bool inr(float f, vec2 r){ return f>=r.x && f<r.y; }
      void main(){ float a=atan(vP.y,vP.x); float f=fract(0.25-a/6.2831853); float r=length(vP);
        vec3 c = f<uDay ? vec3(0.42,0.30,0.08) : vec3(0.06,0.10,0.30);
        float strip = smoothstep(4.3,4.34,r)*(1.0-smoothstep(4.58,4.62,r));
        vec3 k=vec3(0.0); if(inr(f,uR)) k=vec3(0.75,0.12,0.08); else if(inr(f,uY)) k=vec3(0.36,0.2,0.5); else if(inr(f,uG)) k=vec3(0.5,0.26,0.08);
        float el = f<uNow ? 1.0 : 0.55;
        gl_FragColor=vec4(c*el*0.9 + k*strip*(0.9+0.5*uHi), 1.0); }` }));
  C.nz.position.z = 0.004; C.g.add(C.nz);
  C.tr = new T.Mesh(new T.RingGeometry(2.45, 3.25, 180, 1), new T.MeshBasicMaterial({ map: TX.tithiRing, transparent: true })); C.tr.position.z = 0.02; C.g.add(C.tr);
  C.trHi = new T.Mesh(new T.RingGeometry(2.45, 3.25, 16, 1, 0, 0.2), new T.MeshBasicMaterial({ color: COL.goldSoft, transparent: true, opacity: 0.35, blending: T.AdditiveBlending, depthWrite: false })); C.trHi.position.z = 0.01; C.tr.add(C.trHi);
  C.nkHi = new T.Mesh(new T.RingGeometry(3.35, 4.2, 16, 1, 0, 0.2), new T.MeshBasicMaterial({ color: 0xbcd0f0, transparent: true, opacity: 0.28, blending: T.AdditiveBlending, depthWrite: false })); C.nkHi.position.z = 0.03; C.g.add(C.nkHi);
  C.yHi = new T.Mesh(new T.RingGeometry(1.75, 2.35, 16, 1, 0, 0.2), new T.MeshBasicMaterial({ color: COL.goldSoft, transparent: true, opacity: 0.35, blending: T.AdditiveBlending, depthWrite: false })); C.yHi.position.z = 0.03; C.g.add(C.yHi);
  C.moonD = new T.Mesh(new T.CircleGeometry(1.45, 96), new T.ShaderMaterial({ uniforms: { map: { value: TX.moon }, uE: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `uniform sampler2D map; uniform float uE; varying vec2 vUv;
      void main(){ vec2 p=vUv*2.0-1.0; float r2=dot(p,p); if(r2>1.0) discard; vec3 n=vec3(p,sqrt(1.0-r2)); vec3 L=vec3(sin(uE),0.0,-cos(uE));
        float d=dot(n,L); float lit=smoothstep(-0.02,0.06,d);
        vec2 uv=vec2(0.5+atan(n.x,n.z)/6.2831853, 0.5+asin(n.y)/3.14159265); vec3 t=texture2D(map,uv).rgb;
        vec3 col=t*(0.07+lit*(0.35+0.75*max(d,0.0))) + vec3(0.25,0.3,0.45)*pow(1.0-n.z,3.0)*0.35;
        gl_FragColor=vec4(col,1.0); }` }));
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
  C.cache = {}; C.last = {};
  return C;
}
const cpos = (r, th, z = 0) => new T.Vector3(r * Math.cos(th * D2R), r * Math.sin(th * D2R), z);
function clockDay(C, jd, loc) {
  if (C.day && jd >= C.day.sunrise && jd < C.day.nextSunrise && C.day.loc === loc) return C.day;
  let c = civ(jd, loc.tz); let p = P.panchanga(c.y, c.mo + 1, c.d, loc);
  if (jd < p.sunrise) { const d = new Date(Date.UTC(c.y, c.mo, c.d - 1)); p = P.panchanga(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), loc); }
  p.loc = loc; p.civil = civ(p.sunrise + 0.3, loc.tz); C.day = p; C.cache = {}; return p;
}
function angaNow(C, kind, jd) {
  const q = C.cache[kind]; if (q && jd >= q.s && jd < q.e) return q;
  const idx = P.angaAt(kind, jd); const r = { idx, s: P.angaStart(kind, jd), e: P.angaEnd(kind, jd) }; C.cache[kind] = r; return r;
}
function updateClock(C, jd, loc, panel) {
  const day = clockDay(C, jd, loc); const len = day.nextSunrise - day.sunrise; const f = (jd - day.sunrise) / len;
  const U = C.nz.material.uniforms; U.uDay.value = (day.sunset - day.sunrise) / len; const fr = (x) => (x - day.sunrise) / len;
  U.uR.value.set(fr(day.rahu[0]), fr(day.rahu[1])); U.uY.value.set(fr(day.yama[0]), fr(day.yama[1])); U.uG.value.set(fr(day.gulika[0]), fr(day.gulika[1])); U.uNow.value = f;
  const inR = jd >= day.rahu[0] && jd < day.rahu[1]; U.uHi.value = inR ? 1 : 0;
  C.hand.rotation.z = -f * 2 * Math.PI;
  const ls = P.sidSun(jd), lm = P.sidMoon(jd); const el = P.elong(jd);
  C.sun.position.copy(cpos(3.95, 90 + ls, 0.22)); C.moon.position.copy(cpos(3.95, 90 + lm, 0.22)); C.moon.rotation.y += 0.002;
  setRod(C.sunLine, cpos(1.55, 90 + ls, 0.2), cpos(3.8, 90 + ls, 0.2)); setRod(C.moonLine, cpos(1.55, 90 + lm, 0.21), cpos(3.8, 90 + lm, 0.21));
  C.tr.rotation.z = ls * D2R; C.moonD.material.uniforms.uE.value = el * D2R;
  const ys = (ls + lm) % 360; C.yPtr.position.copy(cpos(2.05, 90 + ys, 0.22)); setRod(C.yRod, cpos(1.72, 90 + ys, 0.2), cpos(2.38, 90 + ys, 0.2));
  const A = { tithi: angaNow(C, 'tithi', jd), nakshatra: angaNow(C, 'nakshatra', jd), yoga: angaNow(C, 'yoga', jd), karana: angaNow(C, 'karana', jd) };
  if (C.last.t !== A.tithi.idx) { C.last.t = A.tithi.idx; C.trHi.geometry.dispose(); C.trHi.geometry = new T.RingGeometry(2.45, 3.25, 16, 1, (90 + 12 * A.tithi.idx) * D2R, 12 * D2R); }
  if (C.last.n !== A.nakshatra.idx) { C.last.n = A.nakshatra.idx; C.nkHi.geometry.dispose(); C.nkHi.geometry = new T.RingGeometry(3.35, 4.2, 16, 1, (90 + A.nakshatra.idx * 360 / 27) * D2R, 360 / 27 * D2R); }
  if (C.last.y !== A.yoga.idx) { C.last.y = A.yoga.idx; C.yHi.geometry.dispose(); C.yHi.geometry = new T.RingGeometry(1.75, 2.35, 16, 1, (90 + A.yoga.idx * 360 / 27) * D2R, 360 / 27 * D2R); }
  if (panel) {
    const v = Math.max(0, Math.floor((jd - day.sunrise) * 86400 / 24)); const sv = (x) => String(x).padStart(2, '0');
    const set = (sel, s) => { const el2 = panel.querySelector(sel); if (el2 && el2.__v !== s) { el2.__v = s; el2.innerHTML = s; } };
    set('[data-vara]', P.N.vara[day.weekday]); set('[data-varata]', P.N.varaTa[day.weekday]);
    set('[data-sub]', `${day.civil.d} ${MON[day.civil.mo]} ${day.civil.y} · ${P.N.monthTaLat[day.tamilMonth]} ${day.tamilDay} · ${P.N.samvat[day.samvat]}`);
    set('[data-place]', `${loc.name} · sunrise ${fmt12(day.sunrise, loc.tz)} · sunset ${fmt12(day.sunset, loc.tz)}`);
    set('[data-nz]', `${sv(Math.floor(v / 60))}<span>:</span>${sv(v % 60)}`); set('[data-civil]', fmt12(jd, loc.tz).replace(/:(\d\d) /, (m0, m1) => `:${m1} `));
    const endStr = (e) => { const vv = vinazh(e, day.sunrise); return `ends ${Math.floor(vv / 60)}:${sv(vv % 60)} · ${fmt12(e, loc.tz)}${e > day.nextSunrise ? ' <small>next day</small>' : ''}`; };
    const rows = { tithi: tN(A.tithi.idx), nakshatra: P.N.nakshatra[A.nakshatra.idx], yoga: P.N.yoga[A.yoga.idx], karana: P.karanaName(A.karana.idx) };
    for (const k in rows) {
      set(`[data-row="${k}"] [data-v]`, rows[k]); set(`[data-row="${k}"] [data-e]`, endStr(A[k].e));
      const b = panel.querySelector(`[data-row="${k}"] .bar i`); if (b) b.style.width = `${(100 * clamp((jd - A[k].s) / (A[k].e - A[k].s))).toFixed(1)}%`;
    }
    set('[data-rahu]', `${fmt12(day.rahu[0], loc.tz)}–${fmt12(day.rahu[1], loc.tz)}`); set('[data-yama]', `${fmt12(day.yama[0], loc.tz)}–${fmt12(day.yama[1], loc.tz)}`); set('[data-gul]', `${fmt12(day.gulika[0], loc.tz)}–${fmt12(day.gulika[1], loc.tz)}`);
    panel.querySelector('.kala-r').classList.toggle('now', inR);
    panel.querySelector('.kala-y').classList.toggle('now', jd >= day.yama[0] && jd < day.yama[1]);
    panel.querySelector('.kala-g').classList.toggle('now', jd >= day.gulika[0] && jd < day.gulika[1]);
  }
  return { day, A, f };
}
const CLOCK_PANEL = `<div class="clockpanel">
  <div class="cp-top"><span class="cp-vara" data-vara></span><span class="cp-varata" data-varata></span></div>
  <div class="cp-sub" data-sub></div><div class="cp-place" data-place></div>
  <div class="cp-nz mono" data-nz></div><div class="cp-nzl">nāḻigai : vināḻigai since sunrise · <b data-civil></b></div>
  ${[['tithi', 'Tithi'], ['nakshatra', 'Nakṣatra'], ['yoga', 'Yoga'], ['karana', 'Karaṇa']].map(([k, n]) => `<div class="cp-row" data-row="${k}"><div class="cp-k">${n}</div><div class="cp-v" data-v></div><div class="cp-e mono" data-e></div><div class="bar"><i></i></div></div>`).join('')}
  <div class="cp-kala"><div class="kala-r"><i></i>Rāhu kālam <b data-rahu></b></div><div class="kala-y"><i></i>Yamagaṇḍam <b data-yama></b></div><div class="kala-g"><i></i>Kuḷikai <b data-gul></b></div></div>
</div>`;
function clockCam(K, lt, centered) {
  K.cam.position.set(Math.sin(lt * 0.05) * 0.6, -0.4 + Math.cos(lt * 0.04) * 0.4, centered ? 16 : 22.5); K.cam.lookAt(0, 0.1, 0); shiftView(K.cam, 0, 0);
  K.clock.g.position.set(centered ? 0 : -5.25, centered ? 0 : 0.35, 0); K.clock.g.rotation.y = Math.sin(lt * 0.07) * 0.08 + 0.1; K.clock.g.rotation.x = -0.1 + Math.sin(lt * 0.05) * 0.03;
}
function clockLights(S) { S.add(new T.AmbientLight(0x6070a0, 0.6)); const d = new T.DirectionalLight(0xfff0dc, 1.2); d.position.set(-4, 6, 10); S.add(d); const d2 = new T.DirectionalLight(0x9fb8ff, 0.4); d2.position.set(6, -3, 4); S.add(d2); }

// ---------------- 9 · Kālacakra (the clock) ----------------
chapter({
  key: 'clock', dev: 'कालचक्र', iast: 'Kālacakra', en: 'A Panchangam clock',
  caps: ['Put the pieces together and you get a Panchangam clock. Its main hand counts *nāḻigai*, starting from zero at sunrise.',
    'The gold arc is daytime and the blue arc is night. Their lengths change through the year, so sunset falls at a different *nāḻigai* each day.',
    'The next ring is the sky. The Sun and the Moon sit at their star longitudes among the 27 *nakṣatras*, with the 12 *rāśis* marked.',
    'Inside, the *tithi* ring turns with the Sun. Where the Moon\'s line crosses it you read the *tithi* and *karaṇa*. The inner ring tracks the *yoga*.',
    'None of these change on the hour. Each limb changes when the Sun or Moon crosses a boundary, and the clock computes those moments from their orbits.',
    `Watch 26 September 2026 in Chennai: *Viṣṭi* ends at ${S_.karEnd}, the Moon enters *Uttara Bhādrapadā* at ${S_.nakEnd}, and the yoga turns to *Vṛddhi* at ${S_.yogaEnd}.`,
    `*Pūrṇimā* ends at ${S_.tithiEnd}. At the next sunrise the hand returns to zero and a new day, *Ravivāra*, begins.`],
  build(K) {
    baseScene(K, 34); clockLights(K.scene); K.clock = buildClock(K.scene); K.clock.g.position.set(0, 0, 0);
    K.panel = html(K.ov, CLOCK_PANEL); K.panel.classList.add('film');
  },
  update(lt, K) {
    const c = K.cs, e = K.ce;
    const hrs = kf(lt, [[0, 0], [c[0], 0], [c[1], 0.9], [c[2], 1.8], [c[3], 2.6], [c[4], 3.5], [c[5], 4.45], [e[5], 7.55], [c[6], 8.2], [e[6] - 0.8, 24.2], [K.dur, 24.5]]);
    const jd = JD0 + hrs / 24;
    updateClock(K.clock, jd, LOC, K.panel);
    K.panel.style.opacity = sm(0.8, 2.2, lt);
    clockCam(K, lt);
    K.stars.rotation.y = lt * 0.002;
    // highlight panel rows when they are being explained
    const hl = { tithi: pulse(lt, c[3], e[3] + 0.5), nakshatra: pulse(lt, c[2], e[2] + 0.5), yoga: pulse(lt, c[3] + 3, e[3] + 0.5), karana: pulse(lt, c[3] + 3, e[3] + 0.5) };
    for (const k in hl) K.panel.querySelector(`[data-row="${k}"]`).style.setProperty('--hl', hl[k]);
  }
});

// ---------------- 10 · Muhūrta ----------------
const FAM = [['Nandā', '#3f86a8', 'joy'], ['Bhadrā', '#4f9d7a', 'well-being'], ['Jayā', '#c9a13d', 'victory'], ['Riktā', COL.kumkum, 'empty'], ['Pūrṇā', '#dccfae', 'full']];
const WED_STARS = [3, 4, 9, 11, 12, 14, 16, 18, 20, 25, 26];
function aippasiDays() {
  const out = [];
  for (let i = 0; i < 40; i++) {
    const dt = new Date(Date.UTC(2026, 9, 12 + i)); const y = dt.getUTCFullYear(), m = dt.getUTCMonth() + 1, d = dt.getUTCDate();
    const p = P.panchanga(y, m, d, LOC); if (p.tamilMonth !== 6) continue;
    const sr = p.sunrise; const ti = P.angaAt('tithi', sr), ka = P.angaAt('karana', sr), yo = P.angaAt('yoga', sr), nk = P.angaAt('nakshatra', sr);
    const tn = ti % 15 + 1;
    out.push({ d, m, wd: p.weekday, td: p.tamilDay, ti, ka, yo, nk,
      r1: [4, 9, 14].includes(tn) || ti === 29, r2: P.karanaName(ka) === 'Viṣṭi', r3: yo === 16 || yo === 26, r4: !WED_STARS.includes(nk) });
  }
  return out;
}
chapter({
  key: 'muhurta', dev: 'मुहूर्त', iast: 'Muhūrta', en: 'Choosing the moment',
  caps: ['The five limbs are read together to choose a *muhūrta*, a favourable moment to begin something.',
    'Daylight is cut into eight equal parts. By weekday, one part each goes to *Rāhu kālam*, *Yamagaṇḍam* and *Kuḷikai*.',
    `*Rāhu kālam* is avoided for new ventures. On a Saturday it is the third part: ${S_.rahu0} to ${S_.rahu1} in Chennai on 26 September 2026.`,
    '*Tithis* form five families: *Nandā*, *Bhadrā*, *Jayā*, *Riktā* and *Pūrṇā*. The *Riktā* or empty *tithis*, the 4th, 9th and 14th, are avoided for beginnings.',
    '*Nakṣatras* have natures. Fixed (*dhruva*) stars like *Rohiṇī* suit foundations and house-warming; movable (*cara*) stars like *Svātī* suit travel.',
    'Swift (*kṣipra*) stars like *Hasta* and *Puṣya* suit learning, medicine and trade. Soft (*mṛdu*) stars like *Revatī* suit the arts and new clothes.',
    '*Candrāṣṭamam*: when the Moon passes through the 8th *rāśi* from a person\'s birth *rāśi*, about two and a quarter days each month, that person postpones important starts.',
    'Tamil custom also sets whole months aside for weddings: *Āḍi*, *Puraṭṭāsi* and *Mārgazhi* are commonly avoided.',
    'A simplified wedding filter over Aippasi 2026, read at sunrise: drop *Riktā tithis* and *Amāvāsyā*, *Viṣṭi karaṇa*, *Vyatīpāta* and *Vaidhṛti yogas*, and keep only favourable stars.',
    'A handful of days remain. A real *muhūrta* goes further, checking the rising sign (*lagna*) and the couple\'s stars, but it is built from these same five limbs.'],
  build(K) {
    baseScene(K, 38); const S = K.scene;
    S.add(new T.AmbientLight(0x5060a0, 0.6)); const dl = new T.DirectionalLight(0xfff0dc, 1.2); dl.position.set(-3, 8, 6); S.add(dl);
    // --- arch group
    K.A = new T.Group(); S.add(K.A);
    const floor = new T.Mesh(new T.CircleGeometry(8.2, 128), new T.MeshStandardMaterial({ color: 0x141c3e, roughness: 0.9 })); floor.rotation.x = -Math.PI / 2; K.A.add(floor);
    for (const r of [2, 4, 6, 8]) K.A.add(ringLine(r, COL.gold, 0.18, 0.012));
    K.segs = []; for (let i = 0; i < 8; i++) { const m = new T.Mesh(new T.TorusGeometry(5.6, 0.2, 16, 32, Math.PI / 8 - 0.012), new T.MeshStandardMaterial({ color: 0x2b3a78, roughness: 0.5, emissive: 0x2b3a78, emissiveIntensity: 0.3 })); m.rotation.z = Math.PI - (i + 1) * Math.PI / 8 + 0.006; K.A.add(m); K.segs.push(m);
      const lb = label([{ t: String(i + 1), f: `600 44px ${F.mono}`, c: COL.muted }], 0.42); const a = Math.PI - (i + 0.5) * Math.PI / 8; lb.position.set(6.55 * Math.cos(a), 6.55 * Math.sin(a), 0); K.A.add(lb); }
    K.aSun = makeSun(0.36, 9); K.A.add(K.aSun);
    const lE = label([{ t: 'pūrva', f: `italic 44px ${F.skt}`, c: COL.goldSoft }, { t: 'east · sunrise', f: `26px ${F.sans}`, c: COL.muted }], 0.75); lE.position.set(-6.9, 0.6, 0.6); K.A.add(lE);
    const lW = label([{ t: 'paścima', f: `italic 44px ${F.skt}`, c: COL.goldSoft }, { t: 'west · sunset', f: `26px ${F.sans}`, c: COL.muted }], 0.75); lW.position.set(6.9, 0.6, 0.6); K.A.add(lW);
    K.table = html(K.ov, `<div class="panel ktable"><div class="kt-h"><span></span>${[1, 2, 3, 4, 5, 6, 7, 8].map((i) => `<b>${i}</b>`).join('')}</div>${P.N.vara.map((v, wd) => `<div class="kt-r" data-wd="${wd}"><span><em>${v.replace('vāra', '')}</em></span>${[1, 2, 3, 4, 5, 6, 7, 8].map((i) => `<i class="${P.RAHU[wd] === i ? 'r' : P.YAMA[wd] === i ? 'y' : P.GULIKA[wd] === i ? 'g' : ''}">${P.RAHU[wd] === i ? 'R' : P.YAMA[wd] === i ? 'Y' : P.GULIKA[wd] === i ? 'K' : ''}</i>`).join('')}</div>`).join('')}<div class="kt-leg"><span class="r">R</span> Rāhu kālam <span class="y">Y</span> Yamagaṇḍam <span class="g">K</span> Kuḷikai</div></div>`);
    K.sat = html(K.ov, `<div class="chip satchip"><div class="chip-k">Śanivāra · 26 Sep 2026 · Chennai</div><div class="kline"><i class="r"></i>Rāhu kālam <b>${S_.rahu0}–${S_.rahu1}</b></div><div class="kline"><i class="y"></i>Yamagaṇḍam <b>${fmt12(PD.yama[0])}–${fmt12(PD.yama[1])}</b></div><div class="kline"><i class="g"></i>Kuḷikai <b>${fmt12(PD.gulika[0])}–${fmt12(PD.gulika[1])}</b></div></div>`);
    // --- ring group
    K.R = new T.Group(); S.add(K.R);
    K.fam = []; const tg = new T.BoxGeometry(0.8, 0.18, 0.92);
    for (let k = 0; k < 30; k++) { const n = k % 15 + 1, f = (n - 1) % 5; const col = FAM[f][1]; const m = new T.Mesh(tg, new T.MeshStandardMaterial({ color: col, roughness: 0.5, emissive: new T.Color(col), emissiveIntensity: 0.15, transparent: true })); const a = 12 * k + 6; m.position.copy(onRing(5.4, a, 0.1)); m.rotation.y = a * D2R; K.R.add(m);
      const lb = label([{ t: String(n), f: `600 40px ${F.mono}`, c: f === 4 ? '#1c1810' : COL.star }], 0.36, { shadow: 0 }); lb.position.copy(onRing(5.4, a, 0.34)); K.R.add(lb); K.fam.push({ m, lb, f }); }
    K.famLeg = html(K.ov, `<div class="panel legend fam">${FAM.map(([n, c2, g]) => `<div class="lg ${n === 'Riktā' ? 'bad' : ''}"><i style="background:${c2}"></i><em>${n}</em><small>${g}</small></div>`).join('')}<div class="lg-note">tithis 1·6·11, 2·7·12, 3·8·13, 4·9·14, 5·10·15</div></div>`);
    K.nat = zodiacMesh(TX.nature, true); K.R.add(K.nat);
    K.natHi = []; for (let k = 0; k < 27; k++) { const s2 = sector(ZR.nk0, ZR.nk1, k * 360 / 27, (k + 1) * 360 / 27, 0xffffff, 0.0); K.R.add(s2); K.natHi.push(s2); }
    K.natLeg = html(K.ov, `<div class="panel legend nat">${Object.keys(NATURE).map((n) => `<div class="lg" data-n="${n}"><i style="background:${NATCOL[n]}"></i><em>${NATNAME[n][0]}</em><small>${NATNAME[n][1]}</small><span>${NATURE[n].map((k) => P.N.nakshatra[k]).join(', ')}</span></div>`).join('')}</div>`);
    K.zod = zodiacMesh(TX.zodiac); K.R.add(K.zod);
    K.birth = sector(ZR.ra0, ZR.ra1, 120, 150, COL.gold, 0.4); K.eighth = sector(ZR.ra0, ZR.ra1, 330, 360, COL.kumkum, 0.55); K.R.add(K.birth, K.eighth);
    K.lBirth = label([{ t: 'janma rāśi · Siṃha', f: `italic 42px ${F.skt}`, c: COL.goldSoft }, { t: 'example birth sign', f: `26px ${F.sans}`, c: COL.muted }], 1.9); K.lBirth.position.copy(onRing(10.2, 135, 1.2)); K.R.add(K.lBirth);
    K.lEighth = label([{ t: '8th · Mīna', f: `italic 42px ${F.skt}`, c: '#ffb3a8' }, { t: 'Candrāṣṭamam', f: `26px ${F.sans}`, c: COL.muted }], 1.9); K.lEighth.position.copy(onRing(10.6, 345, 1.2)); K.R.add(K.lEighth);
    K.cMoon = makeMoon(0.3); K.R.add(K.cMoon);
    K.months = [3, 5, 8].map((i) => { const s2 = sector(ZR.ta0, ZR.ta1, i * 30, i * 30 + 30, COL.kumkum, 0.6); K.R.add(s2); return s2; });
    K.earth = makeEarth(0.9); K.R.add(K.earth);
    // --- filter grid
    K.days = aippasiDays();
    K.grid = html(K.ov, `<div class="fgrid"><div class="rules">${['Riktā & Amāvāsyā', 'Viṣṭi karaṇa', 'Vyatīpāta · Vaidhṛti', 'unfavourable star'].map((r, i) => `<span data-r="${i}">${i + 1}. ${r}</span>`).join('')}</div><div class="tiles">${K.days.map((d) => { const t = P.tithiName(d.ti); return `<div class="tile"><b>Aippasi ${d.td}</b><span>${d.d} ${MON[d.m - 1]} · ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.wd]}</span><i>${t.paksha[0]}${t.paksha === 'Śukla' ? '' : ''} ${t.name}</i><i>${P.N.nakshatra[d.nk]}</i><em class="why"></em></div>`; }).join('')}</div><div class="fcount"></div></div>`);
  },
  update(lt, K) {
    const c = K.cs, e = K.ce;
    // stage selection
    const sA = 1 - sm(e[2] + 0.1, c[3] + 0.2, lt); const sR = sm(e[2] + 0.1, c[3] + 0.2, lt);
    setOpacity(K.A, sA); K.R.visible = sR > 0.01;
    // --- arch
    let wd = 6; if (lt < c[2]) { const q = seg(lt, c[1] + 0.8, e[1] - 0.4); wd = lt < c[1] + 0.8 ? 6 : Math.min(6, Math.floor(q * 7)); }
    K.segs.forEach((m, i) => { const n = i + 1; const col = P.RAHU[wd] === n ? COL.kumkum : P.YAMA[wd] === n ? COL.plum : P.GULIKA[wd] === n ? COL.copper : '#2b3a78'; const on = lt > c[1] ? 1 : 0; m.material.color.set(on ? col : '#2b3a78'); m.material.emissive.set(on ? col : '#2b3a78'); m.material.emissiveIntensity = on && col !== '#2b3a78' ? 0.55 : 0.25; m.position.z = 0; });
    const f = ((lt * 0.07) % 1); const a = Math.PI * (1 - f); K.aSun.position.set(5.6 * Math.cos(a), 5.6 * Math.sin(a), 0.35);
    K.table.style.opacity = pulse(lt, c[1] + 0.3, e[2] + 0.3); K.table.querySelectorAll('.kt-r').forEach((r) => r.classList.toggle('on', +r.dataset.wd === wd && lt > c[1] + 0.8));
    K.sat.style.opacity = pulse(lt, c[2] + 0.5, e[2] + 0.3);
    // --- rings
    const fam = pulse(lt, c[3] - 0.2, e[3] + 0.6), nat = pulse(lt, c[4] - 0.3, e[5] + 0.6), cha = pulse(lt, c[6] - 0.3, e[6] + 0.6), mon = pulse(lt, c[7] - 0.3, K.dur + 2);
    const rk = sm(c[3] + 3, c[3] + 4, lt);
    K.fam.forEach((t) => { const bad = t.f === 3; t.m.position.y = 0.1 + (bad ? 0.5 * rk : 0); t.m.material.emissiveIntensity = 0.15 + (bad ? 0.7 * rk * (0.7 + 0.3 * Math.sin(lt * 5)) : 0); t.m.material.opacity = fam * (bad || rk < 0.01 ? 1 : 1 - 0.55 * rk); setOpacity(t.lb, fam); t.m.visible = fam > 0.01; });
    K.famLeg.style.opacity = fam;
    K.nat.material.uniforms.uOp.value = nat; K.nat.visible = nat > 0.01;
    const hiSet = lt < c[5] ? ['dhruva', 'cara'] : ['ksipra', 'mrdu'];
    K.natHi.forEach((s2, k) => { const on = hiSet.includes(natureOf(k)) ? 1 : 0; s2.material.opacity = nat * on * (0.18 + 0.12 * Math.sin(lt * 4)); s2.visible = nat > 0.01; });
    K.natLeg.style.opacity = nat; K.natLeg.querySelectorAll('.lg').forEach((x) => x.classList.toggle('on', hiSet.includes(x.dataset.n)));
    const zU = K.zod.material.uniforms; zU.uOp.value = Math.max(cha, mon); zU.uA2.value = 0; zU.uA0.value = mon; zU.uA1.value = cha + mon * 0.45; K.zod.visible = zU.uOp.value > 0.01;
    setOpacity(K.birth, cha); setOpacity(K.eighth, cha * (0.75 + 0.25 * Math.sin(lt * 4))); setOpacity(K.lBirth, cha); setOpacity(K.lEighth, cha);
    const ml = lerp(300, 385, seg(lt, c[6], e[6])); K.cMoon.position.copy(onRing(7.7, ml, 0.5)); setOpacity(K.cMoon, cha);
    K.months.forEach((s2) => setOpacity(s2, mon * (0.8 + 0.2 * Math.sin(lt * 4))));
    setOpacity(K.earth, sR * (1 - sm(c[8] - 0.5, c[8] + 0.5, lt))); K.earth.rotation.y = lt * 0.2;
    // --- filter
    const fg = sm(c[8] - 0.3, c[8] + 0.6, lt); K.grid.style.opacity = fg; K.veil = fg * 0.55;
    const rt = [0, 1, 2, 3].map((i) => c[8] + 1.6 + i * (e[8] - c[8] - 2) / 4);
    K.grid.querySelectorAll('[data-r]').forEach((s2, i) => s2.classList.toggle('on', lt >= rt[i]));
    let alive = 0;
    K.grid.querySelectorAll('.tile').forEach((el, j) => {
      const d = K.days[j]; let why = '', tOut = 0; const rs = [d.r1, d.r2, d.r3, d.r4]; for (let i = 0; i < 4; i++) if (rs[i] && lt >= rt[i]) { why = String(i + 1); tOut = rt[i]; break; }
      const o = why ? sm(tOut, tOut + 0.5, lt) : 0; const kp = why ? 0 : sm(c[9] - 0.3, c[9] + 0.4, lt);
      el.style.opacity = (1 - 0.72 * o).toFixed(3); el.style.transform = `translateZ(${(-60 * o).toFixed(1)}px) rotateX(${(18 * o).toFixed(1)}deg)`;
      el.style.background = kp > 0 ? `rgba(${Math.round(lerp(22, 227 * 0.22 + 22 * 0.78, kp))},${Math.round(lerp(30, 174 * 0.22 + 30 * 0.78, kp))},${Math.round(lerp(66, 74 * 0.22 + 66 * 0.78, kp))},0.95)` : '';
      el.style.borderColor = kp > 0.5 ? COL.gold : ''; el.style.boxShadow = kp > 0 ? `0 0 ${Math.round(24 * kp)}px rgba(227,174,74,${(0.35 * kp).toFixed(2)})` : '';
      el.querySelector('.why').textContent = why ? `✕ ${why}` : ''; if (!why) alive++;
    });
    K.grid.querySelector('.fcount').innerHTML = lt >= rt[3] ? `<b>${alive}</b> of ${K.days.length} days remain` : `${K.days.length} days of Aippasi 2026`;
    // camera
    const tA = new T.PerspectiveCamera(); tA.position.set(Math.sin(lt * 0.05) * 1.2 + 1.9, 3.4, 15.5); tA.lookAt(1.9, 2.5, 0);
    const tR = new T.PerspectiveCamera(); camOrbit(tR, new T.Vector3(0, 0, 0.6), 35, 270 + lt * 0.5, lt < c[6] - 0.3 ? 62 : 70);
    const mix = ease(sR); K.cam.position.lerpVectors(tA.position, tR.position, mix); K.cam.quaternion.slerpQuaternions(tA.quaternion, tR.quaternion, mix);
    shiftView(K.cam, 210 * sR, 44 * sR);
    K.stars.rotation.y = lt * 0.002;
  }
});

// ---------------- 11 · Close ----------------
chapter({
  key: 'close', noCard: true, dev: 'उपसंहार', iast: 'Upasaṃhāra', en: 'Closing', tail: 6,
  caps: ['Five limbs, two lights, and one sunrise to count from.',
    'A Panchangam is a clock whose hands are the Sun and the Moon.'],
  build(K) {
    baseScene(K, 38); const S = K.scene;
    S.add(new T.AmbientLight(0x2c3558, 0.3)); const dl = new T.DirectionalLight(0xfff1da, 1.9); dl.position.set(50, 0, 0); S.add(dl);
    K.sun = makeSun(3.2, 14); K.sun.position.set(46, 0.5, -3); S.add(K.sun);
    K.earth = makeEarth(0.8); S.add(K.earth); K.moon = makeMoon(0.28); K.moon.position.copy(onRing(3.4, 180, 0.1)); S.add(K.moon);
    K.ring = zodiacMesh(TX.zodiac, true); K.ring.scale.setScalar(1.35); S.add(K.ring);
    K.orbit = ringLine(3.4, 0x9fb0c8, 0.3, 0.01); S.add(K.orbit);
    K.card = html(K.ov, `<div class="panel summary"><div class="sm-h"><span class="dv">पञ्चाङ्गम्</span><span>Śanivāra · 26 Sep 2026 · Chennai</span></div><div class="sm-sub">Parābhava year · Puraṭṭāsi 10 · sunrise ${S_.sunrise}</div>
      <dl><dt>Tithi</dt><dd><em>Śukla Pūrṇimā</em> until ${S_.tithiEnd}</dd><dt>Vāra</dt><dd><em>Śanivāra</em> · சனி</dd><dt>Nakṣatra</dt><dd><em>Pūrva Bhādrapadā</em> until ${S_.nakEnd}, then <em>Uttara Bhādrapadā</em></dd><dt>Yoga</dt><dd><em>Gaṇḍa</em> until ${S_.yogaEnd}, then <em>Vṛddhi</em></dd><dt>Karaṇa</dt><dd><em>Viṣṭi</em> until ${S_.karEnd}, then <em>Bava</em></dd></dl></div>`);
    K.end = html(K.ov, `<div class="endtitle"><div class="t-dev">पञ्चाङ्गम्</div><div class="t-lat">Pañcāṅgam</div></div>`);
  },
  update(lt, K) {
    const c = K.cs;
    const f = ease(seg(lt, 0, K.dur)); const tmp = new T.PerspectiveCamera();
    camOrbit(K.cam, new T.Vector3(0.5, 0, 0), lerp(9, 30, f), 215 + lt * 1.2, lerp(22, 58, f));
    K.earth.rotation.y = lt * 0.25; K.moon.rotation.y = lt * 0.1; K.ring.rotation.y = lt * 0.01;
    K.ring.material.uniforms.uOp.value = sm(1, 5, lt) * 0.8;
    K.card.style.opacity = pulse(lt, 0.8, c[1] + 2.2); K.end.style.opacity = sm(c[1] + 2.4, c[1] + 3.6, lt);
    K.stars.rotation.y = lt * 0.002;
  }
});
