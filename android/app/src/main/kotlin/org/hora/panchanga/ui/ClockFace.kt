// The Kālacakra clock face — geometry from design/clock-face.md (units: face radii, outer rim = 5.0).
// Nāḻigai dial runs clockwise from 12 o'clock; the sky rings run counter-clockwise from 12 o'clock
// (Meṣa 0° at top), as if facing the southern sky. Every ring has its own hue (data/translations.json
// "rings") and a curved name label; tapping a ring highlights it. The rings self-draw on first show.
package org.hora.panchanga.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipPath
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.TextMeasurer
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import org.hora.panchanga.core.DayPanchanga
import org.hora.panchanga.core.Engine
import org.hora.panchanga.core.Tables
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.sin

/** Ring hues — one per limb, from data/translations.json. */
object RingColor {
    private fun c(key: String) = Color(Tables.ring(key).color.toInt())
    val NAZHIGAI = c("nazhigai"); val NAKSHATRA = c("nakshatra"); val TITHI = c("tithi"); val YOGA = c("yoga"); val KARANA = c("karana")
    fun of(key: String) = when (key) { "nazhigai" -> NAZHIGAI; "nakshatra" -> NAKSHATRA; "tithi" -> TITHI; "yoga" -> YOGA; "karana" -> KARANA; else -> C.gold }
}

/** Ring bands in face units, outside in; used for drawing, labels and hit-testing taps. */
val FACE_RINGS = listOf("nazhigai" to (4.30 to 5.00), "nakshatra" to (3.35 to 4.20), "tithi" to (2.45 to 3.25), "yoga" to (1.75 to 2.35))

/** Screen angle (degrees clockwise from +x) for a sky longitude measured counter-clockwise from the top. */
fun skyAngle(lon: Double) = -90.0 - lon

/** Tangential label rotation, flipped by 180° in the lower half so text never reads upside down. */
fun uprightRotation(deg: Double): Float { val d = ((deg % 360) + 360) % 360; return (if (d > 90 && d < 270) d - 180 else d).toFloat() }

/** Screen angle for a dial fraction measured clockwise from the top. */
fun dialAngle(frac: Double) = -90.0 + 360.0 * frac

fun polar(c: Offset, r: Float, screenDeg: Double) =
    Offset(c.x + r * cos(Math.toRadians(screenDeg)).toFloat(), c.y + r * sin(Math.toRadians(screenDeg)).toFloat())

/** Annular sector between radii [r0]..[r1], from screen angle [start] sweeping [sweep] degrees clockwise. */
fun annulus(c: Offset, r0: Float, r1: Float, start: Double, sweep: Double): Path = Path().apply {
    arcTo(Rect(c, r1), start.toFloat(), sweep.toFloat(), true)
    arcTo(Rect(c, r0), (start + sweep).toFloat(), (-sweep).toFloat(), false)
    close()
}

fun DrawScope.centeredText(tm: TextMeasurer, text: String, at: Offset, style: TextStyle, rotateDeg: Float = 0f) {
    val l = tm.measure(text, style)
    val tl = Offset(at.x - l.size.width / 2f, at.y - l.size.height / 2f)
    if (rotateDeg == 0f) drawText(l, topLeft = tl) else rotate(rotateDeg, at) { drawText(l, topLeft = tl) }
}

/** Moon disc with the true phase for elongation [e] (lit side right while waxing) — fallback when no GPU. */
fun DrawScope.moonPhase(c: Offset, r: Float, e: Double, lit: Color = C.moon, dark: Color = Color(0xFF1B2238)) {
    drawCircle(dark, r, c)
    val side = if (e < 180) 1f else -1f
    val k = cos(Math.toRadians(e)).toFloat()
    val p = Path()
    val n = 48
    for (i in 0..n) {
        val phi = Math.PI * i / n
        val pt = Offset(c.x + side * r * sin(phi).toFloat(), c.y - r * cos(phi).toFloat())
        if (i == 0) p.moveTo(pt.x, pt.y) else p.lineTo(pt.x, pt.y)
    }
    for (i in n downTo 0) {
        val phi = Math.PI * i / n
        p.lineTo(c.x + side * r * k * sin(phi).toFloat(), c.y - r * cos(phi).toFloat())
    }
    p.close()
    drawPath(p, lit)
    drawCircle(Brush.radialGradient(listOf(Color.Transparent, Color(0x55000000)), c, r), r, c)
}

private fun smooth01(x: Float): Float { val t = x.coerceIn(0f, 1f); return t * t * (3 - 2 * t) }

/**
 * @param intro 0..1 self-draw progress (rings sweep in one after another)
 * @param highlight ring key to emphasise ("nazhigai", "nakshatra", "tithi", "yoga", "karana"), or null
 * @param onRingTap called with the ring key under a tap
 */
