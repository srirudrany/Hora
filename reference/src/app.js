// ===== app: timing, player, captions, audio, live clock, capture hooks =====
let TOTAL = 0, renderer, cur = null, curIdx = -1;
const DEVNUM = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९', '१०', '११'];
function layoutFilm() {
  let t = 0;
  for (const K of CH) {
    K.cs = []; K.ce = []; let lt = K.lead ?? 2.8;
    for (const s of K.caps) { const n = s.replace(/\*/g, '').length; const d = clamp(n / 14, 4.6, 10.5) + 0.7; K.cs.push(lt); K.ce.push(lt + d - 0.55); lt += d; }
    K.dur = lt + (K.tail ?? 1.6); K.t0 = t; t += K.dur;
  }
  TOTAL = t;
}
const mdEm = (s) => s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
const fmtClock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function chapterAt(t) { for (let i = CH.length - 1; i >= 0; i--) if (t >= CH[i].t0) return i; return 0; }
function renderAt(t) {
  t = clamp(t, 0, TOTAL - 1e-3); const i = chapterAt(t), K = CH[i], lt = t - K.t0;
  if (i !== curIdx) {
    if (cur) cur.ov.hidden = true; cur = K; curIdx = i; K.ov.hidden = false;
    $('#card-dev').textContent = K.dev; $('#card-lat').textContent = K.iast; $('#card-en').textContent = K.en;
    $('#tag').innerHTML = `<b>${DEVNUM[i]}</b> ${K.iast} <span>${K.dev}</span>`;
    document.querySelectorAll('.chap').forEach((b, j) => b.classList.toggle('on', j === i));
  }
  K.veil = 0; K.active = null; K.update(lt, K);
  const fin = i === 0 ? 1 - sm(0, 1.4, lt) : 1 - sm(0, 0.7, lt);
  const fout = i === CH.length - 1 ? sm(K.dur - 2.2, K.dur, lt) : sm(K.dur - 0.6, K.dur, lt);
  $('#veil').style.opacity = Math.max(fin, fout).toFixed(3);
  $('#dim').style.opacity = clamp(K.veil).toFixed(3);
  // captions
  let ci = -1; for (let j = 0; j < K.cs.length; j++) if (lt >= K.cs[j] - 0.1 && lt < K.ce[j] + 0.35) ci = j;
  const cap = $('#cap'), capOut = $('#capOut');
  if (ci >= 0) { if (cap.__i !== `${i}.${ci}`) { cap.__i = `${i}.${ci}`; cap.innerHTML = mdEm(K.caps[ci]); capOut.innerHTML = cap.innerHTML; } cap.style.opacity = (sm(K.cs[ci] - 0.1, K.cs[ci] + 0.35, lt) * (1 - sm(K.ce[ci], K.ce[ci] + 0.35, lt))).toFixed(3); }
  else cap.style.opacity = 0;
  // chapter card
  const cardOn = K.noCard ? 0 : pulse(lt, 0.35, (K.lead ?? 2.8) + 2.2, 0.6);
  $('#card').style.opacity = cardOn.toFixed(3); $('#card').style.transform = `translateY(${(1 - cardOn) * 10}px)`;
  $('#tag').style.opacity = K.noCard ? 0 : sm((K.lead ?? 2.8) + 1.6, (K.lead ?? 2.8) + 2.6, lt).toFixed(3);
  draw(K.active || { scene: K.scene, cam: K.cam }, K);
  return i;
}
function draw(sc, K) {
  renderer.setScissorTest(false); renderer.setViewport(0, 0, W, H);
  renderer.setClearColor(0x04060d, 1); renderer.clear(); renderer.render(sc.scene, sc.cam);
  if (K && K.render && !K.active) K.render(K, renderer);
}

