package org.hora.panchanga.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/** docs/test-vectors.md §2 — index-formula unit vectors (1-based). */
class FormulaTest {
    @Test fun tithi() {
        assertEquals(8, Limbs.tithiIndex(90.5))
        assertEquals(15, Limbs.tithiIndex(179.999)); assertEquals("Pūrṇimā", Tables.tithi[14].iast)
        assertEquals(16, Limbs.tithiIndex(180.0)); assertEquals("Kṛṣṇa Pratipadā", Limbs.tithiLabel(15))
        assertEquals(30, Limbs.tithiIndex(359.999)); assertEquals("Amāvāsyā", Tables.tithi[29].iast)
        assertEquals(1, Limbs.tithiIndex(0.0))
    }

    @Test fun karana() {
        assertEquals(16, Limbs.karanaIndex(90.5)); assertEquals("Bava", Limbs.karanaName(16))
        assertEquals(46, Limbs.karanaIndex(271.0)); assertEquals("Kaulava", Limbs.karanaName(46))
        assertEquals(8, Limbs.karanaIndex(42.0)); assertEquals("Viṣṭi", Limbs.karanaName(8))
        assertEquals(1, Limbs.karanaIndex(0.5)); assertEquals("Kiṃstughna", Limbs.karanaName(1))
        assertEquals(58, Limbs.karanaIndex(342.0)); assertEquals("Śakuni", Limbs.karanaName(58))
        assertEquals(30, Limbs.karanaIndex(179.999)); assertEquals("Bava", Limbs.karanaName(30))
        assertEquals(46, Limbs.karanaIndex(270.0))
        for (k in 1..60) assertEquals("slot $k", Limbs.karanaName(k), Tables.karanaOfSlot(k - 1).iast)
    }

    @Test fun nakshatra() {
        assertEquals(1, Limbs.nakshatraIndex(0.0)); assertEquals(1, Limbs.pada(0.0))
        assertEquals(1, Limbs.nakshatraIndex(13.2)); assertEquals(4, Limbs.pada(13.2))
        assertEquals(2, Limbs.nakshatraIndex(13.34)); assertEquals(1, Limbs.pada(13.34))
        assertEquals(18, Limbs.nakshatraIndex(228.4144)); assertEquals("Jyeṣṭhā", Tables.nakshatra[17].iast)
    }

    /** V-YOGA-01: the guide's §5.2 erratum — 110° + 45° = 155° is Dhruva (12), not Ganda. */
    @Test fun yoga() {
        assertEquals(12, Limbs.yogaIndex(110.0, 45.0)); assertEquals("Dhruva", Tables.yoga[11].iast)
        assertTrue(Limbs.isShubhaYoga(12))
        assertEquals(10, Limbs.yogaIndex(130.0, 0.0)); assertEquals("Gaṇḍa", Tables.yoga[9].iast)
        assertEquals(11, Limbs.yogaIndex(133.34, 0.0))
        assertEquals(12, Limbs.yogaIndex(146.67, 0.0))
        assertEquals(setOf(1, 6, 9, 10, 13, 15, 17, 19, 27), (1..27).filterNot { Limbs.isShubhaYoga(it) }.toSet())
    }

    @Test fun categories() {
        assertEquals(listOf("Nanda", "Bhadra", "Jaya", "Rikta", "Purna"), (1..5).map { Limbs.tithiCategory(it) })
        assertEquals("Purna", Limbs.tithiCategory(30)); assertEquals("Rikta", Limbs.tithiCategory(29))
    }

    /** Preset parity: Amāvāsyā / First Quarter / Pūrṇimā / Third Quarter. */
    @Test fun presets() {
        assertEquals(listOf(30, 8, 15, 23), listOf(359.999, 90.0, 179.999, 270.0).map { Limbs.tithiIndex(it) })
        assertEquals(listOf(60, 16, 30, 46), listOf(359.999, 90.0, 179.999, 270.0).map { Limbs.karanaIndex(it) })
    }
}

