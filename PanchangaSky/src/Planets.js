// Planets.js — the rest of the graha cast (SPEC §7): five visible planets on the ecliptic at
// approximate (mean-element) longitudes, Rahu/Ketu as shadow points with an eclipse glow, and
// the western constellation stick figures that the nakshatra sectors are compared against.
import * as THREE from 'three';
import { GRAHAS, CONSTELLATIONS } from './PanchangamData.js';
import { planetLon, rahuLon, angDist, PLANET_KEYS } from './PanchangamMath.js';

const D2R = Math.PI / 180;
// geocentric distances are stylized: order only, not scale
const RADII = { budha: 12.2, shukra: 13.2, mangala: 14.4, guru: 15.8, shani: 17.2 };
const SIZES = { budha: 0.2, shukra: 0.3, mangala: 0.24, guru: 0.5, shani: 0.44 };
export const NODE_R = 5.9;   // on the Moon's orbit

function glowTex(color) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const c = cv.getContext('2d'), g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, color); g.addColorStop(0.3, color.replace(/[\d.]+\)$/, '0.25)')); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

export class Planets {
  constructor() {
    this.group = new THREE.Group();   // ecliptic frame
    this.bodies = {};
    for (const k of PLANET_KEYS) {
      const G = GRAHAS[k], col = new THREE.Color(G.color);
      const g = new THREE.Group();
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(SIZES[k], 32, 16), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.18, roughness: 0.85 }));
      mesh.userData = { pick: k };
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(rgba(G.color, 0.7)), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      halo.scale.setScalar(SIZES[k] * 5);
      g.add(mesh, halo);
      if (k === 'shani') {   // tilted rings — visible when locked on
        const ring = new THREE.Mesh(new THREE.RingGeometry(SIZES[k] * 1.35, SIZES[k] * 2.3, 64),
          new THREE.MeshBasicMaterial({ color: 0xd8c8a0, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
        ring.rotation.x = -Math.PI / 2 + 0.47; g.add(ring);
      }
      if (k === 'guru') {    // four Galilean moons as pinpricks
        g.userData.moons = [1.769, 3.551, 7.155, 16.689].map((period, i) => {
          const m = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), new THREE.MeshBasicMaterial({ color: 0xefe8d8 }));
          m.userData = { period, r: SIZES[k] * (1.6 + i * 0.55) }; g.add(m); return m;
        });
      }
      this.group.add(g);
      this.bodies[k] = { group: g, mesh, halo };
    }
    // Rahu / Ketu — dark discs with a plum/copper rim; glow when Sun or Moon is near
    this.nodes = {};
    for (const k of ['rahu', 'ketu']) {
      const G = GRAHAS[k];
      const g = new THREE.Group();
      const disc = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 12), new THREE.MeshBasicMaterial({ color: 0x05060c }));
      disc.userData = { pick: k };
      const rim = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(rgba(G.color, 0.9)), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.5 }));
      rim.scale.setScalar(1.1);
      g.add(rim, disc); this.group.add(g);
      this.nodes[k] = { group: g, disc, rim };
    }
    this.nodeLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
      new THREE.LineDashedMaterial({ color: 0x8f6bb8, dashSize: 0.2, gapSize: 0.2, transparent: true, opacity: 0.4 }));
    this.group.add(this.nodeLine);
    this.pickables = [...Object.values(this.bodies).map((b) => b.mesh), ...Object.values(this.nodes).map((n) => n.disc)];
    this.lons = {};
  }

  update(jd, sunLon, moonLon, t, dayLord) {
    const at = (lon, r, v) => v.set(r * Math.cos(lon * D2R), 0, -r * Math.sin(lon * D2R));
    for (const k of PLANET_KEYS) {
      const lon = planetLon(k, jd); this.lons[k] = lon;
      const b = this.bodies[k];
      at(lon, RADII[k], b.group.position);
      const lord = k === dayLord;   // Vara cross-link: today's lord pulses
      b.halo.scale.setScalar(SIZES[k] * (lord ? 7 + Math.sin(t * 3) * 1.2 : 5));
      b.group.userData.moons?.forEach((m) => { const a = (jd / m.userData.period) * Math.PI * 2; m.position.set(Math.cos(a) * m.userData.r, 0, -Math.sin(a) * m.userData.r); });
    }
    const r = rahuLon(jd); this.lons.rahu = r; this.lons.ketu = (r + 180) % 360;
    at(r, NODE_R, this.nodes.rahu.group.position); at(this.lons.ketu, NODE_R, this.nodes.ketu.group.position);
    const p = this.nodeLine.geometry.attributes.position;
    p.setXYZ(0, ...this.nodes.rahu.group.position.toArray()); p.setXYZ(1, ...this.nodes.ketu.group.position.toArray()); p.needsUpdate = true;
    this.nodeLine.computeLineDistances();
    // eclipse affordance: Sun near a node (eclipse season), strongest when the Moon is there too
    this.eclipse = null;
    for (const k of ['rahu', 'ketu']) {
      const dS = angDist(sunLon, this.lons[k]), dM = angDist(moonLon, this.lons[k]);
      const near = Math.max(0, 1 - dS / 18) * (0.4 + 0.6 * Math.max(0, 1 - dM / 15));
      const n = this.nodes[k];
      n.rim.material.opacity = 0.35 + near * (0.65 + 0.2 * Math.sin(t * 4));
      n.rim.scale.setScalar(1.1 + near * 2.4);
      if (near > 0.45) this.eclipse = { node: k, strength: near };
    }
  }
}

/** Western stick figures in the equatorial frame; highlight one on demand. */
export class Constellations {
  constructor(starfield) {
    this.group = new THREE.Group();
    this.figures = {};
    const a = new THREE.Vector3(), b = new THREE.Vector3();
    for (const [name, C] of Object.entries(CONSTELLATIONS)) {
      const pts = [];
      for (const [s1, s2] of C.lines) { starfield.starPosition(s1, a); starfield.starPosition(s2, b); pts.push(a.clone(), b.clone()); }
      const seg = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: 0x8a91b0, transparent: true, opacity: 0.28, depthWrite: false }));
      this.group.add(seg); this.figures[name] = seg;
    }
  }
  highlight(name) {
    for (const [n, seg] of Object.entries(this.figures)) {
      const on = n === name;
      seg.material.color.set(on ? 0xE3AE4A : 0x8a91b0); seg.material.opacity = on ? 0.9 : 0.28;
    }
  }
}
