// Yogatāras (junction stars) of the 27 nakṣatras + small astronomy helpers.
// RA (hours) / Dec (deg) J2000; V magnitude; distance in light-years (approx., Hipparcos/Gaia-era values).
// Deities follow Hora/docs/SPEC.md; symbols and Vimśottari lords are the standard traditional set.
(function () {
  const D2R = Math.PI / 180;
  const L = [
    ['Sheratan','β Arietis','Aries',1.9106,20.808,2.64,59.6,'A5 V','Aśvins','Horse’s head'],
    ['Bharani','41 Arietis','Aries',2.8331,27.261,3.63,160,'B8 Vn','Yama','Yoni'],
    ['Alcyone','η Tauri','Taurus · Pleiades',3.7914,24.105,2.87,440,'B7 IIIe','Agni','Razor, flame'],
    ['Aldebaran','α Tauri','Taurus',4.5987,16.509,0.86,65.3,'K5 III','Prajāpati','Chariot'],
    ['Meissa','λ Orionis','Orion',5.5856,9.934,3.39,1100,'O8 III','Soma','Deer’s head'],
    ['Betelgeuse','α Orionis','Orion',5.9195,7.407,0.50,548,'M1–2 Ia','Rudra','Teardrop'],
    ['Pollux','β Geminorum','Gemini',7.7553,28.026,1.14,33.8,'K0 III','Aditi','Quiver of arrows'],
    ['Asellus Australis','δ Cancri','Cancer',8.7448,18.154,3.94,131,'K0 III','Bṛhaspati','Cow’s udder'],
    ['ε Hydrae','ε Hydrae','Hydra',8.7797,6.419,3.38,129,'G5 III','Sarpas','Coiled serpent'],
    ['Regulus','α Leonis','Leo',10.1395,11.967,1.35,79.3,'B8 IVn','Pitṛs','Royal throne'],
    ['Zosma','δ Leonis','Leo',11.2351,20.524,2.56,58.4,'A4 V','Bhaga','Front legs of a cot'],
    ['Denebola','β Leonis','Leo',11.8177,14.572,2.13,35.9,'A3 Va','Aryaman','Back legs of a cot'],
    ['Algorab','δ Corvi','Corvus',12.4977,-16.515,2.94,87,'B9.5 IV','Savitṛ','Hand'],
    ['Spica','α Virginis','Virgo',13.4199,-11.161,0.97,250,'B1 III–IV','Tvaṣṭṛ','Bright jewel'],
    ['Arcturus','α Boötis','Boötes',14.2610,19.182,-0.05,36.7,'K1.5 III','Vāyu','Young sprout'],
    ['Zubenelgenubi','α² Librae','Libra',14.8480,-16.042,2.75,75,'A3 IV','Indrāgni','Triumphal arch'],
    ['Dschubba','δ Scorpii','Scorpius',16.0056,-22.622,2.29,490,'B0.3 IV','Mitra','Lotus'],
    ['Antares','α Scorpii','Scorpius',16.4901,-26.432,1.09,550,'M1.5 Iab','Indra','Earring, umbrella'],
    ['Shaula','λ Scorpii','Scorpius',17.5601,-37.104,1.62,570,'B2 IV','Nirṛti','Tied roots'],
    ['Kaus Media','δ Sagittarii','Sagittarius',18.3499,-29.828,2.70,348,'K3 III','Āpas','Winnowing fan'],
    ['Nunki','σ Sagittarii','Sagittarius',18.9211,-26.297,2.05,228,'B2.5 V','Viśvedevas','Elephant tusk'],
    ['Altair','α Aquilae','Aquila',19.8464,8.868,0.76,16.7,'A7 V','Viṣṇu','Ear, three footprints'],
    ['Rotanev','β Delphini','Delphinus',20.6258,14.595,3.63,101,'F5 IV','Aṣṭa Vasus','Drum'],
    ['λ Aquarii','λ Aquarii','Aquarius',22.8769,-7.580,3.73,390,'M2.5 III','Varuṇa','Empty circle'],
    ['Markab','α Pegasi','Pegasus',23.0794,15.205,2.48,133,'B9 III','Aja Ekapāda','Front of a funeral cot'],
    ['Algenib','γ Pegasi','Pegasus',0.2206,15.184,2.83,390,'B2 IV','Ahirbudhnya','Back of a funeral cot'],
    ['ζ Piscium','ζ Piscium','Pisces',1.2289,7.575,5.21,148,'A7 IV','Pūṣan','Fish'],
  ];
  const LORDS = ['Ketu','Śukra','Sūrya','Candra','Maṅgala','Rāhu','Guru','Śani','Budha'];
  const NATURE = ['Kṣipra · swift','Ugra · fierce','Miśra · mixed','Dhruva · fixed','Mṛdu · gentle','Tīkṣṇa · sharp','Cara · movable','Kṣipra · swift','Tīkṣṇa · sharp','Ugra · fierce','Ugra · fierce','Dhruva · fixed','Kṣipra · swift','Mṛdu · gentle','Cara · movable','Miśra · mixed','Mṛdu · gentle','Tīkṣṇa · sharp','Tīkṣṇa · sharp','Ugra · fierce','Dhruva · fixed','Cara · movable','Cara · movable','Cara · movable','Ugra · fierce','Dhruva · fixed','Mṛdu · gentle'];
  const NOTES = {
    2: 'Alcyone is the brightest star of the Pleiades open cluster, which is Kṛttikā itself.',
    3: 'The red eye of the bull. The Moon regularly passes in front of Aldebaran and hides it.',
    5: 'A red supergiant near the end of its life; its brightness varies over months.',
    9: 'Regulus sits almost exactly on the ecliptic, so the Moon and planets pass close by.',
    13: 'Spica fixes the Lahiri zodiac: it is set at exactly 180°, opposite 0° Aśvinī.',
    14: 'The brightest star of the northern sky and the brightest of the 27 yogatāras.',
    17: 'Antares is a red supergiant; its name means “rival of Mars” for its colour.',
    18: 'The centre of our galaxy lies in this direction, a few degrees from Shaula.',
    21: 'The nearest yogatāra. Its light takes under 17 years to reach you.',
    26: 'The faintest yogatāra. The Lahiri zodiac places 0° near this star.',
  };
  const TINT = { O: '#9DB4FF', B: '#AFC3FF', A: '#D2DCFF', F: '#F8F7FF', G: '#FFF2E0', K: '#FFD09A', M: '#FFB068' };
  const CLASS = { O: 'blue giant', B: 'blue-white', A: 'white', F: 'yellow-white', G: 'yellow', K: 'orange', M: 'red' };
  const list = L.map((r, i) => {
    const t = r[7][0]; const lum = r[7].includes('Ia') || r[7].includes('Iab') ? 'supergiant' : r[7].includes(' III') ? 'giant' : r[7].includes(' IV') ? 'subgiant' : 'main-sequence star';
    return { i, name: r[0], bayer: r[1], con: r[2], ra: r[3], dec: r[4], mag: r[5], ly: r[6], sp: r[7], deity: r[8], symbol: r[9], lord: LORDS[i % 9], nature: NATURE[i], note: NOTES[i] || '', tint: TINT[t], kind: `${CLASS[t]} ${lum}` };
  });
  const norm = (x) => ((x % 360) + 360) % 360;
  const gmst = (jd) => norm(280.46061837 + 360.98564736629 * (jd - 2451545));
  function eqOfDate(s, jd) { // simple annual precession from J2000
    const y = (jd - 2451545) / 365.25, a = s.ra * 15 * D2R, d = s.dec * D2R;
    const da = (3.07496 + 1.33621 * Math.sin(a) * Math.tan(d)) * y / 240, dd = 20.0431 * Math.cos(a) * y / 3600;
    return { ra: norm(s.ra * 15 + da), dec: s.dec + dd };
  }
  function eclSid(s, jd, P) {
    const e = 23.4393 * D2R, a = s.ra * 15 * D2R, d = s.dec * D2R;
    const beta = Math.asin(Math.sin(d) * Math.cos(e) - Math.cos(d) * Math.sin(e) * Math.sin(a));
    const lam = Math.atan2(Math.sin(a) * Math.cos(e) + Math.tan(d) * Math.sin(e), Math.cos(a));
    const T = (jd - 2451545) / 36525;
    return { lam: norm(lam / D2R + 1.3969713 * T - P.ayanamsa(jd)), beta: beta / D2R };
  }
  function altaz(ra, dec, jd, loc) {
    const H = (gmst(jd) + loc.lon - ra) * D2R, d = dec * D2R, p = loc.lat * D2R;
    const alt = Math.asin(Math.sin(p) * Math.sin(d) + Math.cos(p) * Math.cos(d) * Math.cos(H));
    const az = Math.atan2(-Math.sin(H) * Math.cos(d), Math.cos(p) * Math.sin(d) - Math.sin(p) * Math.cos(d) * Math.cos(H));
    return { alt: alt / D2R, az: norm(az / D2R) };
  }
  function sunEq(jd, P) { const l = P.sunLon(jd) * D2R, e = 23.4393 * D2R; return { ra: norm(Math.atan2(Math.cos(e) * Math.sin(l), Math.cos(l)) / D2R), dec: Math.asin(Math.sin(e) * Math.sin(l)) / D2R }; }
  function events(s, jd, loc) {
    const q = eqOfDate(s, jd), SID = 0.99726957;
    const tr = jd + norm(q.ra - gmst(jd) - loc.lon) / 360 * SID;
    const c = (Math.sin(-0.5667 * D2R) - Math.sin(loc.lat * D2R) * Math.sin(q.dec * D2R)) / (Math.cos(loc.lat * D2R) * Math.cos(q.dec * D2R));
    if (c <= -1) return { transit: tr, circumpolar: true }; if (c >= 1) return { transit: tr, never: true };
    const h = Math.acos(c) / D2R / 360 * SID;
    let rise = tr - h; if (rise < jd) rise += SID; let set = tr + h; if (set - SID > jd) set -= SID; if (set < jd) set += SID;
    return { rise, transit: tr, set, q };
  }
  const COMPASS = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  const compass = (az) => COMPASS[Math.round(norm(az) / 22.5) % 16];
  window.Yogatara = { list, eqOfDate, eclSid, altaz, sunEq, events, compass, norm };
})();
