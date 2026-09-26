import * as THREE from 'three';

/**
 * Procedural starfield with parallax layers, twinkle animation,
 * a faint Milky Way band, and atmospheric horizon haze.
 */
export class Starfield {
  constructor() {
    this.group = new THREE.Group();
    this.layers = [];
    this._clock = new THREE.Clock();
    this._createStars();
    this._createMilkyWay();
    this._createHorizonHaze();
  }

  /* ------------------------------------------------------------------ */
  /*  Stars                                                              */
  /* ------------------------------------------------------------------ */

  _createStars() {
    const layerDefs = [
      { count: 500,   sizeMin: 2.0, sizeMax: 4.0, label: 'bright' },
      { count: 3500,  sizeMin: 1.0, sizeMax: 2.0, label: 'medium' },
      { count: 14000, sizeMin: 0.3, sizeMax: 1.0, label: 'faint'  },
    ];

    // Stellar colour palette (weighted towards white / blue-white)
    const palette = [
      new THREE.Color('#FFFFFF'),   // white          – weight 4
      new THREE.Color('#AACCFF'),   // blue-white     – weight 3
      new THREE.Color('#FFEECC'),   // yellow         – weight 2
      new THREE.Color('#FFDDAA'),   // orange         – weight 1
    ];
    const weights = [4, 3, 2, 1];
    const cumWeights = [];
    let sum = 0;
    for (const w of weights) { sum += w; cumWeights.push(sum); }

    const pickColor = () => {
      const r = Math.random() * sum;
      for (let i = 0; i < cumWeights.length; i++) {
        if (r < cumWeights[i]) return palette[i];
      }
      return palette[0];
    };

    // Log-normal brightness multiplier (most stars dim, few bright)
    const logNormalBrightness = () => {
      // Box-Muller for a normal variate
      const u1 = Math.random() || 1e-10;
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      // mu = -0.5, sigma = 0.6 → median ~0.6, occasional bright outliers
      return Math.exp(-0.5 + 0.6 * z);
    };

    const radius = 100;

    for (const def of layerDefs) {
      const { count, sizeMin, sizeMax } = def;

      const positions  = new Float32Array(count * 3);
      const colors     = new Float32Array(count * 3);
      const baseSizes  = new Float32Array(count);
      const phases     = new Float32Array(count);
      const amplitudes = new Float32Array(count);

      for (let i = 0; i < count; i++) {
        // Uniform distribution on sphere surface
        const theta = Math.acos(2 * Math.random() - 1);
        const phi   = 2 * Math.PI * Math.random();
        positions[i * 3]     = radius * Math.sin(theta) * Math.cos(phi);
        positions[i * 3 + 1] = radius * Math.sin(theta) * Math.sin(phi);
        positions[i * 3 + 2] = radius * Math.cos(theta);

        // Colour (modulated by log-normal brightness)
        const col = pickColor();
        const brightness = Math.min(logNormalBrightness(), 2.0);
        colors[i * 3]     = Math.min(col.r * brightness, 1.0);
        colors[i * 3 + 1] = Math.min(col.g * brightness, 1.0);
        colors[i * 3 + 2] = Math.min(col.b * brightness, 1.0);

        // Size within layer range
        baseSizes[i] = sizeMin + Math.random() * (sizeMax - sizeMin);

        // Twinkle: random phase [0, 2π), amplitude [0.1, 0.4]
        phases[i]     = Math.random() * Math.PI * 2;
        amplitudes[i] = 0.1 + Math.random() * 0.3;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position',  new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color',     new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute('baseSize',  new THREE.BufferAttribute(baseSizes, 1));
      geometry.setAttribute('phase',     new THREE.BufferAttribute(phases, 1));
      geometry.setAttribute('amplitude', new THREE.BufferAttribute(amplitudes, 1));

      const material = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0.0 },
        },
        vertexShader: /* glsl */ `
          attribute float phase;
          attribute float amplitude;
          attribute float baseSize;
          uniform float uTime;
          varying float vAlpha;
          varying vec3 vColor;

          void main() {
            vColor = color;
            float twinkle = 1.0 - amplitude * (0.5 + 0.5 * sin(uTime * 2.0 + phase));
            vAlpha = twinkle;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = baseSize * (200.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: /* glsl */ `
          varying float vAlpha;
          varying vec3 vColor;

          void main() {
            float d = length(gl_PointCoord - vec2(0.5));
            if (d > 0.5) discard;
            float glow = 1.0 - smoothstep(0.0, 0.5, d);
            gl_FragColor = vec4(vColor, vAlpha * glow);
          }
        `,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const points = new THREE.Points(geometry, material);
      this.group.add(points);
      this.layers.push({ points, material, label: def.label });
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Milky Way band                                                     */
  /* ------------------------------------------------------------------ */

  _createMilkyWay() {
    // A torus-like ring of many faint particles forming a hazy band,
    // tilted ~60° from the ecliptic plane.

    const bandCount = 6000;
    const positions = new Float32Array(bandCount * 3);
    const colors    = new Float32Array(bandCount * 3);
    const sizes     = new Float32Array(bandCount);

    const radius    = 99;   // just inside the star sphere
    const spread    = 8;    // half-width of band in degrees ≈ thickness

    // Warm/cool gradient colours for the band
    const warmColor = new THREE.Color('#FFF8E8');
    const coolColor = new THREE.Color('#D0D8F0');
    const tmpColor  = new THREE.Color();

    for (let i = 0; i < bandCount; i++) {
      // Angle around the band ring
      const phi = Math.random() * Math.PI * 2;

      // Offset from the band centre (Gaussian-ish spread)
      const u1 = Math.random() || 1e-10;
      const u2 = Math.random();
      const gaussOffset = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const thetaOffset = (gaussOffset * spread * Math.PI) / 180;

      // Position on a great circle (before tilt)
      const x = radius * Math.cos(phi);
      const y = radius * Math.sin(phi) * Math.cos(thetaOffset);
      const z = radius * Math.sin(phi) * Math.sin(thetaOffset);

      positions[i * 3]     = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Gradient: warm at centre, cool at edges
      const t = Math.min(Math.abs(gaussOffset) / 2.0, 1.0);
      tmpColor.copy(warmColor).lerp(coolColor, t);
      colors[i * 3]     = tmpColor.r;
      colors[i * 3 + 1] = tmpColor.g;
      colors[i * 3 + 2] = tmpColor.b;

      sizes[i] = 1.0 + Math.random() * 2.0;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color',    new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 1.5,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const band = new THREE.Points(geometry, material);

    // Tilt ~60° diagonal to the ecliptic
    band.rotation.x = THREE.MathUtils.degToRad(60);
    band.rotation.z = THREE.MathUtils.degToRad(15);

    this.group.add(band);
    this._milkyWay = band;
  }

  /* ------------------------------------------------------------------ */
  /*  Horizon haze                                                       */
  /* ------------------------------------------------------------------ */

  _createHorizonHaze() {
    // A subtle blue-to-transparent gradient ring at the bottom of the sphere.
    const hazeRadius = 100;
    const hazeHeight = 20;
    const segments   = 64;

    const geometry = new THREE.CylinderGeometry(
      hazeRadius, hazeRadius, hazeHeight, segments, 1, true
    );

    // Custom shader for vertical gradient: opaque blue at bottom → transparent at top
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uColorBottom: { value: new THREE.Color('#1a2a4a') },
        uOpacity:     { value: 0.25 },
      },
      vertexShader: /* glsl */ `
        varying float vHeight;
        void main() {
          // uv.y goes 0 (bottom) to 1 (top)
          vHeight = uv.y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColorBottom;
        uniform float uOpacity;
        varying float vHeight;
        void main() {
          // Fade from colour at bottom to fully transparent at top
          float alpha = (1.0 - vHeight) * (1.0 - vHeight) * uOpacity;
          gl_FragColor = vec4(uColorBottom, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.NormalBlending,
    });

    const haze = new THREE.Mesh(geometry, material);
    // Position so the bottom of the cylinder sits at the bottom of the sphere
    haze.position.y = -hazeRadius + hazeHeight * 0.5;

    this.group.add(haze);
    this._horizonHaze = haze;
  }

  /* ------------------------------------------------------------------ */
  /*  Animation                                                          */
  /* ------------------------------------------------------------------ */

  /**
   * Call every frame with elapsed time in seconds (e.g. from THREE.Clock).
   * If no argument is provided the class keeps its own clock.
   */
  update(time) {
    const t = time !== undefined ? time : this._clock.getElapsedTime();
    for (const layer of this.layers) {
      layer.material.uniforms.uTime.value = t;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Accessors                                                          */
  /* ------------------------------------------------------------------ */

  get object3D() {
    return this.group;
  }
}

export default Starfield;
