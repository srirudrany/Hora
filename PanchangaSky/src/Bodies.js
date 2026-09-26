// Bodies.js — beyond the navagraha: Uranus, Neptune, the dwarf planets Pluto and Ceres, extra moons
// (Titan, Phobos, Deimos; the Galilean moons made pickable) and deep-sky objects on the star sphere.
// None of these are classical grahas; the UI says so plainly.
import * as THREE from 'three';
import { OUTER_BODIES, EXTRA_MOONS, DEEP_SKY, MOONS } from './PanchangamData.js';
import { eqVec } from './Starfield.js';

const D2R = Math.PI / 180;
export { OUTER_KEYS, outerHelio, anyHelio, outerTropicalLon, outerLon } from './BodiesMath.js';
import { OUTER_KEYS, outerLon } from './BodiesMath.js';

function spriteTex(style, color = [230, 220, 200]) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const c = cv.getContext('2d'), [r, g, b] = color;
  let seed = 7; const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const blob = (x, y, rad, a, col = `${r},${g},${b}`) => {
    const gr = c.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(1, `rgba(${col},0)`);
    c.fillStyle = gr; c.beginPath(); c.arc(x, y, rad, 0, Math.PI * 2); c.fill();
  };
  if (style === 'cluster') {
    blob(128, 128, 110, 0.12, '150,180,255');
    for (let i = 0; i < 26; i++) { const a = rand() * 6.283, d = Math.pow(rand(), 0.7) * 80; blob(128 + Math.cos(a) * d, 128 + Math.sin(a) * d, 5 + rand() * 9, 0.8, '215,228,255'); }
  } else if (style === 'globular') {
    blob(128, 128, 90, 0.5); blob(128, 128, 40, 0.8);
    for (let i = 0; i < 120; i++) { const a = rand() * 6.283, d = Math.pow(rand(), 1.6) * 90; blob(128 + Math.cos(a) * d, 128 + Math.sin(a) * d, 2 + rand() * 2, 0.6); }
  } else if (style === 'galaxy') {
    c.save(); c.translate(128, 128); c.scale(1, 0.34); blob(0, 0, 120, 0.35); blob(0, 0, 50, 0.6); blob(0, 0, 14, 0.9, '255,240,215'); c.restore();
  } else if (style === 'nebula') {
    for (let i = 0; i < 14; i++) blob(128 + (rand() - 0.5) * 90, 128 + (rand() - 0.5) * 90, 30 + rand() * 50, 0.18);
    blob(128, 128, 40, 0.35, '200,230,255'); blob(128, 128, 6, 0.95, '255,255,255');
  } else { // cloud
    for (let i = 0; i < 18; i++) blob(128 + (rand() - 0.5) * 120, 128 + (rand() - 0.5) * 70, 30 + rand() * 50, 0.12);
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const pickProxy = (r, pick) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); m.userData = { pick }; return m; };

export class Bodies {
  constructor(planets) {
    this.group = new THREE.Group();    // ecliptic frame: outer planets & dwarfs
    this.sky = new THREE.Group();      // equatorial frame: deep-sky sprites
    this.outer = {}; this.lons = {}; this.pickables = []; this.moons = [];
    for (const k of OUTER_KEYS) {
      const B = OUTER_BODIES[k], col = new THREE.Color(B.color), g = new THREE.Group();
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(B.size, 24, 12), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.1, roughness: 0.9 }));
      mesh.userData = { pick: k };
      g.add(mesh, pickProxy(Math.max(0.35, B.size * 1.6), k));
      if (k === 'uranus') { // faint vertical ring system (98° axial tilt)
        const ring = new THREE.Mesh(new THREE.RingGeometry(B.size * 1.5, B.size * 1.9, 48), new THREE.MeshBasicMaterial({ color: 0x9fd6d2, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }));
        ring.rotation.y = Math.PI / 2; g.add(ring);
      }
      this.group.add(g); this.outer[k] = { group: g, mesh };
      this.pickables.push(g.children[1]);
    }
    // extra moons ride on the existing graha groups; Galilean moons get pick proxies
    for (const [k, M] of Object.entries(EXTRA_MOONS)) {
      const host = planets.bodies[M.host].group;
      const m = new THREE.Mesh(new THREE.SphereGeometry(k === 'titan' ? 0.05 : 0.025, 8, 8), new THREE.MeshBasicMaterial({ color: k === 'titan' ? 0xe0b070 : 0xb8b0a8 }));
      m.userData = { period: M.period, r: M.r, pick: k };
      m.add(pickProxy(0.1, k)); host.add(m); this.moons.push(m); this.pickables.push(m.children[0]);
    }
    const gal = planets.bodies.guru.group.userData.moons ?? [];
    Object.keys(MOONS).forEach((k, i) => { if (gal[i]) { const p = pickProxy(0.09, k); gal[i].add(p); this.pickables.push(p); } });
    // deep-sky sprites just inside the named-star sphere
    this.dso = DEEP_SKY.map((o) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: spriteTex(o.style, o.color), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.85 }));
      s.position.copy(eqVec(o.ra * 15, o.dec, 225));
      s.scale.set(o.size, o.size, 1);
      if (o.style === 'galaxy') s.material.rotation = 0.62;
      s.userData = { dso: o }; this.sky.add(s); return s;
    });
  }

  update(jd, t) {
    const at = (lon, r, v) => v.set(r * Math.cos(lon * D2R), 0, -r * Math.sin(lon * D2R));
    for (const k of OUTER_KEYS) { const lon = outerLon(k, jd); this.lons[k] = lon; at(lon, OUTER_BODIES[k].r, this.outer[k].group.position); }
    for (const m of this.moons) { const a = (jd / m.userData.period) * Math.PI * 2; m.position.set(Math.cos(a) * m.userData.r, 0, -Math.sin(a) * m.userData.r); }
    this.dso.forEach((s, i) => { s.material.opacity = 0.75 + 0.1 * Math.sin(t * 0.3 + i); });
  }

  /** Ray-pick deep-sky sprites; returns the DSO record and its world position. */
  pickDso(raycaster) {
    const h = raycaster.intersectObjects(this.dso, false)[0];
    if (!h) return null;
    return { dso: h.object.userData.dso, world: h.object.getWorldPosition(new THREE.Vector3()) };
  }
}
