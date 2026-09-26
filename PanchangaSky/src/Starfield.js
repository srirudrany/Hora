// Starfield.js — three parallax layers of procedural stars, a milky-way band, nebula wash,
// and the named bright-star catalogue (pickable). All star geometry lives in the equatorial frame.
import * as THREE from 'three';
import { STARS } from './PanchangamData.js';

const D2R = Math.PI / 180;
/** RA/Dec (deg) → unit vector in the equatorial frame (Y = north celestial pole). */
export function eqVec(raDeg, decDeg, r = 1) {
  const a = raDeg * D2R, d = decDeg * D2R;
  return new THREE.Vector3(r * Math.cos(d) * Math.cos(a), r * Math.sin(d), -r * Math.cos(d) * Math.sin(a));
}

// deterministic PRNG so the sky is the same every load
function mulberry(seed) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const STAR_COLORS = [[0.62, 0.72, 1.0], [0.8, 0.86, 1.0], [1.0, 0.98, 0.94], [1.0, 0.92, 0.76], [1.0, 0.8, 0.6]];
const GAL_POLE = eqVec(192.859, 27.128);

const vert = /* glsl */`
  attribute float size; attribute float phase; attribute vec3 tint;
  uniform float uTime; uniform float uSwell; uniform float uPix;
  varying vec3 vTint; varying float vTw;
  void main() {
    vTint = tint;
    float drift = 0.55 + 0.45 * sin(uTime * 0.07 + phase * 3.1);
    vTw = 1.0 - 0.35 * drift * (0.5 + 0.5 * sin(uTime * (1.3 + fract(phase * 7.0) * 2.2) + phase * 6.283));
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * uSwell * uPix;
    gl_Position = projectionMatrix * mv;
  }`;
const frag = /* glsl */`
  uniform float uOpacity; varying vec3 vTint; varying float vTw;
  void main() {
    vec2 c = gl_PointCoord - 0.5; float d = length(c);
    float core = smoothstep(0.5, 0.0, d); core *= core;
    float a = core * vTw * uOpacity;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vTint * 0.8, a);   // capped below the bloom threshold: stars do not bloom
  }`;