@Composable
fun ClockFace(
    modifier: Modifier, jd: Double, day: DayPanchanga, sunSid: Double, moonSid: Double, elong: Double,
    t: Float = 0f, intro: Float = 1f, highlight: String? = null, onRingTap: (String?) -> Unit = {},
) {
    val tm = rememberTextMeasurer(cacheSize = 512)
    val gpu = LocalSkyGpu.current
    Canvas(
        modifier.pointerInput(Unit) {
            detectTapGestures { o ->
                val u = size.width.coerceAtMost(size.height) / 2f / 5.32f
                val d = hypot(o.x - size.width / 2f, o.y - size.height / 2f) / u
                onRingTap(FACE_RINGS.firstOrNull { d >= it.second.first && d <= it.second.second }?.first)
            }
        }
    ) {
        val c = center
        val u = size.minDimension / 2f / 5.32f
        fun r(x: Double) = (x * u).toFloat()
        val len = day.nextSunrise - day.sunrise
        fun frac(t: Double) = (t - day.sunrise) / len
        fun ringAlpha(key: String) = if (highlight == null || highlight == key) 1f else 0.28f
        fun prog(i: Int) = smooth01((intro - i * 0.14f) / 0.45f)
        /** clip to the part of the ring already "drawn" by the intro sweep */
        fun DrawScope.swept(i: Int, block: DrawScope.() -> Unit) {
            val p = prog(i)
            if (p <= 0f) return
            if (p >= 1f) { block(); return }
            val wedge = Path().apply { moveTo(c.x, c.y); arcTo(Rect(c, size.maxDimension), -90f, 360f * p, false); close() }
            clipPath(wedge) { block() }
        }

        // backdrop glow + bezel
        drawCircle(Brush.radialGradient(listOf(C.lapis.copy(alpha = 0.55f), Color.Transparent), c, r(6.2)), r(6.2), c)
        drawCircle(Brush.sweepGradient(listOf(C.brass, C.goldSoft, C.brass, Color(0xFF7A5528), C.brass), c), r(5.28), c, alpha = prog(0).coerceAtLeast(0.2f))
        drawCircle(C.ink, r(5.0), c)

        // ---- 1. nāḻigai dial 4.30–5.00 (gold)
        swept(0) {
            val a = ringAlpha("nazhigai")
            val ssF = frac(day.sunset)
            drawPath(annulus(c, r(4.6), r(5.0), dialAngle(0.0), 360 * ssF), C.dayArc.copy(alpha = a))
            drawPath(annulus(c, r(4.6), r(5.0), dialAngle(ssF), 360 * (1 - ssF)), C.nightArc.copy(alpha = a))
            drawCircle(C.ink2, r(4.6), c)
            for ((span, col) in listOf(day.rahu to C.kumkum, day.yama to C.plum, day.gulika to C.copper)) {
                drawPath(annulus(c, r(4.32), r(4.58), dialAngle(frac(span.first)), 360 * (frac(span.second) - frac(span.first))), col.copy(alpha = 0.85f * a))
            }
            for (i in 0 until 240) {
                val major = i % 4 == 0
                val ang = dialAngle(i / 240.0)
                drawLine((if (major) RingColor.NAZHIGAI else C.muted.copy(alpha = 0.5f)).copy(alpha = (if (major) 0.9f else 0.5f) * a), polar(c, r(if (major) 4.78 else 4.88), ang), polar(c, r(4.98), ang), strokeWidth = if (major) 1.6f else 0.8f)
            }
            for (n in 0 until 60 step 5) centeredText(tm, "$n", polar(c, r(4.66), dialAngle(n / 60.0)), T.mono(9.sp, C.star.copy(alpha = 0.9f * a)))
            drawCircle(RingColor.NAZHIGAI.copy(alpha = 0.55f * a), r(4.30), c, style = Stroke(1.2f))
        }

        // ---- 2. nakṣatra ring 3.35–4.20 (blue), Meṣa 0° at top, counter-clockwise
        val span27 = 360.0 / 27
        val curNak = (moonSid / span27).toInt() % 27
        swept(1) {
            val a = ringAlpha("nakshatra")
            val blueA = lerp(C.cellA, RingColor.NAKSHATRA, 0.22f); val blueB = lerp(C.cellB, RingColor.NAKSHATRA, 0.12f)
            for (i in 0 until 27) {
                val col = if (i == curNak) RingColor.NAKSHATRA.copy(alpha = 0.75f) else if (i % 2 == 0) blueA else blueB
                drawPath(annulus(c, r(3.35), r(4.2), skyAngle((i + 1) * span27), span27), col.copy(alpha = col.alpha * a))
                centeredText(tm, "${i + 1}", polar(c, r(3.56), skyAngle((i + 0.5) * span27)), T.mono(8.sp, (if (i == curNak) Color.White else C.muted).copy(alpha = a)))
            }
            for (i in 0 until 12) {
                val ang = skyAngle(i * 30.0)
                drawLine(C.gold.copy(alpha = a), polar(c, r(3.35), ang), polar(c, r(4.2), ang), strokeWidth = 1.4f)
                val mid = skyAngle(i * 30.0 + 15)
                centeredText(tm, Tables.rasi[i].devanagari, polar(c, r(3.9), mid), T.skt(10.sp, C.goldSoft.copy(alpha = 0.9f * a)), uprightRotation(mid + 90))
            }
            drawCircle(RingColor.NAKSHATRA.copy(alpha = 0.7f * a), r(4.2), c, style = Stroke(1.4f))
            drawCircle(RingColor.NAKSHATRA.copy(alpha = 0.7f * a), r(3.35), c, style = Stroke(1.4f))
        }
        // Sun and Moon markers on the nakṣatra ring
        if (prog(1) > 0.9f) {
            val sp = polar(c, r(4.2), skyAngle(sunSid))
            drawCircle(Brush.radialGradient(listOf(C.gold.copy(alpha = 0.7f), Color.Transparent), sp, r(0.5)), r(0.5), sp)
            drawCircle(C.goldSoft, r(0.16), sp)
            drawCircle(C.moon, r(0.13), polar(c, r(4.2), skyAngle(moonSid)))
        }

        // ---- 3. tithi ring 2.45–3.25 (silver), rotates with the Sun; karaṇa half-ticks in copper
        val curTithi = (elong / 12).toInt() % 30
        swept(2) {
            val a = ringAlpha("tithi")
            val ka = if (highlight == null || highlight == "karana" || highlight == "tithi") 1f else 0.28f
            for (i in 0 until 30) {
                val col = when { i == 14 -> Color(0xFFDCCFAE); i == 29 -> Color(0xFF020308); i < 15 -> lerp(C.sukla, RingColor.TITHI, 0.18f); else -> C.krsna }
                val start = skyAngle(sunSid + (i + 1) * 12.0)
                drawPath(annulus(c, r(2.45), r(3.25), start, 12.0), col.copy(alpha = a))
                drawLine(C.ink.copy(alpha = a), polar(c, r(2.45), start), polar(c, r(3.25), start), strokeWidth = 1f)
                val mid = skyAngle(sunSid + i * 12.0 + 6)
                drawLine(RingColor.KARANA.copy(alpha = 0.9f * ka), polar(c, r(3.02), mid), polar(c, r(3.25), mid), strokeWidth = if (highlight == "karana") 2.4f else 1.4f)
                centeredText(tm, "${i % 15 + 1}", polar(c, r(2.78), skyAngle(sunSid + i * 12.0 + 3)), T.mono(8.sp, (if (i == 14) C.ink else C.star.copy(alpha = 0.85f)).copy(alpha = a)))
            }
            drawPath(annulus(c, r(2.45), r(3.25), skyAngle(sunSid + (curTithi + 1) * 12.0), 12.0), C.goldSoft.copy(alpha = a), style = Stroke(2.4f))
            val kHalf = ((elong / 6).toInt() % 2)
            drawPath(annulus(c, r(3.12), r(3.25), skyAngle(sunSid + curTithi * 12.0 + (kHalf + 1) * 6.0), 6.0), RingColor.KARANA.copy(alpha = ka))
            drawCircle(RingColor.TITHI.copy(alpha = 0.6f * a), r(3.25), c, style = Stroke(1.2f))
        }

        // ---- 4. yoga ring 1.75–2.35 (teal); 17 and 27 in kumkum; pointer at λ☉ + λ☾
        val ys = Engine.norm(sunSid + moonSid)
        val curYoga = (ys / span27).toInt() % 27
        swept(3) {
            val a = ringAlpha("yoga")
            val tA = lerp(C.cellA, RingColor.YOGA, 0.25f); val tB = lerp(C.cellB, RingColor.YOGA, 0.14f)
            for (i in 0 until 27) {
                val base = if (i == 16 || i == 26) C.kumkum.copy(alpha = 0.8f) else if (i % 2 == 0) tA else tB
                drawPath(annulus(c, r(1.75), r(2.35), skyAngle((i + 1) * span27), span27), (if (i == curYoga) RingColor.YOGA.copy(alpha = 0.85f) else base).copy(alpha = a))
            }
            drawPath(annulus(c, r(1.75), r(2.35), skyAngle((curYoga + 1) * span27), span27), Color.White.copy(alpha = 0.8f * a), style = Stroke(1.5f))
            drawCircle(C.goldSoft.copy(alpha = a), r(0.08), polar(c, r(2.42), skyAngle(ys)))
            drawCircle(RingColor.YOGA.copy(alpha = 0.7f * a), r(2.35), c, style = Stroke(1.2f))
        }

        // ---- radial Sun (gold) and Moon (silver) lines 1.55 → 3.8
        if (prog(3) > 0.8f) {
            drawLine(C.gold, polar(c, r(1.55), skyAngle(sunSid)), polar(c, r(3.8), skyAngle(sunSid)), strokeWidth = 2f, cap = StrokeCap.Round)
            drawLine(C.moon, polar(c, r(1.55), skyAngle(moonSid)), polar(c, r(3.8), skyAngle(moonSid)), strokeWidth = 1.6f, cap = StrokeCap.Round)
        }

        // ---- centre Moon 0–1.45: textured, lit by light vector (sin e, 0, −cos e)
        drawCircle(C.ink, r(1.5), c)
        val e = Math.toRadians(elong)
        val light = V3(sin(e).toFloat(), 0f, -cos(e).toFloat())
        val moonA = smooth01((intro - 0.35f) / 0.4f)
        if (moonA > 0f && gpu?.sphere(this, "moon", c, r(1.4), BodyFrame.FACING, light, t, moonA) != true) moonPhase(c, r(1.4), elong)
        drawCircle(C.gold.copy(alpha = 0.7f), r(1.52), c, style = Stroke(1.5f))

        // ---- ring name tags, pinned on each ring along the upper-left diagonal (horizontal, so they stay legible)
        if (intro >= 1f) {
            val tagAng = 225.0 // screen degrees clockwise from +x → upper left
            for ((key, band) in FACE_RINGS) {
                val name = Tables.ring(key).iast.uppercase()
                val col = RingColor.of(key)
                val at = polar(c, r((band.first + band.second) / 2), tagAng)
                val style = TextStyle(fontFamily = F.sans, fontSize = 8.5.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 0.12.em, color = col)
                val l = tm.measure(name, style)
                val w = l.size.width + 14f; val h = l.size.height + 6f
                val tl = Offset(at.x - w / 2, at.y - h / 2)
                val a = ringAlpha(key).coerceAtLeast(0.45f)
                drawRoundRect(Color(0xF0050712), tl, Size(w, h), androidx.compose.ui.geometry.CornerRadius(h / 2), alpha = a)
                drawRoundRect(col, tl, Size(w, h), androidx.compose.ui.geometry.CornerRadius(h / 2), style = Stroke(1.2f), alpha = a)
                drawText(l, topLeft = Offset(at.x - l.size.width / 2f, at.y - l.size.height / 2f), alpha = a)
            }
        }

        // ---- main hand 1.52 → 4.98 (clockwise, one sweep per sunrise-to-sunrise; moves continuously)
        val ha = dialAngle(frac(jd).coerceIn(0.0, 1.0) * prog(0))
        drawLine(Color(0x55000000), polar(c, r(1.56), ha) + Offset(2f, 3f), polar(c, r(4.98), ha) + Offset(2f, 3f), strokeWidth = 3.2f, cap = StrokeCap.Round)
        drawLine(C.goldSoft, polar(c, r(1.56), ha), polar(c, r(4.98), ha), strokeWidth = 2.6f, cap = StrokeCap.Round)
        drawCircle(C.goldSoft, r(0.09), polar(c, r(4.98), ha))
    }
}

