// Renderer.js — scene graph, cameras, bloom, the lift-off transition, HTML label layer and picking.
//
// Frames (outer → inner):  world (Earth-fixed, Earth at origin)
//   └ equatorial  — rotates by −GMST in sky mode: the sky turns, Earth does not
//       ├ Starfield (RA/Dec)
//       └ tilt (obliquity ε about X)
//           └ ecliptic (rotated by the ayanamsha, so λ here is sidereal)
//               ├ ZodiacWheel, CelestialBodies
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Starfield } from './Starfield.js';
import { ZodiacWheel, R } from './ZodiacWheel.js';
import { CelestialBodies } from './CelestialBodies.js';
import { Planets, Constellations } from './Planets.js';
import { Bodies, OUTER_KEYS } from './Bodies.js';   // agent C: bodies
import { STARS, CONSTELLATIONS, NAKSHATRA_TABLE } from './PanchangamData.js';

const D2R = Math.PI / 180;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

export class Renderer {
  constructor(container, labelLayer) {
    this.container = container;
    this.labelLayer = labelLayer;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x04060d);
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.05, 2000);

    this.equatorial = new THREE.Group();
    this.tilt = new THREE.Group();
    this.ecliptic = new THREE.Group();
    this.scene.add(this.equatorial); this.equatorial.add(this.tilt); this.tilt.add(this.ecliptic);

    this.stars = new Starfield(); this.equatorial.add(this.stars.group);
    this.wheel = new ZodiacWheel(); this.ecliptic.add(this.wheel.group);
    this.bodies = new CelestialBodies(); this.ecliptic.add(this.bodies.group);
    this.earth = CelestialBodies.makeEarth(); this.scene.add(this.earth);
    this.grid = this.makeGrid(); this.equatorial.add(this.grid);
    this.planets = new Planets(); this.ecliptic.add(this.planets.group);
    this.constellations = new Constellations(this.stars); this.equatorial.add(this.constellations.group);
    this.ground = this.makeGround(); this.scene.add(this.ground);
    this.scene.add(new THREE.PointLight(0xfff0d0, 2.5, 0, 0));   // lights the planets from the geocentre (stylized)
    this.layers = { constellations: true, grahas: true, nakshatra: true, rashi: true, deepsky: true };
    // agent C: bodies — outer planets, dwarfs, extra moons (ecliptic) + deep-sky sprites (equatorial)
    this.extra = new Bodies(this.planets); this.ecliptic.add(this.extra.group); this.equatorial.add(this.extra.sky);
    this.pov = { k: 0, dir: 0, az: 90, alt: 14, skyPos: new THREE.Vector3() };
    this.scene.add(new THREE.AmbientLight(0x3a4a8a, 0.4));

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 1.05, 0.55, 0.92);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true; this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 3; this.controls.maxDistance = 90; this.controls.enablePan = false;
    this.controls.enabled = false;

    // mode state: w = 0 clock face, 1 celestial sky
    this.mode = 'clock'; this.w = 0; this.anim = null; this.lock = null;
    this.skyPose = new THREE.Vector3(13, 4.2, 12.5);
    this.labels = [];
    this.buildLabels();
    this.raycaster = new THREE.Raycaster();
    this.clockUp = new THREE.Vector3(); this.clockPos = new THREE.Vector3();
    this.resize(); addEventListener('resize', () => this.resize());
    this.t0 = performance.now();
  }

  makeGround() {
    // "Stand here": an opaque ground hemisphere just outside the camera; everything below the horizon is hidden
    const g = new THREE.Group();
    const mat = new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: 0 } }, transparent: true, depthWrite: true, side: THREE.BackSide,
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `uniform float uOpacity; varying vec3 vP;
        void main(){ float h = -vP.y; vec3 c = mix(vec3(0.06,0.07,0.13), vec3(0.015,0.018,0.035), smoothstep(0.0, 0.5, h));
          c += vec3(0.25,0.3,0.55) * exp(-h * 40.0) * 0.5; gl_FragColor = vec4(c, uOpacity); }`,
    });
    const hemi = new THREE.Mesh(new THREE.SphereGeometry(4.6, 64, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat);
    hemi.renderOrder = -1; g.add(hemi);
    // atmospheric haze band above the horizon
    const haze = new THREE.Mesh(new THREE.CylinderGeometry(4.55, 4.55, 1.1, 64, 1, true), new THREE.ShaderMaterial({
      uniforms: { uOpacity: mat.uniforms.uOpacity }, transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
      vertexShader: 'varying float vY; void main(){ vY = position.y / 1.1 + 0.5; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'uniform float uOpacity; varying float vY; void main(){ gl_FragColor = vec4(vec3(0.22,0.3,0.6) * pow(1.0 - vY, 2.5) * 0.6, uOpacity); }',
    }));
    haze.position.y = 0.55; g.add(haze);
    g.visible = false; g.userData.mat = mat;
    return g;
  }

  /** Observer frame at (lat, lon), Earth-fixed world coordinates. */
  observerFrame(lat, lon) {
    const Z = new THREE.Vector3(Math.cos(lat * D2R) * Math.cos(lon * D2R), Math.sin(lat * D2R), -Math.cos(lat * D2R) * Math.sin(lon * D2R));
    const N = new THREE.Vector3(0, 1, 0).addScaledVector(Z, -Z.y);
    if (N.lengthSq() < 1e-6) N.set(-1, 0, 0); N.normalize();
    const E = new THREE.Vector3().crossVectors(N, Z);
    return { Z, N, E };
  }
  povDir(f, az, alt) {
    const a = az * D2R, h = alt * D2R;
    return new THREE.Vector3().addScaledVector(f.N, Math.cos(h) * Math.cos(a)).addScaledVector(f.E, Math.cos(h) * Math.sin(a)).addScaledVector(f.Z, Math.sin(h));
  }
  povLookAt(worldPos) {   // "look at" locks from the horizon
    const f = this.observerFrame(this.state.lat, this.state.lon), d = worldPos.clone().normalize();
    this.pov.targetAlt = Math.asin(THREE.MathUtils.clamp(d.dot(f.Z), -1, 1)) / D2R;
    this.pov.targetAz = Math.atan2(d.dot(f.E), d.dot(f.N)) / D2R;
  }
  povDrag(dx, dy) {
    this.pov.targetAz = undefined; this.pov.targetAlt = undefined;
    const k = this.camera.fov / this.height;
    this.pov.az -= dx * k; this.pov.alt = THREE.MathUtils.clamp(this.pov.alt + dy * k, -10, 89);
  }

  makeGrid() {
    // equatorial RA/Dec grid (Scientific view)
    const g = new THREE.Group(), mat = new THREE.LineBasicMaterial({ color: 0x8a91b0, transparent: true, opacity: 0.12 });
    const r = 200;
    for (let dec = -60; dec <= 60; dec += 30) {
      const pts = []; for (let i = 0; i <= 128; i++) { const a = (i / 128) * Math.PI * 2, c = Math.cos(dec * D2R); pts.push(new THREE.Vector3(r * c * Math.cos(a), r * Math.sin(dec * D2R), -r * c * Math.sin(a))); }
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
    }
    for (let ra = 0; ra < 360; ra += 30) {
      const pts = []; for (let i = 0; i <= 64; i++) { const d = -90 + (i / 64) * 180, c = Math.cos(d * D2R); pts.push(new THREE.Vector3(r * c * Math.cos(ra * D2R), r * Math.sin(d * D2R), -r * c * Math.sin(ra * D2R))); }
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
    }
    // celestial pole axis through Earth
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -2.2, 0), new THREE.Vector3(0, 2.2, 0)]),
      new THREE.LineBasicMaterial({ color: 0xcbd5de, transparent: true, opacity: 0.5 })));
    return g;
  }

  // ---------- HTML labels (crisp Devanagari, never below 14px; animated with transform only) ----------
  addLabel(html, obj, local, cls = '') {
    const el = document.createElement('div');
    el.className = `lbl ${cls}`; el.innerHTML = html;
    this.labelLayer.appendChild(el);
    const L = { el, obj, local, visible: true, on: true, cls };
    this.labels.push(L); return L;
  }
  buildLabels() {
    const a = this.wheel.labelAnchors();
    this.rashiLabels = a.rashi.map(({ rec, pos }) => this.addLabel(`<span class="dv">${rec.name}</span><span class="ia">${rec.iast}</span>`, this.ecliptic, pos, 'lbl-rashi'));
    this.nakLabels = a.nakshatra.map(({ rec, pos }) => this.addLabel(`<span class="dv">${rec.name}</span>`, this.ecliptic, pos, 'lbl-nak'));
    this.sunLabel = this.addLabel('<span class="dv">सूर्य</span><span class="ia">Surya</span>', this.bodies.sun, new THREE.Vector3(0, 1.1, 0), 'lbl-body');
    this.moonLabel = this.addLabel('<span class="dv">चन्द्र</span><span class="ia">Chandra</span>', this.bodies.moonGroup, new THREE.Vector3(0, 0.8, 0), 'lbl-body');
    this.dLLabel = this.addLabel('', this.ecliptic, new THREE.Vector3(), 'lbl-dl');
    this.planetLabels = Object.entries(this.planets.bodies).map(([k, b]) => this.addLabel(`<span class="dv">${{ budha: 'बुध', shukra: 'शुक्र', mangala: 'मङ्गल', guru: 'गुरु', shani: 'शनि' }[k]}</span>`, b.group, new THREE.Vector3(0, 0.75, 0), 'lbl-graha'));
    this.nodeLabels = ['rahu', 'ketu'].map((k) => this.addLabel(`<span class="dv">${k === 'rahu' ? 'राहु' : 'केतु'}</span>`, this.planets.nodes[k].group, new THREE.Vector3(0, 0.55, 0), 'lbl-node'));
    this.cardinals = ['N', 'E', 'S', 'W'].map((c) => this.addLabel(`<b>${c}</b>`, this.scene, new THREE.Vector3(), 'lbl-card'));
    this.outerLabels = OUTER_KEYS.map((k) => this.addLabel(`<span class="on">${k[0].toUpperCase() + k.slice(1)}</span>`, this.extra.outer[k].group, new THREE.Vector3(0, 0.5, 0), 'lbl-outer'));   // agent C
    this.starLabels = STARS.filter((s) => s.mag < 1.4 || s.yogatara).map((s) => this.addLabel(`<span class="sn">${s.name}</span>`, this.stars.group, this.stars.starPosition(s.name, new THREE.Vector3()).clone(), 'lbl-star'));
  }

  updateLabels() {
    const v = new THREE.Vector3(), w = this.width, h = this.height, camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);
    for (const L of this.labels) {
      if (!L.on) { if (L.visible) { L.el.style.opacity = 0; L.visible = false; } continue; }
      v.copy(L.local); L.obj.localToWorld(v);
      const worldV = v.clone();
      const toP = v.clone().sub(this.camera.position);
      const front = toP.dot(camDir) > 0;
      v.project(this.camera);
      const x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * h;
      const aboveHorizon = !this.povZ || this.pov.k < 0.5 || L.cls === 'lbl-card' || worldV.normalize().dot(this.povZ) > -0.01;
      const vis = front && aboveHorizon && x > -80 && x < w + 80 && y > -40 && y < h + 40;
      if (vis) L.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`;
      const op = vis ? (L.opacityOverride ?? 1) : 0;
      if (L.lastOp !== op) { L.el.style.opacity = op; L.lastOp = op; }
      L.visible = vis;
    }
  }

  resize() {
    this.width = this.container.clientWidth; this.height = this.container.clientHeight;
    this.renderer.setSize(this.width, this.height);
    this.composer.setSize(this.width, this.height);
    this.bloom.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.setSafeArea(this.safe);
  }

  /** Fit the clock face into the screen area not covered by panels: {top, bottom, left, right} in px. */
  setSafeArea(safe) {
    this.safe = safe ?? { top: 0, bottom: this.height, left: 0, right: this.width };
    const { top, bottom, left, right } = this.safe;
    const sh = Math.max(200, bottom - top), sw = Math.max(200, right - left);
    const tan = Math.tan(20 * D2R), need = 9.9;   // outer rashi ring + labels
    this.clockDist = Math.max(need / tan * (this.height / sh), need / (tan * this.camera.aspect) * (this.width / sw));
    // shift the projection centre to the middle of the free area
    this.viewOffset = { x: this.width / 2 - (left + right) / 2, y: this.height / 2 - (top + bottom) / 2 };
  }

  // ---------- modes & the lift-off ----------
  computeClockPose(outPos, outUp) {
    // face-on to the ecliptic plane, Mesha (λ=0) at the top — evaluated with the sky un-spun
    const q = new THREE.Quaternion().setFromEuler(this.tilt.rotation);
    const pole = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
    const up = new THREE.Vector3(Math.cos(this.ayan * D2R), 0, -Math.sin(this.ayan * D2R)).applyQuaternion(q);
    outPos.copy(pole).multiplyScalar(this.clockDist); outUp.copy(up);
  }

  setMode(mode, onMid) {
    if (this.anim || this.pov.dir) { this.pending = { mode, onMid }; return true; }
    if (mode === this.mode) return false;
    if (mode === 'pov') {
      if (this.mode === 'clock') { this.setMode('sky', onMid); this.pending = { mode: 'pov', onMid }; return true; }
      this.pov.skyPos.copy(this.camera.position); this.pov.dir = 1; this.controls.enabled = false; this.lock = null;
      this.mode = 'pov'; onMid?.(); return true;
    }
    if (this.mode === 'pov') {   // leave the horizon first, then continue
      this.pov.dir = -1; this.mode = 'sky';
      if (mode === 'clock') this.pending = { mode: 'clock', onMid }; else onMid?.();
      return true;
    }
    const toSky = mode === 'sky';
    const startPos = this.camera.position.clone(), startUp = this.camera.up.clone();
    const endPos = new THREE.Vector3(), endUp = new THREE.Vector3(0, 1, 0);
    if (toSky) endPos.copy(this.skyPoseFor()); else { this.skyPose.copy(this.camera.position); this.computeClockPose(endPos, endUp); }
    this.controls.enabled = false; if (!toSky) this.lock = null;
    this.anim = { t: 0, dur: reducedMotion.matches ? 0.3 : 1.6, toSky, startPos, startUp, endPos, endUp, reduced: reducedMotion.matches, onMid, mid: false };
    this.mode = mode;
    return true;
  }

  skyPoseFor() {
    const s = this.state, rot = this.equatorial.rotation.y;
    this.equatorial.rotation.y = -s.gmst * D2R; this.scene.updateMatrixWorld();
    const az = (s.sunLon + 200) * D2R, el = 26 * D2R, d = 17;
    const p = this.ecliptic.localToWorld(new THREE.Vector3(d * Math.cos(el) * Math.cos(az), d * Math.sin(el), -d * Math.cos(el) * Math.sin(az)));
    this.equatorial.rotation.y = rot; this.scene.updateMatrixWorld();
    return p;
  }

  stepAnim(dt) {
    const A = this.anim; if (!A) return;
    A.t = Math.min(1, A.t + dt / A.dur);
    const e = easeInOut(A.t);
    if (A.t >= 0.5 && !A.mid) { A.mid = true; A.onMid?.(); }
    if (A.reduced) { // 300ms crossfade: swap poses at the midpoint, no warp
      const s = A.t < 0.5 ? 0 : 1;
      this.camera.position.copy(s ? A.endPos : A.startPos); this.camera.up.copy(s ? A.endUp : A.startUp);
      this.w = A.toSky ? s : 1 - s; this.fov = 40; this.swell = 1;
    } else {
      // slerp direction, arc the distance outward ("rise"), breathe FOV 40→68→40, swell stars ~3×
      const d0 = A.startPos.length(), d1 = A.endPos.length();
      const dir = A.startPos.clone().normalize().lerp(A.endPos.clone().normalize(), e).normalize();
      const bump = Math.sin(Math.PI * A.t);
      this.camera.position.copy(dir.multiplyScalar(THREE.MathUtils.lerp(d0, d1, e) * (1 + 0.35 * bump)));
      this.camera.up.copy(A.startUp).lerp(A.endUp, e).normalize();
      this.w = A.toSky ? e : 1 - e;
      this.fov = 40 + 28 * bump; this.swell = 1 + 2 * bump * bump;
    }
    if (A.t >= 1) {
      this.anim = null; this.fov = 40; this.swell = 1;
      if (A.toSky) { this.controls.enabled = true; this.camera.up.set(0, 1, 0); }
      this.flushPending();
    }
    return A;
  }

  flushPending() {
    if (!this.pending) return;
    const p = this.pending; this.pending = null;
    if (this.setMode(p.mode, p.onMid)) this.onPending?.(p.mode);
  }

  stepPov(dt, state) {
    const P = this.pov;
    if (P.dir) {
      P.k = THREE.MathUtils.clamp(P.k + P.dir * dt / (reducedMotion.matches ? 0.3 : 0.9), 0, 1);
      if (P.k === 1 && P.dir > 0) P.dir = 0;
      if (P.k === 0 && P.dir < 0) { P.dir = 0; this.camera.position.copy(P.skyPos); this.camera.up.set(0, 1, 0); this.controls.enabled = true; this.flushPending(); }
    }
    this.ground.visible = P.k > 0.001;
    this.povZ = null;
    if (P.k <= 0) return false;
    if (P.targetAz !== undefined) {
      const k = 1 - Math.exp(-dt * 3);
      P.az += ((((P.targetAz - P.az) % 360) + 540) % 360 - 180) * k; P.alt += (P.targetAlt - P.alt) * k;
    }
    const f = this.observerFrame(state.lat, state.lon), e = easeInOut(P.k);
    this.povZ = f.Z;
    this.ground.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), f.Z);
    this.ground.userData.mat.uniforms.uOpacity.value = Math.min(1, e * 1.4);
    const eye = f.Z.clone().multiplyScalar(0.02);
    this.camera.position.copy(P.skyPos).lerp(eye, e);
    this.camera.up.set(0, 1, 0).lerp(f.Z, e).normalize();
    const target = new THREE.Vector3().lerp(eye.clone().add(this.povDir(f, P.az, P.alt)), e);
    this.camera.lookAt(target);
    ['N', 'E', 'S', 'W'].forEach((c, i) => this.cardinals[i].local.copy(this.povDir(f, i * 90, 3).multiplyScalar(4.2)));
    return true;
  }

  /** Camera locks (sky mode): overview / earth / sun / moon / nakshatra / tithi / yoga / karana. */
  setLock(k) {
    if (this.mode === 'pov') { if (!['overview', 'earth'].includes(k)) this.povLookAt(this.lockTarget(k, new THREE.Vector3())); return; }
    this.lock = k;
  }

  lockTarget(k, out) {
    const P = (lon, r) => this.ecliptic.localToWorld(out.set(r * Math.cos(lon * D2R), 0, -r * Math.sin(lon * D2R)));
    const s = this.state;
    switch (k) {
      case 'sun': return this.bodies.sun.getWorldPosition(out);
      case 'moon': return this.bodies.moon.getWorldPosition(out);
      case 'nakshatra': return P(s.pan.nakshatra.start + 20 / 3, R.nak1);
      case 'tithi': return P(s.sunLon + s.pan.elongation / 2, R.moon);
      case 'karana': return P(s.sunLon + (s.pan.karana.index - 0.5) * 6, R.tithi1);
      case 'yoga': return P(s.pan.yogaSum, R.ecl);
      case 'budha': case 'shukra': case 'mangala': case 'guru': case 'shani': return this.planets.bodies[k].group.getWorldPosition(out);
      case 'rahu': case 'ketu': return this.planets.nodes[k].group.getWorldPosition(out);
      case 'uranus': case 'neptune': case 'pluto': case 'ceres': return this.extra.outer[k].group.getWorldPosition(out);   // agent C
      default: return out.set(0, 0, 0);
    }
  }

  // ---------- picking ----------
  pick(clientX, clientY) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const pickables = [this.bodies.sun.children[0], this.bodies.moon, ...(this.layers.grahas ? [...this.planets.pickables, ...this.extra.pickables] : [])];
    if (this.pov.k < 0.5) pickables.push(this.earth);
    const hits = this.raycaster.intersectObjects(pickables, false);
    if (hits.length) return { kind: 'graha', key: hits[0].object.userData.pick, obj: hits[0].object };
    if (this.layers.deepsky && this.w > 0.5) {   // agent C: deep-sky sprites (before stars: they're larger)
      const d = this.extra.pickDso(this.raycaster);
      if (d) {
        const lp = this.ecliptic.worldToLocal(d.world.clone());
        const lon = ((Math.atan2(-lp.z, lp.x) / D2R) + 360) % 360, lat = Math.asin(lp.y / lp.length()) / D2R;
        return { kind: 'dso', dso: d.dso, lon, lat, nak: d.dso.nak || Math.min(27, Math.floor(lon / (40 / 3)) + 1), world: d.world };
      }
    }
    this.raycaster.params.Points.threshold = 2.4;
    const sh = this.raycaster.intersectObject(this.stars.named.points, false);
    if (sh.length) {
      const star = STARS[sh[0].index];
      const wp = this.stars.starPosition(star.name, new THREE.Vector3()); this.stars.group.localToWorld(wp);
      const lp = this.ecliptic.worldToLocal(wp.clone());
      const lon = ((Math.atan2(-lp.z, lp.x) / D2R) + 360) % 360, lat = Math.asin(lp.y / lp.length()) / D2R;
      return { kind: 'star', star, lon, lat, nak: star.yogatara || Math.min(27, Math.floor(lon / (40 / 3)) + 1), world: wp };
    }
    // ring sectors: intersect the ecliptic plane and read the angle/radius
    const inv = new THREE.Matrix4().copy(this.ecliptic.matrixWorld).invert();
    const ray = this.raycaster.ray.clone().applyMatrix4(inv);
    const p = new THREE.Vector3();
    if (ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p)) {
      const r = Math.hypot(p.x, p.z), lon = ((Math.atan2(-p.z, p.x) / D2R) + 360) % 360;
      if (r >= R.nak0 && r <= R.nak1) return { kind: 'nakshatra', index: Math.min(27, Math.floor(lon / (40 / 3)) + 1), lon };
      if (r >= R.rashi0 && r <= R.rashi1) return { kind: 'rashi', index: Math.floor(lon / 30) + 1, lon };
      if (r >= R.tithi0 && r <= R.tithi1) {
        const rel = ((lon - this.state.sunLon) % 360 + 360) % 360;
        return { kind: 'tithi', index: Math.min(30, Math.floor(rel / 12) + 1), lon };
      }
    }
    return null;
  }

  /** Project a pick result to screen for anchoring the tooltip. */
  screenOf(hit) {
    const v = new THREE.Vector3();
    if (hit.kind === 'star' || hit.kind === 'dso') v.copy(hit.world);
    else if (hit.kind === 'graha' && hit.obj && !['surya', 'chandra', 'earth'].includes(hit.key)) hit.obj.getWorldPosition(v);
    else if (hit.kind === 'graha') {
      if (hit.key === 'surya') this.bodies.sun.getWorldPosition(v);
      else if (hit.key === 'chandra') this.bodies.moon.getWorldPosition(v);
      else v.set(0, 0, 0);
    } else {
      const r = hit.kind === 'nakshatra' ? R.nak1 : hit.kind === 'rashi' ? R.rashi1 : R.tithi1;
      this.ecliptic.localToWorld(v.set(r * Math.cos(hit.lon * D2R), 0, -r * Math.sin(hit.lon * D2R)));
    }
    v.project(this.camera);
    return { x: (v.x * 0.5 + 0.5) * this.width, y: (-v.y * 0.5 + 0.5) * this.height };
  }

  // ---------- per frame ----------
  /** state: { sunLon, moonLon, pan, gmst, obliquity, ayanamsa, dialInfo } */
  frame(state, dt, view) {
    this.state = state;
    const t = (performance.now() - this.t0) / 1000;
    this.ayan = state.ayanamsa;
    this.tilt.rotation.x = state.obliquity * D2R;
    this.ecliptic.rotation.y = state.ayanamsa * D2R;
    this.stepAnim(dt);
    this.equatorial.rotation.y = -state.gmst * D2R * this.w;

    this.wheel.update(state.sunLon, state.moonLon, state.pan, dt);
    this.planets.update(state.jd, state.sunLon, state.moonLon, t, state.dayLord);
    this.planets.group.visible = this.layers.grahas && this.w > 0.15;
    this.extra.update(state.jd, t); this.extra.group.visible = this.planets.group.visible;   // agent C
    this.extra.sky.visible = this.layers.deepsky && this.w > 0.3;
    this.constellations.group.visible = this.layers.constellations && this.w > 0.5;
    this.wheel.nakMesh.visible = this.layers.nakshatra; this.wheel.rashiMesh.visible = this.layers.rashi;
    this.bodies.update(state.sunLon, state.moonLon, t);

    // temporal overlays belong to the clock only; they fade out as we lift off
    const clockA = 1 - this.w;
    this.wheel.dial.mesh.material.opacity = clockA;
    this.wheel.dial.mesh.visible = clockA > 0.01;
    this.wheel.tithiMesh.material.opacity = 0.9 * this.wheel.drawProgress * (0.35 + 0.65 * clockA);
    if (this.wheel.drawProgress >= 1) {
      this.wheel.rashiMesh.material.opacity = 0.95 * (0.4 + 0.6 * clockA);
      this.wheel.nakMesh.material.opacity = 0.9 * (0.45 + 0.55 * clockA);
    }
    const sci = view !== 'religious', rel = view !== 'scientific';
    this.grid.visible = sci;
    for (const l of this.wheel.science) l.visible = sci;
    this.earth.visible = this.pov.k < 0.5;
    const nearHidden = this.pov.k > 0.3;   // anything inside the ground radius goes when standing on Earth
    this.wheel.tithiPivot.visible = !nearHidden; this.wheel.tithiHL.visible = !nearHidden;
    for (const l of this.wheel.science) l.visible = l.visible && !nearHidden;

    if (!this.anim && this.mode === 'clock') {
      this.computeClockPose(this.clockPos, this.clockUp);
      // gentle idle drift so the face never reads as a screenshot (±0.6 units, ~20 s)
      this.camera.position.copy(this.clockPos).add(new THREE.Vector3(Math.sin(t * 0.31) * 0.6, 0, Math.cos(t * 0.27) * 0.6));
      this.camera.up.copy(this.clockUp);
    }
    if (this.mode === 'sky' && !this.anim && this.lock) {
      const target = this.lockTarget(this.lock, new THREE.Vector3());
      this.controls.target.lerp(target, 1 - Math.exp(-dt * 4));
      if (this.planets.bodies[this.lock] || this.extra.outer[this.lock]) {
        // grahas are lit from the geocentre: view them from the Earth side so the lit face shows
        const side = new THREE.Vector3().crossVectors(target, new THREE.Vector3(0, 1, 0)).setLength(2.6);
        const want = target.clone().multiplyScalar(1 - 4.2 / target.length()).add(side).add(new THREE.Vector3(0, 0.8, 0));
        this.camera.position.lerp(want, 1 - Math.exp(-dt * 2.5));
      } else if (this.lock !== 'overview' && this.lock !== 'earth') {
        const want = target.clone().add(target.clone().normalize().multiplyScalar(-0.2)).add(new THREE.Vector3(0, 3.5, 0)).setLength(target.length() + 7);
        this.camera.position.lerp(want, 1 - Math.exp(-dt * 2.5));
      } else if (this.lock === 'earth') {
        this.camera.position.lerp(this.camera.position.clone().setLength(5), 1 - Math.exp(-dt * 2.5));
      } else {
        this.camera.position.lerp(this.camera.position.clone().setLength(34), 1 - Math.exp(-dt * 2.5));
      }
    } else if (this.mode === 'sky' && !this.anim && !this.lock) {
      this.controls.target.lerp(new THREE.Vector3(), 1 - Math.exp(-dt * 3));
    }
    const inPov = this.stepPov(dt, state);
    if (!inPov) { if (this.controls.enabled) this.controls.update(); else this.camera.lookAt(0, 0, 0); }

    this.camera.fov = inPov ? THREE.MathUtils.lerp(40, this.povFov ?? 62, easeInOut(this.pov.k)) : (this.fov ?? 40);
    const k = Math.max(1 - this.w, easeInOut(this.pov.k)), vo = this.viewOffset;
    if (vo && k > 0.001) this.camera.setViewOffset(this.width, this.height, vo.x * k, vo.y * k, this.width, this.height);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
    this.stars.update(t, this.swell ?? 1);
    this.scene.updateMatrixWorld();
    this.bodies.light(this.earth);

    // labels: rashi + nakshatra names read best face-on; in the sky only the Moon's nakshatra stays
    const clockLbl = this.w < 0.5;
    this.rashiLabels.forEach((L) => { L.on = rel || sci; L.opacityOverride = clockLbl ? 1 : 0.55; });
    this.nakLabels.forEach((L, i) => { L.on = rel && i === state.pan.nakshatra.index - 1; });
    this.nakLabels.forEach((L, i) => L.el.classList.toggle('on', i === state.pan.nakshatra.index - 1));
    this.rashiLabels.forEach((L, i) => L.el.classList.toggle('on', i === state.pan.rashiMoon.index - 1));
    const midLon = state.sunLon + state.pan.elongation / 2;
    this.dLLabel.local.set((R.moon - 0.6) * Math.cos(midLon * D2R), 0, -(R.moon - 0.6) * Math.sin(midLon * D2R));
    this.dLLabel.on = sci && state.pan.elongation > 8 && this.pov.k < 0.5;
    this.planetLabels.forEach((L) => { L.on = this.layers.grahas && this.w > 0.3; });
    this.outerLabels.forEach((L) => { L.on = this.layers.grahas && this.w > 0.3; });   // agent C
    this.nodeLabels.forEach((L) => { L.on = this.layers.grahas && this.w > 0.3; });
    this.cardinals.forEach((L) => { L.on = this.pov.k > 0.6; });
    this.starLabels.forEach((L) => { L.on = this.layers.constellations && this.w > 0.6; });
    const txt = `ΔL ${state.pan.elongation.toFixed(1)}°`;
    if (this.dLLabel.el.textContent !== txt) this.dLLabel.el.textContent = txt;

    this.composer.render();
    this.updateLabels();
  }
}
