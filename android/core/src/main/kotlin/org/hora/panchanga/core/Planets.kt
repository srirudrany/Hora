// The five visible grahas and the lunar nodes (SPEC §7).
// Planets: JPL "Keplerian Elements for Approximate Positions of the Major Planets" (E. M. Standish),
// Table 1, valid 1800–2050 (errors of order an arcminute) — heliocentric J2000 ecliptic positions,
// differenced with the Earth–Moon barycentre, then precessed to the ecliptic of date and made sidereal
// with the same Lahiri ayanamsa as the Sun and Moon. Checked against JPL Horizons in PlanetsTest.
// Nodes: Meeus mean ascending node (Rāhu); Ketu is opposite.
package org.hora.panchanga.core

import kotlin.math.*

data class GrahaPos(val key: String, val sidLon: Double, val lat: Double, val distAu: Double, val retrograde: Boolean)

object Planets {
    private class El(val a: DoubleArray, val e: DoubleArray, val i: DoubleArray, val l: DoubleArray, val w: DoubleArray, val o: DoubleArray)
    // [value at J2000, rate per Julian century]
    private val EL = mapOf(
        "mercury" to El(doubleArrayOf(0.38709927, 0.00000037), doubleArrayOf(0.20563593, 0.00001906), doubleArrayOf(7.00497902, -0.00594749),
            doubleArrayOf(252.25032350, 149472.67411175), doubleArrayOf(77.45779628, 0.16047689), doubleArrayOf(48.33076593, -0.12534081)),
        "venus" to El(doubleArrayOf(0.72333566, 0.00000390), doubleArrayOf(0.00677672, -0.00004107), doubleArrayOf(3.39467605, -0.00078890),
            doubleArrayOf(181.97909950, 58517.81538729), doubleArrayOf(131.60246718, 0.00268329), doubleArrayOf(76.67984255, -0.27769418)),
        "earth" to El(doubleArrayOf(1.00000261, 0.00000562), doubleArrayOf(0.01671123, -0.00004392), doubleArrayOf(-0.00001531, -0.01294668),
            doubleArrayOf(100.46457166, 35999.37244981), doubleArrayOf(102.93768193, 0.32327364), doubleArrayOf(0.0, 0.0)),
        "mars" to El(doubleArrayOf(1.52371034, 0.00001847), doubleArrayOf(0.09339410, 0.00007882), doubleArrayOf(1.84969142, -0.00813131),
            doubleArrayOf(-4.55343205, 19140.30268499), doubleArrayOf(-23.94362959, 0.44441088), doubleArrayOf(49.55953891, -0.29257343)),
        "jupiter" to El(doubleArrayOf(5.20288700, -0.00011607), doubleArrayOf(0.04838624, -0.00013253), doubleArrayOf(1.30439695, -0.00183714),
            doubleArrayOf(34.39644051, 3034.74612775), doubleArrayOf(14.72847983, 0.21252668), doubleArrayOf(100.47390909, 0.20469106)),
        "saturn" to El(doubleArrayOf(9.53667594, -0.00125060), doubleArrayOf(0.05386179, -0.00050991), doubleArrayOf(2.48599187, 0.00193609),
            doubleArrayOf(49.95424423, 1222.49362201), doubleArrayOf(92.59887831, -0.41897216), doubleArrayOf(113.66242448, -0.28867794)),
    )
    val KEYS = listOf("mercury", "venus", "mars", "jupiter", "saturn")

    private fun rad(d: Double) = Math.toRadians(d)

    /** Heliocentric J2000 ecliptic rectangular coordinates (AU). */
    private fun helio(key: String, t: Double): DoubleArray {
        val el = EL.getValue(key)
        fun v(x: DoubleArray) = x[0] + x[1] * t
        val a = v(el.a); val e = v(el.e); val inc = v(el.i); val l = v(el.l); val wBar = v(el.w); val om = v(el.o)
        val w = wBar - om
        var m = Engine.norm(l - wBar); if (m > 180) m -= 360
        var ecc = m + Math.toDegrees(e) * sin(rad(m)) // Kepler's equation, degrees
        repeat(8) { val dM = m - (ecc - Math.toDegrees(e) * sin(rad(ecc))); ecc += dM / (1 - e * cos(rad(ecc))) }
        val xp = a * (cos(rad(ecc)) - e); val yp = a * sqrt(1 - e * e) * sin(rad(ecc))
        val cw = cos(rad(w)); val sw = sin(rad(w)); val co = cos(rad(om)); val so = sin(rad(om)); val ci = cos(rad(inc)); val si = sin(rad(inc))
        return doubleArrayOf(
            (cw * co - sw * so * ci) * xp + (-sw * co - cw * so * ci) * yp,
            (cw * so + sw * co * ci) * xp + (-sw * so + cw * co * ci) * yp,
            (sw * si) * xp + (cw * si) * yp,
        )
    }

    /** Geocentric tropical ecliptic longitude of date, latitude (deg) and distance (AU). */
    fun geocentric(key: String, jdUT: Double): Triple<Double, Double, Double> {
        val t = (jdUT + Engine.deltaT(jdUT) - 2451545) / 36525
        // light-time: evaluate the planet at t − τ
        var p = helio(key, t); val earth = helio("earth", t)
        var dx = p[0] - earth[0]; var dy = p[1] - earth[1]; var dz = p[2] - earth[2]
        val tau = sqrt(dx * dx + dy * dy + dz * dz) * 0.0057755183 / 36525
        p = helio(key, t - tau); dx = p[0] - earth[0]; dy = p[1] - earth[1]; dz = p[2] - earth[2]
        val r = sqrt(dx * dx + dy * dy + dz * dz)
        val lonJ2000 = Math.toDegrees(atan2(dy, dx))
        val lat = Math.toDegrees(asin(dz / r))
        val precession = (5029.0966 * t + 1.11113 * t * t) / 3600 // J2000 ecliptic → ecliptic of date
        return Triple(Engine.norm(lonJ2000 + precession), lat, r)
    }

    fun position(key: String, jdUT: Double): GrahaPos {
        val (lon, lat, r) = geocentric(key, jdUT)
        val ayan = Engine.ayanamsa(jdUT)
        val next = geocentric(key, jdUT + 0.5).first
        var d = next - lon; if (d > 180) d -= 360; if (d < -180) d += 360
        return GrahaPos(key, Engine.norm(lon - ayan), lat, r, d < 0)
    }

    /** Mean ascending node of the Moon, tropical of date (Meeus 47.7). */
    fun meanNode(jdUT: Double): Double {
        val t = (jdUT + Engine.deltaT(jdUT) - 2451545) / 36525
        return Engine.norm(125.0445479 - 1934.1362891 * t + 0.0020754 * t * t + t * t * t / 467441)
    }

    /** All grahas beyond Sun and Moon, sidereal: five planets + Rāhu + Ketu (nodes always retrograde in mean motion). */
    fun all(jdUT: Double): List<GrahaPos> {
        val rahu = Engine.norm(meanNode(jdUT) - Engine.ayanamsa(jdUT))
        return KEYS.map { position(it, jdUT) } + listOf(
            GrahaPos("rahu", rahu, 0.0, 0.0, true), GrahaPos("ketu", Engine.norm(rahu + 180), 0.0, 0.0, true),
        )
    }
}
