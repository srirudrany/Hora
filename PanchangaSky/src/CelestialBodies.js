// CelestialBodies.js — Surya, Chandra (phase lit by the real Sun direction) and a small lapis Earth.
// Only the Sun and Moon exceed the bloom threshold: light emits, dark absorbs.
import * as THREE from 'three';
import { R } from './ZodiacWheel.js';

const D2R = Math.PI / 180;

function glowTexture(inner, outer) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const c = cv.getContext('2d'), g = c.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, inner); g.addColorStop(0.25, outer); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

const moonFrag = /* glsl */`
  uniform vec3 uSunDir; varying vec3 vN; varying vec3 vP;
  float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164)))*43758.5453); }
  float n(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
  void main(){
    float maria = smoothstep(0.45, 0.7, n(vP * 2.6)) * 0.35 + n(vP * 9.0) * 0.12;
    float l = dot(normalize(vN), normalize(uSunDir));
    float lit = smoothstep(-0.04, 0.12, l);
    vec3 albedo = vec3(0.86, 0.89, 0.93) * (1.0 - maria);
    vec3 col = albedo * (0.02 + 1.05 * lit) + vec3(0.02, 0.03, 0.06);   // faint earthshine
    gl_FragColor = vec4(col, 1.0);
  }`;

export class CelestialBodies {
  constructor() {
    this.group = new THREE.Group();

    // Surya — HDR core so it blooms; soft corona sprite
    this.sun = new THREE.Group();
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 5), new THREE.MeshBasicMaterial({ color: new THREE.Color(4.0, 2.7, 1.2), toneMapped: false }));
    const corona = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,236,190,1)', 'rgba(255,190,90,0.35)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    corona.scale.setScalar(4.2);
    this.sun.add(core, corona); this.sun.userData = { pick: 'surya' }; core.userData = { pick: 'surya' };
    this.group.add(this.sun);

    // Chandra
    this.moonUniforms = { uSunDir: { value: new THREE.Vector3(1, 0, 0) } };
    this.moon = new THREE.Mesh(new THREE.SphereGeometry(0.42, 64, 32), new THREE.ShaderMaterial({
      uniforms: this.moonUniforms,
      vertexShader: 'varying vec3 vN; varying vec3 vP; void main(){ vN = normalize(mat3(modelMatrix) * normal); vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: moonFrag,
    }));
    this.moon.userData = { pick: 'chandra' };
    this.moonHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(210,222,235,0.55)', 'rgba(180,200,225,0.12)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    this.moonHalo.scale.setScalar(2.2);
    this.moonGroup = new THREE.Group(); this.moonGroup.add(this.moon, this.moonHalo);
    this.group.add(this.moonGroup);
  }

  /** Earth sits at the world origin, outside the sky groups — the sky turns, Earth does not. */
  static makeEarth() {
    const earth = new THREE.Mesh(new THREE.SphereGeometry(1.05, 64, 32), new THREE.ShaderMaterial({
      uniforms: { uSun: { value: new THREE.Vector3(1, 0, 0) } },
      vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vN = normalize(mat3(modelMatrix)*normal); vP = position; vec4 w = modelMatrix*vec4(position,1.0); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix*viewMatrix*w; }',
      fragmentShader: /* glsl */`
        uniform vec3 uSun; varying vec3 vN; varying vec3 vV; varying vec3 vP;
        float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164)))*43758.5453); }
        float n(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
          return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
                     mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
        void main(){
          float land = smoothstep(0.52, 0.56, n(vP*2.2) * 0.7 + n(vP*5.0) * 0.3);
          vec3 base = mix(vec3(0.06,0.11,0.30), vec3(0.20,0.26,0.20), land);
          float l = clamp(dot(vN, normalize(uSun)), 0.0, 1.0);
          float rim = pow(1.0 - max(dot(vN, vV), 0.0), 3.0);
          vec3 col = base * (0.18 + 0.9 * l) + vec3(0.35,0.55,1.0) * rim * 0.55;
          gl_FragColor = vec4(col, 1.0);
        }`,
    }));
    earth.userData = { pick: 'earth' };
    return earth;
  }

  /** Place both bodies on the ecliptic at their sidereal longitudes (ecliptic-local coordinates). */
  update(sunLon, moonLon, t) {
    const s = sunLon * D2R, m = moonLon * D2R;
    this.sun.position.set(R.sun * Math.cos(s), 0, -R.sun * Math.sin(s));
    this.moonGroup.position.set(R.moon * Math.cos(m), 0, -R.moon * Math.sin(m));
    this.sun.children[1].material.rotation = t * 0.05;
    this.sun.children[1].scale.setScalar(4.2 + Math.sin(t * 1.3) * 0.12);
  }

  /** Called after world matrices update: light the Moon from the true Sun direction. */
  light(earth) {
    const sw = new THREE.Vector3(), mw = new THREE.Vector3();
    this.sun.getWorldPosition(sw); this.moon.getWorldPosition(mw);
    // direction from the Moon to the Sun, as seen from the geocentre (the Sun is effectively at infinity)
    this.moonUniforms.uSunDir.value.copy(sw).normalize();
    if (earth) earth.material.uniforms.uSun.value.copy(sw).normalize();
    return { sw, mw };
  }
}
