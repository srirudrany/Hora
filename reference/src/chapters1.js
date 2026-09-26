// ===== chapters =====
const CH = [];
function chapter(def) { CH.push(def); return def; }
function baseScene(K, fov = 40) {
  K.scene = new T.Scene(); K.cam = new T.PerspectiveCamera(fov, W / H, 0.05, 2000);
  K.stars = makeStars(); K.scene.add(K.stars);
  K.ov = document.createElement('div'); K.ov.className = 'ov'; K.ov.hidden = true; $('#overlays').appendChild(K.ov);
}
function html(el, s) { el.insertAdjacentHTML('beforeend', s); return el.lastElementChild; }
// piecewise-linear rate integration: keys [[t, rate], ...]
function integ(lt, keys) {
  const rate = (t) => { if (t <= keys[0][0]) return keys[0][1]; for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], (t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0])); return keys[keys.length - 1][1]; };
  let s = 0, t = 0; const dt = 0.05; while (t < lt) { const h = Math.min(dt, lt - t); s += rate(t + h / 2) * h; t += h; } return s;
}
// keyframe tween: keys [[t, v], ...] with ease between
function kf(lt, keys) { if (lt <= keys[0][0]) return keys[0][1]; for (let i = 1; i < keys.length; i++) if (lt <= keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], ease((lt - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]))); return keys[keys.length - 1][1]; }
const lamDelta = (a, b) => { let d = ((b - a) % 360 + 540) % 360 - 180; return d; };
function moonLat(jd) { const T_ = (jd - 2451545) / 36525; const om = 125.04452 - 1934.136261 * T_; return 5.145 * Math.sin((P.moonLon(jd) - om) * D2R); }
const tN = (i) => { const t = P.tithiName(i); return `${t.paksha} ${t.name}`; };

// derived strings for captions
const S_ = {
  sunrise: fmt12(PD.sunrise), tithiEnd: fmt12(PD.tithi[0].end), nakEnd: fmt12(PD.nakshatra[0].end), yogaEnd: fmt12(PD.yoga[0].end),
  karEnd: fmt12(PD.karana[0].end), rahu0: fmt12(PD.rahu[0]), rahu1: fmt12(PD.rahu[1]), ayan: degStr(PD.ayanamsa),
  nzTithi: nzStr(PD.tithi[0].end, PD.sunrise), kanyaDeg: degStr(PD.sunSid - 150)
};

// ---------------- 0 · Title ----------------
chapter({
  key: 'intro', noCard: true, dev: 'पञ्चाङ्गम्', iast: 'Pañcāṅgam', en: 'Five limbs of time', lead: 3.6,
  caps: ['In Tamil homes the Panchangam is read each morning, like a clock set for the whole day.',
    'Its name is Sanskrit: *pañca*, five, and *aṅga*, limb. Five quantities, each read from the sky.',
    '*Tithi*, *Vāra*, *Nakṣatra*, *Yoga* and *Karaṇa*. This film shows where each one comes from, and how together they make a clock.'],
  build(K) {
    baseScene(K, 34); const S = K.scene;
    S.add(new T.AmbientLight(0x2a3358, 0.35));
    const sunPos = new T.Vector3(-70, 14, -55); const dl = new T.DirectionalLight(0xfff1d8, 1.7); dl.position.copy(sunPos); S.add(dl);
    K.sun = makeSun(3.2, 12); K.sun.position.copy(sunPos); S.add(K.sun);
    K.moon = makeMoon(1.55); K.moon.position.set(2.9, -0.15, 0); S.add(K.moon);
    K.orbit = ringLine(3.4, COL.gold, 0.5, 0.012); K.orbit.position.copy(K.moon.position); K.orbit.rotation.set(1.28, 0.3, 0); S.add(K.orbit);
    
    K.title = html(K.ov, `<div class="title-block"><div class="t-dev">पञ्चाङ्गम्</div><div class="t-ta">பஞ்சாங்கம்</div><div class="t-lat">Pañcāṅgam</div><div class="t-sub">Five limbs of time, and the clock inside a Tamil almanac</div></div>`);
    K.limbs = html(K.ov, `<div class="limbs">${[['तिथि', 'Tithi', 'lunar day'], ['वार', 'Vāra', 'weekday'], ['नक्षत्र', 'Nakṣatra', 'lunar mansion'], ['योग', 'Yoga', 'sum'], ['करण', 'Karaṇa', 'half-tithi']].map(([d, l, e]) => `<div class="limb"><b>${d}</b><span>${l}</span><i>${e}</i></div>`).join('')}</div>`);
  },
  update(lt, K) {
    const c = K.cs;
    K.cam.position.set(lerp(0.6, -0.4, lt / K.dur), lerp(0.7, 0.35, lt / K.dur), lerp(12, 10.2, ease(clamp(lt / K.dur))));
    K.cam.lookAt(1.2, 0, 0);
    K.moon.rotation.y = 0.4 + lt * 0.03; K.stars.rotation.y = lt * 0.004;
    K.orbit.material.opacity = 0.45 * sm(1, 4, lt);
    const a = sm(0.5, 2.6, lt); K.title.style.opacity = a; K.title.style.transform = `translateY(${(1 - a) * 18}px)`;
    [...K.limbs.children].forEach((el, i) => { const b = sm(c[2] + i * 0.35, c[2] + i * 0.35 + 0.8, lt); el.style.opacity = b; el.style.transform = `translateY(${(1 - b) * 14}px)`; });
  }
});

