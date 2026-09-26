// Panchanga engine — Sun (Meeus ch.25), Moon (Meeus ch.47 main series), Lahiri ayanamsa,
// sunrise/sunset, the five angas with end times, Tamil solar month/date and samvatsara.
(function (root) {
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;
  const norm = (x) => ((x % 360) + 360) % 360;
  const sin = (d) => Math.sin(d * D2R), cos = (d) => Math.cos(d * D2R);

  function jdFromDate(date) { return date.getTime() / 86400000 + 2440587.5; }
  function dateFromJd(jd) { return new Date((jd - 2440587.5) * 86400000); }
  const DELTA_T = 69.5 / 86400; // TT - UT, days (c. 2026)

  function sunLon(jdUT) { // apparent tropical longitude, degrees
    const T = (jdUT + DELTA_T - 2451545) / 36525;
    const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
    const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * sin(M)
      + (0.019993 - 0.000101 * T) * sin(2 * M) + 0.000289 * sin(3 * M);
    const om = 125.04 - 1934.136 * T;
    return norm(L0 + C - 0.00569 - 0.00478 * sin(om));
  }

  // Meeus table 47.A longitude terms: D, M, M', F, coeff (1e-6 deg)
  const MT = [
    [0,0,1,0,6288774],[2,0,-1,0,1274027],[2,0,0,0,658314],[0,0,2,0,213618],[0,1,0,0,-185116],
    [0,0,0,2,-114332],[2,0,-2,0,58793],[2,-1,-1,0,57066],[2,0,1,0,53322],[2,-1,0,0,45758],
    [0,1,-1,0,-40923],[1,0,0,0,-34720],[0,1,1,0,-30383],[2,0,0,-2,15327],[0,0,1,2,-12528],
    [0,0,1,-2,10980],[4,0,-1,0,10675],[0,0,3,0,10034],[4,0,-2,0,8548],[2,1,-1,0,-7888],
    [2,1,0,0,-6766],[1,0,-1,0,-5163],[1,1,0,0,4987],[2,-1,1,0,4036],[2,0,2,0,3994],
    [4,0,0,0,3861],[2,0,-3,0,3665],[0,1,-2,0,-2689],[2,0,-1,2,-2602],[2,-1,-2,0,2390],
    [1,0,1,0,-2348],[2,-2,0,0,2236],[0,1,2,0,-2120],[0,2,0,0,-2069],[2,-2,-1,0,2048],
    [2,0,1,-2,-1773],[2,0,0,2,-1595],[4,-1,-1,0,1215],[0,0,2,2,-1110],[3,0,-1,0,-892],
    [2,1,1,0,-810],[4,-1,-2,0,759],[0,2,-1,0,-713],[2,2,-1,0,-700],[2,1,-2,0,691],
    [2,-1,0,-2,596],[4,0,1,0,549],[0,0,4,0,537],[4,-1,0,0,520],[1,0,-2,0,-487],
    [2,1,0,-2,-399],[0,0,2,-2,-381],[1,1,1,0,351],[3,0,-2,0,-340],[4,0,-3,0,330],
    [2,-1,2,0,327],[0,2,1,0,-323],[1,1,-1,0,299],[2,0,3,0,294]
  ];
  function moonLon(jdUT) { // apparent-ish tropical longitude (mean equinox + nutation), deg
    const T = (jdUT + DELTA_T - 2451545) / 36525;
    const T2 = T * T, T3 = T2 * T, T4 = T3 * T;
    const Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T2 + T3 / 538841 - T4 / 65194000;
    const D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T2 + T3 / 545868 - T4 / 113065000;
    const M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T2 + T3 / 24490000;
    const Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T2 + T3 / 69699 - T4 / 14712000;
    const F = 93.2720950 + 483202.0175233 * T - 0.0036539 * T2 - T3 / 3526000 + T4 / 863310000;
    const E = 1 - 0.002516 * T - 0.0000074 * T2;
    const A1 = 119.75 + 131.849 * T, A2 = 53.09 + 479264.290 * T;
    let sl = 0;
    for (const [d, m, mp, f, c] of MT) {
      let k = c; const am = Math.abs(m);
      if (am === 1) k *= E; else if (am === 2) k *= E * E;
      sl += k * sin(d * D + m * M + mp * Mp + f * F);
    }
    sl += 3958 * sin(A1) + 1962 * sin(Lp - F) + 318 * sin(A2);
    const om = 125.04452 - 1934.136261 * T;
    const dpsi = (-17.2 * sin(om) - 1.32 * sin(2 * (280.4665 + 36000.7698 * T)) - 0.23 * sin(2 * Lp)) / 3600;
    return norm(Lp + sl / 1e6 + dpsi);
  }

  // Lahiri (Chitrapaksha) ayanamsa, including nutation so it matches apparent longitudes
  function ayanamsa(jdUT) {
    const T = (jdUT + DELTA_T - 2451545) / 36525;
    const om = 125.04452 - 1934.136261 * T;
    const dpsi = (-17.2 * sin(om) - 1.32 * sin(2 * (280.4665 + 36000.7698 * T))) / 3600;
    return 23.85709 + (5029.0966 * T + 1.11113 * T * T) / 3600 + dpsi;
  }
  const sidSun = (jd) => norm(sunLon(jd) - ayanamsa(jd));
  const sidMoon = (jd) => norm(moonLon(jd) - ayanamsa(jd));

  // Sunrise / sunset (upper limb, refraction: h0 = -0.833 deg)
  function sunEq(jd) {
    const T = (jd + DELTA_T - 2451545) / 36525;
    const lam = sunLon(jd), eps = 23.439291 - 0.0130042 * T;
    const ra = norm(Math.atan2(cos(eps) * sin(lam), cos(lam)) * R2D);
    const dec = Math.asin(sin(eps) * sin(lam)) * R2D;
    return { ra, dec };
  }
  function gmst(jd) { const T = (jd - 2451545) / 36525; return norm(280.46061837 + 360.98564736629 * (jd - 2451545) + 0.000387933 * T * T); }
  // rise=true: sunrise nearest after jdStart's local midnight region; returns JD
  function sunEvent(jdGuess, lat, lon, rise) {
    let jd = jdGuess;
    for (let i = 0; i < 6; i++) {
      const { ra, dec } = sunEq(jd);
      const cosH = (sin(-0.833) - sin(lat) * sin(dec)) / (cos(lat) * cos(dec));
      const H = Math.acos(Math.max(-1, Math.min(1, cosH))) * R2D;
      const target = rise ? norm(ra - H) : norm(ra + H); // local sidereal time at event
      const lst = norm(gmst(jd) + lon);
      let dh = target - lst; if (dh > 180) dh -= 360; if (dh < -180) dh += 360;
      jd += dh / 360.98564736629;
    }
    return jd;
  }
  // civil-date helpers in a fixed tz offset (hours)
  function localMidnightJd(y, m, d, tz) { return Date.UTC(y, m - 1, d) / 86400000 + 2440587.5 - tz / 24; }
  function sunriseOn(y, m, d, loc) { return sunEvent(localMidnightJd(y, m, d, loc.tz) + 0.25, loc.lat, loc.lon, true); }
  function sunsetOn(y, m, d, loc) { return sunEvent(localMidnightJd(y, m, d, loc.tz) + 0.75, loc.lat, loc.lon, false); }

  // ---------- anga functions: value in [0, n) -------------
  const elong = (jd) => norm(moonLon(jd) - sunLon(jd));
  const ANGA = {
    tithi: { n: 30, span: 12, f: elong },
    karana: { n: 60, span: 6, f: elong },
    nakshatra: { n: 27, span: 360 / 27, f: sidMoon },
    yoga: { n: 27, span: 360 / 27, f: (jd) => norm(sidMoon(jd) + sidSun(jd)) },
    rasi: { n: 12, span: 30, f: sidMoon },
    solar: { n: 12, span: 30, f: sidSun }
  };
  function angaAt(kind, jd) { const a = ANGA[kind]; return Math.floor(a.f(jd) / a.span) % a.n; }
  // time when anga index changes from its value at jd (forward search)
  function angaEnd(kind, jd) {
    const a = ANGA[kind]; const idx = angaAt(kind, jd);
    const boundary = norm((idx + 1) * a.span);
    const g = (t) => { let d = norm(a.f(t) - boundary); return d > 180 ? d - 360 : d; };
    let lo = jd, hi = jd + 0.25;
    while (g(hi) < 0) { lo = hi; hi += 0.25; if (hi - jd > 40) break; }
    for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (g(mid) < 0) lo = mid; else hi = mid; }
    return hi;
  }
  function angaStart(kind, jd) {
    const a = ANGA[kind]; const idx = angaAt(kind, jd);
    const boundary = norm(idx * a.span);
    const g = (t) => { let d = norm(a.f(t) - boundary); return d > 180 ? d - 360 : d; };
    let hi = jd, lo = jd - 0.25;
    while (g(lo) >= 0) { hi = lo; lo -= 0.25; if (jd - lo > 40) break; }
    for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (g(mid) < 0) lo = mid; else hi = mid; }
    return hi;
  }

  // ---------- names ----------
  const N = {
    tithi: ['Pratipadā','Dvitīyā','Tṛtīyā','Caturthī','Pañcamī','Ṣaṣṭhī','Saptamī','Aṣṭamī','Navamī','Daśamī','Ekādaśī','Dvādaśī','Trayodaśī','Caturdaśī'],
    nakshatra: ['Aśvinī','Bharaṇī','Kṛttikā','Rohiṇī','Mṛgaśīrṣa','Ārdrā','Punarvasu','Puṣya','Āśleṣā','Maghā','Pūrva Phalgunī','Uttara Phalgunī','Hasta','Citrā','Svātī','Viśākhā','Anurādhā','Jyeṣṭhā','Mūla','Pūrva Āṣāḍhā','Uttara Āṣāḍhā','Śravaṇa','Dhaniṣṭhā','Śatabhiṣaj','Pūrva Bhādrapadā','Uttara Bhādrapadā','Revatī'],
    nakshatraTa: ['அசுவினி','பரணி','கார்த்திகை','ரோகிணி','மிருகசீரிடம்','திருவாதிரை','புனர்பூசம்','பூசம்','ஆயில்யம்','மகம்','பூரம்','உத்திரம்','அஸ்தம்','சித்திரை','சுவாதி','விசாகம்','அனுஷம்','கேட்டை','மூலம்','பூராடம்','உத்திராடம்','திருவோணம்','அவிட்டம்','சதயம்','பூரட்டாதி','உத்திரட்டாதி','ரேவதி'],
    nakshatraDev: ['अश्विनी','भरणी','कृत्तिका','रोहिणी','मृगशीर्ष','आर्द्रा','पुनर्वसु','पुष्य','आश्लेषा','मघा','पूर्वफल्गुनी','उत्तरफल्गुनी','हस्त','चित्रा','स्वाती','विशाखा','अनुराधा','ज्येष्ठा','मूल','पूर्वाषाढा','उत्तराषाढा','श्रवण','धनिष्ठा','शतभिषक्','पूर्वभाद्रपदा','उत्तरभाद्रपदा','रेवती'],
    yoga: ['Viṣkambha','Prīti','Āyuṣmān','Saubhāgya','Śobhana','Atigaṇḍa','Sukarmā','Dhṛti','Śūla','Gaṇḍa','Vṛddhi','Dhruva','Vyāghāta','Harṣaṇa','Vajra','Siddhi','Vyatīpāta','Varīyān','Parigha','Śiva','Siddha','Sādhya','Śubha','Śukla','Brahma','Aindra','Vaidhṛti'],
    karanaChara: ['Bava','Bālava','Kaulava','Taitila','Gara','Vaṇij','Viṣṭi'],
    vara: ['Ravivāra','Somavāra','Maṅgalavāra','Budhavāra','Guruvāra','Śukravāra','Śanivāra'],
    varaTa: ['ஞாயிறு','திங்கள்','செவ்வாய்','புதன்','வியாழன்','வெள்ளி','சனி'],
    rasi: ['Meṣa','Vṛṣabha','Mithuna','Karkaṭa','Siṃha','Kanyā','Tulā','Vṛścika','Dhanus','Makara','Kumbha','Mīna'],
    rasiDev: ['मेष','वृषभ','मिथुन','कर्कट','सिंह','कन्या','तुला','वृश्चिक','धनुस्','मकर','कुम्भ','मीन'],
    monthTa: ['சித்திரை','வைகாசி','ஆனி','ஆடி','ஆவணி','புரட்டாசி','ஐப்பசி','கார்த்திகை','மார்கழி','தை','மாசி','பங்குனி'],
    monthTaLat: ['Chithirai','Vaikāsi','Āni','Āḍi','Āvaṇi','Puraṭṭāsi','Aippasi','Kārttikai','Mārgazhi','Thai','Māsi','Panguni'],
    samvat: ['Prabhava','Vibhava','Śukla','Pramoda','Prajāpati','Āṅgīrasa','Śrīmukha','Bhāva','Yuvan','Dhātṛ','Īśvara','Bahudhānya','Pramāthin','Vikrama','Vṛṣa','Citrabhānu','Svabhānu','Tāraṇa','Pārthiva','Vyaya','Sarvajit','Sarvadhārin','Virodhin','Vikṛti','Khara','Nandana','Vijaya','Jaya','Manmatha','Durmukha','Hemalamba','Vilamba','Vikārin','Śārvari','Plava','Śubhakṛt','Śobhakṛt','Krodhin','Viśvāvasu','Parābhava','Plavaṅga','Kīlaka','Saumya','Sādhāraṇa','Virodhikṛt','Paridhāvin','Pramādin','Ānanda','Rākṣasa','Nala','Piṅgala','Kālayukta','Siddhārthin','Raudra','Durmati','Dundubhi','Rudhirodgārin','Raktākṣin','Krodhana','Akṣaya']
  };
  function tithiName(i) { // i: 0..29
    const paksha = i < 15 ? 'Śukla' : 'Kṛṣṇa';
    const k = i % 15;
    const name = k === 14 ? (i < 15 ? 'Pūrṇimā' : 'Amāvāsyā') : N.tithi[k];
    return { paksha, name, num: k + 1 };
  }
  function karanaName(k) { // k: 0..59
    if (k === 0) return 'Kiṃstughna';
    if (k >= 57) return ['Śakuni','Catuṣpāda','Nāga'][k - 57];
    return N.karanaChara[(k - 1) % 7];
  }

  // Rahu kalam etc: eighth-part index (1..8) of daytime, by weekday (0=Sun)
  const RAHU = [8, 2, 7, 5, 6, 4, 3], YAMA = [5, 4, 3, 2, 1, 7, 6], GULIKA = [7, 6, 5, 4, 3, 2, 1];

  // ---------- full panchanga for a civil date at a place ----------
  function panchanga(y, m, d, loc) {
    const sr = sunriseOn(y, m, d, loc), ss = sunsetOn(y, m, d, loc);
    const nd = new Date(Date.UTC(y, m - 1, d + 1));
    const srNext = sunriseOn(nd.getUTCFullYear(), nd.getUTCMonth() + 1, nd.getUTCDate(), loc);
    const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    const out = { sunrise: sr, sunset: ss, nextSunrise: srNext, weekday };
    for (const k of ['tithi', 'nakshatra', 'yoga', 'karana']) {
      const list = []; let t = sr;
      while (t < srNext && list.length < 4) {
        const idx = angaAt(k, t + 1e-6); const end = angaEnd(k, t + 1e-6);
        list.push({ idx, end }); t = end;
      }
      out[k] = list;
    }
    // Tamil solar month: sankranti before sunset => month day 1 is today; else tomorrow
    const mIdx = angaAt('solar', ss);
    let start = angaStart('solar', ss); // JD of sankranti
    // find civil date of month day 1
    const sd = dateFromJd(start + loc.tz / 24);
    let y1 = sd.getUTCFullYear(), m1 = sd.getUTCMonth() + 1, d1 = sd.getUTCDate();
    const ssThat = sunsetOn(y1, m1, d1, loc);
    let day1 = Date.UTC(y1, m1 - 1, d1); if (start > ssThat) day1 += 86400000;
    out.tamilMonth = mIdx;
    out.tamilDay = Math.round((Date.UTC(y, m - 1, d) - day1) / 86400000) + 1;
    // samvatsara: Tamil year begins with Mesha (Chithirai); 1987 Chithirai = Prabhava
    const ty = (m <= 4 && mIdx >= 8) ? y - 1 : y;
    out.samvat = ((ty - 1987) % 60 + 60) % 60;
    const part = (ss - sr) / 8;
    const seg = (n) => [sr + (n - 1) * part, sr + n * part];
    out.rahu = seg(RAHU[weekday]); out.yama = seg(YAMA[weekday]); out.gulika = seg(GULIKA[weekday]);
    out.abhijit = [sr + 7 * (ss - sr) / 15, sr + 8 * (ss - sr) / 15];
    out.sunSid = sidSun(sr); out.moonSid = sidMoon(sr); out.ayanamsa = ayanamsa(sr);
    return out;
  }

  const api = { jdFromDate, dateFromJd, sunLon, moonLon, ayanamsa, sidSun, sidMoon, elong, sunriseOn, sunsetOn,
    angaAt, angaEnd, angaStart, panchanga, N, tithiName, karanaName, RAHU, YAMA, GULIKA, norm };
  if (typeof module !== 'undefined') module.exports = api; else root.Panchanga = api;
})(this);
