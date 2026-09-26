import { computePanchangam, overallAuspiciousness } from './PanchangamMath.js';
import { GLOSSARY } from './PanchangamData.js';

/**
 * UI — HTML overlay module for Panchanga Sky.
 * Creates and manages all DOM elements overlaid on the Three.js canvas.
 */

const GLOSSARY_TERMS = new Set([
  'tithi', 'nakshatra', 'yoga', 'karana', 'vara', 'paksha',
  'shubha', 'ashubha', 'nanda', 'bhadra', 'jaya', 'rikta', 'purna',
  'shukla', 'krishna',
]);

const PRESETS = {
  amavasya:        { offset: 359.999 },
  'first-quarter': { offset: 90 },
  purnima:         { offset: 179.999 },
  'third-quarter': { offset: 270 },
};

const LIMB_LABELS = ['Vara', 'Tithi', 'Nakshatra', 'Yoga', 'Karana'];

/**
 * Wrap recognised glossary terms found in `text` with tooltip spans.
 */
function wrapGlossary(text) {
  if (!text) return '';
  let out = text;
  for (const term of GLOSSARY_TERMS) {
    if (!GLOSSARY[term]) continue;
    const re = new RegExp(`\\b(${term})\\b`, 'gi');
    out = out.replace(re, (match) => {
      const key = match.toLowerCase();
      return `<span class="glossary-term" data-term="${key}">${match}</span>`;
    });
  }
  return out;
}

export class UI {
  /**
   * @param {function(number, number): void} onUpdate — callback(sunLon, moonLon)
   */
  constructor(onUpdate) {
    this.onUpdate = onUpdate;
    this.sunLon = 0;
    this.moonLon = 0;
    this._rafPending = false;

    const overlay = document.getElementById('ui-overlay');
    if (!overlay) {
      throw new Error('UI: #ui-overlay element not found in the document');
    }

    // ---- Header bar ----
    this._headerBar = this._buildHeaderBar();
    overlay.appendChild(this._headerBar);

    // ---- Panchangam panel (bottom-left, 5 cards) ----
    this._panchangaPanel = document.createElement('div');
    this._panchangaPanel.id = 'panchanga-panel';
    this._cards = [];
    for (let i = 0; i < LIMB_LABELS.length; i++) {
      const card = this._buildCard(LIMB_LABELS[i], i);
      this._cards.push(card);
      this._panchangaPanel.appendChild(card.root);
    }
    overlay.appendChild(this._panchangaPanel);

    // ---- Controls panel (bottom-right) ----
    this._controlsPanel = this._buildControlsPanel();
    overlay.appendChild(this._controlsPanel);

    // ---- Glossary tooltip (singleton) ----
    this._tooltip = document.createElement('div');
    this._tooltip.id = 'glossary-tooltip';
    this._tooltip.style.display = 'none';
    overlay.appendChild(this._tooltip);
    this._bindGlossaryHovers(overlay);

    // ---- Initial computation ----
    const now = new Date();
    const panchangam = computePanchangam(this.sunLon, this.moonLon, now);
    this.updateDisplay(panchangam);
  }

  // =========================================================================
  // Header bar
  // =========================================================================

  _buildHeaderBar() {
    const bar = document.createElement('div');
    bar.id = 'header-bar';

    const h1 = document.createElement('h1');
    h1.className = 'app-title';
    h1.textContent = '\u092A\u091E\u094D\u091A\u093E\u0919\u094D\u0917 '; // पञ्चाङ्ग
    const span = document.createElement('span');
    span.className = 'title-english';
    span.textContent = 'Sky';
    h1.appendChild(span);
    bar.appendChild(h1);

    this._elongationDisplay = document.createElement('div');
    this._elongationDisplay.id = 'elongation-display';
    this._elongationDisplay.textContent = '\u0394L = 0.0\u00B0';
    bar.appendChild(this._elongationDisplay);

    this._auspiciousnessDot = document.createElement('div');
    this._auspiciousnessDot.id = 'auspiciousness-dot';
    this._auspiciousnessDot.className = 'shubha';
    bar.appendChild(this._auspiciousnessDot);

    return bar;
  }

  // =========================================================================
  // Panchanga cards
  // =========================================================================

  _buildCard(label, index) {
    const root = document.createElement('div');
    root.className = 'panchanga-card';
    root.style.animationDelay = `${index * 100}ms`;

    const cardLabel = document.createElement('div');
    cardLabel.className = 'card-label';
    cardLabel.textContent = label;

    const nameDevanagari = document.createElement('div');
    nameDevanagari.className = 'card-name-devanagari';

    const nameIast = document.createElement('div');
    nameIast.className = 'card-name-iast';

    const detail = document.createElement('div');
    detail.className = 'card-detail';

    const badge = document.createElement('div');
    badge.className = 'card-badge';

    const activities = document.createElement('div');
    activities.className = 'card-activities';

    root.appendChild(cardLabel);
    root.appendChild(nameDevanagari);
    root.appendChild(nameIast);
    root.appendChild(detail);
    root.appendChild(badge);
    root.appendChild(activities);

    return { root, cardLabel, nameDevanagari, nameIast, detail, badge, activities };
  }