// ---------- sizing ----------
let SCALE = 1;
function fit() {
  const wrap = $('#stageWrap'); const w = CAPTURE ? W : wrap.clientWidth; SCALE = w / W;
  $('#stage').style.transform = `scale(${SCALE})`; wrap.style.height = CAPTURE ? `${H}px` : `${H * SCALE}px`;
  const pr = CAPTURE ? +(Q.get('pr') || 1) : Math.min(2, (window.devicePixelRatio || 1) * SCALE);
  renderer.setPixelRatio(Math.max(0.5, pr)); renderer.setSize(W, H, false);
  STARMATS.forEach((m) => (m.size = m.userData.base * Math.max(0.75, renderer.getPixelRatio())));
  document.body.classList.toggle('narrow', SCALE < 0.62);
}

// ---------- audio: tanpura drone + bells ----------
const AU = { ctx: null, on: false, timer: null, next: 0, step: 0 };
function audioInit() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)(); AU.ctx = ctx;
  AU.master = ctx.createGain(); AU.master.gain.value = 0.0; AU.master.connect(ctx.destination);
  const conv = ctx.createConvolver(); const len = ctx.sampleRate * 3.2, ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
  conv.buffer = ir; AU.wet = ctx.createGain(); AU.wet.gain.value = 0.35; conv.connect(AU.wet); AU.wet.connect(AU.master); AU.conv = conv;
  AU.dry = ctx.createGain(); AU.dry.gain.value = 0.8; AU.dry.connect(AU.master);
  const real = new Float32Array(24), imag = new Float32Array(24); for (let n = 1; n < 24; n++) imag[n] = (n === 1 ? 0.7 : 1 / Math.pow(n, 0.8)) * (n % 7 === 0 ? 0.4 : 1);
  AU.wave = ctx.createPeriodicWave(real, imag);
}
function pluck(t, f, g = 0.16) {
  const c = AU.ctx, o = c.createOscillator(), o2 = c.createOscillator(), lp = c.createBiquadFilter(), v = c.createGain();
  o.setPeriodicWave(AU.wave); o2.setPeriodicWave(AU.wave); o.frequency.value = f; o2.frequency.value = f * 1.0021;
  lp.type = 'lowpass'; lp.Q.value = 4; lp.frequency.setValueAtTime(f * 3, t); lp.frequency.linearRampToValueAtTime(f * 14, t + 0.9); lp.frequency.exponentialRampToValueAtTime(f * 4, t + 4.2);
  v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(g, t + 0.012); v.gain.exponentialRampToValueAtTime(g * 0.35, t + 1.6); v.gain.exponentialRampToValueAtTime(0.0008, t + 5.2);
  o.connect(lp); o2.connect(lp); lp.connect(v); v.connect(AU.dry); v.connect(AU.conv); o.start(t); o2.start(t); o.stop(t + 5.4); o2.stop(t + 5.4);
}
function bell(t) {
  const c = AU.ctx; [[1, 0.05], [2.76, 0.028], [5.4, 0.016], [8.93, 0.008]].forEach(([k, g]) => { const o = c.createOscillator(), v = c.createGain(); o.frequency.value = 587.3 * k; v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(g, t + 0.004); v.gain.exponentialRampToValueAtTime(0.0001, t + 3.8 / Math.sqrt(k)); o.connect(v); v.connect(AU.dry); v.connect(AU.conv); o.start(t); o.stop(t + 4); });
}
const SA = 146.83, TANP = [SA * 0.75, SA * 2, SA * 2, SA];
function audioTick() { const c = AU.ctx; while (AU.next < c.currentTime + 0.3) { pluck(AU.next, TANP[AU.step % 4], AU.step % 4 === 3 ? 0.2 : 0.14); AU.next += AU.step % 4 === 3 ? 2.0 : 1.15; AU.step++; } }
function audioPlay(on) {
  if (!AU.ctx) { try { audioInit(); } catch (e) { return; } }
  const c = AU.ctx; if (on) { c.resume(); if (!AU.timer) { AU.next = c.currentTime + 0.1; AU.timer = setInterval(audioTick, 100); } AU.master.gain.setTargetAtTime(0.5, c.currentTime, 0.4); }
  else { AU.master.gain.setTargetAtTime(0, c.currentTime, 0.3); clearInterval(AU.timer); AU.timer = null; }
}

