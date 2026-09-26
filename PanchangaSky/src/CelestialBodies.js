import * as THREE from 'three';

const ECLIPTIC_R = 5.25;
const DEG2RAD = Math.PI / 180;

const SUN_COLOR = '#FFD700';
const SUN_HEX = 0xFFD700;
const MOON_COLOR = '#C0C0C0';
const MOON_HEX = 0xC0C0C0;

const GRAHA_DEFS = [
  { name: 'बुध Budha',     color: 0x00CC66, lon: 80  },
  { name: 'शुक्र Shukra',   color: 0xFFFFFF, lon: 120 },
  { name: 'मंगल Mangala',   color: 0xFF4444, lon: 200 },
  { name: 'गुरु Guru',      color: 0xFF8C00, lon: 50  },
  { name: 'शनि Shani',     color: 0x7788AA, lon: 330 },
];

const NODE_DEFS = [
  { name: 'राहु Rahu', lon: 150 },
  { name: 'केतु Ketu', lon: 330 },
];

/**
 * CelestialBodies - renders Sun, Moon, five Grahas, Rahu/Ketu, and the
 * elongation arc on the ecliptic circle (XZ plane).
 */
export class CelestialBodies {
  constructor() {
    this.group = new THREE.Group();
    this.sunGroup = new THREE.Group();
    this.moonGroup = new THREE.Group();
    this.arcGroup = new THREE.Group();
    this.grahaGroup = new THREE.Group();
    this.nodeGroup = new THREE.Group();

    this._sunLon = 0;
    this._moonLon = 0;
    this._elongation = 0;

    this._glowSprite = null;
    this._moonHaloSprite = null;
    this._moonMesh = null;
    this._moonPhaseMaterial = null;
    this._arcLabel = null;

    this._createSun();
    this._createMoon();
    this._createElongationArc();
    this._createGrahas();
    this._createNodes();

    this.group.add(this.sunGroup, this.moonGroup, this.arcGroup, this.grahaGroup, this.nodeGroup);
  }

  /* ================================================================== */
  /*  Sun                                                                */
  /* ================================================================== */
  _createSun() {
    // Core golden sphere
    const geo = new THREE.IcosahedronGeometry(0.3, 2);
    const mat = new THREE.MeshBasicMaterial({ color: SUN_HEX });
    const mesh = new THREE.Mesh(geo, mat);
    this.sunGroup.add(mesh);

    // Bloom glow sprite
    this._glowSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this._makeGlowTexture(SUN_COLOR, 256),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    this._glowSprite.scale.set(1.8, 1.8, 1);
    this.sunGroup.add(this._glowSprite);

    // Label
    const label = this._makeTextSprite('सूर्य Surya', SUN_COLOR, 40);
    label.position.set(0, 0.6, 0);
    label.scale.set(1.0, 0.5, 1);
    this.sunGroup.add(label);
  }

  /* ================================================================== */
  /*  Moon                                                               */
  /* ================================================================== */
  _createMoon() {
    // Silver sphere
    const geo = new THREE.SphereGeometry(0.2, 24, 24);
    this._moonPhaseMaterial = new THREE.MeshBasicMaterial({
      color: MOON_HEX,
      map: this._makeMoonPhaseTexture(0),
    });
    this._moonMesh = new THREE.Mesh(geo, this._moonPhaseMaterial);
    this.moonGroup.add(this._moonMesh);

    // Silver halo sprite
    this._moonHaloSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this._makeGlowTexture(MOON_COLOR, 128),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    this._moonHaloSprite.scale.set(1.2, 1.2, 1);
    this.moonGroup.add(this._moonHaloSprite);

    // Label
    const label = this._makeTextSprite('चन्द्र Chandra', MOON_COLOR, 36);
    label.position.set(0, 0.5, 0);
    label.scale.set(1.0, 0.5, 1);
    this.moonGroup.add(label);
  }

