// ZodiacWheel.js — the Kālacakra: rashi ring, nakshatra ring, tithi ring, self-drawing gold ecliptic,
// and the temporal nāḻigai dial. Everything lies in the ecliptic plane (local XZ, λ counter-clockwise
// from +X, Mesha 0° at the top of the clock face). Radii in scene units.
import * as THREE from 'three';
import { RASHI_TABLE, NAKSHATRA_TABLE, TITHI_TABLE } from './PanchangamData.js';

export const R = Object.freeze({
  dial0: 2.1, dial1: 4.0, tithi0: 4.4, tithi1: 5.2, moon: 5.9, nak0: 6.7, nak1: 7.9, rashi0: 8.1, rashi1: 9.4, ecl: 9.6, sun: 10.8,
});
const D2R = Math.PI / 180;
const GOLD = '#E3AE4A', GOLD_SOFT = '#F3D491', MUTED = '#8A91B0', KUMKUM = '#D9483E';

/** Draw helpers in a square canvas where angle θ (deg, CCW) maps onto the ring's UVs. */
function polarCanvas(size, outer) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const c = cv.getContext('2d'), k = size / 2 / outer, m = size / 2;
  const P = (th, r) => [m + r * k * Math.cos(th * D2R), m - r * k * Math.sin(th * D2R)];
  const band = (a, b, r0, r1) => { // θ from a to b (CCW)
    c.beginPath(); c.arc(m, m, r1 * k, -a * D2R, -b * D2R, true); c.arc(m, m, r0 * k, -b * D2R, -a * D2R, false); c.closePath();
  };
  const ray = (th, r0, r1) => { c.beginPath(); c.moveTo(...P(th, r0)); c.lineTo(...P(th, r1)); c.stroke(); };
  return { cv, c, P, band, ray, k, m };
}
function ringMesh(r0, r1, tex, opacity = 1) {
  const g = new THREE.RingGeometry(r0, r1, 256, 1);
  // planar UVs spanning the outer square so the polar canvas maps 1:1
  const pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / (2 * r1) + 0.5, pos.getY(i) / (2 * r1) + 0.5);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }));
  m.rotation.x = -Math.PI / 2;
  return m;
}
const tex = (cv) => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

export class ZodiacWheel {
  constructor() {
    this.group = new THREE.Group();      // ecliptic frame (sidereal)
    this.fadeables = [];
    this.buildRashi(); this.buildNakshatra(); this.buildTithi(); this.buildEcliptic(); this.buildHighlights();
    this.dial = this.buildDial();
    for (const f of this.fadeables) f.material.opacity = 0;
  }

  buildRashi() {
    const { cv, c, band, ray } = polarCanvas(2048, R.rashi1);
    for (let i = 0; i < 12; i++) {
      band(i * 30, i * 30 + 30, R.rashi0, R.rashi1);
      c.fillStyle = i % 2 ? 'rgba(22,32,74,0.55)' : 'rgba(36,51,107,0.45)'; c.fill();
    }
    c.strokeStyle = GOLD; c.lineWidth = 3;
    for (let i = 0; i < 12; i++) ray(i * 30, R.rashi0, R.rashi1);
    c.lineWidth = 1.2; c.strokeStyle = 'rgba(227,174,74,0.6)';
    for (let d = 0; d < 360; d++) ray(d, R.rashi1 - (d % 5 ? 0.12 : 0.26), R.rashi1);
    this.rashiMesh = ringMesh(R.rashi0, R.rashi1, tex(cv), 0.95);
    this.group.add(this.rashiMesh); this.fadeables.push(this.rashiMesh);
  }