// ---------------- 1 · Krāntivṛtta ----------------
chapter({
  key: 'ecliptic', dev: 'क्रान्तिवृत्त', iast: 'Krāntivṛtta', en: 'The road of the two lights',
  caps: ['Seen from Earth, the Sun and the Moon travel the same road across the stars: the ecliptic, *krāntivṛtta*.',
    'The Sun takes a year to go around once. The Moon goes around in about 27⅓ days.',
    'Every limb of the Panchangam measures where these two lights stand on that road.',
    'The Panchangam uses a *nirayana* zodiac, fixed to the stars. Its anchor is the star *Citrā* (Spica), set at exactly 180°.',
    'The equinox point used by the tropical (*sāyana*) zodiac slides back about 50″ a year, because Earth\'s axis slowly wobbles.',
    `The gap between the two zodiacs is the *ayanāṁśa*. By the Lahiri reckoning it is about ${S_.ayan} in 2026.`],
  build(K) {
    baseScene(K, 38); const S = K.scene;
    S.add(new T.AmbientLight(0x3a4670, 0.45));
    K.sunL = new T.PointLight(0xfff0d8, 2.0, 0, 0); S.add(K.sunL);
    K.earthG = new T.Group(); K.earth = makeEarth(1); K.earthG.add(K.earth);
    K.axis = rod(COL.teal, 0.9, 0.018); setRod(K.axis, new T.Vector3(0, -1.9, 0), new T.Vector3(0, 1.9, 0)); K.earthG.add(K.axis); S.add(K.earthG);
    K.ecl = ringLine(9, COL.gold, 0.85, 0.035); S.add(K.ecl);
    K.ticks = new T.Group(); for (let i = 0; i < 12; i++) { const r = rod(COL.gold, 0.8, 0.02); setRod(r, onRing(8.7, i * 30), onRing(9.3, i * 30)); K.ticks.add(r); } S.add(K.ticks);
    K.eqG = new T.Group(); K.eq = ringLine(8.85, COL.teal, 0.55, 0.02); K.eqG.add(K.eq); S.add(K.eqG);
    K.moG = new T.Group(); K.mo = ringLine(4.2, 0x9fb0c8, 0.4, 0.012); K.moG.add(K.mo); S.add(K.moG);
    K.sun = makeSun(0.55, 10); S.add(K.sun); K.moon = makeMoon(0.32); S.add(K.moon);
    K.sunLine = rod(COL.gold, 0.35, 0.012); K.moonLine = rod(0xc8d4e4, 0.35, 0.012); S.add(K.sunLine, K.moonLine);
    K.lEcl = label([{ t: 'krāntivṛtta', f: `italic 46px ${F.skt}`, c: COL.goldSoft }, { t: 'the ecliptic', f: `28px ${F.sans}`, c: COL.muted }], 2.1); K.lEcl.position.copy(onRing(10.3, 128, 0.6)); S.add(K.lEcl);
    K.lSun = label([{ t: 'Sūrya', f: `italic 44px ${F.skt}`, c: COL.goldSoft }], 1.15); S.add(K.lSun);
    K.lMoon = label([{ t: 'Candra', f: `italic 44px ${F.skt}`, c: COL.moon }], 1.0); S.add(K.lMoon);
    // precession kit
    const oct = (col) => new T.Mesh(new T.OctahedronGeometry(0.22), new T.MeshBasicMaterial({ color: col, transparent: true }));
    K.vern = oct(COL.teal); S.add(K.vern); K.nir = oct(COL.gold); K.nir.position.copy(onRing(9, 0)); S.add(K.nir);
    K.lVern = label([{ t: 'sāyana 0°', f: `italic 40px ${F.skt}`, c: COL.teal }, { t: 'equinox', f: `26px ${F.sans}`, c: COL.muted }], 1.7); S.add(K.lVern);
    K.lNir = label([{ t: 'nirayana 0°', f: `italic 40px ${F.skt}`, c: COL.goldSoft }, { t: 'start of Aśvinī', f: `26px ${F.sans}`, c: COL.muted }], 1.7); K.lNir.position.copy(onRing(9.4, 14, 1.6)); S.add(K.lNir);
    K.spica = new T.Sprite(new T.SpriteMaterial({ map: TX.soft, color: 0xcfe0ff, blending: T.AdditiveBlending, transparent: true, depthWrite: false })); K.spica.scale.setScalar(1.1); K.spica.position.copy(onRing(9, 180, -0.31)); S.add(K.spica);
    K.lSpica = label([{ t: 'Citrā · 180°', f: `italic 42px ${F.skt}`, c: '#dfe8ff' }, { t: 'Spica, the anchor star', f: `26px ${F.sans}`, c: COL.muted }], 1.8); K.lSpica.position.copy(onRing(10.6, 180, 0.9)); S.add(K.lSpica);
    K.arc = sector(8.55, 9.45, -1, 0, COL.teal, 0.4); S.add(K.arc);
    K.cone = ringLine(2.3 * Math.sin(23.44 * D2R), COL.teal, 0.35, 0.01, 96); K.cone.position.y = 2.3 * Math.cos(23.44 * D2R); S.add(K.cone);
    K.yr = html(K.ov, `<div class="chip tr"><div class="chip-k">year</div><div class="chip-v mono" data-y>285 CE</div><div class="chip-k">ayanāṁśa</div><div class="chip-v mono" data-a>0°00′</div></div>`);
  },
  update(lt, K) {
    const c = K.cs, e = K.ce;
    const rv = sm(0.2, 2.2, lt);
    // time-lapse
    const jd = JD0 - 70 + integ(lt, [[0, 0.4], [c[1], 0.5], [c[1] + 0.6, 6], [e[1], 6], [e[1] + 0.8, 1.2], [c[3], 0.9]]);
    const ls = P.sidSun(jd), lm = P.sidMoon(jd), bm = moonLat(jd);
    K.sun.position.copy(onRing(9, ls)); K.sunL.position.copy(K.sun.position);
    const mp = onRing(4.2 * Math.cos(bm * D2R), lm, 4.2 * Math.sin(bm * D2R)); K.moon.position.copy(mp);
    const T_ = (jd - 2451545) / 36525, om = 125.04452 - 1934.136261 * T_ - P.ayanamsa(jd);
    K.moG.quaternion.setFromAxisAngle(new T.Vector3(Math.cos(om * D2R), 0, -Math.sin(om * D2R)), 5.145 * D2R);
    setRod(K.sunLine, new T.Vector3(), K.sun.position); setRod(K.moonLine, new T.Vector3(), mp);
    K.lSun.position.copy(onRing(9, ls, 1.5)); K.lMoon.position.copy(mp).add(new T.Vector3(0, 1.0, 0));
    // precession phase
    const ayNow = P.ayanamsa(jd);
    let p = 1; if (lt > c[4] - 0.2) p = lt < c[4] + 1.2 ? 1 - sm(c[4] - 0.2, c[4] + 1.2, lt) : sm(c[4] + 1.6, c[5] + 3.5, lt);
    const ay = ayNow * p, nu = -ay;
    const n = new T.Vector3(Math.cos(nu * D2R), 0, -Math.sin(nu * D2R)); const q = new T.Quaternion().setFromAxisAngle(n, -23.44 * D2R);
    K.earthG.quaternion.copy(q); K.eqG.quaternion.copy(q);
    K.earth.children[0].rotation.y = lt * 0.25;
    K.vern.position.copy(onRing(9, nu)); K.lVern.position.copy(onRing(11.0, nu - 12, -1.2)); K.vern.rotation.y = lt;
    K.nir.rotation.y = lt;
    setSector(K.arc, 8.55, 9.45, nu, 0);
    // opacities
    setOpacity(K.ecl, rv); setOpacity(K.ticks, rv); setOpacity(K.lEcl, rv * (1 - sm(c[3] - 1, c[3], lt)));
    setOpacity(K.mo, sm(1, 3, lt)); setOpacity(K.sunLine, sm(c[1], c[1] + 1, lt) * (1 - sm(c[3], c[3] + 1, lt))); setOpacity(K.moonLine, sm(c[1], c[1] + 1, lt) * (1 - sm(c[3], c[3] + 1, lt)));
    const a3 = sm(c[3], c[3] + 1.2, lt), a4 = sm(c[4], c[4] + 1, lt), a5 = sm(c[5], c[5] + 1, lt);
    setOpacity(K.spica, a3); setOpacity(K.lSpica, a3); setOpacity(K.nir, a3); setOpacity(K.lNir, a3);
    setOpacity(K.vern, a4); setOpacity(K.lVern, a4); setOpacity(K.eqG, a4); setOpacity(K.axis, a4); setOpacity(K.cone, a4 * 0.8);
    setOpacity(K.arc, Math.max(a4 * 0.6, a5));
    K.yr.style.opacity = sm(c[4] + 0.6, c[4] + 1.4, lt);
    K.yr.querySelector('[data-y]').textContent = `${Math.round(lerp(285, 2026, p))} CE`;
    K.yr.querySelector('[data-a]').textContent = degStr(ay);
    // camera
    const el = kf(lt, [[0, 22], [c[3] - 1, 26], [c[3] + 2, 50], [c[4], 42], [c[5] + 2, 58]]);
    const dist = kf(lt, [[0, 27], [c[2], 24], [c[4], 21.5], [K.dur, 22.5]]);
    camOrbit(K.cam, new T.Vector3(0, 0, 0), dist, 262 + lt * 1.3, el); shiftView(K.cam, 0, 36);
    K.stars.rotation.y = lt * 0.003;
  }
});

// ---------------- 2 · Rāśi and Nakṣatra ----------------
chapter({
  key: 'zodiac', dev: 'राशि · नक्षत्र', iast: 'Rāśi · Nakṣatra', en: 'Two ways to divide the circle',
  caps: ['The circle of 360° is divided in two ways. First, twelve *rāśis* of 30° each, from *Meṣa* to *Mīna*.',
    'The Tamil month is solar. Chithirai begins when the Sun enters *Meṣa*, and each month lasts while the Sun stays in one *rāśi*.',
    'Second, twenty-seven *nakṣatras* of 13°20′ each, from *Aśvinī* to *Revatī*.',
    'The Moon moves about 13° a day, so it passes through roughly one *nakṣatra* each day.',
    `On 26 September 2026 the Sun stands at ${S_.kanyaDeg} in *Kanyā*, so the Tamil date is Puraṭṭāsi 10.`,
    'Years are named from a cycle of sixty, about five rounds of Jupiter (*Bṛhaspati*). The year that began in April 2026 is *Parābhava*, the 40th.'],
  build(K) {
    baseScene(K, 40); const S = K.scene;
    S.add(new T.AmbientLight(0x4a5680, 0.55)); const dl = new T.DirectionalLight(0xfff2de, 1.4); dl.position.set(3, 10, 6); S.add(dl);
    K.ring = zodiacMesh(TX.zodiac); S.add(K.ring);
    K.earth = makeEarth(0.9); S.add(K.earth);
    K.sun = makeSun(0.36, 9); S.add(K.sun); K.moon = makeMoon(0.3); S.add(K.moon);
    K.gS = new T.Group(); K.gS.add(sector(ZR.ta0, ZR.ra1, 0, 30, COL.gold, 0.28)); S.add(K.gS);
    K.gM = new T.Group(); K.gM.add(sector(ZR.nk0, ZR.nk1, 0, 360 / 27, 0xbcd0f0, 0.26)); S.add(K.gM);
    K.beads = new T.Group(); for (let i = 0; i < 60; i++) { const b = new T.Mesh(new T.SphereGeometry(i === 39 ? 0.2 : 0.12, 16, 12), new T.MeshBasicMaterial({ color: i === 39 ? COL.gold : 0x5b6690, transparent: true })); b.position.copy(onRing(11.4, 90 - i * 6, 0)); K.beads.add(b); } S.add(K.beads);
    K.jup = new T.Mesh(new T.SphereGeometry(0.32, 32, 24), new T.MeshStandardMaterial({ color: 0xd9a066, roughness: 0.8 })); S.add(K.jup);
    K.lPar = label([{ t: 'Parābhava', f: `italic 50px ${F.skt}`, c: COL.goldSoft }, { t: '40th year · 2026–27', f: `28px ${F.sans}`, c: COL.muted }], 2.0); K.lPar.position.copy(onRing(12.9, 90 - 39 * 6, 0.4)); S.add(K.lPar);
    K.lPrab = label([{ t: 'Prabhava', f: `italic 40px ${F.skt}`, c: COL.star }, { t: '1st', f: `26px ${F.sans}`, c: COL.muted }], 1.5); K.lPrab.position.copy(onRing(12.6, 90, 0.4)); S.add(K.lPrab);
    K.card = html(K.ov, `<div class="card datecard"><div class="dc-ta">புரட்டாசி 10</div><div class="dc-lat">Puraṭṭāsi 10</div><div class="dc-note">Sun in <em>Kanyā</em> ${S_.kanyaDeg} · Moon in <em>${P.N.nakshatra[PD.nakshatra[0].idx]}</em></div></div>`);
    K.mcard = html(K.ov, `<div class="chip tr"><div class="chip-k">Moon in</div><div class="chip-v" data-n></div><div class="chip-ta" data-t></div></div>`);
  },
  update(lt, K) {
    const c = K.cs, e = K.ce, U = K.ring.material.uniforms;
    U.uA1.value = sm(0.2, 2.2, lt); U.uA0.value = sm(c[1], c[1] + 1.5, lt);
    U.uSweep.value = lt < c[2] ? 0 : 6.3 * sm(c[2] + 0.3, c[2] + 4.2, lt);
    // Sun: tours the year during c1, ends in Kanyā
    const ls = lt < c[1] + 0.5 ? PD.sunSid - 519 : lerp(PD.sunSid - 519, PD.sunSid, ease(seg(lt, c[1] + 0.5, e[1] - 0.3)));
    const lsN = ((ls % 360) + 360) % 360;
    K.sun.position.copy(onRing(7.7, lsN, 0.45)); K.gS.rotation.y = Math.floor(lsN / 30) * 30 * D2R;
    setOpacity(K.gS, sm(c[1], c[1] + 0.6, lt) * (1 - 0.5 * sm(c[2], c[2] + 1, lt)) + 0.9 * pulse(lt, c[4], e[4] + 0.5));
    setOpacity(K.sun, sm(c[1] - 0.8, c[1], lt));
    // Moon
    const jd = JD0 + integ(lt, [[0, 0], [c[3], 0], [c[3] + 1, 0.42], [e[3], 0.42], [e[3] + 1, 0]]);
    const lm = P.sidMoon(jd); K.moon.position.copy(onRing(9.45, lm, 0.45)); K.moon.rotation.y = lt * 0.3;
    const nk = Math.floor(lm / (360 / 27)); K.gM.rotation.y = nk * (360 / 27) * D2R;
    setOpacity(K.moon, sm(c[2] + 3, c[2] + 4, lt)); setOpacity(K.gM, sm(c[3], c[3] + 0.6, lt) * (1 - sm(e[4], e[4] + 1, lt)));
    K.mcard.style.opacity = pulse(lt, c[3] + 0.5, e[3] + 0.6);
    K.mcard.querySelector('[data-n]').textContent = P.N.nakshatra[nk]; K.mcard.querySelector('[data-t]').textContent = P.N.nakshatraTa[nk];
    K.card.style.opacity = pulse(lt, c[4] + 0.3, e[4] + 0.2);
    // year beads + Jupiter
    const b = sm(c[5], c[5] + 5.5, lt);
    K.beads.children.forEach((m, i) => { m.material.opacity = sm(i / 60 - 0.02, i / 60 + 0.02, b) * (i === 39 ? 1 : 0.8); m.visible = m.material.opacity > 0.01; });
    const jl = 90 - b * 360; K.jup.position.copy(onRing(11.4, jl, 0.55)); setOpacity(K.jup, sm(c[5], c[5] + 0.8, lt));
    K.jup.rotation.y = lt; setOpacity(K.lPar, sm(c[5] + 5, c[5] + 6, lt)); setOpacity(K.lPrab, sm(c[5] + 0.4, c[5] + 1.2, lt));
    // camera: overhead, follow Moon in c3, back up
    const f = sm(c[3] - 0.2, c[3] + 1.6, lt) * (1 - sm(e[3] - 0.6, e[3] + 1.2, lt));
    const tgtA = new T.Vector3(0, 0, 0.8); const camA = new T.Vector3(); const tmp = new T.PerspectiveCamera();
    const dA = kf(lt, [[0, 29], [c[2], 30], [c[5], 34]]);
    camOrbit(tmp, tgtA, dA, 270 + lt * 0.6, kf(lt, [[0, 72], [c[1], 60], [c[4], 64], [c[5], 58]])); camA.copy(tmp.position);
    const tgtB = onRing(9.3, lm + 9, 0), camB = onRing(15.5, lm - 20, 4.4);
    K.cam.position.lerpVectors(camA, camB, ease(f)); K.cam.lookAt(new T.Vector3().lerpVectors(tgtA, tgtB, ease(f)));
    shiftView(K.cam, 150 * (1 - ease(f)) * Math.max(sm(c[4], c[4] + 1, lt), 0), 46 * (1 - ease(f)));
    K.earth.rotation.y = lt * 0.2; K.stars.rotation.y = lt * 0.003;
  }
});