  /* ================================================================== */
  /*  Elongation Arc                                                     */
  /* ================================================================== */
  _createElongationArc() {
    // Placeholder geometry; rebuilt whenever positions update
    this._arcLine = null;
    this._arcLabel = null;
  }

  _rebuildArc() {
    // Clear previous arc objects
    while (this.arcGroup.children.length > 0) {
      const child = this.arcGroup.children[0];
      this.arcGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (child.material.map) child.material.map.dispose();
        child.material.dispose();
      }
    }

    const sunRad = this._sunLon * DEG2RAD;
    const moonRad = this._moonLon * DEG2RAD;

    // Compute swept angle (always positive, going from sun to moon counter-clockwise)
    let sweep = this._moonLon - this._sunLon;
    if (sweep < 0) sweep += 360;
    if (sweep === 0) return;

    const numPoints = 64;
    const points = [];
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      const angle = (this._sunLon + sweep * t) * DEG2RAD;
      points.push(new THREE.Vector3(
        Math.cos(angle) * ECLIPTIC_R,
        0.05,
        -Math.sin(angle) * ECLIPTIC_R
      ));
    }

    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineDashedMaterial({
      color: SUN_HEX,
      dashSize: 0.15,
      gapSize: 0.08,
      transparent: true,
      opacity: 0.8,
    });

    this._arcLine = new THREE.Line(geo, mat);
    this._arcLine.computeLineDistances();
    this.arcGroup.add(this._arcLine);

    // Midpoint label
    const midAngle = (this._sunLon + sweep / 2) * DEG2RAD;
    const labelText = '\u0394L = ' + this._elongation.toFixed(1) + '\u00B0';
    const label = this._makeTextSprite(labelText, SUN_COLOR, 32, true);
    label.position.set(
      Math.cos(midAngle) * (ECLIPTIC_R + 0.45),
      0.3,
      -Math.sin(midAngle) * (ECLIPTIC_R + 0.45)
    );
    label.scale.set(1.2, 0.5, 1);
    this.arcGroup.add(label);
  }

  /* ================================================================== */
  /*  Five Grahas                                                        */
  /* ================================================================== */
  _createGrahas() {
    for (const def of GRAHA_DEFS) {
      const grp = new THREE.Group();

      // Small sphere
      const geo = new THREE.SphereGeometry(0.1, 16, 16);
      const mat = new THREE.MeshBasicMaterial({ color: def.color });
      const mesh = new THREE.Mesh(geo, mat);
      grp.add(mesh);

      // Label
      const labelColor = '#' + new THREE.Color(def.color).getHexString();
      const label = this._makeTextSprite(def.name, labelColor, 28);
      label.position.set(0, 0.35, 0);
      label.scale.set(0.9, 0.4, 1);
      grp.add(label);

      // Position on ecliptic
      const rad = def.lon * DEG2RAD;
      grp.position.set(Math.cos(rad) * ECLIPTIC_R, 0, -Math.sin(rad) * ECLIPTIC_R);

      // Store userData for picking
      mesh.userData = { type: 'graha', name: def.name, longitude: def.lon };

      this.grahaGroup.add(grp);
    }
  }

  /* ================================================================== */
  /*  Rahu / Ketu Nodes                                                  */
  /* ================================================================== */
  _createNodes() {
    const nodeColor = 0x6B3FA0; // dark purple
    const nodeColorHex = '#6B3FA0';

    for (const def of NODE_DEFS) {
      const grp = new THREE.Group();

      // Shadow point - small translucent sphere
      const geo = new THREE.SphereGeometry(0.12, 16, 16);
      const mat = new THREE.MeshBasicMaterial({
        color: nodeColor,
        transparent: true,
        opacity: 0.7,
      });
      const mesh = new THREE.Mesh(geo, mat);
      grp.add(mesh);

      // Dark glow
      const glow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: this._makeGlowTexture(nodeColorHex, 96),
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      glow.scale.set(0.8, 0.8, 1);
      grp.add(glow);

      // Label
      const label = this._makeTextSprite(def.name, nodeColorHex, 28);
      label.position.set(0, 0.35, 0);
      label.scale.set(0.9, 0.4, 1);
      grp.add(label);

      const rad = def.lon * DEG2RAD;
      grp.position.set(Math.cos(rad) * ECLIPTIC_R, 0, -Math.sin(rad) * ECLIPTIC_R);

      mesh.userData = { type: 'node', name: def.name, longitude: def.lon };

      this.nodeGroup.add(grp);
    }
  }

  /* ================================================================== */
  /*  Public setters                                                     */
  /* ================================================================== */

  /** Position sun at sidereal longitude (degrees) on ecliptic circle. */
  setSunLongitude(degrees) {
    this._sunLon = ((degrees % 360) + 360) % 360;
    const rad = this._sunLon * DEG2RAD;
    this.sunGroup.position.set(Math.cos(rad) * ECLIPTIC_R, 0, -Math.sin(rad) * ECLIPTIC_R);
  }

  /** Position moon at sidereal longitude (degrees) on ecliptic circle. */
  setMoonLongitude(degrees) {
    this._moonLon = ((degrees % 360) + 360) % 360;
    const rad = this._moonLon * DEG2RAD;
    this.moonGroup.position.set(Math.cos(rad) * ECLIPTIC_R, 0, -Math.sin(rad) * ECLIPTIC_R);
    this._updateMoonPhase();
  }

  /** Update the elongation arc between sun and moon. */
  updateElongationArc(sunDeg, moonDeg, elongation) {
    this._sunLon = ((sunDeg % 360) + 360) % 360;
    this._moonLon = ((moonDeg % 360) + 360) % 360;
    this._elongation = elongation;
    this._rebuildArc();
  }

  /** Set graha longitude by index (0=Budha, 1=Shukra, 2=Mangala, 3=Guru, 4=Shani). */
  setGrahaLongitude(index, degrees) {
    if (index < 0 || index >= this.grahaGroup.children.length) return;
    const lon = ((degrees % 360) + 360) % 360;
    const rad = lon * DEG2RAD;
    this.grahaGroup.children[index].position.set(
      Math.cos(rad) * ECLIPTIC_R, 0, -Math.sin(rad) * ECLIPTIC_R
    );
  }

  /** Set Rahu longitude; Ketu is placed opposite. */
  setNodeLongitude(rahuDeg) {
    const rahuLon = ((rahuDeg % 360) + 360) % 360;
    const ketuLon = (rahuLon + 180) % 360;

    const rahuRad = rahuLon * DEG2RAD;
    this.nodeGroup.children[0].position.set(
      Math.cos(rahuRad) * ECLIPTIC_R, 0, -Math.sin(rahuRad) * ECLIPTIC_R
    );

    const ketuRad = ketuLon * DEG2RAD;
    this.nodeGroup.children[1].position.set(
      Math.cos(ketuRad) * ECLIPTIC_R, 0, -Math.sin(ketuRad) * ECLIPTIC_R
    );
  }

  /* ================================================================== */
  /*  Per-frame update                                                   */
  /* ================================================================== */
  update(time) {
    if (time === undefined) return;

    // Pulsing sun glow
    if (this._glowSprite) {
      const s = 1.8 + 0.2 * Math.sin(time * 2.0);
      this._glowSprite.scale.set(s, s, 1);
    }

    // Pulsing moon halo
    if (this._moonHaloSprite) {
      const s = 1.2 + 0.1 * Math.sin(time * 1.5 + 1.0);
      this._moonHaloSprite.scale.set(s, s, 1);
      this._moonHaloSprite.material.opacity = 0.4 + 0.1 * Math.sin(time * 1.8);
    }
  }

  /* ================================================================== */
  /*  Accessor                                                           */
  /* ================================================================== */
  get object3D() {
    return this.group;
  }

  /* ================================================================== */
  /*  Moon phase texture                                                 */
  /* ================================================================== */
  _updateMoonPhase() {
    const elongation = ((this._moonLon - this._sunLon) % 360 + 360) % 360;
    const tex = this._makeMoonPhaseTexture(elongation);
    if (this._moonPhaseMaterial.map) {
      this._moonPhaseMaterial.map.dispose();
    }
    this._moonPhaseMaterial.map = tex;
    this._moonPhaseMaterial.needsUpdate = true;
  }

  /**
   * Create a canvas texture showing the moon phase as a crescent.
   * Illuminated fraction = (1 - cos(elongation)) / 2.
   */
  _makeMoonPhaseTexture(elongationDeg) {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 2;

    const elongRad = elongationDeg * DEG2RAD;
    const illuminated = (1 - Math.cos(elongRad)) / 2;

    // Dark background (unlit side)
    ctx.fillStyle = '#222222';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Illuminated portion
    // We draw the lit area as an intersection of two arcs (crescent).
    // The terminator is an ellipse whose x-radius is r * |cos(phase_angle)|.
    // phase_angle here maps illuminated fraction to a visual sweep.
    const phaseAngle = Math.PI * (1 - illuminated * 2); // -PI..PI

    ctx.fillStyle = '#D0D0D0';
    ctx.beginPath();

    // Right half lit when waxing (elongation 0-180), left when waning (180-360)
    const waxing = elongationDeg <= 180;

    // Draw the lit crescent using two arcs
    if (illuminated < 0.01) {
      // New moon - almost fully dark, skip
    } else if (illuminated > 0.99) {
      // Full moon - fully lit
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Crescent or gibbous
      // Outer arc (full semicircle on the lit side)
      const startAngle = waxing ? -Math.PI / 2 : Math.PI / 2;
      const endAngle = waxing ? Math.PI / 2 : -Math.PI / 2;
      ctx.arc(cx, cy, r, startAngle, endAngle, !waxing);

      // Inner arc (terminator, an ellipse approximated by quadratic curve)
      // The terminator x-radius: positive = gibbous, negative = crescent
      const terminatorX = r * Math.cos(elongRad);

      // Draw terminator as an elliptical arc from endAngle back to startAngle
      const steps = 32;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const angle = (waxing ? Math.PI / 2 : -Math.PI / 2) +
                      t * (waxing ? -Math.PI : Math.PI);
        const px = cx + terminatorX * Math.cos(angle) * (waxing ? -1 : 1);
        const py = cy + r * Math.sin(angle);
        ctx.lineTo(px, py);
      }

      ctx.closePath();
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  /* ================================================================== */
  /*  Glow texture (radial gradient)                                     */
  /* ================================================================== */
  _makeGlowTexture(colorStr, size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const cx = size / 2;
    const cy = size / 2;
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, cx);
    gradient.addColorStop(0, colorStr);
    gradient.addColorStop(0.3, colorStr + 'AA');
    gradient.addColorStop(0.7, colorStr + '33');
    gradient.addColorStop(1, 'transparent');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  /* ================================================================== */
  /*  Text label sprites (canvas-based)                                  */
  /* ================================================================== */
  _makeTextSprite(text, colorStr, fontSize, monospace) {
    const canvas = document.createElement('canvas');
    const width = 512;
    const height = 128;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    const fontFamily = monospace
      ? "'Courier New', monospace"
      : "'Noto Sans Devanagari', 'Tiro Devanagari Hindi', sans-serif";

    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Glow
    ctx.shadowColor = colorStr;
    ctx.shadowBlur = 10;
    ctx.fillStyle = colorStr;
    ctx.fillText(text, width / 2, height / 2);

    // Second pass for crisp center
    ctx.shadowBlur = 0;
    ctx.fillText(text, width / 2, height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    });

    return new THREE.Sprite(mat);
  }
}