  buildNakshatra() {
    const { cv, c, band, ray, P } = polarCanvas(2048, R.nak1);
    const natureCol = { dhruva: '#3E7F7A', cara: '#3C5FA8', ksipra: '#C9962F', mrdu: '#A0698F', ugra: '#A63A32', tiksna: '#6B3A7E', misra: '#6E7488' };
    NAKSHATRA_TABLE.forEach((n) => {
      band(n.start, n.end, R.nak0, R.nak1);
      c.fillStyle = natureCol[n.nature] + '40'; c.fill();
      band(n.start, n.end, R.nak0, R.nak0 + 0.12); c.fillStyle = natureCol[n.nature] + 'C0'; c.fill();
      c.fillStyle = 'rgba(239,232,216,0.8)'; c.font = '600 34px "IBM Plex Mono", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(String(n.index), ...P(n.start + 20 / 3, R.nak0 + 0.35));
    });
    c.strokeStyle = 'rgba(227,174,74,0.55)'; c.lineWidth = 2;
    NAKSHATRA_TABLE.forEach((n) => ray(n.start, R.nak0, R.nak1));
    c.strokeStyle = 'rgba(227,174,74,0.22)'; c.lineWidth = 1;
    for (let p = 0; p < 108; p++) if (p % 4) ray(p * 10 / 3, R.nak1 - 0.18, R.nak1);
    this.nakMesh = ringMesh(R.nak0, R.nak1, tex(cv));
    this.group.add(this.nakMesh); this.fadeables.push(this.nakMesh);
  }

  buildTithi() {
    // 30 cells relative to the Sun; the ring's rotation is set to λ☉ each frame.
    const { cv, c, band, ray, P } = polarCanvas(2048, R.tithi1);
    TITHI_TABLE.forEach((t, i) => {
      band(i * 12, i * 12 + 12, R.tithi0, R.tithi1);
      c.fillStyle = t.index === 15 ? 'rgba(243,212,145,0.55)' : t.index === 30 ? 'rgba(4,6,13,0.9)' : t.paksha === 'Shukla' ? 'rgba(78,94,146,0.55)' : 'rgba(20,26,58,0.8)';
      c.fill();
      c.fillStyle = t.index === 15 ? '#10152B' : 'rgba(239,232,216,0.75)'; c.font = '500 40px "IBM Plex Mono", monospace';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(String(((t.index - 1) % 15) + 1), ...P(i * 12 + 6, (R.tithi0 + R.tithi1) / 2));
    });
    c.strokeStyle = 'rgba(227,174,74,0.5)'; c.lineWidth = 2;
    for (let i = 0; i < 30; i++) ray(i * 12, R.tithi0, R.tithi1);
    c.strokeStyle = 'rgba(227,174,74,0.3)'; c.lineWidth = 1.5;   // karana half-step ticks
    for (let i = 0; i < 30; i++) ray(i * 12 + 6, R.tithi1 - 0.14, R.tithi1);
    this.tithiMesh = ringMesh(R.tithi0, R.tithi1, tex(cv), 0.9);
    this.tithiPivot = new THREE.Group(); this.tithiPivot.add(this.tithiMesh);
    this.group.add(this.tithiPivot); this.fadeables.push(this.tithiMesh);
  }