  // =========================================================================
  // Controls panel
  // =========================================================================

  _buildControlsPanel() {
    const panel = document.createElement('div');
    panel.id = 'controls-panel';

    // --- Sun slider ---
    const sunGroup = this._buildSliderGroup(
      '\u0938\u0942\u0930\u094D\u092F Sun Longitude',  // सूर्य
      'sun-slider', 'sun-value'
    );
    this._sunSlider = sunGroup.slider;
    this._sunValueLabel = sunGroup.valueLabel;
    panel.appendChild(sunGroup.root);

    // --- Moon slider ---
    const moonGroup = this._buildSliderGroup(
      '\u091A\u0928\u094D\u0926\u094D\u0930 Moon Longitude',  // चन्द्र
      'moon-slider', 'moon-value'
    );
    this._moonSlider = moonGroup.slider;
    this._moonValueLabel = moonGroup.valueLabel;
    panel.appendChild(moonGroup.root);

    // --- Preset buttons ---
    const presetDiv = document.createElement('div');
    presetDiv.className = 'preset-buttons';

    const presets = [
      { key: 'amavasya',       label: '\u0905\u092E\u093E\u0935\u0938\u094D\u092F\u093E', sub: 'New Moon' },
      { key: 'first-quarter',  label: '\u092A\u094D\u0930\u0925\u092E',                   sub: 'First Quarter' },
      { key: 'purnima',        label: '\u092A\u0942\u0930\u094D\u0923\u093F\u092E\u093E', sub: 'Full Moon' },
      { key: 'third-quarter',  label: '\u0924\u0943\u0924\u0940\u092F',                   sub: 'Third Quarter' },
    ];

    for (const p of presets) {
      const btn = document.createElement('button');
      btn.className = 'preset-btn';
      btn.dataset.preset = p.key;
      btn.innerHTML = `${p.label}<br><small>${p.sub}</small>`;
      btn.addEventListener('click', () => this._applyPreset(p.key));
      presetDiv.appendChild(btn);
    }
    panel.appendChild(presetDiv);

    // --- Mode toggle ---
    const modeDiv = document.createElement('div');
    modeDiv.className = 'mode-toggle';

    const modes = [
      { key: 'both',       label: 'Both',       active: true },
      { key: 'scientific', label: 'Scientific',  active: false },
      { key: 'religious',  label: 'Religious',   active: false },
    ];

    this._modeBtns = [];
    for (const m of modes) {
      const btn = document.createElement('button');
      btn.className = 'mode-btn' + (m.active ? ' active' : '');
      btn.dataset.mode = m.key;
      btn.textContent = m.label;
      btn.addEventListener('click', () => this._setMode(m.key));
      modeDiv.appendChild(btn);
      this._modeBtns.push(btn);
    }
    panel.appendChild(modeDiv);

    // --- Slider event listeners ---
    this._sunSlider.addEventListener('input', () => this._onSliderInput());
    this._moonSlider.addEventListener('input', () => this._onSliderInput());

    return panel;
  }

  _buildSliderGroup(labelText, sliderId, valueId) {
    const root = document.createElement('div');
    root.className = 'slider-group';

    const label = document.createElement('label');
    label.textContent = labelText;

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = sliderId;
    slider.min = '0';
    slider.max = '359.999';
    slider.step = '0.1';
    slider.value = '0';

    const valueLabel = document.createElement('span');
    valueLabel.className = 'slider-value';
    valueLabel.id = valueId;
    valueLabel.textContent = '0.0\u00B0';

    root.appendChild(label);
    root.appendChild(slider);
    root.appendChild(valueLabel);

    return { root, slider, valueLabel };
  }

  // =========================================================================
  // Slider & preset interaction
  // =========================================================================

  _onSliderInput() {
    this.sunLon = parseFloat(this._sunSlider.value);
    this.moonLon = parseFloat(this._moonSlider.value);
    this._sunValueLabel.textContent = `${this.sunLon.toFixed(1)}\u00B0`;
    this._moonValueLabel.textContent = `${this.moonLon.toFixed(1)}\u00B0`;

    if (!this._rafPending) {
      this._rafPending = true;
      requestAnimationFrame(() => {
        this._rafPending = false;
        const panchangam = computePanchangam(this.sunLon, this.moonLon, new Date());
        this.updateDisplay(panchangam);
        this.onUpdate(this.sunLon, this.moonLon);
      });
    }
  }