// ---------- player ----------
const ST = { t: 0, playing: false, last: 0, mode: 'film', sound: true, poster: true };
function setPlaying(p) {
  if (p && ST.poster) { ST.poster = false; }
  ST.playing = p; $('#play').classList.toggle('on', p); $('#play').setAttribute('aria-label', p ? 'Pause' : 'Play');
  $('#bigplay').hidden = p || ST.mode !== 'film'; if (ST.sound) audioPlay(p);
}
function seek(t) { ST.poster = false; ST.t = clamp(t, 0, TOTAL - 0.01); }
function loop(now) {
  const dt = ST.last ? Math.min(0.1, (now - ST.last) / 1000) : 0; ST.last = now;
  if (ST.mode === 'film') {
    if (ST.playing) { ST.t += dt; if (ST.t >= TOTAL - 0.02) { ST.t = TOTAL - 0.02; setPlaying(false); $('#ended').hidden = false; } }
    const pi = curIdx; const i = renderAt(ST.poster ? 13.5 : ST.t); if (ST.poster) { $('#cap').style.opacity = 0; } if (ST.playing && i !== pi && pi !== -1 && AU.ctx && ST.sound) bell(AU.ctx.currentTime + 0.05);
    $('#time').textContent = `${fmtClock(ST.t)} / ${fmtClock(TOTAL)}`; $('#prog').style.width = `${(100 * ST.t / TOTAL).toFixed(2)}%`;
  } else liveFrame();
  requestAnimationFrame(loop);
}
// ---------- live clock ----------
let _lp = null; function LP() { if (!_lp) { $('#livePanel').innerHTML = CLOCK_PANEL; _lp = $('#livePanel .clockpanel'); } return _lp; }
const PLACES = { Chennai: [13.0827, 80.2707], Madurai: [9.9252, 78.1198], Tiruchirappalli: [10.7905, 78.7047], Coimbatore: [11.0168, 76.9558], Tirunelveli: [8.7139, 77.7567], Puducherry: [11.9416, 79.8083], Bengaluru: [12.9716, 77.5946], Thiruvananthapuram: [8.5241, 76.9366] };
let LIVE = { name: 'Chennai', lat: 13.0827, lon: 80.2707, tz: 5.5 };
function liveFrame() {
  const K = CH.find((k) => k.key === 'clock'); if (cur !== K) { if (cur) cur.ov.hidden = true; cur = K; curIdx = -1; K.ov.hidden = false; }
  const jd = P.jdFromDate(new Date()); const narrow = document.body.classList.contains('narrow');
  updateClock(K.clock, jd, LIVE, K.panel); if (narrow) updateClock(K.clock, jd, LIVE, LP());
  const lt = performance.now() / 1000;
  clockCam(K, lt, narrow);
  K.panel.style.opacity = 1; ['#veil', '#dim', '#cap', '#card', '#tag'].forEach((s) => ($(s).style.opacity = 0));
  draw({ scene: K.scene, cam: K.cam }, K);
}
function setMode(m) {
  ST.mode = m; document.body.classList.toggle('live', m === 'live');
  $('#modeFilm').classList.toggle('on', m === 'film'); $('#modeLive').classList.toggle('on', m === 'live');
  $('#modeFilm').setAttribute('aria-pressed', m === 'film'); $('#modeLive').setAttribute('aria-pressed', m === 'live');
  const K = CH.find((k) => k.key === 'clock'); K.panel.classList.toggle('film', m === 'film');
  if (m === 'live') { setPlaying(false); $('#ended').hidden = true; } else { curIdx = -2; }
  $('#bigplay').hidden = m !== 'film' || ST.playing;
}

