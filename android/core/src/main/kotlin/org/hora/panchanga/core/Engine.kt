// Kotlin port of Hora engine/panchanga.js (Sun: Meeus ch.25, Moon: Meeus ch.47 main series,
// Lahiri ayanamsa, sunrise/sunset with h0 = -0.833°, the five angas with end times by bisection,
// Tamil solar month/date and samvatsara). Changes from the JS reference, per SPEC §3:
//  - ΔT from the Espenak–Meeus polynomials instead of a fixed 69.5 s
//  - civil dates are resolved in an IANA time zone (DST-aware) via [Place.zoneId]
// Must reproduce data/test-vectors.json within 1 minute (see core/src/test).
package org.hora.panchanga.core

import java.time.LocalDate
import java.time.ZoneId
import kotlin.math.*

data class Place(val name: String, val lat: Double, val lon: Double, val zoneId: String)

/** A limb value in force from the previous boundary until [end] (JD, UT). [idx] is 0-based. */
data class Span(val idx: Int, val end: Double)

data class DayPanchanga(
    val date: LocalDate,
    val tzHours: Double,
    val sunrise: Double,
    val sunset: Double,
    val nextSunrise: Double,
    /** 0 = Sunday */
    val weekday: Int,
    val tithi: List<Span>,
    val nakshatra: List<Span>,
    val yoga: List<Span>,
    val karana: List<Span>,
    /** 0 = Chithirai (Sun in Meṣa) */
    val tamilMonth: Int,
    val tamilDay: Int,
    val samvat: Int,
    val rahu: Pair<Double, Double>,
    val yama: Pair<Double, Double>,
    val gulika: Pair<Double, Double>,
    val abhijit: Pair<Double, Double>,
    val sunSid: Double,
    val moonSid: Double,
    val ayanamsa: Double,
)

enum class Anga(val n: Int, val span: Double) {
    TITHI(30, 12.0), KARANA(60, 6.0), NAKSHATRA(27, 360.0 / 27), YOGA(27, 360.0 / 27), RASI(12, 30.0), SOLAR(12, 30.0)
}

object Engine {
    private const val D2R = PI / 180
    private const val R2D = 180 / PI
    fun norm(x: Double): Double = ((x % 360) + 360) % 360
    private fun sind(d: Double) = sin(d * D2R)
    private fun cosd(d: Double) = cos(d * D2R)

    fun jdFromEpochMillis(ms: Long): Double = ms / 86_400_000.0 + 2440587.5
    fun epochMillisFromJd(jd: Double): Long = Math.round((jd - 2440587.5) * 86_400_000.0)

    /** ΔT = TT − UT in days, Espenak & Meeus (NASA Five Millennium Canon) polynomials. */
    fun deltaT(jdUT: Double): Double {
        val y = 2000.0 + (jdUT - 2451544.5) / 365.2425
        val s = when {
            y < -500 -> { val u = (y - 1820) / 100; -20 + 32 * u * u }
            y < 500 -> { val u = y / 100; 10583.6 - 1014.41 * u + 33.78311 * u.pow(2) - 5.952053 * u.pow(3) - 0.1798452 * u.pow(4) + 0.022174192 * u.pow(5) + 0.0090316521 * u.pow(6) }
            y < 1600 -> { val u = (y - 1000) / 100; 1574.2 - 556.01 * u + 71.23472 * u.pow(2) + 0.319781 * u.pow(3) - 0.8503463 * u.pow(4) - 0.005050998 * u.pow(5) + 0.0083572073 * u.pow(6) }
            y < 1700 -> { val t = y - 1600; 120 - 0.9808 * t - 0.01532 * t * t + t.pow(3) / 7129 }
            y < 1800 -> { val t = y - 1700; 8.83 + 0.1603 * t - 0.0059285 * t * t + 0.00013336 * t.pow(3) - t.pow(4) / 1174000 }
            y < 1860 -> { val t = y - 1800; 13.72 - 0.332447 * t + 0.0068612 * t * t + 0.0041116 * t.pow(3) - 0.00037436 * t.pow(4) + 0.0000121272 * t.pow(5) - 0.0000001699 * t.pow(6) + 0.000000000875 * t.pow(7) }
            y < 1900 -> { val t = y - 1860; 7.62 + 0.5737 * t - 0.251754 * t * t + 0.01680668 * t.pow(3) - 0.0004473624 * t.pow(4) + t.pow(5) / 233174 }
            y < 1920 -> { val t = y - 1900; -2.79 + 1.494119 * t - 0.0598939 * t * t + 0.0061966 * t.pow(3) - 0.000197 * t.pow(4) }
            y < 1941 -> { val t = y - 1920; 21.20 + 0.84493 * t - 0.076100 * t * t + 0.0020936 * t.pow(3) }
            y < 1961 -> { val t = y - 1950; 29.07 + 0.407 * t - t * t / 233 + t.pow(3) / 2547 }
            y < 1986 -> { val t = y - 1975; 45.45 + 1.067 * t - t * t / 260 - t.pow(3) / 718 }
            y < 2005 -> { val t = y - 2000; 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * t.pow(3) + 0.000651814 * t.pow(4) + 0.00002373599 * t.pow(5) }
            y < 2050 -> { val t = y - 2000; 62.92 + 0.32217 * t + 0.005589 * t * t }
            y < 2150 -> { val u = (y - 1820) / 100; -20 + 32 * u * u - 0.5628 * (2150 - y) }
            else -> { val u = (y - 1820) / 100; -20 + 32 * u * u }
        }
        return s / 86400.0
    }

