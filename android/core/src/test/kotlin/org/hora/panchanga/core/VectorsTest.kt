package org.hora.panchanga.core

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import java.time.LocalDate
import java.time.OffsetDateTime
import kotlin.math.abs

/**
 * data/test-vectors.json — every day must match within 1 minute and with exact indices.
 * Note: in that file ALL limb indices (tithi, nakshatra, yoga, karana) are 0-based.
 */
class VectorsTest {
    private val data = File(System.getProperty("hora.data") ?: "../../data")
    private val json = JSONObject(File(data, "test-vectors.json").readText())
    private val tolMin = json.getDouble("tolerance_minutes")

    private fun jdOf(iso: String) = Engine.jdFromEpochMillis(OffsetDateTime.parse(iso).toInstant().toEpochMilli())
    private fun assertTime(label: String, expectedIso: String, jd: Double) {
        val diffMin = abs(jd - jdOf(expectedIso)) * 1440
        assertTrue("$label: expected $expectedIso, off by ${"%.2f".format(diffMin)} min", diffMin <= tolMin)
    }

    private fun place(v: JSONObject) = Place(v.getString("city"), v.getDouble("lat"), v.getDouble("lon"), "Asia/Kolkata")

    @Test
    fun allSixtyVectors() {
        val vs = json.getJSONArray("vectors")
        assertEquals(60, vs.length())
        for (i in 0 until vs.length()) {
            val v = vs.getJSONObject(i)
            val tag = "${v.getString("city")} ${v.getString("date")}"
            val p = Engine.panchanga(LocalDate.parse(v.getString("date")), place(v))
            assertTime("$tag sunrise", v.getString("sunrise"), p.sunrise)
            assertTime("$tag sunset", v.getString("sunset"), p.sunset)
            assertTime("$tag next sunrise", v.getString("next_sunrise"), p.nextSunrise)
            assertEquals("$tag vara", v.getJSONObject("vara").getInt("index"), p.weekday)
            assertEquals("$tag vara name", v.getJSONObject("vara").getString("name"), Tables.vara[p.weekday].iast)
            assertEquals("$tag tamil month", v.getJSONObject("tamil_month").getInt("index"), p.tamilMonth)
            assertEquals("$tag tamil day", v.getJSONObject("tamil_month").getInt("day"), p.tamilDay)
            assertEquals("$tag samvatsara", v.getJSONObject("samvatsara").getInt("index"), p.samvat)
            assertEquals("$tag ayanamsa", v.getDouble("ayanamsa_deg"), p.ayanamsa, 0.001)
            assertEquals("$tag sun", v.getDouble("sun_sidereal_deg"), p.sunSid, 0.002)
            assertEquals("$tag moon", v.getDouble("moon_sidereal_deg"), p.moonSid, 0.005)
            checkSpans("$tag tithi", v.getJSONArray("tithi"), p.tithi) { Limbs.tithiLabel(it) }
            checkSpans("$tag nakshatra", v.getJSONArray("nakshatra"), p.nakshatra) { Limbs.nakshatraLabel(it) }
            checkSpans("$tag yoga", v.getJSONArray("yoga"), p.yoga) { Limbs.yogaLabel(it) }
            checkSpans("$tag karana", v.getJSONArray("karana"), p.karana) { Limbs.karanaLabel(it) }
            for ((key, pair) in listOf("rahu_kalam" to p.rahu, "yamagandam" to p.yama, "kulikai" to p.gulika, "abhijit" to p.abhijit)) {
                val a = v.getJSONArray(key)
                assertTime("$tag $key start", a.getString(0), pair.first)
                assertTime("$tag $key end", a.getString(1), pair.second)
            }
        }
    }

    private fun checkSpans(tag: String, exp: JSONArray, got: List<Span>, name: (Int) -> String) {
        assertEquals("$tag count", exp.length(), got.size)
        for (j in 0 until exp.length()) {
            val e = exp.getJSONObject(j)
            assertEquals("$tag[$j] index", e.getInt("index"), got[j].idx)
            assertEquals("$tag[$j] name", e.getString("name"), name(got[j].idx))
            assertTime("$tag[$j] end", e.getString("ends"), got[j].end)
            assertEquals("$tag[$j] nāḻigai", e.getString("ends_nazhigai"), nz(e.getString("ends_nazhigai"), got[j].end, jdOf(e.getString("ends"))))
        }
    }

