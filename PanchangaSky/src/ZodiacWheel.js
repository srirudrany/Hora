import * as THREE from 'three';

const GOLD = 0xDAA520;
const GOLD_HEX = '#DAA520';
const INNER_R = 5;
const OUTER_R = 5.5;
const LABEL_R = 5.85;
const SEGMENT_COUNT = 12;
const SEGMENT_ARC = (2 * Math.PI) / SEGMENT_COUNT; // 30°

const RASHI_NAMES = [
  'मेष',    // Mesha
  'वृषभ',   // Vrishabha
  'मिथुन',  // Mithuna
  'कर्क',   // Karka
  'सिंह',   // Simha
  'कन्या',  // Kanya
  'तुला',   // Tula
  'वृश्चिक', // Vrishchika
  'धनु',    // Dhanu
  'मकर',    // Makara
  'कुंभ',   // Kumbha
  'मीन',    // Meena
];

/**
 * ZodiacWheel – renders the 12 Rashi segments as a golden ring
 * lying flat on the ecliptic (XZ) plane.
 */
export class ZodiacWheel {
  constructor() {
    this.group = new THREE.Group();
    this._animating = false;
    this._animStart = 0;
    this._animDuration = 1200;

    this._createSegments();
    this._createRings();
    this._createDivisionLines();
    this._createLabels();
  }

  /* ------------------------------------------------------------------ */
  /*  Rings                                                              */
  /* ------------------------------------------------------------------ */
  _createRings() {
    const makeRing = (innerR, outerR) => {
      const geo = new THREE.RingGeometry(innerR, outerR, 128);
      const mat = new THREE.MeshBasicMaterial({
        color: GOLD,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2; // lay flat on XZ
      return mesh;
    };

    // Inner border ring (thin)
    this.group.add(makeRing(INNER_R - 0.03, INNER_R));
    // Outer border ring (thin)
    this.group.add(makeRing(OUTER_R, OUTER_R + 0.03));
  }

  /* ------------------------------------------------------------------ */
  /*  Filled segments                                                    */
  /* ------------------------------------------------------------------ */
  _createSegments() {
    for (let i = 0; i < SEGMENT_COUNT; i++) {
      const startAngle = i * SEGMENT_ARC;

      // Alternate between two subtle gold shades for readability
      const shade = i % 2 === 0 ? 0xDAA520 : 0xC89418;

      const geo = new THREE.RingGeometry(INNER_R, OUTER_R, 32, 1, startAngle, SEGMENT_ARC);
      const mat = new THREE.MeshBasicMaterial({
        color: shade,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.15,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2; // XZ plane
      this.group.add(mesh);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Division lines every 30°                                           */
  /* ------------------------------------------------------------------ */
  _createDivisionLines() {
    const lineMat = new THREE.LineBasicMaterial({
      color: GOLD,
      transparent: true,
      opacity: 0.7,
    });

    for (let i = 0; i < SEGMENT_COUNT; i++) {
      const angle = i * SEGMENT_ARC;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      const points = [
        new THREE.Vector3(INNER_R * cosA, 0, -INNER_R * sinA),
        new THREE.Vector3(OUTER_R * cosA, 0, -OUTER_R * sinA),
      ];

      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geo, lineMat);
      this.group.add(line);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Devanagari labels (canvas-based sprites)                           */
  /* ------------------------------------------------------------------ */
  _createLabels() {
    for (let i = 0; i < SEGMENT_COUNT; i++) {
      const midAngle = (i + 0.5) * SEGMENT_ARC;

      const sprite = this._makeTextSprite(RASHI_NAMES[i]);

      // Position at midpoint of arc, on XZ plane, slightly above (y)
      sprite.position.set(
        LABEL_R * Math.cos(midAngle),
        0.15,
        -LABEL_R * Math.sin(midAngle)
      );

      sprite.scale.set(0.7, 0.35, 1);
      this.group.add(sprite);
    }
  }

  _makeTextSprite(text) {
    const canvas = document.createElement('canvas');
    const size = 256;
    canvas.width = size;
    canvas.height = size / 2;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Text style
    ctx.font = "bold 48px 'Noto Sans Devanagari', 'Tiro Devanagari Hindi', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Subtle glow behind text
    ctx.shadowColor = GOLD_HEX;
    ctx.shadowBlur = 12;
    ctx.fillStyle = GOLD_HEX;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    // Second pass for brighter centre
    ctx.shadowBlur = 0;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    });

    return new THREE.Sprite(mat);
  }

  /* ------------------------------------------------------------------ */
  /*  Entrance animation                                                 */
  /* ------------------------------------------------------------------ */
  animateEntrance(duration = 1200) {
    this._animDuration = duration;
    this._animStart = performance.now();
    this._animating = true;
    this.group.scale.set(0, 0, 0);
  }

  /* ------------------------------------------------------------------ */
  /*  Per-frame update                                                   */
  /* ------------------------------------------------------------------ */
  update(time) {
    // Entrance scale-up animation with cubic ease-out
    if (this._animating) {
      const elapsed = performance.now() - this._animStart;
      let t = Math.min(elapsed / this._animDuration, 1);

      // Cubic ease-out: 1 - (1-t)^3
      t = 1 - Math.pow(1 - t, 3);

      this.group.scale.set(t, t, t);

      if (t >= 1) {
        this._animating = false;
        this.group.scale.set(1, 1, 1);
      }
    }

    // Subtle glow pulse — oscillate child ring opacities gently
    if (time !== undefined) {
      const pulse = 0.85 + 0.15 * Math.sin(time * 1.5);
      this.group.children.forEach((child) => {
        if (child.material && child.material.opacity !== undefined) {
          // Only pulse the border rings (high base opacity)
          if (child.material.opacity > 0.5) {
            child.material.opacity = pulse * 0.9;
          }
        }
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Accessor                                                           */
  /* ------------------------------------------------------------------ */
  get object3D() {
    return this.group;
  }
}
