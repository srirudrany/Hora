// HolyDays.js — "when is it good to…?" (SPEC §6.2). Scores each day of a month at sunrise using
// Hora's rules.json only: tithi family, nakshatra nature, karana, yoga, wedding list, daily windows.
// No lagna, no tārābalam, no personal charts — guidance, not advice.
import RULES from './rules.js';
import { NAKSHATRA_TABLE, TITHI_TABLE, YOGA_TABLE, KARANA_TABLE } from './PanchangamData.js';
import { fmtTime } from './PanchangamMath.js';

const P = () => globalThis.Panchanga;
const NAT = RULES.nakshatra_natures;   // star lists are 0-based in rules.json

export const ACTIVITIES = Object.freeze([
  { key: 'foundation', label: 'Foundations, house-warming, planting', nature: 'dhruva' },
  { key: 'travel', label: 'Travel, vehicles', nature: 'cara' },
  { key: 'learning', label: 'Learning, medicine, trade', nature: 'ksipra' },
  { key: 'arts', label: 'Arts, friendship, new clothes', nature: 'mrdu' },
  { key: 'wedding', label: 'Wedding', stars: RULES.wedding.favourable_nakshatra },
  { key: 'any', label: 'Any beginning' },
]);
const NATURE_NAME = { dhruva: 'Dhruva (fixed)', cara: 'Cara (movable)', ksipra: 'Kṣipra (swift)', mrdu: 'Mṛdu (soft)', ugra: 'Ugra (fierce)', tiksna: 'Tīkṣṇa (sharp)', misra: 'Miśra (mixed)' };
const natureOf = (n0) => Object.keys(NAT).find((k) => NAT[k].stars.includes(n0));
const AVOID_MONTHS_WEDDING = [3, 5, 8];   // Āḍi, Puraṭṭāsi, Mārgazhi (solar-month index from Meṣa)

/** Score every civil day of (y, m) at `loc`. Returns [{d, jd, verdict, score, chips[], limbs}] */
export function scanMonth(y, m, loc, activityKey) {
  const act = ACTIVITIES.find((a) => a.key === activityKey);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const out = [];
  for (let d = 1; d <= days; d++) {
    const E = P();
    const sr = E.sunriseOn(y, m, d, loc), ss = E.sunsetOn(y, m, d, loc);
    const t = E.angaAt('tithi', sr) + 1, n0 = E.angaAt('nakshatra', sr), yg = E.angaAt('yoga', sr) + 1, k = E.angaAt('karana', sr) + 1;
    const solar = E.angaAt('solar', sr), weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    const nat = natureOf(n0), tithi = TITHI_TABLE[t - 1], nak = NAKSHATRA_TABLE[n0], yoga = YOGA_TABLE[yg - 1], kar = KARANA_TABLE[k - 1];
    const chips = []; let score = 0, avoid = false;
    const pos = (limb, text) => { chips.push({ limb, text, tone: 'fav' }); score += 2; };
    const neg = (limb, text, hard = true) => { chips.push({ limb, text, tone: 'avoid' }); score -= hard ? 2 : 1; if (hard) avoid = true; };

    if (act.nature && nat === act.nature) pos('nakshatra', `${nak.iast} · ${NATURE_NAME[nat]} — traditionally favourable for ${NAT[nat].uses}`);
    if (act.stars && act.stars.includes(n0)) pos('nakshatra', `${nak.iast} — on the favourable wedding list`);
    if (act.key === 'any' && ['dhruva', 'ksipra', 'mrdu'].includes(nat)) pos('nakshatra', `${nak.iast} · ${NATURE_NAME[nat]}`);
    if (['ugra', 'tiksna'].includes(nat) && act.key !== 'any') neg('nakshatra', `${nak.iast} · ${NATURE_NAME[nat]} — commonly avoided for gentle work`, false);
    if (tithi.category === 'Rikta') neg('tithi', `${tithi.iast.replace(' (Krishna)', '')} · Riktā tithi — commonly avoided for beginnings`);
    if (t === 30) neg('tithi', 'Amāvāsyā — commonly avoided for beginnings');
    if (tithi.category === 'Purna' && t !== 30) { chips.push({ limb: 'tithi', text: `${tithi.iast.replace(' (Krishna)', '')} · Pūrṇā tithi`, tone: 'fav' }); score += 1; }
    if (tithi.paksha === 'Shukla' && t !== 15) { chips.push({ limb: 'tithi', text: 'Shukla paksha (waxing)', tone: 'fav' }); score += 1; }
    if (kar.avoid) neg('karana', 'Viṣṭi (Bhadrā) karana at sunrise — commonly avoided', false);
    if (yg === 17 || yg === 27) neg('yoga', `${yoga.iast} yoga — commonly avoided`);
    if (act.key === 'wedding' && AVOID_MONTHS_WEDDING.includes(solar)) neg('month', `${E.N.monthTaLat[solar]} — a month commonly avoided for weddings`);
    const part = (ss - sr) / 8, seg = (i) => [sr + (i - 1) * part, sr + i * part];
    const rahu = seg(E.RAHU[weekday]), yama = seg(E.YAMA[weekday]);
    chips.push({ limb: 'window', text: `Avoid Rāhu kālam ${fmtTime(rahu[0], loc.tz)}–${fmtTime(rahu[1], loc.tz)} and Yamagaṇḍam ${fmtTime(yama[0], loc.tz)}–${fmtTime(yama[1], loc.tz)}`, tone: 'note' });

    // hard avoids (Riktā, Amāvāsyā, Vyatīpāta/Vaidhṛti, avoided wedding month) decide; soft cautions only dim
    const verdict = avoid ? 'avoid' : score >= 3 ? 'fav' : 'neutral';
    out.push({ d, jd: sr + 2 / 24, verdict, score, chips, limbs: { tithi, nak, yoga, kar } });
  }
  return out;
}
export const DISCLAIMER = RULES.disclaimer;
