// Special days and the muhūrta finder, driven by data/rules.json (via Tables).
// Always presented as guidance (Tables.DISCLAIMER), never prescription.
package org.hora.panchanga.core

data class SpecialDay(val name: String, val kind: Kind) {
    enum class Kind { PURNIMA, AMAVASYA, EKADASHI, SHASHTHI, PRADOSHAM, SANKATAHARA, KARTTIKAI, FESTIVAL }
}

object Specials {
    /** Special observances for a day, judged by the limbs in force at sunrise (Tamil convention). */
    fun of(day: DayPanchanga): List<SpecialDay> {
        val t = day.tithi[0].idx
        val n = day.nakshatra[0].idx
        val o = mutableListOf<SpecialDay>()
        Tables.festivals.filter { it.tamilMonth == day.tamilMonth && it.nakshatra == n }
            .forEach { o += SpecialDay(it.name, SpecialDay.Kind.FESTIVAL) }
        if (t == 14) o += SpecialDay("Pūrṇimā", SpecialDay.Kind.PURNIMA)
        if (t == 29) o += SpecialDay("Amāvāsyā", SpecialDay.Kind.AMAVASYA)
        if (t == 10 || t == 25) o += SpecialDay("Ekādaśī", SpecialDay.Kind.EKADASHI)
        if (t == 5 || t == 20) o += SpecialDay("Ṣaṣṭhī", SpecialDay.Kind.SHASHTHI)
        if (t == 12 || t == 27) o += SpecialDay("Pradoṣam", SpecialDay.Kind.PRADOSHAM)
        if (t == 18) o += SpecialDay("Saṅkaṭahara Caturthī", SpecialDay.Kind.SANKATAHARA)
        if (n == 2) o += SpecialDay("Kārttikai", SpecialDay.Kind.KARTTIKAI)
        return o
    }
}

enum class Activity(val label: String, val gloss: String) {
    WEDDING("Vivāha", "Wedding"),
    GRIHAPRAVESHA("Gṛhapraveśa", "House-warming"),
    TRAVEL("Yātrā", "Travel"),
    STUDY("Vidyārambha", "Starting study"),
    BUSINESS("Vyāpāra", "Starting a business"),
}

/** One reason for or against a day. [ok] = favourable, otherwise an exclusion. */
data class Reason(val ok: Boolean, val text: String)

data class DayVerdict(val day: DayPanchanga, val score: Int, val excluded: Boolean, val reasons: List<Reason>)

object MuhurtaFinder {
    private val GOOD_NATURES = mapOf(
        Activity.WEDDING to setOf<String>(),
        Activity.GRIHAPRAVESHA to setOf("dhruva", "mrdu"),
        Activity.TRAVEL to setOf("cara", "ksipra", "mrdu"),
        Activity.STUDY to setOf("ksipra", "mrdu", "cara"),
        Activity.BUSINESS to setOf("ksipra", "cara", "dhruva"),
    )

    fun judge(day: DayPanchanga, activity: Activity): DayVerdict {
        val r = mutableListOf<Reason>()
        var ex = false
        var score = 50
        val t = day.tithi[0].idx
        val tNum = t % 15 + 1
        val n = day.nakshatra[0].idx
        val y = day.yoga[0].idx + 1
        val k = day.karana[0].idx + 1
        val nak = Tables.nakshatra[n]
        // tithi
        if (tNum == 4 || tNum == 9 || tNum == 14) { ex = true; r += Reason(false, "${Limbs.tithiLabel(t)} is a Riktā (\"empty\") tithi — avoided for beginnings") }
        else if (t == 29) { ex = true; r += Reason(false, "Amāvāsyā — avoided for beginnings") }
        else { score += if (t < 15) 10 else 4; r += Reason(true, "${Limbs.tithiLabel(t)} (${Tables.tithi[t].family}) at sunrise") }
        // yoga
        if (y == 17 || y == 27) { ex = true; r += Reason(false, "${Limbs.yogaLabel(y - 1)} yoga — avoided for beginnings") }
        else if (Limbs.isShubhaYoga(y)) { score += 6; r += Reason(true, "${Limbs.yogaLabel(y - 1)} yoga is śubha") }
        else { score -= 6; r += Reason(false, "${Limbs.yogaLabel(y - 1)} yoga is aśubha") }
        // karana
        if (Limbs.karanaName(k) == "Viṣṭi") { score -= 12; r += Reason(false, "Viṣṭi (Bhadrā) karaṇa at sunrise — wait until it ends") }
        // nakshatra
        if (activity == Activity.WEDDING) {
            if (n in Tables.weddingNakshatras) { score += 20; r += Reason(true, "${nak.iast} is a favoured wedding star") }
            else { ex = true; r += Reason(false, "${nak.iast} is not among the wedding stars") }
            if (day.tamilMonth in Tables.weddingAvoidMonths) { ex = true; r += Reason(false, "${Tables.rasi[day.tamilMonth].tamilMonth} is commonly avoided for weddings") }
        } else {
            val info = Tables.natures[nak.nature]
            if (nak.nature in GOOD_NATURES.getValue(activity)) { score += 18; r += Reason(true, "${nak.iast} is ${info?.meaning} — suited to ${info?.uses}") }
            else if (nak.nature == "ugra" || nak.nature == "tiksna") { ex = true; r += Reason(false, "${nak.iast} is ${info?.meaning} — avoided for gentle work") }
            else r += Reason(true, "${nak.iast} is ${info?.meaning} (${info?.uses})")
        }
        r += Reason(true, "Avoid Rāhu kālam and Yamagaṇḍam within the day")
        return DayVerdict(day, if (ex) 0 else score.coerceIn(0, 100), ex, r)
    }
}
