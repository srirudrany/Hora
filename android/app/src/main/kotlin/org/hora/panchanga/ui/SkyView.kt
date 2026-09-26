// Celestial mode. Two directions, as in the Sky Navigator design:
//  - Kālacakra ("bridge"): the geocentric wheel seen from space — Earth at the centre, the tithi dial
//    around it, the Moon's orbit with the nodes, the five grahas (distances not to scale), the 12 rāśis and
//    27 nakṣatras, the Sun outside; the real Milky Way and bright stars behind. Orbit camera with tilt,
//    azimuth, zoom and perspective; textured bodies rendered by [SkyGpu].
//  - Horizon: first-person sky from the selected place (true alt/az of Sun, Moon, planets, ecliptic, stars).
package org.hora.panchanga.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.sp
import org.hora.panchanga.core.Engine
import org.hora.panchanga.core.GrahaPos
import org.hora.panchanga.core.Tables
import kotlin.math.asin
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin

enum class Target(val label: String, val gloss: String, val graha: String? = null) {
    OVERVIEW("Kālacakra", "Overview"), SUN("Sūrya", "Sun", "sun"), MOON("Candra", "Moon", "moon"), EARTH("Pṛthvī", "You are here", "earth"),
    NAKSHATRA("Nakṣatra", "Lunar mansion"), TITHI("Tithi", "Lunar day"), YOGA("Yoga", "Sun + Moon"),
    MERCURY("Budha", "Mercury", "mercury"), VENUS("Śukra", "Venus", "venus"), MARS("Maṅgala", "Mars", "mars"),
    JUPITER("Guru", "Jupiter", "jupiter"), SATURN("Śani", "Saturn", "saturn"), RAHU("Rāhu", "North node", "rahu"), KETU("Ketu", "South node", "ketu"),
}

/** Orbit camera. [el] = tilt above the ecliptic plane (90 = top-down, i.e. the clock face). */
data class Cam(val tx: Float, val tz: Float, val fit: Float, val el: Float, val az: Float)

object Radii {
    const val EARTH = 1f; const val ARC0 = 1.35f; const val ARC1 = 1.8f; const val DIAL0 = 2.19f; const val DIAL1 = 2.9f
    const val MOON_ORBIT = 3.5f; const val RASI0 = 7.4f; const val RASI1 = 8.3f; const val NAK0 = 8.5f; const val NAK1 = 10.4f
    const val NAK_LABEL = 9.45f; const val SUN = 14f
    /** Grahas sit between the Moon's orbit and the zodiac band, in order of period — not to scale. */
    val PLANET = mapOf("mercury" to 4.25f, "venus" to 4.9f, "mars" to 5.55f, "jupiter" to 6.2f, "saturn" to 6.85f)
    val PLANET_SIZE = mapOf("mercury" to 0.13f, "venus" to 0.2f, "mars" to 0.16f, "jupiter" to 0.34f, "saturn" to 0.28f)
}

/** Everything the sky needs for one instant. */
data class SkyNow(val jd: Double, val sunSid: Double, val moonSid: Double, val elong: Double, val grahas: List<GrahaPos>) {
    val ayan = Engine.ayanamsa(jd)
    val eps = Engine.obliquity(jd)
    fun graha(key: String) = grahas.first { it.key == key }
}

/** World position (ecliptic plane) for sidereal longitude λ at radius r; λ runs counter-clockwise seen from above. */
fun world(lon: Double, r: Float): Pair<Float, Float> {
    val a = Math.toRadians(lon)
    return Pair((-r * sin(a)).toFloat(), (-r * cos(a)).toFloat())
}

/** World-space position of a target body. */
fun bodyPos(t: Target, s: SkyNow): Pair<Float, Float>? = when (t) {
    Target.SUN -> world(s.sunSid, Radii.SUN)
    Target.MOON -> world(s.moonSid, Radii.MOON_ORBIT)
    Target.EARTH -> Pair(0f, 0f)
    Target.MERCURY, Target.VENUS, Target.MARS, Target.JUPITER, Target.SATURN -> world(s.graha(t.graha!!).sidLon, Radii.PLANET.getValue(t.graha))
    Target.RAHU, Target.KETU -> world(s.graha(t.graha!!).sidLon, Radii.MOON_ORBIT)
    else -> null
}