// ---------------- 3 · Vāra ----------------
const CHALD = [['Śani', 'शनि', 0x6f7fb0, 'Saturn'], ['Guru', 'गुरु', 0xe0b040, 'Jupiter'], ['Maṅgala', 'मङ्गल', 0xd0473a, 'Mars'], ['Sūrya', 'सूर्य', 0xffd27a, 'Sun'], ['Śukra', 'शुक्र', 0xf4efe6, 'Venus'], ['Budha', 'बुध', 0x57a872, 'Mercury'], ['Candra', 'चन्द्र', 0xcbd5de, 'Moon']];
const VARA_OF = { 3: 0, 6: 1, 2: 2, 5: 3, 1: 4, 4: 5, 0: 6 }; // chaldean index -> weekday
const CITIES = [['Chennai', 80.2707, 13.0827], ['Madurai', 78.1198, 9.9252], ['Coimbatore', 76.9558, 11.0168]];
chapter({
  key: 'vara', dev: 'वार', iast: 'Vāra', en: 'The day, counted from sunrise',
  caps: ['The first limb, *Vāra*, is the day of the week. A Panchangam day starts at sunrise, *sūryodaya*, not at midnight.',
    `Sunrise depends on place. In Chennai on 26 September 2026 the Sun rises at ${S_.sunrise}, a little later inland, so each town reckons its own day.`,
    'The day is divided into 24 *horās*. Each is ruled by a *graha*, taken from slowest to fastest: *Śani*, *Guru*, *Maṅgala*, *Sūrya*, *Śukra*, *Budha*, *Candra*.',
    'The *graha* that rules the first *horā* at sunrise gives the day its name.',
    'After 24 *horās* the ruler has moved three places around the circle. Joining the day-lords draws a seven-pointed star.',
    'Follow the star and the weekdays appear in order: *Ravi*, *Soma*, *Maṅgala*, *Budha*, *Guru*, *Śukra*, *Śani*.'],
  build(K) {
    baseScene(K, 36); const S = K.scene;
    S.add(new T.AmbientLight(0x1a2240, 0.25)); const dl = new T.DirectionalLight(0xfff0d6, 1.9); dl.position.set(50, 0, 0); S.add(dl);
    K.sun = makeSun(2.4, 14); K.sun.position.set(70, 3, -12); S.add(K.sun);
    K.earth = makeEarth(2); S.add(K.earth); K.earth.userData.mat.emissiveIntensity = 0.55;
    K.pins = CITIES.map(([n, lon, lat]) => {
      const g = new T.Group(); const head = new T.Mesh(new T.SphereGeometry(0.045, 16, 12), new T.MeshBasicMaterial({ color: COL.gold }));
      const p = lonlat(lon, lat, 2.0); const st = rod(COL.gold, 0.9, 0.008); setRod(st, p, lonlat(lon, lat, 2.16)); head.position.copy(lonlat(lon, lat, 2.17)); g.add(st, head);
      const halo = new T.Sprite(new T.SpriteMaterial({ map: TX.glow, blending: T.AdditiveBlending, transparent: true, depthWrite: false })); halo.position.copy(head.position); halo.scale.setScalar(0.5); g.add(halo);
      const [y, m, d] = [2026, 9, 26]; const sr = P.sunriseOn(y, m, d, { lat, lon, tz: 5.5 });
      const lay = { Chennai: [7, 2.5, 0, 'left'], Madurai: [5, -6, 0, 'left'], Coimbatore: [-7, 2.5, 1, 'right'] }[n];
      const lb = label([{ t: n, f: `600 40px ${F.sans}`, c: COL.star }], 0.17, { align: lay[3], center: [lay[2], 0.5] });
      lb.position.copy(lonlat(lon + lay[0], lat + lay[1], 2.2)); g.add(lb);
      const ld = rod(COL.goldSoft, 0.55, 0.0045); setRod(ld, lonlat(lon, lat, 2.17), lonlat(lon + lay[0] * 0.85, lat + lay[1] * 0.85, 2.19)); g.add(ld);
      K.earth.children[0].add(g); return { g, head, halo, lb, sr, lon, lat };
    });
    K.chip = html(K.ov, `<div class="chip tr big"><div class="chip-dev">सूर्योदय</div><div class="chip-v"><em>sūryodaya</em></div><div class="chip-k">26 Sep 2026 · sunrise</div>${K.pins.map((p, i) => `<div class="kline city" data-c="${i}">${CITIES[i][0]}<b>${fmt12(p.sr)}</b></div>`).join('')}</div>`);
    // heptagram scene
    K.sB = new T.Scene(); K.sB.add(makeStars(19)); K.sB.add(new T.AmbientLight(0x505a80, 0.7)); const dl2 = new T.DirectionalLight(0xffffff, 1.1); dl2.position.set(2, 3, 8); K.sB.add(dl2);
    K.camB = new T.PerspectiveCamera(38, W / H, 0.1, 2000);
    const R = 2.4; K.vtx = []; K.planets = [];
    CHALD.forEach(([n, dv, col], k) => {
      const a = (90 - k * 360 / 7) * D2R; const pos = new T.Vector3(R * Math.cos(a), R * Math.sin(a), 0); K.vtx.push(pos);
      let obj; if (k === 3) obj = makeSun(0.42, 7); else if (k === 6) { obj = makeMoon(0.36); } else obj = new T.Mesh(new T.SphereGeometry(k === 1 ? 0.4 : 0.32, 32, 24), new T.MeshStandardMaterial({ color: col, roughness: 0.7, emissive: new T.Color(col), emissiveIntensity: 0.18 }));
      obj.position.copy(pos); K.sB.add(obj);
      const halo = new T.Sprite(new T.SpriteMaterial({ map: TX.soft, color: col, blending: T.AdditiveBlending, transparent: true, opacity: 0.35, depthWrite: false })); halo.scale.setScalar(1.6); halo.position.copy(pos); K.sB.add(halo);
      const lp = pos.clone().multiplyScalar(1.4); const lb = label([{ t: dv, f: `48px ${F.skt}`, c: COL.star }, { t: n, f: `italic 38px ${F.skt}`, c: COL.goldSoft }], 0.78); lb.position.copy(lp); K.sB.add(lb);
      K.planets.push({ obj, halo, lb });
    });
    K.ptr = new T.Mesh(new T.TorusGeometry(0.62, 0.035, 8, 64), new T.MeshBasicMaterial({ color: COL.gold, transparent: true })); K.sB.add(K.ptr);
    K.lines = []; const order = [3, 6, 2, 5, 1, 4, 0, 3];
    for (let i = 0; i < 7; i++) { const r = rod(COL.gold, 0.85, 0.028); K.sB.add(r); K.lines.push({ r, a: K.vtx[order[i]], b: K.vtx[order[i + 1]], k: order[i] }); }
    K.vlabels = order.slice(0, 7).map((k) => { const wd = VARA_OF[k]; const lb = label([{ t: P.N.vara[wd], f: `italic 36px ${F.skt}`, c: COL.goldSoft }, { t: P.N.varaTa[wd], f: `30px ${F.ta}`, c: COL.muted }], 0.62); lb.position.copy(K.vtx[k].clone().multiplyScalar(0.62)); K.sB.add(lb); return lb; });
    K.hora = html(K.ov, `<div class="chip tr"><div class="chip-k">horā</div><div class="chip-v mono" data-h>1 of 24</div><div class="chip-k" data-l>Sūrya</div></div>`);
  },
  update(lt, K) {
    const c = K.cs, e = K.ce;
    const cut = c[2] - 0.3; K.veil = clamp(1 - Math.abs(lt - cut) / 0.55);
    if (lt < cut) {
      K.active = null;
      const tR = c[0] + 3.8; const thDeg = -170.27 - 0.9 + (lt - tR) * 1.0; K.earth.rotation.y = thDeg * D2R;
      const sunDir = new T.Vector3(1, 0, 0);
      K.pins.forEach((p) => {
        const w = new T.Vector3(); p.head.getWorldPosition(w); const alt = Math.asin(clamp(w.normalize().dot(sunDir), -1, 1)) / D2R;
        const lit = sm(-0.9, 0.6, alt); p.head.material.color.set(lit > 0.5 ? COL.goldSoft : COL.gold); p.halo.material.opacity = lit * (0.6 + 0.4 * Math.exp(-Math.max(0, alt) * 0.8)); p.halo.scale.setScalar(0.35 + 0.5 * lit);
        const tCity = tR + (p.sr - PD.sunrise) * 1440 / 4; setOpacity(p.lb, 0.35 + 0.65 * lit);
      });
      const f = sm(0, cut, lt); K.cam.position.set(lerp(-3.4, -2.6, f), lerp(1.5, 1.1, f), lerp(6.2, 5.3, f)); K.cam.lookAt(lerp(-0.2, 0.15, f), 0.45, 1.5); shiftView(K.cam, 0, 30);
      K.chip.style.opacity = pulse(lt, tR - 0.4, cut - 0.2); K.pins.forEach((p, i) => { const tCity = tR + (p.sr - PD.sunrise) * 1440 / 4; K.chip.querySelector(`[data-c="${i}"]`).style.opacity = sm(tCity - 0.3, tCity + 0.3, lt); });
      K.hora.style.opacity = 0;
    } else {
      K.active = { scene: K.sB, cam: K.camB };
      const hp = seg(lt, c[2] + 1.0, e[2] - 0.8); const h = Math.min(24, Math.floor(hp * 24.999));
      let pk = (3 + h) % 7; if (lt > c[3] - 0.2) pk = 3;
      K.ptr.position.copy(K.vtx[pk]); K.ptr.rotation.z = lt; K.ptr.material.opacity = lt < c[4] ? 1 : 1 - sm(c[4], c[4] + 1, lt);
      K.hora.style.opacity = pulse(lt, c[2] + 0.8, c[3] - 0.2);
      K.hora.querySelector('[data-h]').textContent = h >= 24 ? 'next sunrise' : `${h + 1} of 24`;
      K.hora.querySelector('[data-l]').textContent = CHALD[pk][0] + (h >= 24 ? ' · Somavāra' : '');
      K.planets.forEach((p, k) => { const on = sm(c[2] + 0.1 * k - 0.3, c[2] + 0.1 * k + 0.4, lt); setOpacity(p.lb, on); p.halo.material.opacity = 0.25 + 0.55 * (k === pk && lt < c[4] ? 1 : 0); });
      const d0 = c[4] + 0.6, d1 = e[5] - 1.5, n = K.lines.length;
      K.lines.forEach((L, i) => { const pr = seg(lt, lerp(d0, d1, i / n), lerp(d0, d1, (i + 1) / n)); setRod(L.r, L.a, new T.Vector3().lerpVectors(L.a, L.b, pr)); L.r.visible = pr > 0.001; });
      K.vlabels.forEach((lb, i) => setOpacity(lb, sm(lerp(d0, d1, i / n) - 0.2, lerp(d0, d1, i / n) + 0.5, lt)));
      K.camB.position.set(Math.sin(lt * 0.08) * 0.8, Math.cos(lt * 0.06) * 0.3, 14); K.camB.lookAt(0, 0, 0); shiftView(K.camB, 0, 64);
      K.chip.style.opacity = 0;
    }
    K.stars.rotation.y = lt * 0.002;
  }
});