    private fun centuriesTT(jdUT: Double) = (jdUT + deltaT(jdUT) - 2451545) / 36525

    /** Apparent tropical longitude of the Sun, degrees. */
    fun sunLon(jdUT: Double): Double {
        val t = centuriesTT(jdUT)
        val l0 = 280.46646 + 36000.76983 * t + 0.0003032 * t * t
        val m = 357.52911 + 35999.05029 * t - 0.0001537 * t * t
        val c = (1.914602 - 0.004817 * t - 0.000014 * t * t) * sind(m) +
            (0.019993 - 0.000101 * t) * sind(2 * m) + 0.000289 * sind(3 * m)
        val om = 125.04 - 1934.136 * t
        return norm(l0 + c - 0.00569 - 0.00478 * sind(om))
    }

    // Meeus table 47.A longitude terms: D, M, M', F, coeff (1e-6 deg)
    private val MT = arrayOf(
        intArrayOf(0, 0, 1, 0, 6288774), intArrayOf(2, 0, -1, 0, 1274027), intArrayOf(2, 0, 0, 0, 658314), intArrayOf(0, 0, 2, 0, 213618), intArrayOf(0, 1, 0, 0, -185116),
        intArrayOf(0, 0, 0, 2, -114332), intArrayOf(2, 0, -2, 0, 58793), intArrayOf(2, -1, -1, 0, 57066), intArrayOf(2, 0, 1, 0, 53322), intArrayOf(2, -1, 0, 0, 45758),
        intArrayOf(0, 1, -1, 0, -40923), intArrayOf(1, 0, 0, 0, -34720), intArrayOf(0, 1, 1, 0, -30383), intArrayOf(2, 0, 0, -2, 15327), intArrayOf(0, 0, 1, 2, -12528),
        intArrayOf(0, 0, 1, -2, 10980), intArrayOf(4, 0, -1, 0, 10675), intArrayOf(0, 0, 3, 0, 10034), intArrayOf(4, 0, -2, 0, 8548), intArrayOf(2, 1, -1, 0, -7888),
        intArrayOf(2, 1, 0, 0, -6766), intArrayOf(1, 0, -1, 0, -5163), intArrayOf(1, 1, 0, 0, 4987), intArrayOf(2, -1, 1, 0, 4036), intArrayOf(2, 0, 2, 0, 3994),
        intArrayOf(4, 0, 0, 0, 3861), intArrayOf(2, 0, -3, 0, 3665), intArrayOf(0, 1, -2, 0, -2689), intArrayOf(2, 0, -1, 2, -2602), intArrayOf(2, -1, -2, 0, 2390),
        intArrayOf(1, 0, 1, 0, -2348), intArrayOf(2, -2, 0, 0, 2236), intArrayOf(0, 1, 2, 0, -2120), intArrayOf(0, 2, 0, 0, -2069), intArrayOf(2, -2, -1, 0, 2048),
        intArrayOf(2, 0, 1, -2, -1773), intArrayOf(2, 0, 0, 2, -1595), intArrayOf(4, -1, -1, 0, 1215), intArrayOf(0, 0, 2, 2, -1110), intArrayOf(3, 0, -1, 0, -892),
        intArrayOf(2, 1, 1, 0, -810), intArrayOf(4, -1, -2, 0, 759), intArrayOf(0, 2, -1, 0, -713), intArrayOf(2, 2, -1, 0, -700), intArrayOf(2, 1, -2, 0, 691),
        intArrayOf(2, -1, 0, -2, 596), intArrayOf(4, 0, 1, 0, 549), intArrayOf(0, 0, 4, 0, 537), intArrayOf(4, -1, 0, 0, 520), intArrayOf(1, 0, -2, 0, -487),
        intArrayOf(2, 1, 0, -2, -399), intArrayOf(0, 0, 2, -2, -381), intArrayOf(1, 1, 1, 0, 351), intArrayOf(3, 0, -2, 0, -340), intArrayOf(4, 0, -3, 0, 330),
        intArrayOf(2, -1, 2, 0, 327), intArrayOf(0, 2, 1, 0, -323), intArrayOf(1, 1, -1, 0, 299), intArrayOf(2, 0, 3, 0, 294),
    )