fun goal(t: Target, s: SkyNow): Cam {
    val span = 360.0 / 27
    val p = bodyPos(t, s)
    return when (t) {
        Target.OVERVIEW -> Cam(0f, 0f, 13.5f, 42f, 0f)
        Target.SUN -> Cam(p!!.first, p.second, 4.5f, 26f, 0f)
        Target.MOON -> Cam(p!!.first, p.second, 1.5f, 22f, 0f)
        Target.EARTH -> Cam(0f, 0f, 2.4f, 20f, 0f)
        Target.NAKSHATRA -> world(((s.moonSid / span).toInt() + 0.5) * span, Radii.NAK_LABEL).let { Cam(it.first, it.second, 4.2f, 50f, 0f) }
        Target.TITHI -> Cam(0f, 0f, 3.6f, 82f, 0f)
        Target.YOGA -> Cam(0f, 0f, 11.5f, 62f, 0f)
        Target.SATURN, Target.JUPITER -> Cam(p!!.first, p.second, 1.4f, 18f, 0f)
        Target.RAHU, Target.KETU -> Cam(p!!.first, p.second, 2.2f, 30f, 0f)
        else -> Cam(p!!.first, p.second, 0.9f, 18f, 0f)
    }
}

class Projector(val cam: Cam, val size: Size) {
    private val s = min(size.width, size.height) / 2f / cam.fit
    private val sinEl = sin(Math.toRadians(cam.el.toDouble())).toFloat()
    private val cosEl = cos(Math.toRadians(cam.el.toDouble())).toFloat()
    private val ca = cos(Math.toRadians(cam.az.toDouble())).toFloat()
    private val sa = sin(Math.toRadians(cam.az.toDouble())).toFloat()
    private val dist = cam.fit * 3.2f
    val center = Offset(size.width / 2f, size.height * 0.36f)
    /** Focal length for the sky backdrop and star directions (≈ 58° across the short side). */
    val focal = min(size.width, size.height) * 0.9f

    /** Returns screen point, perspective factor and depth (positive = farther). y = height above the plane. */
    fun p(x: Float, z: Float, y: Float = 0f): Triple<Offset, Float, Float> {
        val dx = x - cam.tx; val dz = z - cam.tz
        val rx = dx * ca - dz * sa; val rz = dx * sa + dz * ca
        val depth = -rz * cosEl - y * sinEl
        val f = dist / max(0.2f * dist, dist + depth)
        return Triple(Offset(center.x + rx * s * f, center.y + (rz * sinEl - y * cosEl) * s * f), f, depth)
    }
    fun scale(f: Float) = s * f

    /** World direction → view space (x right, y up, z toward the viewer). */
    fun view(dx: Float, dy: Float, dz: Float): V3 {
        val rx = dx * ca - dz * sa; val rz = dx * sa + dz * ca
        return V3(rx, -(rz * sinEl - dy * cosEl), rz * cosEl + dy * sinEl)
    }
    /** View-space direction of sidereal ecliptic longitude λ (in the plane). */
    fun viewLon(lon: Double): V3 { val (x, z) = world(lon, 1f); return view(x, 0f, z) }
    /** Screen position of a direction on the celestial sphere, or null if behind the camera. */
    fun sky(v: V3): Offset? = if (v.z >= -0.05f) null else Offset(center.x + focal * v.x / -v.z, center.y - focal * v.y / -v.z)
}

private fun Projector.ringPath(r: Float, steps: Int = 120): Path = Path().apply {
    for (i in 0..steps) {
        val (x, z) = world(360.0 * i / steps, r); val o = p(x, z).first
        if (i == 0) moveTo(o.x, o.y) else lineTo(o.x, o.y)
    }
}

private fun Projector.band(r0: Float, r1: Float, from: Double, to: Double, steps: Int = 12): Path = Path().apply {
    for (i in 0..steps) {
        val (x, z) = world(from + (to - from) * i / steps, r1); val o = p(x, z).first
        if (i == 0) moveTo(o.x, o.y) else lineTo(o.x, o.y)
    }
    for (i in steps downTo 0) {
        val (x, z) = world(from + (to - from) * i / steps, r0); val o = p(x, z).first
        lineTo(o.x, o.y)
    }
    close()
}