// ---------------- 4 · Tithi ----------------
function tithiStats() {
  const t0 = P.jdFromDate(new Date(Date.UTC(2026, 0, 1))) - 5.5 / 24; let s = P.angaStart('tithi', t0); const out = [];
  while (s < t0 + 365) { const e = P.angaEnd('tithi', s + 1e-5); out.push({ idx: P.angaAt('tithi', s + 1e-5), s, e, h: (e - s) * 24 }); s = e; }
  return out;
}
chapter({
  key: 'tithi', dev: 'तिथि', iast: 'Tithi', en: 'The lunar day',
  caps: ['The second limb, *Tithi*, is a lunar day. It measures the angle between the Moon and the Sun.',
    'Each time the Moon gains 12° on the Sun, one *tithi* ends. 360° divided by 12° gives 30 *tithis* in a lunar month.',
    'Fifteen fall in the bright half, *Śukla pakṣa*, ending at *Pūrṇimā*, the full moon, when the angle reaches 180°.',
    'Fifteen fall in the dark half, *Kṛṣṇa pakṣa*, ending at *Amāvāsyā*, the new moon, when the Moon catches up with the Sun.',
    'The Moon speeds up near perigee and slows near apogee, so in 2026 a *tithi* lasts anywhere from about 20 to 27 hours.',
    'So a *tithi* can begin and end between two sunrises. It never touches a sunrise and is called *kṣaya*, a lost *tithi*.',
    'A *tithi* that spans two sunrises is counted on both days: *adhika*, an added *tithi*.'],
  build(K) {
    baseScene(K, 40); const S = K.scene;
    S.add(new T.AmbientLight(0x2c3558, 0.3)); const dl = new T.DirectionalLight(0xfff1da, 1.8); dl.position.set(50, 0, 0); S.add(dl);
    K.sun = makeSun(3, 13); K.sun.position.set(46, 0.5, -3); S.add(K.sun);
    K.earth = makeEarth(0.7); S.add(K.earth); K.moon = makeMoon(0.26); S.add(K.moon);
    K.dial = new T.Mesh(new T.RingGeometry(3.7, 4.9, 256, 1), new T.MeshBasicMaterial({ map: TX.tithiDial, transparent: true, depthWrite: false, side: T.DoubleSide })); K.dial.rotation.x = -Math.PI / 2; S.add(K.dial);
    K.orbit = ringLine(3, 0x9fb0c8, 0.3, 0.01); S.add(K.orbit);
    K.arc = arcMesh(0.85, 3.55, COL.gold, 0.1); S.add(K.arc);
    K.sunLine = rod(COL.gold, 0.7, 0.014); setRod(K.sunLine, new T.Vector3(0.7, 0, 0), new T.Vector3(5.2, 0, 0)); S.add(K.sunLine);
    K.moonLine = rod(0xcfe0f0, 0.7, 0.014); S.add(K.moonLine);
    K.hi = new T.Group(); K.hi.add(sector(3.7, 4.9, 0, 12, COL.goldSoft, 0.3)); S.add(K.hi);
    const L = (t, sub, lam, r, col) => { const l = label([{ t, f: `italic 44px ${F.skt}`, c: col }, { t: sub, f: `26px ${F.sans}`, c: COL.muted }], 1.05); l.position.copy(onRing(r, lam, 0.2)); S.add(l); return l; };
    K.lbls = [L('Śukla pakṣa', 'bright half · waxing', 90, 5.9, COL.star), L('Kṛṣṇa pakṣa', 'dark half · waning', 270, 5.9, COL.muted), L('Amāvāsyā', 'new moon · 0°', 0, 5.9, COL.goldSoft), L('Pūrṇimā', 'full moon · 180°', 180, 5.9, COL.goldSoft)];
    K.icam = new T.PerspectiveCamera(13, 1, 0.1, 500);
    K.inset = html(K.ov, `<div class="inset"><span>as seen from Earth</span></div>`);
    K.read = html(K.ov, `<div class="chip tl-low"><div class="chip-k">Moon − Sun</div><div class="chip-v mono" data-e></div><div class="chip-v" data-t></div></div>`);
    // chart
    const st = tithiStats(); K.stats = st;
    K.chart = html(K.ov, `<div class="panel chartp"><div class="p-h">Length of every <em>tithi</em> in 2026</div><canvas width="1520" height="560"></canvas><div class="p-foot">Each bar is one <em>tithi</em>, computed from the Moon's orbit. Shortest ${Math.min(...st.map((x) => x.h)).toFixed(1)} h, longest ${Math.max(...st.map((x) => x.h)).toFixed(1)} h.</div></div>`);
    drawTithiChart(K.chart.querySelector('canvas'), st);
    K.ks = html(K.ov, `<div class="panel stripp"><div class="p-h">Kṣaya: a <em>tithi</em> lost between sunrises · Chennai, Sep 2026</div><canvas width="1720" height="330"></canvas></div>`);
    drawStrip(K.ks.querySelector('canvas'), [2026, 9, 1], 3, 'ksaya');
    K.ad = html(K.ov, `<div class="panel stripp"><div class="p-h">Adhika: one <em>tithi</em> seen at two sunrises · Chennai, Oct 2026</div><canvas width="1720" height="330"></canvas></div>`);
    drawStrip(K.ad.querySelector('canvas'), [2026, 10, 16], 3, 'adhika');
  },
  update(lt, K) {
    const c = K.cs, e = K.ce;
    const el = kf(lt, [[0, 14], [c[0] + 2, 20], [c[1], 30], [e[1], 96], [c[2], 100], [e[2] - 0.6, 180], [c[3], 184], [e[3] - 0.5, 360], [K.dur, 400]]);
    const lam = el % 360; K.moon.position.copy(onRing(3, lam, 0)); K.moon.rotation.y = lt * 0.1;
    setRod(K.moonLine, onRing(0.7, lam), onRing(3.6, lam));
    K.arc.material.uniforms.uA0.value = 0; K.arc.material.uniforms.uA1.value = lam * D2R;
    const k = Math.floor(lam / 12) % 30; K.hi.rotation.y = k * 12 * D2R;
    K.earth.rotation.y = lt * 0.2;
    K.lbls.forEach((l, i) => setOpacity(l, sm(i < 2 ? c[1] + 1 : c[2] - 0.5 + (i === 2 ? 0 : 0), (i < 2 ? c[1] + 2 : c[2] + 0.5), lt)));
    const tn = P.tithiName(k); K.read.querySelector('[data-e]').textContent = `${lam.toFixed(1)}°`;
    K.read.querySelector('[data-t]').innerHTML = `<em>${tn.paksha} ${tn.name}</em> · tithi ${k + 1} of 30`;
    const ovl = Math.max(pulse(lt, c[4] - 0.2, e[4] + 0.4), pulse(lt, c[5] - 0.2, e[5] + 0.4), pulse(lt, c[6] - 0.2, K.dur + 1));
    K.veil = ovl * 0.6;
    K.read.style.opacity = sm(c[0] + 1, c[0] + 2, lt) * (1 - ovl); K.inset.style.opacity = K.read.style.opacity;
    K.chart.style.opacity = pulse(lt, c[4] - 0.2, e[4] + 0.4); K.ks.style.opacity = pulse(lt, c[5] - 0.2, e[5] + 0.4); K.ad.style.opacity = pulse(lt, c[6] - 0.2, K.dur + 1);
    camOrbit(K.cam, new T.Vector3(0.9, 0, 0.3), kf(lt, [[0, 16], [c[1], 15], [c[3], 14.5], [K.dur, 14]]), 238 + lt * 0.5, kf(lt, [[0, 48], [c[2], 40], [c[3], 52]])); shiftView(K.cam, 0, 40);
    K.stars.rotation.y = lt * 0.002;
    // inset camera
    K.icam.position.set(0, 0, 0); K.icam.lookAt(K.moon.position); K.insetOn = +K.inset.style.opacity > 0.02;
  },
  render(K, R) {
    if (!K.insetOn) return; const sz = 210, x = W - 40 - sz, y = 92; const f = 1; const op = +K.inset.style.opacity;
    if (op < 0.5) return;
    R.setScissorTest(true); R.setViewport(x * f, (H - y - sz) * f, sz * f, sz * f); R.setScissor(x * f, (H - y - sz) * f, sz * f, sz * f);
    R.setClearColor(0x03050b, 1); R.clear(); const vis = K.dial.visible; K.dial.visible = false; K.arc.visible = false; K.orbit.visible = false; K.moonLine.visible = false; K.sunLine.visible = false; K.hi.visible = false; K.lbls.forEach((l) => (l.visible = false));
    R.render(K.scene, K.icam);
    K.dial.visible = vis; K.arc.visible = true; K.orbit.visible = true; K.moonLine.visible = true; K.sunLine.visible = true; K.hi.visible = true;
    R.setScissorTest(false); R.setViewport(0, 0, W, H);
  }
});
function drawTithiChart(cv, st) {
  const g = cv.getContext('2d'), w = cv.width, h = cv.height; const L = 90, Rt = 20, Tp = 20, B = 60; const x = (i) => L + (w - L - Rt) * i / st.length, y = (v) => Tp + (h - Tp - B) * (1 - (v - 19) / 9);
  g.font = `28px ${F.mono}`; g.fillStyle = COL.muted; g.textAlign = 'right'; g.textBaseline = 'middle';
  for (const v of [20, 22, 24, 26, 28]) { g.strokeStyle = v === 24 ? 'rgba(243,212,145,0.5)' : 'rgba(138,145,176,0.22)'; g.lineWidth = 2; g.beginPath(); g.moveTo(L, y(v)); g.lineTo(w - Rt, y(v)); g.stroke(); g.fillText(`${v} h`, L - 12, y(v)); }
  st.forEach((s, i) => { const t = (s.h - 20) / 7; g.fillStyle = `rgb(${Math.round(lerp(99, 227, t))},${Math.round(lerp(150, 174, t))},${Math.round(lerp(178, 74, t))})`; g.fillRect(x(i), y(s.h), Math.max(1.5, (w - L - Rt) / st.length - 1), y(19) - y(s.h)); });
  g.textAlign = 'center'; g.textBaseline = 'top'; g.font = `26px ${F.sans}`; g.fillStyle = COL.muted;
  MON.forEach((m, i) => { const idx = st.findIndex((s) => civ(s.s).mo === i); if (idx >= 0) g.fillText(m, x(idx) + 20, h - B + 14); });
  g.fillStyle = COL.goldSoft; g.textAlign = 'left'; g.fillText('one solar day = 24 h', L + 10, y(24) - 34);
}
function drawStrip(cv, [y, m, d], ndays, kind) {
  const g = cv.getContext('2d'), w = cv.width, h = cv.height;
  const srs = []; for (let i = 0; i <= ndays; i++) { const dt = new Date(Date.UTC(y, m - 1, d + i)); srs.push(P.sunriseOn(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate(), LOC)); }
  const t0 = srs[0] - 0.08, t1 = srs[ndays] + 0.08; const X = (jd) => 40 + (w - 80) * (jd - t0) / (t1 - t0);
  // tithi blocks
  let s = P.angaStart('tithi', t0); const blocks = [];
  while (s < t1) { const e = P.angaEnd('tithi', s + 1e-5); blocks.push({ s, e, idx: P.angaAt('tithi', s + 1e-5) }); s = e; }
  const touches = (b) => srs.filter((r) => r >= b.s && r < b.e).length;
  blocks.forEach((b, i) => {
    const x0 = Math.max(40, X(b.s)), x1 = Math.min(w - 40, X(b.e)); const n = touches(b);
    const special = kind === 'ksaya' ? n === 0 : n >= 2;
    g.fillStyle = special ? (kind === 'ksaya' ? 'rgba(217,72,62,0.35)' : 'rgba(227,174,74,0.35)') : (i % 2 ? 'rgba(36,51,107,0.9)' : 'rgba(44,62,124,0.9)');
    g.fillRect(x0, 110, x1 - x0 - 3, 130);
    if (special) { g.strokeStyle = kind === 'ksaya' ? COL.kumkum : COL.gold; g.lineWidth = 5; g.strokeRect(x0 + 2, 112, x1 - x0 - 7, 126); }
    const t = P.tithiName(b.idx); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `italic 44px ${F.skt}`;
    if (g.measureText(t.name).width < x1 - x0 - 24) { g.fillStyle = COL.star; g.fillText(t.name, (x0 + x1) / 2, 155); g.font = `30px ${F.mono}`; g.fillStyle = COL.muted; const tt = `${fmt12(b.s)} → ${fmt12(b.e)}`; if (g.measureText(tt).width < x1 - x0 - 16) g.fillText(tt, (x0 + x1) / 2, 205); }
  });
  srs.forEach((r) => {
    const x = X(r); g.strokeStyle = COL.gold; g.lineWidth = 3; g.setLineDash([8, 8]); g.beginPath(); g.moveTo(x, 70); g.lineTo(x, 262); g.stroke(); g.setLineDash([]);
    g.fillStyle = COL.gold; g.beginPath(); g.arc(x, 58, 12, 0, 7); g.fill();
    g.font = `600 30px ${F.sans}`; g.fillStyle = COL.goldSoft; g.textAlign = x < 200 ? 'left' : x > w - 200 ? 'right' : 'center'; g.textBaseline = 'alphabetic'; g.fillText(`${fmtDate(r)} · ${fmt12(r)}`, x < 200 ? x - 10 : x > w - 200 ? x + 10 : x, 34);
    // which tithi is "seen" at this sunrise
    const b = blocks.find((q) => r >= q.s && r < q.e); if (b) { g.font = `28px ${F.sans}`; g.fillStyle = COL.star; g.fillText(`day's tithi: ${P.tithiName(b.idx).name}`, x, 300); }
  });
}