    private class MoonArgs(t: Double) {
        val t2 = t * t; val t3 = t2 * t; val t4 = t3 * t
        val lp = 218.3164477 + 481267.88123421 * t - 0.0015786 * t2 + t3 / 538841 - t4 / 65194000
        val d = 297.8501921 + 445267.1114034 * t - 0.0018819 * t2 + t3 / 545868 - t4 / 113065000
        val m = 357.5291092 + 35999.0502909 * t - 0.0001536 * t2 + t3 / 24490000
        val mp = 134.9633964 + 477198.8675055 * t + 0.0087414 * t2 + t3 / 69699 - t4 / 14712000
        val f = 93.2720950 + 483202.0175233 * t - 0.0036539 * t2 - t3 / 3526000 + t4 / 863310000
        val e = 1 - 0.002516 * t - 0.0000074 * t2
    }

    /** Apparent tropical longitude of the Moon (mean equinox + nutation), degrees. */
    fun moonLon(jdUT: Double): Double {
        val t = centuriesTT(jdUT)
        val a = MoonArgs(t)
        val a1 = 119.75 + 131.849 * t
        val a2 = 53.09 + 479264.290 * t
        var sl = 0.0
        for (r in MT) {
            var k = r[4].toDouble()
            val am = abs(r[1])
            if (am == 1) k *= a.e else if (am == 2) k *= a.e * a.e
            sl += k * sind(r[0] * a.d + r[1] * a.m + r[2] * a.mp + r[3] * a.f)
        }
        sl += 3958 * sind(a1) + 1962 * sind(a.lp - a.f) + 318 * sind(a2)
        val om = 125.04452 - 1934.136261 * t
        val dpsi = (-17.2 * sind(om) - 1.32 * sind(2 * (280.4665 + 36000.7698 * t)) - 0.23 * sind(2 * a.lp)) / 3600
        return norm(a.lp + sl / 1e6 + dpsi)
    }

    /** Ecliptic latitude of the Moon (largest Meeus 47.B terms), degrees. Used for the horizon view only. */
    fun moonLat(jdUT: Double): Double {
        val a = MoonArgs(centuriesTT(jdUT))
        val sb = 5128122 * sind(a.f) + 280602 * sind(a.mp + a.f) + 277693 * sind(a.mp - a.f) +
            173237 * sind(2 * a.d - a.f) + 55413 * sind(2 * a.d - a.mp + a.f) + 46271 * sind(2 * a.d - a.mp - a.f) +
            32573 * sind(2 * a.d + a.f) + 17198 * sind(2 * a.mp + a.f)
        return sb / 1e6
    }