    // ends_nazhigai is computed from sunrise; allow the same 1-minute tolerance (= 2.5 vināḻigai)
    private fun nz(expected: String, got: Double, expJd: Double) = if (abs(got - expJd) * 1440 <= tolMin) expected else "mismatch"

    /** test-vectors.md §3 — the externally verified day (drikpanchang), IST clock times. */
    @Test
    fun regressionDayChennai() {
        val chennai = Place("Chennai", 13.0827, 80.2707, "Asia/Kolkata")
        val p = Engine.panchanga(LocalDate.of(2026, 9, 26), chennai)
        fun hm(jd: Double) = java.time.Instant.ofEpochMilli(Engine.epochMillisFromJd(jd)).atZone(java.time.ZoneId.of("Asia/Kolkata")).toLocalTime()
        fun near(label: String, jd: Double, h: Int, m: Int) {
            val t = hm(jd); val diff = abs(t.hour * 60 + t.minute + t.second / 60.0 - (h * 60 + m + 0.5))
            assertTrue("$label $t vs $h:$m", diff <= 1.5)
        }
        near("sunrise", p.sunrise, 5, 58); near("sunset", p.sunset, 18, 2)
        assertEquals(15, p.tithi[0].idx + 1); assertEquals("Śukla Pūrṇimā", Limbs.tithiLabel(p.tithi[0].idx)); near("tithi", p.tithi[0].end, 22, 18)
        assertEquals(25, p.nakshatra[0].idx + 1); near("nakshatra", p.nakshatra[0].end, 11, 32)
        assertEquals("Gaṇḍa", Limbs.yogaLabel(p.yoga[0].idx)); assertEquals(10, p.yoga[0].idx + 1); near("yoga", p.yoga[0].end, 13, 17)
        // 1-based karana k = floor(E/6)+1: Viṣṭi is k = 29 here (docs/test-vectors.md §3 prints 28 — see README)
        assertEquals(29, p.karana[0].idx + 1); assertEquals("Viṣṭi", Limbs.karanaLabel(p.karana[0].idx)); near("viṣṭi", p.karana[0].end, 10, 46)
        assertEquals("Bava", Limbs.karanaLabel(p.karana[1].idx)); near("bava", p.karana[1].end, 22, 18)
        near("rahu start", p.rahu.first, 8, 59); near("rahu end", p.rahu.second, 10, 30)
        assertEquals("Puraṭṭāsi", listOf("Chithirai", "Vaikāsi", "Āni", "Āḍi", "Āvaṇi", "Puraṭṭāsi", "Aippasi", "Kārttikai", "Mārgazhi", "Thai", "Māsi", "Panguni")[p.tamilMonth])
        assertEquals(10, p.tamilDay)
    }

    /** SPEC §6: kṣaya day (2 Sep 2026) and adhika day (17 Oct 2026), Chennai. */
    @Test
    fun kshayaAndAdhika() {
        val chennai = Place("Chennai", 13.0827, 80.2707, "Asia/Kolkata")
        val k = Engine.panchanga(LocalDate.of(2026, 9, 2), chennai)
        // kṣaya: Kṛṣṇa Ṣaṣṭhī (idx 20) begins and ends between the two sunrises, so it is never "seen" at dawn
        assertEquals(listOf(19, 20, 21), k.tithi.map { it.idx })
        assertTrue(k.tithi[1].end < k.nextSunrise)
        val a = Engine.panchanga(LocalDate.of(2026, 10, 17), chennai)
        // adhika: Śukla Saptamī (idx 6) is in force at this sunrise and the next one
        assertEquals(listOf(6), a.tithi.map { it.idx })
        assertTrue(a.tithi[0].end > a.nextSunrise)
        assertEquals(6, Engine.panchanga(LocalDate.of(2026, 10, 18), chennai).tithi[0].idx)
    }

    /** DST zones resolve the civil date in local time (SPEC §3 req. 3). */
    @Test
    fun dstZone() {
        val ny = Place("New York", 40.7128, -74.006, "America/New_York")
        val summer = Engine.panchanga(LocalDate.of(2026, 7, 1), ny)
        val winter = Engine.panchanga(LocalDate.of(2026, 1, 15), ny)
        assertEquals(-4.0, summer.tzHours, 0.0); assertEquals(-5.0, winter.tzHours, 0.0)
        fun localHour(jd: Double, tz: Double) = ((jd + tz / 24 + 0.5) % 1) * 24
        assertTrue(localHour(summer.sunrise, summer.tzHours) in 5.0..6.0)
        assertTrue(localHour(winter.sunrise, winter.tzHours) in 7.0..7.5)
    }
}