// ---------------- 5 · Nakṣatra ----------------
const FEST = [
  { n: 'Kārttikai Dīpam', ta: 'கார்த்திகை தீபம்', month: 7, star: 2 },
  { n: 'Thai Pūsam', ta: 'தைப்பூசம்', month: 9, star: 7 },
  { n: 'Paṅguni Uttiram', ta: 'பங்குனி உத்திரம்', month: 11, star: 11 },
  { n: 'Vaikāsi Visākam', ta: 'வைகாசி விசாகம்', month: 1, star: 15 }];
chapter({
  key: 'nakshatra', dev: 'नक्षत्र', iast: 'Nakṣatra', en: 'The Moon\'s star',
  caps: ['The third limb, *Nakṣatra*, is the 13°20′ segment of the star circle that holds the Moon.',
    'Tamil speech uses Tamil forms of the same names: *Kṛttikā* is Kārttikai, *Ārdrā* is Tiruvādirai, *Śravaṇa* is Tiruvōṇam.',
    'A person\'s *janma nakṣatra* is the Moon\'s star at birth. Many Tamil families keep birthdays by star and solar month.',
    'Festivals pair a solar month with a star. Kārttikai Dīpam falls when the Moon is in *Kṛttikā* during the month of Kārttikai.',
    'The same pattern gives Thai Pūsam, Paṅguni Uttiram and Vaikāsi Visākam.',
    'Each falls near a full moon, because in that month the named star lies opposite the Sun.'],
  build(K) {
    baseScene(K, 40); const S = K.scene;
    S.add(new T.AmbientLight(0x4a5680, 0.55)); const dl = new T.DirectionalLight(0xfff2de, 1.4); dl.position.set(3, 10, 6); S.add(dl);
    K.ring = zodiacMesh(TX.zodiac); S.add(K.ring); K.earth = makeEarth(0.9); S.add(K.earth);
    K.sun = makeSun(0.4, 9); S.add(K.sun); K.moon = makeMoon(0.32); S.add(K.moon);
    K.gM = new T.Group(); K.gM.add(sector(ZR.nk0, ZR.nk1, 0, 360 / 27, 0xbcd0f0, 0.3)); S.add(K.gM);
    K.gS = new T.Group(); K.gS.add(sector(ZR.ta0, ZR.ra1, 0, 30, COL.gold, 0.3)); S.add(K.gS);
    K.opp = rod(COL.gold, 0.6, 0.03); S.add(K.opp);
    K.card = html(K.ov, `<div class="card nakcard"><div class="nc-dev" data-d></div><div class="nc-lat" data-l></div><div class="nc-ta" data-t></div></div>`);
    K.tbl = html(K.ov, `<div class="panel tamtbl">${[[2, 'Kārttikai'], [5, 'Tiruvādirai'], [21, 'Tiruvōṇam']].map(([k, tl]) => `<div class="row"><span class="dv">${P.N.nakshatraDev[k]}</span><em>${P.N.nakshatra[k]}</em><span class="ar">→</span><span class="ta">${P.N.nakshatraTa[k]}</span><span class="tl">${tl}</span></div>`).join('')}</div>`);
    K.fcard = html(K.ov, `<div class="card festcard"><div class="fc-ta" data-ta></div><div class="fc-lat" data-n></div><div class="fc-row"><span class="dotg"></span><span data-s></span></div><div class="fc-row"><span class="dotm"></span><span data-m></span></div></div>`);
    K.lastNk = -1; K.lastF = -1;
  },
  update(lt, K) {
    const c = K.cs, e = K.ce, U = K.ring.material.uniforms;
    const jd = JD0 + integ(lt, [[0, 0.1], [1.5, 0.36], [e[2], 0.36], [c[3], 0.2]]);
    let lm = P.sidMoon(jd), ls = P.sidSun(jd);
    // festival mode
    const fm = sm(c[3] - 0.5, c[3] + 1.2, lt);
    let fi = -1;
    if (lt > c[3] - 0.5) {
      const slots = [[c[3], e[3]], ...[0, 1, 2].map((i) => [lerp(c[4], e[4], i / 3), lerp(c[4], e[4], (i + 1) / 3)]), ...[0, 1, 2, 3].map((i) => [lerp(c[5], K.dur, i / 4), lerp(c[5], K.dur, (i + 1) / 4)])];
      const ids = [0, 1, 2, 3, 0, 1, 2, 3];
      let fs = 0, fsl = PD.sunSid, fml = lm, prevS = PD.sunSid, prevM = lm;
      for (let i = 0; i < slots.length; i++) {
        const F_ = FEST[ids[i]], ts = F_.month * 30 + 15, tm = F_.star * 360 / 27 + 180 / 27;
        const p = ease(seg(lt, slots[i][0] - 0.6, slots[i][0] + 0.6));
        if (lt >= slots[i][0] - 0.6) { fsl = prevS + lamDelta(prevS, ts) * p; fml = prevM + lamDelta(prevM, tm) * p; fi = ids[i]; prevS = ts; prevM = tm; }
      }
      ls = lerp(ls, fsl, fm); lm = lm + lamDelta(lm, fml) * fm;
    }
    lm = ((lm % 360) + 360) % 360; ls = ((ls % 360) + 360) % 360;
    K.moon.position.copy(onRing(9.45, lm, 0.5)); K.sun.position.copy(onRing(7.7, ls, 0.5)); K.moon.rotation.y = lt * 0.3;
    const nk = Math.floor(lm / (360 / 27)); K.gM.rotation.y = nk * 360 / 27 * D2R; K.gS.rotation.y = Math.floor(ls / 30) * 30 * D2R;
    setOpacity(K.gS, fm); setOpacity(K.sun, Math.max(0.0, fm));
    const opp = sm(c[5], c[5] + 1, lt); setRod(K.opp, onRing(7.7, ls, 0.5), onRing(9.45, lm, 0.5)); setOpacity(K.opp, opp * 0.9);
    if (nk !== K.lastNk) { K.lastNk = nk; K.card.querySelector('[data-d]').textContent = P.N.nakshatraDev[nk]; K.card.querySelector('[data-l]').textContent = `${nk + 1} · ${P.N.nakshatra[nk]}`; K.card.querySelector('[data-t]').textContent = P.N.nakshatraTa[nk]; }
    K.card.style.opacity = sm(0.8, 1.8, lt) * (1 - sm(c[3] - 0.8, c[3], lt));
    K.tbl.style.opacity = pulse(lt, c[1] + 0.2, e[1] + 0.4);
    if (fi !== K.lastF && fi >= 0) { K.lastF = fi; const F_ = FEST[fi]; K.fcard.querySelector('[data-ta]').textContent = F_.ta; K.fcard.querySelector('[data-n]').textContent = F_.n; K.fcard.querySelector('[data-s]').innerHTML = `Sun in <em>${P.N.rasi[F_.month]}</em> · month of ${P.N.monthTaLat[F_.month]}`; K.fcard.querySelector('[data-m]').innerHTML = `Moon in <em>${P.N.nakshatra[F_.star]}</em>`; }
    K.fcard.style.opacity = sm(c[3], c[3] + 0.8, lt);
    // camera
    const f = 1 - sm(c[3] - 1.2, c[3] + 0.8, lt);
    const tmp = new T.PerspectiveCamera(); camOrbit(tmp, new T.Vector3(0, 0, 0.6), 31, 270 + lt * 0.4, 66);
    const camB = onRing(15.2, lm - 24, 4.6), tgtB = onRing(9.3, lm + 10, 0);
    K.cam.position.lerpVectors(tmp.position, camB, ease(f)); K.cam.lookAt(new T.Vector3().lerpVectors(new T.Vector3(0, 0, 0.6), tgtB, ease(f))); shiftView(K.cam, 170 * (1 - ease(f)), 44 * (1 - ease(f)));
    K.earth.rotation.y = lt * 0.2; K.stars.rotation.y = lt * 0.003;
  }
});

