import { Renderer } from './Renderer.js';
import { UI } from './UI.js';
import { computePanchangam, overallAuspiciousness } from './PanchangamMath.js';

class App {
  constructor() {
    // Get container elements
    const canvasContainer = document.getElementById('canvas-container');

    // Initialize state
    this.sunLon = 0;
    this.moonLon = 45;
    this.date = new Date();

    // Create renderer (Three.js scene)
    this.renderer = new Renderer(canvasContainer);

    // Create UI with update callback
    this.ui = new UI((sunLon, moonLon) => {
      this.sunLon = sunLon;
      this.moonLon = moonLon;
      this.update();
    });

    // Initial computation and render
    this.update();

    // Start entrance sequence after a brief delay (the "first five seconds")
    this._entrance();

    // Start animation loop
    this._animate();
  }

  _entrance() {
    // Near-black load, then:
    // 1. After 200ms: trigger zodiac ring self-draw (1.2s)
    // 2. After 500ms: cards stagger in (CSS handles the stagger)
    // 3. After 1000ms: "Lift off" affordance breathes once
    // No loading spinner!

    setTimeout(() => {
      this.renderer.triggerEntrance();
    }, 200);

    setTimeout(() => {
      // Make cards visible (they start with animation)
      const cards = document.querySelectorAll('.panchanga-card');
      cards.forEach(card => card.classList.add('visible'));
      // Make controls visible
      const controls = document.getElementById('controls-panel');
      if (controls) controls.classList.add('visible');
    }, 500);
  }

  update() {
    // Compute panchangam from current state
    const panchangam = computePanchangam(this.sunLon, this.moonLon, this.date);
    const auspiciousness = overallAuspiciousness(panchangam);

    // Update Three.js scene
    this.renderer.setSunLongitude(this.sunLon);
    this.renderer.setMoonLongitude(this.moonLon);
    this.renderer.updateElongationArc(this.sunLon, this.moonLon, panchangam.elongation);

    // Update UI cards
    this.ui.updateDisplay(panchangam);
  }

  _animate() {
    const loop = (time) => {
      this.renderer.render(time);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new App());
} else {
  new App();
}