/** Simple starfield: seeded positions, twinkle driven by [t] seconds (fallback when the catalogue is absent). */
class Starfield(n: Int, seed: Long) {
    private val rnd = java.util.Random(seed)
    val x = FloatArray(n) { rnd.nextFloat() }
    val y = FloatArray(n) { rnd.nextFloat() }
    val mag = FloatArray(n) { val g = rnd.nextFloat(); g * g * g }
    val phase = FloatArray(n) { rnd.nextFloat() * 6.28f }
    val tint = IntArray(n) { rnd.nextInt(10) }

    fun draw(s: DrawScope, t: Float, size: Size, parallax: Offset = Offset.Zero, alpha: Float = 1f) {
        for (i in x.indices) {
            val tw = 0.75f + 0.25f * sin(t * (0.8f + (i % 7) * 0.2f) + phase[i])
            val a = (0.25f + 0.75f * mag[i]) * tw * alpha
            val col = when (tint[i]) { 0 -> Color(0xFFBFD4FF); 1 -> Color(0xFFFFE2B0); 2 -> Color(0xFFFFC9A0); else -> C.star }
            val px = ((x[i] * size.width + parallax.x * (0.3f + mag[i])) % size.width + size.width) % size.width
            val py = ((y[i] * size.height + parallax.y * (0.3f + mag[i])) % size.height + size.height) % size.height
            s.drawCircle(col.copy(alpha = a.coerceIn(0f, 1f)), 0.6f + 1.6f * mag[i], Offset(px, py))
        }
    }
}

fun angDiff(a: Double, b: Double) = abs(((a - b) % 360 + 540) % 360 - 180)