// ---------------- 6 · Yoga ----------------
chapter({
  key: 'yoga', dev: 'योग', iast: 'Yoga', en: 'The sum of the two lights',
  caps: ['The fourth limb, *Yoga*, adds the two lights together: the Sun\'s star longitude plus the Moon\'s.',
    'The sum is divided into 27 parts of 13°20′, named *Viṣkambha*, *Prīti*, *Āyuṣmān* and so on, up to *Vaidhṛti*.',
    'No star sits at the sum. *Yoga* is pure calculation, and it advances about one degree a day faster than the *nakṣatra*.',
    `*Vyatīpāta* and *Vaidhṛti*, the 17th and 27th, are avoided for beginnings. On 26 September 2026 the yoga is *Gaṇḍa* until ${S_.yogaEnd}.`],
  build(K) {
    baseScene(K, 40); const S = K.scene;
    S.add(new T.AmbientLight(0x4a5680, 0.6)); const dl = new T.DirectionalLight(0xfff2de, 1.3); dl.position.set(3, 10, 6); S.add(dl);
    K.ring = zodiacMesh(TX.yoga, true); S.add(K.ring); K.earth = makeEarth(0.9); S.add(K.earth);
    K.aM = arcMesh(4.9, 5.4, COL.moon, 0.45); K.aS = arcMesh(5.8, 6.3, COL.gold, 0.55); K.aSumM = arcMesh(6.9, 7.4, COL.moon, 0.45); K.aSumS = arcMesh(6.9, 7.4, COL.gold, 0.55); K.aSum2 = arcMesh(7.55, 8.0, COL.gold, 0.55);
    S.add(K.aM, K.aS, K.aSumM, K.aSumS, K.aSum2);
    K.sun = makeSun(0.3, 8); K.moon = makeMoon(0.26); S.add(K.sun, K.moon);
    K.zero = rod(COL.star, 0.7, 0.02); setRod(K.zero, onRing(4.7, 0, 0.02), onRing(10.7, 0, 0.02)); S.add(K.zero);
    K.lZero = label([{ t: '0° · Aśvinī', f: `italic 38px ${F.skt}`, c: COL.star }], 0.95); K.lZero.position.copy(onRing(12.2, 0, 0.3)); S.add(K.lZero);
    K.ptr = rod(COL.goldSoft, 1, 0.045); S.add(K.ptr);
    K.ptrG = new T.Sprite(new T.SpriteMaterial({ map: TX.glow, blending: T.AdditiveBlending, transparent: true, depthWrite: false })); K.ptrG.scale.setScalar(1.6); S.add(K.ptrG);
    K.bad = new T.Group(); for (const k of [16, 26]) K.bad.add(sector(ZR.nk0, ZR.nk1, k * 360 / 27, (k + 1) * 360 / 27, COL.kumkum, 0.5)); S.add(K.bad);
    const lb = (t, col) => label([{ t, f: `italic 36px ${F.skt}`, c: col }], 0.85);
    K.lS = lb('Sūrya', COL.goldSoft); K.lM = lb('Candra', COL.moon); K.lSum = lb('Sūrya + Candra', COL.star); S.add(K.lS, K.lM, K.lSum);
    K.eq = html(K.ov, `<div class="panel eqp"><div class="eq mono"><span class="g" data-s></span><span class="op">+</span><span class="m" data-m></span><span class="op">=</span><span data-t></span></div><div class="eq-r" data-y></div></div>`);
  },
  update(lt, K) {
    const c = K.cs, e = K.ce;
    const jd = JD0 + integ(lt, [[0, 0], [c[2], 0], [c[2] + 1, 0.55], [e[2], 0.55], [e[2] + 1, 0.05]]);
    const ls = P.sidSun(jd), lm = P.sidMoon(jd); const g = ease(seg(lt, c[0] + 0.8, c[0] + 4.5));
    const A = lm * D2R * g, B = ls * D2R * g;
    K.aM.material.uniforms.uA1.value = A; K.aS.material.uniforms.uA1.value = B;
    const sg = ease(seg(lt, c[0] + 4.5, c[1] + 1.5));
    K.aSumM.material.uniforms.uA1.value = A * sg; K.aSumS.material.uniforms.uA0.value = A; K.aSumS.material.uniforms.uA1.value = Math.min(A + B * sg, 2 * Math.PI);
    const over = A + B * sg - 2 * Math.PI; K.aSum2.material.uniforms.uA1.value = Math.max(0, over); K.aSum2.visible = over > 0;
    K.aSumS.visible = sg > 0.001;
    K.sun.position.copy(onRing(6.05, ls * g, 0.3)); K.moon.position.copy(onRing(5.15, lm * g, 0.3));
    K.lS.position.copy(onRing(6.1, ls * g + 6, 0.8)); K.lM.position.copy(onRing(5.2, lm * g - 6, 0.8));
    const sum = ((lm + ls) % 360) * sg + 0; const yi = Math.floor(((lm + ls) % 360) / (360 / 27));
    const sp = (A + B * sg) / D2R % 360; setRod(K.ptr, onRing(6.9, sp, 0.05), onRing(10.7, sp, 0.05)); K.ptrG.position.copy(onRing(10.6, sp, 0.1));
    K.lSum.position.copy(onRing(8.4, sp + 5, 0.9)); setOpacity(K.lSum, sm(c[1], c[1] + 1, lt));
    setOpacity(K.ptr, sm(c[0] + 5, c[1] + 1.5, lt)); setOpacity(K.ptrG, sm(c[1], c[1] + 1.5, lt));
    setOpacity(K.bad, sm(c[3], c[3] + 0.8, lt) * (0.55 + 0.45 * Math.sin(lt * 4)));
    K.ring.material.uniforms.uSweep.value = 6.3 * sm(c[1] - 0.5, c[1] + 3, lt) + (lt < c[1] - 0.5 ? 0 : 0);
    K.ring.material.uniforms.uA2.value = 1; K.ring.material.uniforms.uOp.value = lerp(0.35, 1, sm(c[1] - 0.5, c[1] + 1, lt));
    if (lt < c[1] - 0.5) K.ring.material.uniforms.uSweep.value = 7;
    const fmtd = (x) => degStr(x);
    K.eq.querySelector('[data-s]').textContent = `Sūrya ${fmtd(ls)}`; K.eq.querySelector('[data-m]').textContent = `Candra ${fmtd(lm)}`;
    const tot = ls + lm; K.eq.querySelector('[data-t]').textContent = tot >= 360 ? `${fmtd(tot)} − 360° = ${fmtd(tot - 360)}` : fmtd(tot);
    K.eq.querySelector('[data-y]').innerHTML = `yoga ${yi + 1} of 27 · <em>${P.N.yoga[yi]}</em>`;
    K.eq.style.opacity = sm(c[1] + 1, c[1] + 2, lt);
    camOrbit(K.cam, new T.Vector3(0, 0, 0.8), kf(lt, [[0, 31], [K.dur, 30]]), 270 + lt * 0.35, kf(lt, [[0, 76], [c[2], 66], [c[3], 72]])); shiftView(K.cam, 190, 44);
    K.earth.rotation.y = lt * 0.2; K.stars.rotation.y = lt * 0.003;
  }
});

