package org.hora.panchanga

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableDoubleStateOf
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import org.hora.panchanga.core.Anga
import org.hora.panchanga.core.DayPanchanga
import org.hora.panchanga.core.Engine
import org.hora.panchanga.core.Place
import org.hora.panchanga.core.Tables
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

enum class Script(val label: String) { IAST("IAST"), DEVANAGARI("देवनागरी"), TAMIL("தமிழ்") }

object Places {
    val cities = listOf(
        Place("Chennai", 13.0827, 80.2707, "Asia/Kolkata"),
        Place("Madurai", 9.9252, 78.1198, "Asia/Kolkata"),
        Place("Coimbatore", 11.0168, 76.9558, "Asia/Kolkata"),
        Place("Tiruchirappalli", 10.7905, 78.7047, "Asia/Kolkata"),
        Place("Bengaluru", 12.9716, 77.5946, "Asia/Kolkata"),
        Place("Hyderabad", 17.3850, 78.4867, "Asia/Kolkata"),
        Place("Mumbai", 19.0760, 72.8777, "Asia/Kolkata"),
        Place("Delhi", 28.6139, 77.2090, "Asia/Kolkata"),
        Place("Kolkata", 22.5726, 88.3639, "Asia/Kolkata"),
        Place("Varanasi", 25.3176, 82.9739, "Asia/Kolkata"),
        Place("Colombo", 6.9271, 79.8612, "Asia/Colombo"),
        Place("Jaffna", 9.6615, 80.0255, "Asia/Colombo"),
        Place("Kathmandu", 27.7172, 85.3240, "Asia/Kathmandu"),
        Place("Singapore", 1.3521, 103.8198, "Asia/Singapore"),
        Place("Kuala Lumpur", 3.1390, 101.6869, "Asia/Kuala_Lumpur"),
        Place("Dubai", 25.2048, 55.2708, "Asia/Dubai"),
        Place("London", 51.5074, -0.1278, "Europe/London"),
        Place("Toronto", 43.6532, -79.3832, "America/Toronto"),
        Place("New York", 40.7128, -74.0060, "America/New_York"),
        Place("San Francisco", 37.7749, -122.4194, "America/Los_Angeles"),
        Place("Sydney", -33.8688, 151.2093, "Australia/Sydney"),
    )
}

/** Live time, scrub offset, place and preferences. All panchanga values derive from [jd]. */
class AppState(private val ctx: Context) {
    private val prefs = ctx.getSharedPreferences("panchanga", Context.MODE_PRIVATE)

    var place by mutableStateOf(loadPlace())
        private set
    var use24h by mutableStateOf(prefs.getBoolean("use24h", false))
        private set
    var script by mutableStateOf(Script.valueOf(prefs.getString("script", Script.IAST.name)!!))
        private set

    /** Wall-clock "now" in ms, ticked by the UI. */
    var nowMs by mutableStateOf(System.currentTimeMillis())
    /** Scrub offset from now, hours. 0 = live. */
    var offsetH by mutableDoubleStateOf(0.0)
    var playing by mutableStateOf(false)
    /** Playback speed in hours per second */
    var speed by mutableFloatStateOf(6f)

    val live get() = offsetH == 0.0 && !playing
    val jd get() = Engine.jdFromEpochMillis(nowMs) + offsetH / 24.0
    /** Like [jd] but read from the wall clock right now — for per-frame smooth motion. */
    fun jdNow() = Engine.jdFromEpochMillis(System.currentTimeMillis()) + offsetH / 24.0

    private var dayCache: DayPanchanga? = null
    private var dayPlace: Place? = null
    fun day(at: Double = jd): DayPanchanga {
        val c = dayCache
        if (c != null && dayPlace == place && at >= c.sunrise && at < c.nextSunrise) return c
        return Engine.dayContaining(at, place).also { dayCache = it; dayPlace = place }
    }

    data class AngaNow(val idx: Int, val start: Double, val end: Double)
    private val angaCache = HashMap<Anga, AngaNow>()
    fun anga(kind: Anga, at: Double = jd): AngaNow {
        val q = angaCache[kind]
        if (q != null && at >= q.start && at < q.end) return q
        return AngaNow(Engine.angaAt(kind, at), Engine.angaStart(kind, at), Engine.angaEnd(kind, at)).also { angaCache[kind] = it }
    }

    fun choosePlace(p: Place) {
        place = p
        prefs.edit().putString("place", listOf(p.name, p.lat, p.lon, p.zoneId).joinToString("|")).apply()
    }
    fun chooseUse24h(v: Boolean) { use24h = v; prefs.edit().putBoolean("use24h", v).apply() }
    fun chooseScript(s: Script) { script = s; prefs.edit().putString("script", s.name).apply() }

    private fun loadPlace(): Place {
        val s = prefs.getString("place", null) ?: return Places.cities[0]
        val p = s.split("|")
        return runCatching { Place(p[0], p[1].toDouble(), p[2].toDouble(), p[3]) }.getOrDefault(Places.cities[0])
    }

    // ---------- formatting in the place's zone ----------
    private val zone get() = ZoneId.of(place.zoneId)
    private fun zdt(jd: Double) = Instant.ofEpochMilli(Engine.epochMillisFromJd(jd + 0.5 / 86400)).atZone(zone)
    fun time(jd: Double): String {
        val z = zdt(jd)
        return if (use24h) "%02d:%02d".format(z.hour, z.minute)
        else "${if (z.hour % 12 == 0) 12 else z.hour % 12}:%02d %s".format(z.minute, if (z.hour < 12) "am" else "pm")
    }
    fun date(jd: Double, pattern: String = "d MMM yyyy"): String = zdt(jd).format(DateTimeFormatter.ofPattern(pattern, Locale.ENGLISH))

    // ---------- names in the chosen script ----------
    fun tithi(idx: Int): String = when (script) {
        Script.DEVANAGARI -> Tables.tithi[idx].devanagari + if (idx in 15..28) " (कृष्ण)" else if (idx < 14) " (शुक्ल)" else ""
        else -> "${Tables.tithi[idx].paksha} ${Tables.tithi[idx].iast}"
    }
    fun nakshatra(idx: Int): String = when (script) {
        Script.IAST -> Tables.nakshatra[idx].iast
        Script.DEVANAGARI -> Tables.nakshatra[idx].devanagari
        Script.TAMIL -> Tables.nakshatra[idx].tamil
    }
    fun yoga(idx: Int): String = if (script == Script.DEVANAGARI) Tables.yoga[idx].devanagari else Tables.yoga[idx].iast
    fun karana(slot: Int): String = Tables.karanaOfSlot(slot).let { if (script == Script.DEVANAGARI) it.devanagari else it.iast }
    fun vara(w: Int): String = if (script == Script.DEVANAGARI) Tables.vara[w].devanagari else Tables.vara[w].iast
    fun month(m: Int): String = if (script == Script.TAMIL) Tables.rasi[m].tamilMonthScript else Tables.rasi[m].tamilMonth
}