  _applyPreset(presetKey) {
    const preset = PRESETS[presetKey];
    if (!preset) return;

    this.moonLon = (this.sunLon + preset.offset) % 360;
    this._moonSlider.value = this.moonLon.toFixed(1);
    this._moonValueLabel.textContent = `${this.moonLon.toFixed(1)}\u00B0`;

    const panchangam = computePanchangam(this.sunLon, this.moonLon, new Date());
    this.updateDisplay(panchangam);
    this.onUpdate(this.sunLon, this.moonLon);
  }

  _setMode(modeKey) {
    for (const btn of this._modeBtns) {
      btn.classList.toggle('active', btn.dataset.mode === modeKey);
    }
  }

  // =========================================================================
  // Display update
  // =========================================================================

  updateDisplay(panchangam) {
    const { vara, tithi, nakshatra, yoga, karana, elongation: dL, pada } = panchangam;
    const auspiciousness = overallAuspiciousness(panchangam);

    // --- Elongation ---
    this._elongationDisplay.textContent = `\u0394L = ${dL.toFixed(1)}\u00B0`;

    // --- Auspiciousness dot ---
    this._auspiciousnessDot.className = auspiciousness === 'Shubha' ? 'shubha' : 'ashubha';

    // --- Vara card ---
    const varaCard = this._cards[0];
    varaCard.nameDevanagari.textContent = vara.name;
    varaCard.nameIast.textContent = vara.iast;
    varaCard.detail.innerHTML = wrapGlossary(`${vara.english} \u00B7 ${vara.planet}`);
    varaCard.badge.textContent = '';
    varaCard.badge.className = 'card-badge';
    varaCard.activities.innerHTML = wrapGlossary(vara.nature);

    // --- Tithi card ---
    const tithiCard = this._cards[1];
    tithiCard.nameDevanagari.textContent = tithi.name;
    tithiCard.nameIast.textContent = tithi.iast;
    tithiCard.detail.innerHTML = wrapGlossary(`${tithi.category} \u00B7 ${tithi.paksha} Paksha`);
    const tithiIsShubha = tithi.category !== 'Rikta';
    tithiCard.badge.textContent = tithiIsShubha ? 'Shubha' : 'Ashubha';
    tithiCard.badge.className = `card-badge ${tithiIsShubha ? 'shubha' : 'ashubha'}`;
    tithiCard.activities.innerHTML = wrapGlossary(tithi.auspiciousFor);

    // --- Nakshatra card ---
    const nakCard = this._cards[2];
    nakCard.nameDevanagari.textContent = nakshatra.name;
    nakCard.nameIast.textContent = nakshatra.iast;
    nakCard.detail.innerHTML = wrapGlossary(`Deity: ${nakshatra.deity} \u00B7 ${nakshatra.temperament}`);
    nakCard.badge.textContent = `Pada ${pada}`;
    nakCard.badge.className = 'card-badge';
    nakCard.activities.innerHTML = wrapGlossary(
      `${nakshatra.start.toFixed(1)}\u00B0 \u2013 ${nakshatra.end.toFixed(1)}\u00B0`
    );

    // --- Yoga card ---
    const yogaCard = this._cards[3];
    yogaCard.nameDevanagari.textContent = yoga.name;
    yogaCard.nameIast.textContent = yoga.iast;
    yogaCard.detail.innerHTML = wrapGlossary(yoga.nature);
    yogaCard.badge.textContent = yoga.classification;
    yogaCard.badge.className = `card-badge ${yoga.classification === 'Shubha' ? 'shubha' : 'ashubha'}`;
    yogaCard.activities.innerHTML = '';

    // --- Karana card ---
    const karCard = this._cards[4];
    karCard.nameDevanagari.textContent = karana.name;
    karCard.nameIast.textContent = karana.iast;
    karCard.detail.innerHTML = wrapGlossary(`${karana.animal} \u00B7 ${karana.nature}`);
    karCard.badge.textContent = karana.type;
    karCard.badge.className = `card-badge ${karana.iast === 'Vishti' ? 'ashubha' : 'shubha'}`;
    karCard.activities.innerHTML = wrapGlossary(karana.application);

    // Re-bind glossary hovers for newly injected HTML
    this._bindGlossaryHovers(this._panchangaPanel);
  }

  // =========================================================================
  // Glossary tooltip hovers
  // =========================================================================

  _bindGlossaryHovers(container) {
    const terms = container.querySelectorAll('.glossary-term');
    for (const el of terms) {
      // Avoid double-binding
      if (el.dataset.glossaryBound) continue;
      el.dataset.glossaryBound = '1';

      el.addEventListener('mouseenter', (e) => {
        const key = el.dataset.term;
        const def = GLOSSARY[key];
        if (!def) return;
        this._tooltip.textContent = def;
        this._tooltip.style.display = 'block';

        const rect = el.getBoundingClientRect();
        this._tooltip.style.left = `${rect.left}px`;
        this._tooltip.style.top = `${rect.bottom + 4}px`;
      });

      el.addEventListener('mouseleave', () => {
        this._tooltip.style.display = 'none';
      });
    }
  }
}
