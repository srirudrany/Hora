// Script.js — primary-name resolution by script preference (SPEC §9.5): Devanagari · IAST · Tamil.
// IAST (with diacritics) and Tamil come from Hora's engine name tables (vendor/panchanga.js, P.N).
// Hora ships Tamil only for nakshatra, vara and the solar month; the other limbs fall back to
// Devanagari in Tamil mode (documented in the README).
const P = () => globalThis.Panchanga;

export const SCRIPTS = Object.freeze(['dev', 'iast', 'ta']);
export const script = { current: 'dev' };

/**
 * @param {'tithi'|'nakshatra'|'yoga'|'karana'|'vara'|'rashi'} kind
 * @param {{index:number, name:string, iast:string}} rec  1-based record from PanchangamData
 * @returns {{text:string, cls:'dv'|'ia'|'ta'}} cls tells the UI which font to use
 */
export function nameIn(kind, rec, s = script.current) {
  const N = P().N, i = rec.index - 1;
  if (s === 'ta') {
    if (kind === 'nakshatra') return { text: N.nakshatraTa[i], cls: 'ta' };
    if (kind === 'vara') return { text: N.varaTa[i], cls: 'ta' };
    return { text: rec.name, cls: 'dv' };
  }
  if (s === 'iast') {
    const t = {
      tithi: () => { const x = P().tithiName(i); return x.num === 15 ? x.name : `${x.paksha} ${x.name}`; },
      nakshatra: () => N.nakshatra[i],
      yoga: () => N.yoga[i],
      karana: () => P().karanaName(i),
      vara: () => N.vara[i],
      rashi: () => N.rasi[i],
    }[kind];
    return { text: t ? t() : rec.iast, cls: 'ia' };
  }
  return { text: rec.name, cls: 'dv' };
}

/** HTML for a primary name: a span carrying the right font class. */
export const nameHTML = (kind, rec, s) => { const n = nameIn(kind, rec, s); return `<span class="nm nm-${n.cls}">${n.text}</span>`; };