/** Body-fixed frame: north pole = ecliptic north, centre meridian toward sidereal longitude [meridian]. */
fun Projector.frame(meridian: Double): BodyFrame {
    val y = view(0f, 1f, 0f); val z = viewLon(meridian); val x = viewLon(meridian + 90)
    return BodyFrame(x, y, z)
}

/** Screen positions of pickable things, for taps and HUD tags. */
data class SkyPicks(val pos: Map<Target, Offset>)

/** Star direction cache: HYG catalogue → sidereal ecliptic unit vectors in world space. */
class StarDirs(stars: List<Star>, eps: Double, ayan: Double) {
    val x = FloatArray(stars.size); val y = FloatArray(stars.size); val z = FloatArray(stars.size)
    val mag = FloatArray(stars.size); val col = Array(stars.size) { stars[it].color }
    init {
        stars.forEachIndexed { i, s ->
            val (lam, bet) = eqToSidEcl(s.ra, s.dec, eps, ayan)
            val l = Math.toRadians(lam); val b = Math.toRadians(bet)
            x[i] = (-cos(b) * sin(l)).toFloat(); y[i] = sin(b).toFloat(); z[i] = (-cos(b) * cos(l)).toFloat(); mag[i] = s.mag
        }
    }
}

private fun DrawScope.drawStars(pr: Projector, dirs: StarDirs?, starfield: Starfield, t: Float, alpha: Float, warp: Float) {
    if (dirs == null || dirs.x.isEmpty()) { starfield.draw(this, t, size, Offset(pr.cam.az * 3f, pr.cam.el * 2f), alpha); return }
    val c = pr.center
    for (i in dirs.x.indices) {
        val o = pr.sky(pr.view(dirs.x[i], dirs.y[i], dirs.z[i])) ?: continue
        if (o.x < -20 || o.y < -20 || o.x > size.width + 20 || o.y > size.height + 20) continue
        val m = dirs.mag[i]
        val b = ((5.2f - m) / 6.5f).coerceIn(0.08f, 1f)
        val tw = 0.8f + 0.2f * sin(t * (1.1f + (i % 5) * 0.37f) + i)
        val r = 0.55f + 2.3f * b * b
        val a = (b * tw * alpha).coerceIn(0f, 1f)
        if (warp > 0.02f) {
            val d = o - c; val len = d.getDistance().coerceAtLeast(1f)
            drawLine(dirs.col[i].copy(alpha = a), o, o + d / len * (len * 0.35f * warp), r, cap = StrokeCap.Round)
        }
        if (b > 0.55f) drawCircle(dirs.col[i].copy(alpha = a * 0.25f), r * 3.2f, o)
        drawCircle(dirs.col[i].copy(alpha = a), r, o)
    }
}

private val GRAHA_COLOR = mapOf(
    "mercury" to Color(0xFF57A872), "venus" to Color(0xFFF4EFE6), "mars" to Color(0xFFD0473A),
    "jupiter" to Color(0xFFE0B040), "saturn" to Color(0xFF6F7FB0), "rahu" to Color(0xFF6A6F86), "ketu" to Color(0xFF8C7A6A),
)