// ---------- boot ----------
async function boot() {
  const faces = [`48px ${F.skt}`, `italic 48px ${F.skt}`, `48px ${F.ta}`, `48px ${F.sans}`, `600 48px ${F.sans}`, `48px ${F.mono}`, `600 48px ${F.mono}`];
  try { await Promise.all(faces.map((f) => document.fonts.load(f, 'aāṣṇ अ த 0'))); await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 3000))]); } catch (e) { }
  renderer = new T.WebGLRenderer({ canvas: $('#gl'), antialias: true, preserveDrawingBuffer: CAPTURE, powerPreference: 'high-performance' });
  renderer.autoClear = false; MAXANISO = renderer.capabilities.getMaxAnisotropy();
  initTextures(); layoutFilm();
  for (const K of CH) K.build(K);
  fit(); window.addEventListener('resize', fit);
  // chapter list + scrub ticks
  const list = $('#chapters'), ticks = $('#ticks');
  CH.forEach((K, i) => {
    list.insertAdjacentHTML('beforeend', `<button class="chap" type="button" data-i="${i}"><span class="cn">${DEVNUM[i]}</span><span class="cd">${K.dev}</span><span class="cl">${K.iast}</span><span class="ce">${K.en}</span><span class="ct mono">${fmtClock(K.t0)}</span></button>`);
    if (i) ticks.insertAdjacentHTML('beforeend', `<i style="left:${(100 * K.t0 / TOTAL).toFixed(2)}%"></i>`);
  });
  list.addEventListener('click', (e) => { const b = e.target.closest('.chap'); if (!b) return; if (ST.mode !== 'film') setMode('film'); seek(CH[+b.dataset.i].t0 + 0.01); $('#ended').hidden = true; if (!ST.playing) setPlaying(true); });
  if (CAPTURE) { window.__film = { total: TOTAL, renderAt, starts: CH.map((k) => k.t0), keys: CH.map((k) => k.key) }; renderAt(0); window.__ready = true; return; }
  // controls
  $('#play').addEventListener('click', () => { if (ST.mode !== 'film') setMode('film'); if (!ST.playing && ST.t >= TOTAL - 0.1) seek(0); $('#ended').hidden = true; setPlaying(!ST.playing); });
  $('#bigplay').addEventListener('click', () => { $('#ended').hidden = true; if (ST.t >= TOTAL - 0.1) seek(0); setPlaying(true); });
  $('#replay').addEventListener('click', () => { $('#ended').hidden = true; seek(0); setPlaying(true); });
  $('#toLive').addEventListener('click', () => setMode('live'));
  $('#sound').addEventListener('click', () => { ST.sound = !ST.sound; $('#sound').classList.toggle('off', !ST.sound); $('#sound').setAttribute('aria-pressed', ST.sound); audioPlay(ST.sound && ST.playing); });
  $('#fs').addEventListener('click', () => { const el = $('#player'); try { if (document.fullscreenElement) document.exitFullscreen(); else el.requestFullscreen().catch(() => { }); } catch (e) { } });
  document.addEventListener('fullscreenchange', () => setTimeout(fit, 50));
  const bar = $('#scrub'); let drag = false; const at = (e) => { const r = bar.getBoundingClientRect(); seek((e.clientX - r.left) / r.width * TOTAL); $('#ended').hidden = true; };
  bar.addEventListener('pointerdown', (e) => { if (ST.mode !== 'film') setMode('film'); drag = true; bar.setPointerCapture(e.pointerId); at(e); });
  bar.addEventListener('pointermove', (e) => { if (drag) at(e); }); bar.addEventListener('pointerup', () => (drag = false));
  bar.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') seek(ST.t + 5); if (e.key === 'ArrowLeft') seek(ST.t - 5); });
  document.addEventListener('keydown', (e) => { if (e.key === ' ' && e.target === document.body) { e.preventDefault(); $('#play').click(); } });
  $('#modeFilm').addEventListener('click', () => setMode('film')); $('#modeLive').addEventListener('click', () => setMode('live'));
  const sel = $('#place'); Object.keys(PLACES).forEach((n) => sel.insertAdjacentHTML('beforeend', `<option value="${n}">${n}</option>`));
  sel.addEventListener('change', () => { const [la, lo] = PLACES[sel.value]; LIVE = { name: sel.value, lat: la, lon: lo, tz: 5.5 }; });
  $('#loading').hidden = true; $('#bigplay').hidden = false;
  requestAnimationFrame(loop);
}
boot();