  buildEcliptic() {
    const pts = [];
    for (let i = 0; i <= 512; i++) { const a = (i / 512) * Math.PI * 2; pts.push(new THREE.Vector3(R.ecl * Math.cos(a), 0, -R.ecl * Math.sin(a))); }
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    this.eclLine = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xE3AE4A, transparent: true, opacity: 0.95 }));
    g.setDrawRange(0, 0);
    this.group.add(this.eclLine);
    const inner = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map((p) => p.clone().multiplyScalar(R.nak0 / R.ecl))),
      new THREE.LineBasicMaterial({ color: 0xE3AE4A, transparent: true, opacity: 0.35 }));
    this.group.add(inner); this.fadeables.push(inner);
    this.drawProgress = 0;
  }

  buildHighlights() {
    const mk = (r0, r1, color, span) => {
      const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 32, 1, 0, span * D2R),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
      m.rotation.x = -Math.PI / 2; const piv = new THREE.Group(); piv.add(m); this.group.add(piv); return piv;
    };
    this.nakHL = mk(R.nak0, R.nak1, 0xF3D491, 40 / 3);
    this.rashiHL = mk(R.rashi0, R.rashi1, 0xE3AE4A, 30);
    this.tithiHL = mk(R.tithi0, R.tithi1, 0xF3D491, 12);
    // tithi arc (Sun → Moon), yoga point, radial measurement lines
    this.arcGeom = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 97 }, () => new THREE.Vector3()));
    this.arc = new THREE.Line(this.arcGeom, new THREE.LineBasicMaterial({ color: 0xF3D491, transparent: true, opacity: 0.9 }));
    this.group.add(this.arc);
    this.yogaDot = new THREE.Mesh(new THREE.OctahedronGeometry(0.2), new THREE.MeshBasicMaterial({ color: 0xE3AE4A }));
    this.group.add(this.yogaDot);
    const radial = (color) => { const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
      const l = new THREE.Line(g, new THREE.LineDashedMaterial({ color, dashSize: 0.25, gapSize: 0.18, transparent: true, opacity: 0.7 })); this.group.add(l); return l; };
    this.sunRay = radial(0xFFD27A); this.moonRay = radial(0xCBD5DE); this.yogaRay = radial(0xE3AE4A);
    this.science = [this.sunRay, this.moonRay, this.yogaRay];
  }

  /** Temporal dial (nāḻigai, day/night, Rāhu kālam, hora hand) — redrawn at 4 Hz. */
  buildDial() {
    const pc = polarCanvas(1024, R.dial1);
    const mesh = ringMesh(0.01, R.dial1, tex(pc.cv));
    mesh.material.opacity = 1;
    this.group.add(mesh);
    return { ...pc, mesh };
  }

  drawDial({ frac, sunsetFrac, rahu, yama, gulika, horaIdx, horaCount }) {
    const { c, cv, band, ray, P } = this.dial;
    // The clock camera puts λ=0 at the top, so "12 o'clock" is θ=0 and clockwise is −θ.
    const T = (f) => -f * 360;
    c.clearRect(0, 0, cv.width, cv.height);
    const r0 = R.dial0, r1 = R.dial1;
    band(T(sunsetFrac), T(0), r0 + 0.95, r1); c.fillStyle = 'rgba(107,77,20,0.55)'; c.fill();       // day arc
    band(T(1), T(sunsetFrac), r0 + 0.95, r1); c.fillStyle = 'rgba(15,26,77,0.7)'; c.fill();        // night arc
    const win = (w, col) => { band(T(w[1]), T(w[0]), r0 + 0.95, r0 + 1.35); c.fillStyle = col; c.fill(); };
    win(rahu, 'rgba(217,72,62,0.95)'); win(yama, 'rgba(143,107,184,0.9)'); win(gulika, 'rgba(192,122,67,0.9)');
    c.strokeStyle = 'rgba(227,174,74,0.9)'; c.lineWidth = 2.2;
    for (let n = 0; n < 60; n++) ray(T(n / 60), r1 - (n % 5 ? 0.18 : 0.38), r1);
    c.lineWidth = 0.8; c.strokeStyle = 'rgba(227,174,74,0.45)';
    for (let n = 0; n < 240; n++) if (n % 4) ray(T(n / 240), r1 - 0.09, r1);
    c.fillStyle = 'rgba(243,212,145,0.85)'; c.font = '500 30px "IBM Plex Mono", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let n = 0; n < 60; n += 5) c.fillText(String(n), ...P(T(n / 60), r1 - 0.62));
    // hora sectors (inner ring)
    for (let h = 0; h < horaCount; h++) {
      band(T((h + 1) / horaCount), T(h / horaCount), r0, r0 + 0.35);
      c.fillStyle = h === horaIdx ? 'rgba(227,174,74,0.6)' : h % 2 ? 'rgba(36,51,107,0.5)' : 'rgba(22,32,74,0.5)'; c.fill();
    }
    c.strokeStyle = 'rgba(227,174,74,0.6)'; c.lineWidth = 1.5;
    c.beginPath(); c.arc(cv.width / 2, cv.height / 2, r1 * this.dial.k - 1, 0, Math.PI * 2); c.stroke();
    // the hand: starts outside the hub so the Earth is never covered
    c.strokeStyle = GOLD_SOFT; c.lineWidth = 5; c.lineCap = 'round'; ray(T(frac), r0 - 0.4, r1 - 0.05);
    c.fillStyle = GOLD; c.beginPath(); c.arc(...P(T(frac), r1 - 0.05), 9, 0, Math.PI * 2); c.fill();
    this.dial.mesh.material.map.needsUpdate = true;
  }

  /** Per-frame: place highlights, arc and pointers from the live longitudes. */
  update(sunLon, moonLon, pan, dt) {
    if (this.drawProgress < 1) {
      this.drawProgress = Math.min(1, this.drawProgress + dt / 1.6);
      const e = 1 - Math.pow(1 - this.drawProgress, 3);
      this.eclLine.geometry.setDrawRange(0, Math.floor(e * 513));
      for (const f of this.fadeables) f.material.opacity = e * (f === this.rashiMesh ? 0.95 : 0.9);
    }
    const nak = pan.nakshatra, t = pan.tithi;
    this.nakHL.rotation.y = nak.start * D2R;
    this.rashiHL.rotation.y = (pan.rashiMoon.start) * D2R;
    this.tithiPivot.rotation.y = sunLon * D2R;
    this.tithiHL.rotation.y = (sunLon + (t.index - 1) * 12) * D2R;
    const arcR = R.moon + 0.35, sweep = pan.elongation;
    const pos = this.arcGeom.attributes.position;
    for (let i = 0; i <= 96; i++) { const a = (sunLon + (sweep * i) / 96) * D2R; pos.setXYZ(i, arcR * Math.cos(a), 0, -arcR * Math.sin(a)); }
    pos.needsUpdate = true;
    this.arc.material.color.set(t.paksha === 'Shukla' ? 0xF3D491 : 0x8A91B0);
    const ya = pan.yogaSum * D2R;
    this.yogaDot.position.set(R.ecl * Math.cos(ya), 0, -R.ecl * Math.sin(ya));
    this.yogaDot.rotation.y += dt;
    this.yogaDot.material.color.set(pan.yoga.classification === 'Shubha' ? 0xE3AE4A : 0xD9483E);
    const setRay = (l, lon, r) => { const a = lon * D2R, p = l.geometry.attributes.position;
      p.setXYZ(0, 1.3 * Math.cos(a), 0, -1.3 * Math.sin(a)); p.setXYZ(1, r * Math.cos(a), 0, -r * Math.sin(a)); p.needsUpdate = true; l.computeLineDistances(); };
    setRay(this.sunRay, sunLon, R.sun); setRay(this.moonRay, moonLon, R.moon); setRay(this.yogaRay, pan.yogaSum, R.ecl);
  }

  /** Label anchors (local ecliptic coordinates) for the HTML label layer. */
  labelAnchors() {
    const at = (lon, r) => new THREE.Vector3(r * Math.cos(lon * D2R), 0, -r * Math.sin(lon * D2R));
    return {
      rashi: RASHI_TABLE.map((s) => ({ rec: s, pos: at(s.start + 15, (R.rashi0 + R.rashi1) / 2) })),
      nakshatra: NAKSHATRA_TABLE.map((n) => ({ rec: n, pos: at(n.start + 20 / 3, (R.nak0 + R.nak1) / 2 + 0.1) })),
    };
  }
}
export { GOLD, GOLD_SOFT, MUTED, KUMKUM };