@Composable
fun KalacakraView(
    modifier: Modifier, cam: Cam, now: SkyNow, lock: Target, t: Float, starfield: Starfield, stars: StarDirs?,
    alpha: Float, warp: Float,
    onOrbit: (dAz: Float, dEl: Float, zoom: Float) -> Unit, onTap: (Target?) -> Unit,
) {
    val tm = rememberTextMeasurer(cacheSize = 256)
    val gpu = LocalSkyGpu.current
    val picks = remember { arrayOfNulls<SkyPicks>(1) }
    Canvas(
        modifier
            .pointerInput(Unit) { detectTransformGestures { _, pan, zoom, _ -> onOrbit(-pan.x * 0.25f, pan.y * 0.18f, zoom) } }
            .pointerInput(Unit) {
                detectTapGestures { o ->
                    val hit = picks[0]?.pos?.minByOrNull { (it.value - o).getDistance() }
                    onTap(if (hit != null && (hit.value - o).getDistance() < 70f) hit.key else null)
                }
            }
    ) {
        val pr = Projector(cam, size)
        val sunSid = now.sunSid; val moonSid = now.moonSid; val elong = now.elong
        // ---- sky: Milky Way + real stars (fallback: seeded starfield)
        gpu?.backdropOrbit(this, pr.center, pr.focal, cam.az, cam.el, now.ayan, now.eps, 0.9f * alpha)
        drawStars(pr, stars, starfield, t, alpha, warp)

        val span = 360.0 / 27
        val ys = Engine.norm(sunSid + moonSid)
        val curNak = (moonSid / span).toInt() % 27
        val curTithi = (elong / 12).toInt() % 30
        val yogaMode = lock == Target.YOGA

        // ---- zodiac band: rāśi ring and nakṣatra ring (yoga names when locked on yoga)
        for (i in 0 until 12) {
            drawPath(pr.band(Radii.RASI0, Radii.RASI1, i * 30.0, (i + 1) * 30.0), (if (i % 2 == 0) C.cellA else C.cellB).copy(alpha = 0.6f * alpha))
            val (x, z) = world(i * 30.0 + 15, (Radii.RASI0 + Radii.RASI1) / 2); val (o, f, _) = pr.p(x, z)
            centeredText(tm, Tables.rasi[i].devanagari, o, T.skt((11 * f.coerceIn(0.6f, 1.6f)).sp, C.goldSoft.copy(alpha = 0.85f * alpha)))
        }
        for (i in 0 until 27) {
            val cur = if (yogaMode) (ys / span).toInt() % 27 == i else i == curNak
            val warn = yogaMode && (i == 16 || i == 26)
            val col = when { cur -> RingColor.NAKSHATRA.copy(alpha = 0.55f); warn -> C.kumkum.copy(alpha = 0.6f); i % 2 == 0 -> C.cellA; else -> C.cellB }
            drawPath(pr.band(Radii.NAK0, Radii.NAK1, i * span, (i + 1) * span), col.copy(alpha = col.alpha * 0.82f * alpha))
            val (x, z) = world((i + 0.5) * span, Radii.NAK_LABEL); val (o, f, _) = pr.p(x, z)
            val name = if (yogaMode) Tables.yoga[i].iast else Tables.nakshatra[i].iast
            centeredText(tm, name, o, T.skt((9.5f * f.coerceIn(0.55f, 2.2f)).sp, (if (cur) C.goldSoft else C.star.copy(alpha = 0.7f)).copy(alpha = alpha), italic = true))
        }
        for (i in 0 until 12) {
            val (x0, z0) = world(i * 30.0, Radii.RASI0); val (x1, z1) = world(i * 30.0, Radii.NAK1)
            drawLine(C.gold.copy(alpha = 0.7f * alpha), pr.p(x0, z0).first, pr.p(x1, z1).first, 1.2f)
        }
        drawPath(pr.ringPath(Radii.NAK1 + 0.05f), C.gold.copy(alpha = 0.5f * alpha), style = Stroke(1.2f))

        // ---- graha orbits (dashed, not to scale), Moon orbit, tithi dial, elongation arc
        for ((_, r) in Radii.PLANET) drawPath(pr.ringPath(r), C.muted.copy(alpha = 0.16f * alpha), style = Stroke(0.8f, pathEffect = PathEffect.dashPathEffect(floatArrayOf(4f, 6f))))
        drawPath(pr.ringPath(Radii.MOON_ORBIT), Color(0xFF9AA6C0).copy(alpha = 0.35f * alpha), style = Stroke(1f))
        for (i in 0 until 30) {
            val a0 = sunSid + i * 12.0
            val col = when { i == curTithi -> C.goldSoft.copy(alpha = 0.6f); i == 14 -> Color(0xFFDCCFAE).copy(alpha = 0.6f); i == 29 -> Color(0xFF020308); i < 15 -> C.sukla.copy(alpha = 0.55f); else -> C.krsna.copy(alpha = 0.8f) }
            drawPath(pr.band(Radii.DIAL0, Radii.DIAL1, a0, a0 + 12, 4), col.copy(alpha = col.alpha * alpha))
            if (cam.fit < 7f) {
                val (x, z) = world(a0 + 6, (Radii.DIAL0 + Radii.DIAL1) / 2); val (o, f, _) = pr.p(x, z)
                centeredText(tm, "${i % 15 + 1}", o, T.mono((8 * f.coerceIn(0.6f, 2f)).sp, C.star.copy(alpha = 0.8f * alpha)))
            }
        }
        drawPath(pr.band(Radii.ARC0, Radii.ARC1, sunSid, sunSid + elong, 60), C.gold.copy(alpha = 0.45f * alpha))

        fun rod(lon: Double, col: Color, w: Float) {
            val (x0, z0) = world(lon, 1.05f); val (x1, z1) = world(lon, Radii.NAK1)
            drawLine(col, pr.p(x0, z0).first, pr.p(x1, z1).first, w, cap = StrokeCap.Round)
        }
        rod(sunSid, C.gold.copy(alpha = 0.8f * alpha), 1.8f)
        rod(moonSid, C.moon.copy(alpha = 0.8f * alpha), 1.4f)
        if (yogaMode) {
            rod(ys, C.goldSoft.copy(alpha = alpha), 2.4f)
            val (x, z) = world(ys, Radii.NAK1 + 0.4f); drawCircle(C.goldSoft.copy(alpha = alpha), 6f, pr.p(x, z).first)
        }

        // ---- bodies, painted far → near
        val light = pr.viewLon(sunSid)
        val pos = HashMap<Target, Offset>()
        data class Body(val t: Target, val o: Offset, val depth: Float, val draw: () -> Unit)
        val bodies = mutableListOf<Body>()
        run { // Earth — Greenwich meridian faces sidereal longitude GMST − ayanamsa, so the lit side is the real daytime side
            val (o, f, d) = pr.p(0f, 0f)
            val r = pr.scale(f) * Radii.EARTH
            bodies += Body(Target.EARTH, o, d) {
                val frame = pr.frame(Engine.gmst(now.jd) - now.ayan)
                if (gpu?.sphere(this, "earth", o, r, frame, light, t, alpha, Color(0xFF6FA8FF), 0.9f) != true) {
                    drawCircle(Brush.radialGradient(listOf(Color(0xFF3A6FB0), Color(0xFF16305C), Color(0xFF0A1428)), o - Offset(r * 0.3f, r * 0.3f), r * 1.4f), r, o, alpha = alpha)
                }
            }
        }
        run { // Moon — tidally locked: its near side faces Earth
            val (x, z) = world(moonSid, Radii.MOON_ORBIT); val (o, f, d) = pr.p(x, z)
            val r = max(3f, pr.scale(f) * 0.34f)
            bodies += Body(Target.MOON, o, d) {
                drawCircle(Brush.radialGradient(listOf(C.moon.copy(alpha = 0.22f * alpha), Color.Transparent), o, r * 3f), r * 3f, o)
                val y = pr.view(0f, 1f, 0f); val zf = pr.viewLon(moonSid + 180); val xf = y.cross(zf)
                if (gpu?.sphere(this, "moon", o, r, BodyFrame(xf, y, zf), light, t, alpha) != true) moonPhase(o, r, elong)
            }
        }
        run { // Sun
            val (x, z) = world(sunSid, Radii.SUN); val (o, f, d) = pr.p(x, z)
            val r = max(5f, pr.scale(f) * 0.9f)
            bodies += Body(Target.SUN, o, d) {
                if (gpu?.sphere(this, "sun", o, r, pr.frame(t * 2.0), light, t, alpha) != true) {
                    drawCircle(Brush.radialGradient(listOf(Color(0xFFFFF4D6).copy(alpha = alpha), C.gold.copy(alpha = 0.5f * alpha), Color.Transparent), o, r * 4f), r * 4f, o)
                    drawCircle(Color(0xFFFFF4D6).copy(alpha = alpha), r, o)
                }
            }
        }
        for (g in now.grahas) {
            val tgt = Target.entries.first { it.graha == g.key }
            if (g.key == "rahu" || g.key == "ketu") {
                val (x, z) = world(g.sidLon, Radii.MOON_ORBIT); val (o, f, d) = pr.p(x, z)
                val r = max(3f, pr.scale(f) * 0.17f)
                bodies += Body(tgt, o, d) {
                    drawCircle(Color(0xFF05060C).copy(alpha = 0.9f * alpha), r, o)
                    drawCircle(GRAHA_COLOR.getValue(g.key).copy(alpha = 0.9f * alpha), r, o, style = Stroke(1.4f))
                    // eclipse affordance: glow when the Sun or Moon is near a node
                    val near = minOf(angDiff(g.sidLon, sunSid), angDiff(g.sidLon, moonSid))
                    if (near < 12) drawCircle(C.kumkum.copy(alpha = ((12 - near) / 12 * 0.45f).toFloat() * alpha), r * 2.4f, o)
                    centeredText(tm, Tables.graha(g.key).iast, o + Offset(0f, r + 12f), T.skt(11.sp, C.muted.copy(alpha = alpha), italic = true))
                }
            } else {
                val (x, z) = world(g.sidLon, Radii.PLANET.getValue(g.key)); val (o, f, d) = pr.p(x, z)
                val r = max(2.5f, pr.scale(f) * Radii.PLANET_SIZE.getValue(g.key))
                bodies += Body(tgt, o, d) {
                    val frame = pr.frame(t * (if (g.key == "jupiter" || g.key == "saturn") 24.0 else 8.0))
                    if (gpu?.sphere(this, g.key, o, r, frame, light, t, alpha, if (g.key == "venus") Color(0xFFFFE9C0) else Color.Transparent, if (g.key == "venus") 0.5f else 0f) != true) {
                        drawCircle(GRAHA_COLOR.getValue(g.key).copy(alpha = alpha), r, o)
                    }
                    val lbl = Tables.graha(g.key).iast + if (g.retrograde) " ℞" else ""
                    centeredText(tm, lbl, o + Offset(0f, r + 12f), T.skt(11.sp, GRAHA_COLOR.getValue(g.key).copy(alpha = 0.95f * alpha), italic = true))
                }
            }
        }
        bodies.sortByDescending { it.depth }
        for (b in bodies) { b.draw(); pos[b.t] = b.o }

        val (nx, nz) = world((curNak + 0.5) * span, Radii.NAK_LABEL)
        val (tx, tz) = world(sunSid + curTithi * 12.0 + 6, (Radii.DIAL0 + Radii.DIAL1) / 2)
        val (yx, yz) = world(ys, Radii.NAK1 + 0.4f)
        pos[Target.NAKSHATRA] = pr.p(nx, nz).first; pos[Target.TITHI] = pr.p(tx, tz).first; pos[Target.YOGA] = pr.p(yx, yz).first
        picks[0] = SkyPicks(pos)
        pos[lock]?.let { if (lock != Target.OVERVIEW) reticle(it, 30f, alpha * (1 - warp)) }
    }
}

