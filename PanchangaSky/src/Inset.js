// Inset.js — stylized heliocentric inset (SPEC §7): orbit rings on a log-compressed radius,
// comet-style motion trails, and an honest NOT-TO-SCALE label. 2D canvas, redrawn at 4 Hz.
import { GRAHAS } from './PanchangamData.js';
import { anyHelio as helio } from './BodiesMath.js';   // agent C: classical + outer bodies
import { OUTER_BODIES } from './PanchangamData.js';

const ORDER = ['budha', 'shukra', 'earth', 'mangala', 'ceres', 'guru', 'shani', 'uranus', 'neptune', 'pluto'];
const logR = (a) => Math.log(1 + a * 2.2) / Math.log(1 + 49 * 2.2);   // out to Pluto's aphelion

export class Inset {
  constructor(canvas) {
    this.cv = canvas; this.c = canvas.getContext('2d');
    this.dpr = Math.min(devicePixelRatio, 2);
  }

  draw(jd, ayanamsa, focus) {
    const { cv, c } = this;
    const w = cv.clientWidth, h = cv.clientHeight;
    if (!w) return;
    if (cv.width !== w * this.dpr) { cv.width = w * this.dpr; cv.height = h * this.dpr; }
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2 + 4, R = Math.min(w, h) / 2 - 14;
    // rotate so sidereal 0° (Meṣa) points up, matching the clock face
    const toXY = (x, y, r) => { const a = Math.atan2(y, x) - ayanamsa * Math.PI / 180, rr = logR(r) * R; return [cx - rr * Math.sin(a), cy - rr * Math.cos(a)]; };
    const sun = c.createRadialGradient(cx, cy, 0, cx, cy, 9);
    sun.addColorStop(0, 'rgba(255,236,190,1)'); sun.addColorStop(0.3, 'rgba(255,190,90,.6)'); sun.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = sun; c.beginPath(); c.arc(cx, cy, 9, 0, Math.PI * 2); c.fill();
    for (const k of ORDER) {
      const now = helio(k, jd);
      c.strokeStyle = k === focus ? 'rgba(227,174,74,.55)' : 'rgba(138,145,176,.22)'; c.lineWidth = 1;
      c.beginPath(); c.arc(cx, cy, logR(now.r) * R, 0, Math.PI * 2); c.stroke();
      // trail: the last ~1/12 orbit, fading
      const col = k === 'earth' ? '#63B8B2' : (GRAHAS[k] ?? OUTER_BODIES[k]).color;
      const period = { budha: 88, shukra: 225, earth: 365, mangala: 687, guru: 4333, shani: 10759 }[k] ?? OUTER_BODIES[k].period;
      for (let i = 24; i >= 1; i--) {
        const p = helio(k, jd - (period / 12) * (i / 24)), [x, y] = toXY(p.x, p.y, p.r);
        c.fillStyle = col; c.globalAlpha = 0.5 * (1 - i / 24); c.beginPath(); c.arc(x, y, 1.3, 0, Math.PI * 2); c.fill();
      }
      c.globalAlpha = 1;
      const [x, y] = toXY(now.x, now.y, now.r);
      c.fillStyle = col; c.beginPath(); c.arc(x, y, k === 'guru' || k === 'shani' ? 4 : 3, 0, Math.PI * 2); c.fill();
      if (k === 'shani') { c.strokeStyle = 'rgba(216,200,160,.8)'; c.beginPath(); c.ellipse(x, y, 7, 2.5, -0.4, 0, Math.PI * 2); c.stroke(); }
      if (k === 'guru') for (let i = 0; i < 4; i++) { const a = jd / [1.769, 3.551, 7.155, 16.689][i] * Math.PI * 2; c.fillStyle = '#EFE8D8'; c.fillRect(x + Math.cos(a) * (6 + i * 2), y + Math.sin(a) * 1.5, 1, 1); }
      c.font = '500 10.5px "Noto Sans", sans-serif'; c.fillStyle = k === focus ? '#F3D491' : 'rgba(239,232,216,.7)';
      if (!['budha', 'shukra', 'ceres'].includes(k)) c.fillText(k === 'earth' ? 'Pṛthvī' : (GRAHAS[k] ?? OUTER_BODIES[k]).iast, x + 6, y - 5);
    }
    c.font = '500 9.5px "IBM Plex Mono", monospace'; c.fillStyle = 'rgba(217,72,62,.85)';
    c.fillText('NOT TO SCALE · log distances', 8, h - 8);
  }
}
