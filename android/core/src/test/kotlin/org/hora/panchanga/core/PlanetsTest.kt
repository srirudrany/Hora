package org.hora.panchanga.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/** Geocentric apparent ecliptic-of-date longitudes from JPL Horizons (QUANTITIES=31), 00:00 UT. */
class PlanetsTest {
    private val horizons = mapOf(
        2461309.5 to mapOf("mercury" to 203.8110085, "venus" to 217.5037571, "mars" to 118.7499863, "jupiter" to 138.6791011, "saturn" to 11.9674089),
        2447892.5 to mapOf("mars" to 249.6482639, "jupiter" to 95.2160871),
    )

    @Test fun matchesHorizons() {
        for ((jd, planets) in horizons) for ((key, lon) in planets) {
            val got = Planets.geocentric(key, jd).first
            var d = got - lon; if (d > 180) d -= 360; if (d < -180) d += 360
            assertTrue("$key @ $jd: $got vs Horizons $lon (Δ ${"%.3f".format(d)}°)", kotlin.math.abs(d) < 0.1)
        }
    }

    @Test fun nodesOpposite() {
        val all = Planets.all(2461309.5)
        val r = all.first { it.key == "rahu" }.sidLon; val k = all.first { it.key == "ketu" }.sidLon
        assertEquals(180.0, Engine.norm(k - r), 1e-9)
        assertEquals(7, all.size)
        assertEquals(10, Tables.grahas.size); assertEquals(7, Tables.rings.size)
    }
}