fun DrawScope.reticle(o: Offset, h: Float, alpha: Float = 1f) {
    val l = h * 0.45f; val c = C.goldSoft.copy(alpha = alpha)
    for ((sx, sy) in listOf(-1f to -1f, 1f to -1f, -1f to 1f, 1f to 1f)) {
        val corner = Offset(o.x + sx * h, o.y + sy * h)
        drawLine(c, corner, Offset(corner.x - sx * l, corner.y), 2f)
        drawLine(c, corner, Offset(corner.x, corner.y - sy * l), 2f)
    }
}

// ---------------------------------------------------------------- Horizon

fun eqToHor(raDeg: Double, decDeg: Double, lst: Double, lat: Double): Pair<Double, Double> {
    val h = Math.toRadians(lst - raDeg); val d = Math.toRadians(decDeg); val phi = Math.toRadians(lat)
    val alt = asin(sin(phi) * sin(d) + cos(phi) * cos(d) * cos(h))
    val az = atan2(-sin(h) * cos(d), cos(phi) * sin(d) - sin(phi) * cos(d) * cos(h))
    return Pair(Math.toDegrees(alt), Engine.norm(Math.toDegrees(az)))
}

data class HorizonInfo(val sunAlt: Double, val sunAz: Double, val moonAlt: Double, val moonAz: Double)

