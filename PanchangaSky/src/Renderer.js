import * as THREE from 'three';
import { Starfield } from './Starfield.js';
import { ZodiacWheel } from './ZodiacWheel.js';
import { CelestialBodies } from './CelestialBodies.js';

/**
 * Renderer - Three.js scene setup and render loop manager for the
 * Panchanga Sky application.
 */
export class Renderer {
  /**
   * @param {HTMLElement} container - DOM element to mount the canvas in.
   */
  constructor(container) {
    this.container = container;
    this._clock = new THREE.Clock();

    // --- WebGL renderer ---
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x0a0a1a, 1);
    this.renderer.setSize(container.clientWidth, container.clientHeight);

    // --- Camera ---
    this.camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );

    // --- Scene ---
    this.scene = new THREE.Scene();

    // --- Lights ---
    const ambient = new THREE.AmbientLight(0x1a1a3e, 0.3);
    this.scene.add(ambient);

    this.directionalLight = new THREE.DirectionalLight(0xffd700, 0.5);
    this.directionalLight.position.set(5, 3, 5);
    this.scene.add(this.directionalLight);

    // --- Domain objects ---
    this.starfield = new Starfield();
    this.zodiacWheel = new ZodiacWheel();
    this.celestialBodies = new CelestialBodies();

    this.scene.add(this.starfield.object3D);
    this.scene.add(this.zodiacWheel.object3D);
    this.scene.add(this.celestialBodies.object3D);

    // --- Controls ---
    this._setupControls();

    // --- Resize handling ---
    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);

    // --- Mount ---
    container.appendChild(this.renderer.domElement);

    // --- Entrance animation state ---
    this._entranceActive = false;
    this._entranceStart = 0;
    this._entranceDuration = 1500;
    this._entranceFrom = { theta: 0, phi: 0.3, radius: 30 };
  }

  /* ================================================================== */
  /*  Manual orbit controls                                              */
  /* ================================================================== */

  _setupControls() {
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    const spherical = { theta: 0, phi: Math.PI / 4, radius: 15 };

    const canvas = this.renderer.domElement;

    // --- Mouse ---
    canvas.addEventListener('mousedown', (e) => {
      isDragging = true;
      prevMouse = { x: e.clientX, y: e.clientY };
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;
      spherical.theta -= dx * 0.005;
      spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi - dy * 0.005));
      prevMouse = { x: e.clientX, y: e.clientY };
      this._updateCamera();
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });

    canvas.addEventListener('wheel', (e) => {
      spherical.radius = Math.max(5, Math.min(30, spherical.radius + e.deltaY * 0.01));
      this._updateCamera();
      e.preventDefault();
    }, { passive: false });

    // --- Touch ---
    let touchStartDist = 0;
    let touchStartRadius = 0;
    let prevTouch = { x: 0, y: 0 };

    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        prevTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        isDragging = false;
        const dx = e.touches[1].clientX - e.touches[0].clientX;
        const dy = e.touches[1].clientY - e.touches[0].clientY;
        touchStartDist = Math.sqrt(dx * dx + dy * dy);
        touchStartRadius = spherical.radius;
      }
      e.preventDefault();
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && isDragging) {
        const dx = e.touches[0].clientX - prevTouch.x;
        const dy = e.touches[0].clientY - prevTouch.y;
        spherical.theta -= dx * 0.005;
        spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi - dy * 0.005));
        prevTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        this._updateCamera();
      } else if (e.touches.length === 2) {
        const dx = e.touches[1].clientX - e.touches[0].clientX;
        const dy = e.touches[1].clientY - e.touches[0].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const scale = touchStartDist / dist;
        spherical.radius = Math.max(5, Math.min(30, touchStartRadius * scale));
        this._updateCamera();
      }
      e.preventDefault();
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      if (e.touches.length === 0) {
        isDragging = false;
      } else if (e.touches.length === 1) {
        // Switched from pinch to single-finger drag
        isDragging = true;
        prevTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    });

    this.spherical = spherical;
    this._updateCamera();
  }

  _updateCamera() {
    const { theta, phi, radius } = this.spherical;
    this.camera.position.set(
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.cos(theta)
    );
    this.camera.lookAt(0, 0, 0);
  }

  /* ================================================================== */
  /*  Public setters                                                     */
  /* ================================================================== */

  /** Update sun position on the ecliptic. */
  setSunLongitude(deg) {
    this.celestialBodies.setSunLongitude(deg);

    // Update directional light to come from sun direction
    const rad = (((deg % 360) + 360) % 360) * (Math.PI / 180);
    this.directionalLight.position.set(
      Math.cos(rad) * 10,
      5,
      -Math.sin(rad) * 10
    );
  }

  /** Update moon position on the ecliptic. */
  setMoonLongitude(deg) {
    this.celestialBodies.setMoonLongitude(deg);
  }

  /** Update the elongation arc between sun and moon. */
  updateElongationArc(sunDeg, moonDeg, elongation) {
    this.celestialBodies.updateElongationArc(sunDeg, moonDeg, elongation);
  }

  /* ================================================================== */
  /*  Per-frame render                                                   */
  /* ================================================================== */

  /**
   * Called each frame (typically from requestAnimationFrame).
   * @param {number} [time] - elapsed time in seconds. Uses internal clock if omitted.
   */
  render(time) {
    const t = time !== undefined ? time : this._clock.getElapsedTime();

    // Animate entrance camera ease-in
    if (this._entranceActive) {
      const elapsed = performance.now() - this._entranceStart;
      let p = Math.min(elapsed / this._entranceDuration, 1);
      // Cubic ease-out: 1 - (1-p)^3
      p = 1 - Math.pow(1 - p, 3);

      const from = this._entranceFrom;
      const target = { theta: 0, phi: Math.PI / 4, radius: 15 };

      this.spherical.theta = from.theta + (target.theta - from.theta) * p;
      this.spherical.phi = from.phi + (target.phi - from.phi) * p;
      this.spherical.radius = from.radius + (target.radius - from.radius) * p;
      this._updateCamera();

      if (p >= 1) {
        this._entranceActive = false;
      }
    }

    // Update sub-systems
    this.starfield.update(t);
    this.zodiacWheel.update(t);
    this.celestialBodies.update(t);

    // Render
    this.renderer.render(this.scene, this.camera);
  }

  /* ================================================================== */
  /*  Resize                                                             */
  /* ================================================================== */

  resize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  /* ================================================================== */
  /*  Entrance animation                                                 */
  /* ================================================================== */

  /**
   * Triggers the zodiac wheel ring self-draw entrance animation
   * and a camera ease-in from a distant overhead view.
   */
  triggerEntrance() {
    // Camera ease-in: start from a distant, nearly top-down position
    this._entranceFrom = {
      theta: this.spherical.theta,
      phi: 0.15,
      radius: 28,
    };
    this.spherical.theta = this._entranceFrom.theta;
    this.spherical.phi = this._entranceFrom.phi;
    this.spherical.radius = this._entranceFrom.radius;
    this._updateCamera();

    this._entranceStart = performance.now();
    this._entranceActive = true;

    // Trigger zodiac wheel scale-up entrance
    this.zodiacWheel.animateEntrance(this._entranceDuration);
  }
}