    /** Lahiri (Chitrapaksha) ayanamsa including nutation, so it matches apparent longitudes. */
    fun ayanamsa(jdUT: Double): Double {
        val t = centuriesTT(jdUT)
        val om = 125.04452 - 1934.136261 * t
        val dpsi = (-17.2 * sind(om) - 1.32 * sind(2 * (280.4665 + 36000.7698 * t))) / 3600
        return 23.85709 + (5029.0966 * t + 1.11113 * t * t) / 3600 + dpsi
    }

    fun sidSun(jd: Double) = norm(sunLon(jd) - ayanamsa(jd))
    fun sidMoon(jd: Double) = norm(moonLon(jd) - ayanamsa(jd))
    /** Elongation E = λ☾ − λ☉ (ayanamsa cancels). */
    fun elong(jd: Double) = norm(moonLon(jd) - sunLon(jd))

    fun obliquity(jd: Double) = 23.439291 - 0.0130042 * centuriesTT(jd)
    fun gmst(jd: Double): Double { val t = (jd - 2451545) / 36525; return norm(280.46061837 + 360.98564736629 * (jd - 2451545) + 0.000387933 * t * t) }

    private fun sunEvent(jdGuess: Double, lat: Double, lon: Double, rise: Boolean): Double {
        var jd = jdGuess
        repeat(6) {
            val lam = sunLon(jd); val eps = obliquity(jd)
            val ra = norm(atan2(cosd(eps) * sind(lam), cosd(lam)) * R2D)
            val dec = asin(sind(eps) * sind(lam)) * R2D
            val cosH = (sind(-0.833) - sind(lat) * sind(dec)) / (cosd(lat) * cosd(dec))
            val h = acos(cosH.coerceIn(-1.0, 1.0)) * R2D
            val target = if (rise) norm(ra - h) else norm(ra + h)
            val lst = norm(gmst(jd) + lon)
            var dh = target - lst
            if (dh > 180) dh -= 360
            if (dh < -180) dh += 360
            jd += dh / 360.98564736629
        }
        return jd
    }

    private fun localMidnightJd(date: LocalDate, tz: Double) = date.toEpochDay() + 2440587.5 - tz / 24

    /** UTC offset in hours of [zoneId] at local noon on [date] (DST-aware). */
    fun tzHours(zoneId: String, date: LocalDate): Double =
        ZoneId.of(zoneId).rules.getOffset(date.atTime(12, 0)).totalSeconds / 3600.0

    fun sunriseOn(date: LocalDate, place: Place) = sunEvent(localMidnightJd(date, tzHours(place.zoneId, date)) + 0.25, place.lat, place.lon, true)
    fun sunsetOn(date: LocalDate, place: Place) = sunEvent(localMidnightJd(date, tzHours(place.zoneId, date)) + 0.75, place.lat, place.lon, false)

    private fun angaValue(kind: Anga, jd: Double): Double = when (kind) {
        Anga.TITHI, Anga.KARANA -> elong(jd)
        Anga.NAKSHATRA, Anga.RASI -> sidMoon(jd)
        Anga.YOGA -> norm(sidMoon(jd) + sidSun(jd))
        Anga.SOLAR -> sidSun(jd)
    }

    fun angaAt(kind: Anga, jd: Double): Int = floor(angaValue(kind, jd) / kind.span).toInt() % kind.n

    /** Time when the anga index changes from its value at [jd] (forward search). */
    fun angaEnd(kind: Anga, jd: Double): Double {
        val boundary = norm((angaAt(kind, jd) + 1) * kind.span)
        val g = { t: Double -> val d = norm(angaValue(kind, t) - boundary); if (d > 180) d - 360 else d }
        var lo = jd; var hi = jd + 0.25
        while (g(hi) < 0) { lo = hi; hi += 0.25; if (hi - jd > 40) break }
        repeat(40) { val mid = (lo + hi) / 2; if (g(mid) < 0) lo = mid else hi = mid }
        return hi
    }

    fun angaStart(kind: Anga, jd: Double): Double {
        val boundary = norm(angaAt(kind, jd) * kind.span)
        val g = { t: Double -> val d = norm(angaValue(kind, t) - boundary); if (d > 180) d - 360 else d }
        var hi = jd; var lo = jd - 0.25
        while (g(lo) >= 0) { hi = lo; lo -= 0.25; if (jd - lo > 40) break }
        repeat(40) { val mid = (lo + hi) / 2; if (g(mid) < 0) lo = mid else hi = mid }
        return hi
    }