function makeLayer(count, radius, sizeRange, rand, galacticBias) {
  const pos = new Float32Array(count * 3), size = new Float32Array(count), phase = new Float32Array(count), tint = new Float32Array(count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    // uniform on sphere, optionally squeezed toward the galactic plane (milky way)
    for (;;) {
      const u = rand() * 2 - 1, th = rand() * Math.PI * 2, s = Math.sqrt(1 - u * u);
      v.set(s * Math.cos(th), u, s * Math.sin(th));
      const gl = Math.abs(v.dot(GAL_POLE));
      if (rand() > galacticBias * gl) break;
    }
    v.multiplyScalar(radius * (0.94 + rand() * 0.12));
    pos.set([v.x, v.y, v.z], i * 3);
    // log-normal-ish magnitude distribution: many faint, few bright
    const m = Math.exp(-Math.abs(rand() + rand() + rand() - 1.5) * 1.6);
    size[i] = sizeRange[0] + (sizeRange[1] - sizeRange[0]) * m * m;
    phase[i] = rand();
    const c = STAR_COLORS[Math.min(4, Math.floor(Math.pow(rand(), 0.8) * 5))];
    const b = 0.45 + 0.55 * m;
    tint.set([c[0] * b, c[1] * b, c[2] * b], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('size', new THREE.BufferAttribute(size, 1));
  g.setAttribute('phase', new THREE.BufferAttribute(phase, 1));
  g.setAttribute('tint', new THREE.BufferAttribute(tint, 3));
  return g;
}

export class Starfield {
  constructor() {
    this.group = new THREE.Group();
    this.uniforms = { uTime: { value: 0 }, uSwell: { value: 1 }, uPix: { value: Math.min(devicePixelRatio, 2) }, uOpacity: { value: 1 } };
    const mat = new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: vert, fragmentShader: frag,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const rand = mulberry(108);
    // three parallax layers: bright/near, medium, faint/far — 18,000 stars total
    this.layers = [[1400, 240, [1.6, 4.2], 0.2], [4600, 300, [1.0, 2.6], 0.5], [12000, 360, [0.6, 1.6], 0.85]].map(([n, r, s, gb]) => {
      const p = new THREE.Points(makeLayer(n, r, s, rand, gb), mat);
      p.frustumCulled = false; this.group.add(p); return p;
    });
    this.group.add(this.makeMilkyWay());
    this.group.add(this.makeNebula());
    this.named = this.makeNamed();
    this.group.add(this.named.points);
  }

  makeMilkyWay() {
    // a faint band texture on a sphere, oriented to the galactic plane
    const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 256;
    const c = cv.getContext('2d');
    const grd = c.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(0.42, 'rgba(120,130,190,0.10)');
    grd.addColorStop(0.5, 'rgba(210,200,190,0.20)'); grd.addColorStop(0.58, 'rgba(120,130,190,0.10)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = grd; c.fillRect(0, 0, 1024, 256);
    const rand = mulberry(7);
    for (let i = 0; i < 900; i++) { // dust lanes & clumps
      const x = rand() * 1024, y = 128 + (rand() - 0.5) * 70 * rand(), r = 6 + rand() * 30;
      const g2 = c.createRadialGradient(x, y, 0, x, y, r);
      const dark = rand() < 0.35;
      g2.addColorStop(0, dark ? 'rgba(4,6,13,0.22)' : 'rgba(230,215,200,0.05)'); g2.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g2; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    }
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.SphereGeometry(390, 64, 32),
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9 }));
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), GAL_POLE);
    return m;
  }

  makeNebula() {
    const mat = new THREE.ShaderMaterial({
      uniforms: { uOpacity: this.uniforms.uOpacity },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: /* glsl */`
        uniform float uOpacity; varying vec3 vP;
        float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164)))*43758.5453); }
        float n(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
          return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
                     mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
        float fbm(vec3 p){ float a=0.5, s=0.0; for(int i=0;i<5;i++){ s+=a*n(p); p*=2.03; a*=0.5; } return s; }
        void main(){
          float f = fbm(vP*2.2), g = fbm(vP*3.7+7.0);
          vec3 col = mix(vec3(0.09,0.06,0.20), vec3(0.03,0.07,0.16), g) + vec3(0.12,0.08,0.02)*smoothstep(0.62,0.9,f);
          gl_FragColor = vec4(col, smoothstep(0.35,0.85,f) * 0.35 * uOpacity);
        }`,
      side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    return new THREE.Mesh(new THREE.SphereGeometry(395, 48, 24), mat);
  }

  makeNamed() {
    const n = STARS.length, pos = new Float32Array(n * 3), size = new Float32Array(n), phase = new Float32Array(n), tint = new Float32Array(n * 3);
    this.namedIndex = new Map();
    STARS.forEach((s, i) => {
      const v = eqVec(s.ra * 15, s.dec, 230);
      pos.set([v.x, v.y, v.z], i * 3);
      size[i] = Math.max(2.2, 7.5 - s.mag * 1.5);
      phase[i] = (i * 0.618) % 1;
      const warm = /Betelgeuse|Aldebaran|Antares|Arcturus|Pollux|Dubhe|Hamal|Kaus|Alnasl|Scheat/.test(s.name);
      const b = 1.0;
      tint.set(warm ? [1.0 * b, 0.78 * b, 0.55 * b] : [0.9 * b, 0.94 * b, 1.0 * b], i * 3);
      this.namedIndex.set(s.name, i);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('size', new THREE.BufferAttribute(size, 1));
    g.setAttribute('phase', new THREE.BufferAttribute(phase, 1));
    g.setAttribute('tint', new THREE.BufferAttribute(tint, 3));
    this.highlight = new Float32Array(n);
    g.setAttribute('hl', new THREE.BufferAttribute(this.highlight, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: vert.replace('attribute vec3 tint;', 'attribute vec3 tint; attribute float hl; varying float vHl;')
        .replace('vTint = tint;', 'vTint = tint; vHl = hl;')
        .replace('gl_PointSize = size * uSwell * uPix;', 'gl_PointSize = size * uSwell * uPix * (1.0 + hl * (0.9 + 0.5 * sin(uTime * 4.0)));'),
      fragmentShader: frag.replace('varying float vTw;', 'varying float vTw; varying float vHl;')
        .replace('gl_FragColor = vec4(vTint * 0.8, a);', 'gl_FragColor = vec4(mix(vTint * 0.8, vec3(0.89,0.68,0.29), vHl * 0.7), a);'),
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(g, mat);
    points.frustumCulled = false;
    return { points, geometry: g };
  }

  setHighlight(names) {
    this.highlight.fill(0);
    for (const nm of names) { const i = this.namedIndex.get(nm); if (i !== undefined) this.highlight[i] = 1; }
    this.named.geometry.attributes.hl.needsUpdate = true;
  }

  starPosition(name, target = new THREE.Vector3()) {
    const i = this.namedIndex.get(name);
    return target.fromBufferAttribute(this.named.geometry.attributes.position, i);
  }

  update(t, swell) { this.uniforms.uTime.value = t; this.uniforms.uSwell.value = swell; }
}