// ---------------- 7 · Karaṇa ----------------
const KCOL = { 'Bava': '#34508e', 'Bālava': '#3c67a0', 'Kaulava': '#3b7c8e', 'Taitila': '#3e8a77', 'Gara': '#5a7f4e', 'Vaṇij': '#7f7a44', 'Viṣṭi': COL.kumkum, 'Śakuni': '#9a5a2e', 'Catuṣpāda': '#b06d38', 'Nāga': '#c78544', 'Kiṃstughna': '#d39a55' };
chapter({
  key: 'karana', dev: 'करण', iast: 'Karaṇa', en: 'Half a tithi',
  caps: ['The fifth limb, *Karaṇa*, is half a *tithi*: every 6° the Moon gains on the Sun. A lunar month holds 60.',
    'Seven movable *karaṇas* repeat eight times: *Bava*, *Bālava*, *Kaulava*, *Taitila*, *Gara*, *Vaṇij* and *Viṣṭi*.',
    'Four fixed *karaṇas* close the dark fortnight and open the new month: *Śakuni*, *Catuṣpāda*, *Nāga* and *Kiṃstughna*.',
    `*Viṣṭi*, also called *Bhadrā*, is avoided for auspicious work. On 26 September 2026 it ends at ${S_.karEnd} in Chennai.`],
  build(K) {
    baseScene(K, 40); const S = K.scene;
    S.add(new T.AmbientLight(0x3a4468, 0.55)); const dl = new T.DirectionalLight(0xfff1da, 1.7); dl.position.set(40, 12, 0); S.add(dl);
    K.sun = makeSun(3, 13); K.sun.position.set(46, 1, -2); S.add(K.sun);
    K.earth = makeEarth(0.7); S.add(K.earth); K.moon = makeMoon(0.26); S.add(K.moon);
    K.dial = new T.Mesh(new T.RingGeometry(3.7, 4.9, 256, 1), new T.MeshBasicMaterial({ map: TX.tithiDial, transparent: true, depthWrite: false, side: T.DoubleSide, opacity: 0.85 })); K.dial.rotation.x = -Math.PI / 2; S.add(K.dial);
    K.tiles = []; const geo = new T.BoxGeometry(0.7, 0.16, 0.44);
    for (let k = 0; k < 60; k++) {
      const nm = P.karanaName(k); const mat = new T.MeshStandardMaterial({ color: KCOL[nm], roughness: 0.55, metalness: 0.1, emissive: new T.Color(KCOL[nm]), emissiveIntensity: 0.15 });
      const m = new T.Mesh(geo, mat); const a = 6 * k + 3; m.position.copy(onRing(5.4, a, 0.08)); m.rotation.y = a * D2R; S.add(m);
      const lb = label([{ t: nm, f: `italic 40px ${F.skt}`, c: nm === 'Viṣṭi' ? '#ffb3a8' : COL.star }], 0.42); lb.position.copy(onRing(6.35, a, 0.3)); S.add(lb);
      K.tiles.push({ m, lb, nm, a });
    }
    K.moonLine = rod(0xcfe0f0, 0.6, 0.012); S.add(K.moonLine);
    K.legend = html(K.ov, `<div class="panel legend">${Object.keys(KCOL).map((n, i) => `${i === 7 ? '<div class="lg-sep">fixed</div>' : ''}<div class="lg" data-k="${n}"><i style="background:${KCOL[n]}"></i><em>${n}</em></div>`).join('')}</div>`);
    K.note = html(K.ov, `<div class="chip tr"><div class="chip-k">26 Sep 2026 · Chennai</div><div class="chip-v"><em>Viṣṭi</em> until ${S_.karEnd}</div><div class="chip-k">then <em>Bava</em> until ${fmt12(PD.karana[1].end)}</div></div>`);
  },
  update(lt, K) {
    const c = K.cs, e = K.ce;
    const el = kf(lt, [[0, 0], [c[0] + 1, 2], [e[0], 17], [c[1] + 0.5, 20], [e[1], 96], [c[2] - 0.2, 100], [c[2] + 1.4, 322], [e[2], 366], [c[3], 368], [K.dur, 378]]);
    const lam = ((el % 360) + 360) % 360; const cur = Math.floor(lam / 6) % 60;
    K.moon.position.copy(onRing(3, lam, 0)); setRod(K.moonLine, onRing(0.7, lam), onRing(6.8, lam, 0.02));
    const viP = sm(c[3], c[3] + 0.6, lt);
    K.tiles.forEach((t, k) => {
      const d = Math.abs(lamDelta(t.a, lam)); const on = k === cur ? 1 : 0;
      t.m.position.y = 0.08 + 0.32 * on; t.m.material.emissiveIntensity = 0.15 + 0.7 * on + (t.nm === 'Viṣṭi' ? viP * (0.5 + 0.4 * Math.sin(lt * 5)) : 0);
      setOpacity(t.lb, clamp(1 - (d - 12) / 30) * (1 - viP) + (t.nm === 'Viṣṭi' ? viP : 0));
    });
    const nm = P.karanaName(cur); K.legend.querySelectorAll('.lg').forEach((x) => x.classList.toggle('on', x.dataset.k === nm));
    K.legend.style.opacity = sm(c[0] + 1, c[0] + 2, lt); K.note.style.opacity = sm(c[3] + 0.5, c[3] + 1.2, lt);
    const ca = kf(lt, [[0, -40], [c[3], -40], [c[3] + 2, 0]]);
    const tgt = onRing(3.2, lam + 8, 0).multiplyScalar(1 - viP); const cp = onRing(lerp(13, 17.5, viP), lam - 42, lerp(6.5, 11, viP));
    K.cam.position.copy(cp); K.cam.lookAt(tgt); shiftView(K.cam, 110, 20);
    K.earth.rotation.y = lt * 0.2; K.stars.rotation.y = lt * 0.002;
  }
});