    /** Local civil date of a JD in [place]'s zone. */
    fun civilDate(jd: Double, place: Place): LocalDate =
        java.time.Instant.ofEpochMilli(epochMillisFromJd(jd)).atZone(ZoneId.of(place.zoneId)).toLocalDate()

    /** Full panchanga for a civil date at a place. All times are JD (UT). */
    fun panchanga(date: LocalDate, place: Place): DayPanchanga {
        val tz = tzHours(place.zoneId, date)
        val sr = sunriseOn(date, place)
        val ss = sunsetOn(date, place)
        val srNext = sunriseOn(date.plusDays(1), place)
        val weekday = date.dayOfWeek.value % 7
        fun spans(kind: Anga): List<Span> {
            val list = mutableListOf<Span>()
            var t = sr
            while (t < srNext && list.size < 4) {
                val idx = angaAt(kind, t + 1e-6)
                val end = angaEnd(kind, t + 1e-6)
                list += Span(idx, end); t = end
            }
            return list
        }
        // Tamil solar month: sankranti before sunset => that day is day 1, else the next day
        val mIdx = angaAt(Anga.SOLAR, ss)
        val start = angaStart(Anga.SOLAR, ss)
        val sd = civilDate(start, place)
        var day1 = sd
        if (start > sunsetOn(sd, place)) day1 = sd.plusDays(1)
        val tamilDay = (date.toEpochDay() - day1.toEpochDay()).toInt() + 1
        val m = date.monthValue
        val ty = if (m <= 4 && mIdx >= 8) date.year - 1 else date.year
        val samvat = (((ty - 1987) % 60) + 60) % 60
        val part = (ss - sr) / 8
        fun seg(n: Int) = Pair(sr + (n - 1) * part, sr + n * part)
        return DayPanchanga(
            date = date, tzHours = tz, sunrise = sr, sunset = ss, nextSunrise = srNext, weekday = weekday,
            tithi = spans(Anga.TITHI), nakshatra = spans(Anga.NAKSHATRA), yoga = spans(Anga.YOGA), karana = spans(Anga.KARANA),
            tamilMonth = mIdx, tamilDay = tamilDay, samvat = samvat,
            rahu = seg(Tables.rahuKalam[weekday]), yama = seg(Tables.yamagandam[weekday]), gulika = seg(Tables.kulikai[weekday]),
            abhijit = Pair(sr + 7 * (ss - sr) / 15, sr + 8 * (ss - sr) / 15),
            sunSid = sidSun(sr), moonSid = sidMoon(sr), ayanamsa = ayanamsa(sr),
        )
    }

    /** The panchanga day (sunrise to next sunrise) containing [jd]. */
    fun dayContaining(jd: Double, place: Place): DayPanchanga {
        val d = civilDate(jd, place)
        val p = panchanga(d, place)
        return if (jd < p.sunrise) panchanga(d.minusDays(1), place) else p
    }

    /** Sidereal ecliptic (λ, β) → horizontal (alt, az) for an observer. az: 0 = N, 90 = E. */
    fun altAz(lamSid: Double, beta: Double, jd: Double, lat: Double, lon: Double): Pair<Double, Double> {
        val lam = lamSid + ayanamsa(jd)
        val eps = obliquity(jd)
        val ra = atan2(sind(lam) * cosd(eps) - tan(beta * D2R) * sind(eps), cosd(lam))
        val dec = asin(sind(beta) * cosd(eps) + cosd(beta) * sind(eps) * sind(lam))
        val h = (gmst(jd) + lon) * D2R - ra
        val phi = lat * D2R
        val alt = asin(sin(phi) * sin(dec) + cos(phi) * cos(dec) * cos(h))
        val az = atan2(-sin(h) * cos(dec), cos(phi) * sin(dec) - sin(phi) * cos(dec) * cos(h))
        return Pair(alt * R2D, norm(az * R2D))
    }
}