fun horizonInfo(jd: Double, lat: Double, lon: Double): HorizonInfo {
    val s = Engine.altAz(Engine.sidSun(jd), 0.0, jd, lat, lon)
    val m = Engine.altAz(Engine.sidMoon(jd), Engine.moonLat(jd), jd, lat, lon)
    return HorizonInfo(s.first, s.second, m.first, m.second)
}

@Composable
fun HorizonView(
    modifier: Modifier, now: SkyNow, lat: Double, lon: Double, heading: Float, pitch: Float, fov: Float, t: Float,
    stars: List<Star>, alpha: Float, onLook: (dHeading: Float, dPitch: Float, zoom: Float) -> Unit,
) {
    val tm = rememberTextMeasurer(cacheSize = 128)
    val gpu = LocalSkyGpu.current
    Canvas(modifier.pointerInput(Unit) { detectTransformGestures { _, pan, zoom, _ -> onLook(-pan.x, pan.y, zoom) } }) {
        val jd = now.jd
        val ppd = size.width / fov
        val cx = size.width / 2f; val cy = size.height * 0.5f
        fun scr(alt: Double, az: Double): Offset? {
            var d = az - heading; d = ((d % 360) + 540) % 360 - 180
            if (kotlin.math.abs(d) > fov * 0.75) return null
            return Offset(cx + (d * ppd).toFloat(), cy - ((alt - pitch) * ppd).toFloat())
        }
        val info = horizonInfo(jd, lat, lon)
        val day = ((info.sunAlt + 8) / 14).coerceIn(0.0, 1.0).toFloat()
        val horizonY = cy + pitch * ppd
        val lst = Engine.norm(Engine.gmst(jd) + lon)
        drawRect(Color(0xFF02030A))
        gpu?.backdropHorizon(this, Offset(cx, cy), heading, pitch, ppd, lat, lst, 1.15f * (1 - day))
        // daylight wash over the Milky Way
        drawRect(Brush.verticalGradient(listOf(Color(0xFF1F3A74).copy(alpha = day), Color(0xFF5C7FB8).copy(alpha = day * 0.95f), lerp(Color(0xFF0C1330).copy(alpha = 0.45f), Color(0xFFE8B880).copy(alpha = 0.5f), day)), startY = horizonY - 90 * ppd, endY = horizonY))
        // real stars (HYG, V ≤ 5)
        stars.forEachIndexed { i, s ->
            val (alt, az) = eqToHor(s.ra, s.dec, lst, lat)
            if (alt < 0) return@forEachIndexed
            val o = scr(alt, az) ?: return@forEachIndexed
            val b = ((5.2f - s.mag) / 6.5f).coerceIn(0.08f, 1f)
            val tw = 0.8f + 0.2f * sin(t * 1.3f + i)
            val a = (b * tw * (1 - day * 0.95f) * alpha).coerceIn(0f, 1f)
            val r = 0.6f + 2.6f * b * b
            if (b > 0.55f) drawCircle(s.color.copy(alpha = a * 0.25f), r * 3.4f, o)
            drawCircle(s.color.copy(alpha = a), r, o)
            if (s.mag < 1.3f && s.name.isNotEmpty() && day < 0.5f) centeredText(tm, s.name, o + Offset(0f, 14f), T.body(9.sp, C.muted.copy(alpha = 0.8f * alpha)))
        }
        for (a in listOf(30.0, 60.0)) {
            val y = cy - ((a - pitch) * ppd).toFloat()
            drawLine(C.muted.copy(alpha = 0.18f), Offset(0f, y), Offset(size.width, y), 1f)
            centeredText(tm, "${a.toInt()}°", Offset(24f, y - 10f), T.mono(9.sp, C.muted))
        }
        // ecliptic with the 27 nakṣatra ticks and names
        val path = Path(); var pen = false
        for (i in 0..360 step 2) {
            val (alt, az) = Engine.altAz(i.toDouble(), 0.0, jd, lat, lon)
            val o = scr(alt, az)
            if (o == null) { pen = false; continue }
            if (!pen) path.moveTo(o.x, o.y) else path.lineTo(o.x, o.y)
            pen = true
        }
        drawPath(path, C.gold.copy(alpha = 0.85f), style = Stroke(1.6f))
        val span = 360.0 / 27
        val curNak = (now.moonSid / span).toInt() % 27
        for (i in 0 until 27) {
            val (a1, z1) = Engine.altAz(i * span, 1.6, jd, lat, lon); val (a2, z2) = Engine.altAz(i * span, -1.6, jd, lat, lon)
            val o1 = scr(a1, z1); val o2 = scr(a2, z2)
            if (o1 != null && o2 != null) drawLine(C.goldSoft.copy(alpha = 0.7f), o1, o2, 1.2f)
            val (am, zm) = Engine.altAz(i * span + span / 2, 4.2, jd, lat, lon)
            scr(am, zm)?.let { centeredText(tm, Tables.nakshatra[i].iast, it, T.skt(12.sp, if (i == curNak) C.goldSoft else C.star.copy(alpha = 0.62f), italic = true)) }
        }
        for (i in 0 until 12) {
            val (am, zm) = Engine.altAz(i * 30.0 + 15, -5.5, jd, lat, lon)
            scr(am, zm)?.let { centeredText(tm, Tables.rasi[i].devanagari, it, T.skt(13.sp, C.goldSoft.copy(alpha = 0.8f))) }
        }
        // planets (true alt/az), lit from the Sun's direction as seen on the sky
        val sunO = scr(info.sunAlt, info.sunAz)
        fun lightFrom(o: Offset): V3 = if (sunO == null) V3(0f, 0f, -1f) else V3(sunO.x - o.x, -(sunO.y - o.y), 0f).norm().let { V3(it.x, it.y, 0.2f) }
        for (g in now.grahas) {
            if (g.key == "rahu" || g.key == "ketu") continue
            val (alt, az) = Engine.altAz(g.sidLon, g.lat, jd, lat, lon)
            val o = scr(alt, az) ?: continue
            val r = if (g.key == "jupiter" || g.key == "saturn") 7f else 5f
            if (gpu?.sphere(this, g.key, o, r, BodyFrame.FACING, lightFrom(o), t, alpha) != true) drawCircle(GRAHA_COLOR.getValue(g.key), r, o)
            centeredText(tm, Tables.graha(g.key).iast + if (g.retrograde) " ℞" else "", o + Offset(0f, r + 12f), T.skt(12.sp, GRAHA_COLOR.getValue(g.key), italic = true))
        }
        scr(info.moonAlt, info.moonAz)?.let { o ->
            drawCircle(Brush.radialGradient(listOf(C.moon.copy(alpha = 0.3f), Color.Transparent), o, 70f), 70f, o)
            val e = now.elong
            if (gpu?.sphere(this, "moon", o, 20f, BodyFrame.FACING, V3(sin(Math.toRadians(e)).toFloat(), 0f, -cos(Math.toRadians(e)).toFloat()), t, alpha) != true) moonPhase(o, 16f, e)
        }
        sunO?.let { o -> if (gpu?.sphere(this, "sun", o, 20f, BodyFrame.FACING, V3(0f, 0f, 1f), t, alpha) != true) drawCircle(Color(0xFFFFF4D6), 18f, o) }
        // ground
        drawRect(Brush.verticalGradient(listOf(lerp(Color(0xFF070912), Color(0xFF1A2236), day), Color(0xFF030408)), startY = horizonY, endY = size.height), topLeft = Offset(0f, horizonY), size = Size(size.width, max(0f, size.height - horizonY)))
        drawLine(C.gold.copy(alpha = 0.8f), Offset(0f, horizonY), Offset(size.width, horizonY), 1.6f)
        for ((lab, az) in listOf("N" to 0.0, "E" to 90.0, "S" to 180.0, "W" to 270.0)) {
            scr(0.0, az)?.let { centeredText(tm, lab, Offset(it.x, horizonY + 22f), T.caps(14.sp, C.goldSoft)) }
        }
        drawCircle(C.goldSoft.copy(alpha = 0.55f), 22f, Offset(cx, cy), style = Stroke(1f))
    }
}

fun lerp(a: Color, b: Color, t: Float) = Color(a.red + (b.red - a.red) * t, a.green + (b.green - a.green) * t, a.blue + (b.blue - a.blue) * t, a.alpha + (b.alpha - a.alpha) * t)

fun lerpCam(a: Cam, b: Cam, k: Float): Cam {
    val dAz = ((b.az - a.az) % 360 + 540) % 360 - 180
    return Cam(a.tx + (b.tx - a.tx) * k, a.tz + (b.tz - a.tz) * k, a.fit + (b.fit - a.fit) * k, a.el + (b.el - a.el) * k, a.az + dAz * k)
}

