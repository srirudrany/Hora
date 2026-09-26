// Index formulas (CLAUDE.md / SPEC §2) — 1-based, half-open intervals, clamped.
// Everything in the UI that names a limb goes through here so the formulas live in one place.
package org.hora.panchanga.core

import kotlin.math.floor

object Limbs {
    const val NAK_SPAN = 40.0 / 3.0
    const val PADA_SPAN = 10.0 / 3.0

    fun elongation(sunLon: Double, moonLon: Double) = Engine.norm(moonLon - sunLon)
    fun tithiIndex(e: Double) = minOf(floor(Engine.norm(e) / 12).toInt() + 1, 30)
    fun nakshatraIndex(moonLon: Double) = minOf(floor(Engine.norm(moonLon) / NAK_SPAN).toInt() + 1, 27)
    fun pada(moonLon: Double) = minOf(floor((Engine.norm(moonLon) % NAK_SPAN) / PADA_SPAN).toInt() + 1, 4)
    fun yogaIndex(sunLon: Double, moonLon: Double) = minOf(floor(Engine.norm(sunLon + moonLon) / NAK_SPAN).toInt() + 1, 27)
    fun karanaIndex(e: Double) = minOf(floor(Engine.norm(e) / 6).toInt() + 1, 60)
    fun rasiIndex(lon: Double) = minOf(floor(Engine.norm(lon) / 30).toInt() + 1, 12)

    /** Karana name by 1-based k: 1 Kiṃstughna, 2..57 movable cycle at (k−2) mod 7, 58–60 fixed. */
    fun karanaName(k: Int): String = when {
        k == 1 -> "Kiṃstughna"
        k >= 58 -> listOf("Śakuni", "Catuṣpāda", "Nāga")[k - 58]
        else -> listOf("Bava", "Bālava", "Kaulava", "Taitila", "Gara", "Vaṇij", "Viṣṭi")[(k - 2) % 7]
    }

    /** Tithi category by ((t − 1) mod 5). */
    fun tithiCategory(t: Int) = listOf("Nanda", "Bhadra", "Jaya", "Rikta", "Purna")[(t - 1) % 5]
    fun paksha(t: Int) = if (t <= 15) "Śukla" else "Kṛṣṇa"
    fun isShubhaYoga(y: Int) = y !in Tables.ashubhaYogas

    /** "Śukla Pūrṇimā" for a 0-based tithi index. */
    fun tithiLabel(idx0: Int): String { val t = Tables.tithi[idx0]; return "${t.paksha} ${t.iast}" }
    fun nakshatraLabel(idx0: Int) = Tables.nakshatra[idx0].iast
    fun yogaLabel(idx0: Int) = Tables.yoga[idx0].iast
    fun karanaLabel(idx0: Int) = karanaName(idx0 + 1)

    /** Illuminated fraction of the Moon's disc for elongation e (degrees). */
    fun illumination(e: Double) = (1 - kotlin.math.cos(Math.toRadians(e))) / 2
}

/** Nāḻigai arithmetic: 1 day (sunrise→sunrise, nominal 24 h) = 60 nāḻigai; 1 nāḻigai = 24 min = 60 vināḻigai. */
object Nazhigai {
    /** Whole vināḻigai elapsed from sunrise to [jd]. */
    fun vinazhigai(jd: Double, sunrise: Double) = floor((jd - sunrise) * 86400 / 24).toInt()
    fun format(jd: Double, sunrise: Double): String {
        val v = Math.round((jd - sunrise) * 86400 / 24).toInt()
        return "%02d:%02d".format(v / 60, v % 60)
    }
}