// ---------------- 8 · Ghaṭikā ----------------
chapter({
  key: 'ghatika', dev: 'घटिका', iast: 'Ghaṭikā', en: 'Measuring the day in water',
  caps: ['Before mechanical clocks, time was measured with water. A copper bowl with a small hole, the *ghaṭī-yantra*, floats in a tank.',
    'Water seeps in and the bowl sinks in one *ghaṭikā*, 24 minutes. In Tamil this unit is the *nāḻigai*.',
    'Sunrise to sunrise is 60 *nāḻigai*. One *nāḻigai* is 60 *vināḻigai* (*vighaṭikā*) of 24 seconds each.',
    'One *vighaṭikā* is six *prāṇa*, the length of a slow breath. Two *ghaṭikās* make a *muhūrta* of 48 minutes.',
    `Tamil Panchangams still give end times this way. On 26 September 2026 in Chennai, *Pūrṇimā* lasts ${S_.nzTithi} after sunrise.`],
  build(K) {
    baseScene(K, 36); const S = K.scene; K.stars.visible = true;
    S.add(new T.HemisphereLight(0x6a7cb8, 0x2a1a10, 0.45));
    const lamp = new T.PointLight(0xffb266, 2.2, 0, 0); lamp.position.set(-4, 5, 4); S.add(lamp);
    const rim = new T.DirectionalLight(0x9fc4ff, 0.7); rim.position.set(5, 3, -6); S.add(rim);
    const stone = new T.MeshStandardMaterial({ color: 0x3a3440, roughness: 0.9, side: T.DoubleSide });
    const tank = new T.Mesh(new T.CylinderGeometry(3.2, 2.9, 2.4, 96, 1, true), stone); tank.position.y = -0.6; S.add(tank);
    const bottom = new T.Mesh(new T.CircleGeometry(2.9, 64), stone); bottom.rotation.x = -Math.PI / 2; bottom.position.y = -1.8; S.add(bottom);
    const lip = new T.Mesh(new T.TorusGeometry(3.2, 0.1, 16, 128), new T.MeshStandardMaterial({ color: 0xb87333, roughness: 0.35, metalness: 0.6 })); lip.rotation.x = Math.PI / 2; lip.position.y = 0.6; S.add(lip);
    K.water = new T.Mesh(new T.CircleGeometry(3.15, 128, 0, Math.PI * 2), new T.MeshStandardMaterial({ color: 0x2c6e86, roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.72, emissive: 0x0b2a38, emissiveIntensity: 0.6 }));
    K.water.geometry = new T.CircleGeometry(3.15, 128); K.water.rotation.x = -Math.PI / 2; K.water.position.y = 0.25; S.add(K.water);
    K.wpos = K.water.geometry.attributes.position.array.slice();
    const pts = []; for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI / 2; pts.push(new T.Vector2(1.3 * Math.sin(a) + 0.001, -0.95 * Math.cos(a))); } pts.push(new T.Vector2(1.38, 0.02));
    K.bowl = new T.Group(); const copper = new T.MeshStandardMaterial({ color: 0xc27040, roughness: 0.32, metalness: 0.65, side: T.DoubleSide, emissive: 0x2a1006, emissiveIntensity: 0.4 });
    K.bowl.add(new T.Mesh(new T.LatheGeometry(pts, 96), copper));
    K.inner = new T.Mesh(new T.CircleGeometry(1, 64), new T.MeshStandardMaterial({ color: 0x3a8aa6, roughness: 0.1, transparent: true, opacity: 0.8, emissive: 0x0e3240, emissiveIntensity: 0.6 })); K.inner.rotation.x = -Math.PI / 2; K.bowl.add(K.inner);
    K.jet = new T.Mesh(new T.ConeGeometry(0.05, 0.4, 12), new T.MeshBasicMaterial({ color: 0x9fe0f0, transparent: true, opacity: 0.6 })); K.jet.position.y = -0.75; K.bowl.add(K.jet);
    S.add(K.bowl);
    K.counter = html(K.ov, `<div class="chip tr big"><div class="chip-k">vināḻigai</div><div class="chip-v mono huge" data-v>0</div><div class="chip-k">of 60 = 1 nāḻigai</div></div>`);
    K.units = html(K.ov, `<div class="panel units">
      <div class="u"><b>1 day</b><span>sunrise to sunrise</span><i>60 nāḻigai</i></div>
      <div class="u"><b>1 nāḻigai</b><span><em>ghaṭikā</em> · 24 min</span><i>60 vināḻigai</i></div>
      <div class="u"><b>1 vināḻigai</b><span><em>vighaṭikā</em> · 24 s</span><i>6 prāṇa</i></div>
      <div class="u"><b>1 prāṇa</b><span>one slow breath</span><i>4 s</i></div>
      <div class="u hl"><b>1 muhūrta</b><span>2 ghaṭikā</span><i>48 min · 30 a day</i></div></div>`);
    K.wheel = html(K.ov, `<div class="panel wheel">${dayWheelSVG()}</div>`);
  },
  update(lt, K) {
    const c = K.cs, e = K.ce;
    // cycle: fill over [c0+1, e1], sink, reset, slower refill
    const t0 = c[0] + 1.2, t1 = e[1] - 0.6; let fill, sink = 0, lift = 0;
    if (lt < t1) fill = seg(lt, t0, t1); else { const r = lt - t1; sink = sm(0, 1.6, r); lift = sm(2.4, 4.0, r); fill = 1 - lift; if (r > 4.0) fill = seg(lt, t1 + 4.0, t1 + 4.0 + 22); }
    const wy = 0.25; const f15 = Math.pow(fill, 1.4);
    let by = wy + lerp(0.55, -0.35, f15) - sink * 1.4 * (1 - lift) + lift * 0.0;
    if (lt > t1 + 2.4 && lt < t1 + 4) by = lerp(wy - 1.75, wy + 0.8, sm(t1 + 2.4, t1 + 3.6, lt));
    K.bowl.position.y = by; K.bowl.rotation.z = 0.04 * Math.sin(lt * 0.9); K.bowl.rotation.x = 0.03 * Math.sin(lt * 0.7 + 1);
    const hy = lerp(-0.93, -0.06, fill); const rr = 1.3 * Math.sqrt(Math.max(0.0001, 1 - (hy / 0.95) ** 2)); K.inner.position.y = hy; K.inner.scale.set(rr, rr, 1); K.inner.visible = fill > 0.01;
    K.jet.scale.y = 0.6 + 0.4 * Math.sin(lt * 20); K.jet.visible = fill < 0.99 && fill > 0.0;
    const pa = K.water.geometry.attributes.position; for (let i = 0; i < pa.count; i++) { const x = K.wpos[i * 3], y = K.wpos[i * 3 + 1]; const d = Math.hypot(x, y); pa.array[i * 3 + 2] = 0.03 * Math.sin(d * 5 - lt * 2.2) * Math.exp(-d * 0.2); } pa.needsUpdate = true; K.water.geometry.computeVertexNormals();
    const v = lt < t1 ? Math.floor(fill * 60) : (lt < t1 + 4 ? 60 : Math.floor(fill * 60));
    K.counter.querySelector('[data-v]').textContent = String(v).padStart(2, '0'); K.counter.style.opacity = sm(c[0] + 1, c[0] + 2, lt) * (1 - sm(c[2] - 0.5, c[2], lt));
    K.units.style.opacity = pulse(lt, c[2], e[3] + 0.5); K.wheel.style.opacity = sm(c[4] - 0.3, c[4] + 0.6, lt);
    K.units.querySelectorAll('.u').forEach((u, i) => { const a = sm(c[2] + i * 0.7 + (i > 2 ? 2 : 0), c[2] + i * 0.7 + 0.6 + (i > 2 ? 2 : 0), lt); u.style.opacity = a; });
    K.wheel.querySelector('.wm').style.opacity = sm(c[4] + 1, c[4] + 2, lt);
    camOrbit(K.cam, new T.Vector3(0, -0.2, 0), kf(lt, [[0, 10.5], [c[2], 9.2], [K.dur, 10]]), 250 + lt * 1.5, kf(lt, [[0, 34], [c[1], 28], [c[3], 38]]));
    const offs = kf(lt, [[0, 0], [c[2] - 0.3, 0], [c[2] + 1, 1.8], [e[3], 1.8], [c[4], 1.8]]);
    shiftView(K.cam, offs * 120, 20);
  }
});
function dayWheelSVG() {
  const R = 150, cx = 180, cy = 180, day = (PD.sunset - PD.sunrise) * 60, pt = (n, r) => [cx + r * Math.sin(n / 60 * 2 * Math.PI), cy - r * Math.cos(n / 60 * 2 * Math.PI)];
  const arc = (a, b, r) => { const [x0, y0] = pt(a, r), [x1, y1] = pt(b, r); return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${b - a > 30 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`; };
  let ticks = ''; for (let i = 0; i < 60; i++) { const [a, b] = pt(i, R - (i % 5 ? 8 : 16)), [c2, d] = pt(i, R); ticks += `<line x1="${a.toFixed(1)}" y1="${b.toFixed(1)}" x2="${c2.toFixed(1)}" y2="${d.toFixed(1)}" stroke="${i % 5 ? '#8A91B0' : '#F3D491'}" stroke-width="${i % 5 ? 1.2 : 2}"/>`; }
  let nums = ''; for (let i = 0; i < 60; i += 10) { const [x, y] = pt(i, R - 34); nums += `<text x="${x.toFixed(1)}" y="${(y + 6).toFixed(1)}" text-anchor="middle" class="wn">${i}</text>`; }
  const tv = vinazh(PD.tithi[0].end, PD.sunrise) / 60; const [mx, my] = pt(tv, R + 2);
  const [sx, sy] = pt(day, R + 22);
  return `<svg viewBox="0 0 360 380" width="300" aria-label="Day of 60 nāḻigai">
    <path d="${arc(0, day, R + 10)}" stroke="#E3AE4A" stroke-width="10" fill="none"/>
    <path d="${arc(day, 60, R + 10)}" stroke="#2c3f86" stroke-width="10" fill="none"/>
    ${ticks}${nums}
    <text x="${cx}" y="${cy - R - 24}" text-anchor="middle" class="wl">sunrise · 0</text>
    <text x="${sx.toFixed(1)}" y="${(sy + 4).toFixed(1)}" text-anchor="start" class="wl">sunset · ${day.toFixed(1)}</text>
    <g class="wm"><line x1="${cx}" y1="${cy}" x2="${mx.toFixed(1)}" y2="${my.toFixed(1)}" stroke="#CBD5DE" stroke-width="3"/><circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="7" fill="#CBD5DE"/>
    <text x="${cx}" y="${cy + 10}" text-anchor="middle" class="wv">${Math.floor(tv)} : ${String(Math.round((tv % 1) * 60)).padStart(2, '0')}</text>
    <text x="${cx}" y="${cy + 34}" text-anchor="middle" class="wl">Pūrṇimā ends · ${S_.tithiEnd}</text></g>
  </svg>`;
}
