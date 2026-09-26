// "Now" (clock face + readout) and "Sky" (Kālacakra / Horizon) share one stage so the clock face can
// lift off into the sky: the face tilts flat and fades as the orbit camera descends from top-down.
// Motion: rings self-draw on first show, the hand sweeps continuously, lock-on flights warp the stars,
// Kālacakra ⇄ Horizon zoom-crossfade, and changing values slide in.
package org.hora.panchanga.ui

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameMillis
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.hora.panchanga.AppState
import org.hora.panchanga.core.Anga
import org.hora.panchanga.core.Engine
import org.hora.panchanga.core.Limbs
import org.hora.panchanga.core.Nazhigai
import org.hora.panchanga.core.Planets
import org.hora.panchanga.core.Tables
import kotlin.math.PI
import kotlin.math.sin

private val EASE = CubicBezierEasing(0.65f, 0f, 0.35f, 1f)
private fun smooth(a: Float, b: Float, x: Float): Float { val t = ((x - a) / (b - a)).coerceIn(0f, 1f); return t * t * (3 - 2 * t) }

enum class SkyDir { KALACAKRA, HORIZON }

/** Tracks whether the face intro has played in this process, so tab switches don't replay it. */
private object IntroOnce { var played = false }

@Composable
fun NowSkyStage(state: AppState, sky: Boolean, onLift: (Boolean) -> Unit) {
    val gpu = LocalSkyGpu.current
    val lift = remember { Animatable(if (sky) 1f else 0f) }
    LaunchedEffect(sky) { lift.animateTo(if (sky) 1f else 0f, tween(1700, easing = EASE)) }
    val intro = remember { Animatable(if (IntroOnce.played) 1f else 0f) }
    LaunchedEffect(Unit) { if (!IntroOnce.played) { intro.animateTo(1f, tween(2400, easing = CubicBezierEasing(0.2f, 0f, 0.1f, 1f))); IntroOnce.played = true } }

    var dir by rememberSaveable { mutableStateOf(SkyDir.KALACAKRA) }
    val horizonMix = remember { Animatable(0f) }
    LaunchedEffect(dir) { horizonMix.animateTo(if (dir == SkyDir.HORIZON) 1f else 0f, tween(1300, easing = EASE)) }
    var lock by remember { mutableStateOf(Target.OVERVIEW) }
    val camAnim = remember { Animatable(1f) }
    var camFrom by remember { mutableStateOf(Cam(0f, 0f, 13.5f, 42f, 0f)) }
    var userAz by remember { mutableFloatStateOf(0f) }
    var userEl by remember { mutableFloatStateOf(0f) }
    var zoomF by remember { mutableFloatStateOf(1f) }
    var heading by remember { mutableFloatStateOf(90f) }
    var pitch by remember { mutableFloatStateOf(20f) }
    var fov by remember { mutableFloatStateOf(80f) }
    var ring by remember { mutableStateOf<String?>(null) }
    var tSec by remember { mutableFloatStateOf(0f) }
    val stars = remember { Starfield(420, 7) }
    LaunchedEffect(Unit) { val t0 = withFrameMillis { it }; while (true) { withFrameMillis { tSec = (it - t0) / 1000f } } }

    // continuous time: tSec changes every frame, so re-reading the clock here keeps the hand and the sky moving smoothly
    val jd = if (tSec >= 0f) state.jdNow() else state.jd
    val day = state.day(jd)
    val ls = Engine.sidSun(jd); val lm = Engine.sidMoon(jd); val e = Engine.elong(jd)
    val now = SkyNow(jd, ls, lm, e, Planets.all(jd))
    val starDirs = remember(gpu?.ready, gpu?.stars?.size) { gpu?.stars?.takeIf { it.isNotEmpty() }?.let { StarDirs(it, now.eps, now.ayan) } }
    val e01 = EASE.transform(lift.value)

    val goalCam = goal(lock, now)
    val k = camAnim.value
    val baseCam = lerpCam(camFrom, goalCam, EASE.transform(k))
    val warp = if (camAnim.isRunning) sin(PI * k).toFloat() * 0.9f else 0f
    val orbitCam0 = baseCam.copy(az = baseCam.az + userAz, el = (baseCam.el + userEl).coerceIn(5f, 89f), fit = baseCam.fit * zoomF)
    // Kālacakra → Horizon: dive toward Earth and level out while the horizon fades in
    val hm = EASE.transform(horizonMix.value)
    val orbitCam = lerpCam(orbitCam0, Cam(0f, 0f, 1.3f, 6f, orbitCam0.az), hm)
    val clockCam = Cam(0f, 0f, 11.2f, 89.5f, 0f)
    val cam = lerpCam(clockCam, orbitCam, e01)

    fun lockTo(t: Target) {
        camFrom = orbitCam0.copy(az = orbitCam0.az - userAz)
        userAz = 0f; userEl = 0f; zoomF = 1f
        lock = t
    }
    LaunchedEffect(lock) { camAnim.snapTo(0f); camAnim.animateTo(1f, tween(1600, easing = androidx.compose.animation.core.LinearEasing)) }
    LaunchedEffect(dir) { if (dir == SkyDir.HORIZON) { val h = horizonInfo(state.jd, state.place.lat, state.place.lon); val m = h.moonAlt > -2; heading = (if (m) h.moonAz else h.sunAz).toFloat(); pitch = (if (m) h.moonAlt else h.sunAlt).toFloat().coerceIn(-10f, 70f) } }

    BoxWithConstraints(Modifier.fillMaxSize().background(C.stage)) {
        val w = maxWidth
        // ---------- sky layer
        if (e01 > 0.02f) {
            val skyAlpha = smooth(0.3f, 0.85f, e01)
            if (hm < 0.999f) {
                KalacakraView(
                    Modifier.fillMaxSize(), cam, now, lock, tSec, stars, starDirs, alpha = skyAlpha * (1 - smooth(0.4f, 1f, hm)), warp = warp,
                    onOrbit = { dAz, dEl, z -> if (sky) { userAz += dAz; userEl += dEl; zoomF = (zoomF / z).coerceIn(0.3f, 3f) } },
                    onTap = { t -> if (sky && t != null) lockTo(t) },
                )
            }
            if (hm > 0.001f && sky) {
                HorizonView(
                    Modifier.fillMaxSize().graphicsLayer { val s = 1.25f - 0.25f * hm; scaleX = s; scaleY = s; alpha = smooth(0.25f, 1f, hm) },
                    now, state.place.lat, state.place.lon, heading, pitch, fov, tSec, gpu?.stars ?: emptyList(), 1f,
                ) { dh, dp, z ->
                    heading = Engine.norm(heading + dh * fov / 1000.0).toFloat(); pitch = (pitch + dp * fov / 1000f).coerceIn(-20f, 88f); fov = (fov / z).coerceIn(25f, 110f)
                }
            }
        }
        // ---------- clock face layer (lies flat and fades as it lifts)
        val faceAlpha = 1f - smooth(0.45f, 0.9f, e01)
        if (faceAlpha > 0.01f) {
            Column(Modifier.fillMaxSize().padding(top = 44.dp).verticalScroll(rememberScrollState(), enabled = !sky)) {
                Box(Modifier.fillMaxWidth().aspectRatio(1f).padding(horizontal = 10.dp)) {
                    ClockFace(
                        Modifier.fillMaxSize().graphicsLayer {
                            rotationX = 62f * e01; scaleX = 1f + 0.5f * e01; scaleY = 1f + 0.5f * e01; alpha = faceAlpha; cameraDistance = 14f * density
                        },
                        jd, day, ls, lm, e, tSec, intro.value, ring,
                    ) { tapped -> ring = if (ring == tapped) null else tapped }
                }
                Box(Modifier.graphicsLayer { alpha = faceAlpha * smooth(0.55f, 1f, intro.value); translationY = 80f * e01 + 40f * (1 - intro.value) }) {
                    Column {
                        if (!sky) LiftButton(Modifier.align(Alignment.CenterHorizontally).padding(top = 6.dp)) { onLift(true) }
                        RingLegend(ring) { key -> ring = if (ring == key) null else key }
                        Readout(state, jd, intro.value)
                    }
                }
            }
        }
        // ---------- sky HUD
        if (e01 > 0.6f) {
            Box(Modifier.fillMaxSize().graphicsLayer { alpha = smooth(0.6f, 1f, e01) }) {
                Row(Modifier.fillMaxWidth().padding(start = 12.dp, end = 12.dp, top = 52.dp), verticalAlignment = Alignment.Top) {
                    PillGroup {
                        Pill("Kālacakra", dir == SkyDir.KALACAKRA) { dir = SkyDir.KALACAKRA }
                        Pill("Horizon", dir == SkyDir.HORIZON) { dir = SkyDir.HORIZON }
                    }
                    Spacer(Modifier.weight(1f))
                    TopRead(state, jd)
                }
                Column(Modifier.align(Alignment.BottomCenter).padding(start = 12.dp, end = 12.dp, bottom = 128.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    AnimatedContent(
                        targetState = dir, label = "hud",
                        transitionSpec = { (fadeIn(tween(420, 180)) + slideInVertically(tween(520, 120)) { it / 3 }) togetherWith (fadeOut(tween(240)) + slideOutVertically(tween(300)) { it / 4 }) },
                    ) { d ->
                        if (d == SkyDir.KALACAKRA) Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            AnimatedContent(
                                targetState = lock, label = "dossier",
                                transitionSpec = { (fadeIn(tween(380, 140)) + slideInVertically(spring(Spring.DampingRatioLowBouncy, Spring.StiffnessLow)) { it / 5 }) togetherWith fadeOut(tween(160)) },
                            ) { l -> Dossier(state, l, now, onLand = { onLift(false) }) }
                            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                Target.entries.forEachIndexed { i, t -> TargetChip(i + 1, t, lock == t) { lockTo(t) } }
                            }
                        } else HorizonPanel(state, now) { key ->
                            val h = horizonInfo(state.jd, state.place.lat, state.place.lon)
                            when (key) {
                                Target.SUN -> { heading = h.sunAz.toFloat(); pitch = h.sunAlt.toFloat().coerceIn(-15f, 80f) }
                                Target.MOON -> { heading = h.moonAz.toFloat(); pitch = h.moonAlt.toFloat().coerceIn(-15f, 80f) }
                                else -> {
                                    val g = key.graha?.let { gk -> now.grahas.firstOrNull { it.key == gk } }
                                    val a = if (g != null) Engine.altAz(g.sidLon, g.lat, state.jd, state.place.lat, state.place.lon)
                                    else { val span = 360.0 / 27; val n = (lm / span).toInt(); Engine.altAz(n * span + span / 2, 0.0, state.jd, state.place.lat, state.place.lon) }
                                    heading = a.second.toFloat(); pitch = a.first.toFloat().coerceIn(-15f, 80f)
                                }
                            }
                        }
                    }
                }
            }
        }
        Scrubber(state, modifier = Modifier.align(Alignment.BottomCenter).padding(start = 12.dp, end = 12.dp, bottom = 12.dp).width(w - 24.dp))
    }
}

@Composable
private fun LiftButton(modifier: Modifier, onClick: () -> Unit) {
    Row(
        modifier.clip(RoundedCornerShape(999.dp)).background(Color(0xD1080B18)).border(1.dp, C.gold, RoundedCornerShape(999.dp))
            .clickable(onClick = onClick).padding(horizontal = 18.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text("▲", style = T.body(10.sp, C.gold))
        Spacer(Modifier.width(8.dp))
        Text("LIFT OFF INTO THE SKY", style = T.caps(12.sp, C.goldSoft))
    }
}

/** The ring key under the face: each ring's colour, name and what it measures; tap to highlight it. */
@Composable
private fun RingLegend(selected: String?, onSelect: (String) -> Unit) {
    val keys = listOf("nazhigai", "nakshatra", "tithi", "karana", "yoga")
    Column(Modifier.fillMaxWidth().padding(start = 14.dp, end = 14.dp, top = 12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text("THE RINGS · OUTSIDE IN — TAP ONE", style = T.caps(10.sp))
        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            for (key in keys) {
                val r = Tables.ring(key)
                val col = RingColor.of(key)
                val on = selected == key
                Row(
                    Modifier.clip(RoundedCornerShape(12.dp)).background(if (on) col.copy(alpha = 0.16f) else Color(0xB8080B18))
                        .border(1.dp, if (on) col else col.copy(alpha = 0.35f), RoundedCornerShape(12.dp))
                        .clickable { onSelect(key) }.padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(Modifier.size(10.dp).clip(CircleShape).background(col))
                    Spacer(Modifier.width(8.dp))
                    Text(r.iast, style = T.skt(16.sp, if (on) col else C.star, italic = true))
                }
            }
        }
        selected?.let { key -> Text(Tables.ring(key).english, style = T.body(13.sp, RingColor.of(key))) }
    }
}

@Composable
private fun TopRead(state: AppState, jd: Double) {
    val day = state.day(jd)
    val v = Nazhigai.vinazhigai(jd, day.sunrise).coerceAtLeast(0)
    Column(horizontalAlignment = Alignment.End) {
        Row(verticalAlignment = Alignment.Bottom) {
            Text(state.vara(day.weekday), style = T.skt(22.sp, C.goldSoft))
            Spacer(Modifier.width(8.dp)); Text(Tables.vara[day.weekday].tamil, style = T.tamil(15.sp))
        }
        Text("%02d:%02d".format(v / 60, v % 60), style = T.mono(30.sp, weight = androidx.compose.ui.text.font.FontWeight.Normal))
        Row { Term("Nāḻigai", T.body(11.sp, C.muted), "nāḻigai"); Text(" since sunrise · ", style = T.body(11.sp, C.muted)); Text(state.time(jd), style = T.mono(11.sp)) }
    }
}

/** SPEC §4.2 readout. */
@Composable
fun Readout(state: AppState, jd: Double, intro: Float = 1f) {
    val day = state.day(jd)
    val v = Nazhigai.vinazhigai(jd, day.sunrise).coerceAtLeast(0)
    Column(Modifier.fillMaxWidth().padding(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 150.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Row(verticalAlignment = Alignment.Bottom) {
            Term("Vāra", T.skt(34.sp, C.goldSoft), state.vara(day.weekday))
            Spacer(Modifier.width(12.dp)); Text(Tables.vara[day.weekday].tamil, style = T.tamil(22.sp))
        }
        Text("${state.date(day.sunrise + 0.3)} · ${state.month(day.tamilMonth)} ${day.tamilDay} · ${Tables.samvatsara[day.samvat]}", style = T.body(15.sp))
        Text("${state.place.name} · sunrise ${state.time(day.sunrise)} · sunset ${state.time(day.sunset)}", style = T.body(13.sp, C.muted))
        Row(Modifier.padding(top = 8.dp), verticalAlignment = Alignment.Bottom) {
            RollingDigits("%02d".format(v / 60), 54)
            Text(":", style = T.mono(54.sp, C.gold, androidx.compose.ui.text.font.FontWeight.Normal))
            RollingDigits("%02d".format(v % 60), 54)
        }
        Row(Modifier.padding(bottom = 8.dp)) {
            Term("Nāḻigai", T.body(13.sp, C.muted), "nāḻigai"); Text(" : ", style = T.body(13.sp, C.muted))
            Term("Vināḻigai", T.body(13.sp, C.muted), "vināḻigai"); Text(" since sunrise · ", style = T.body(13.sp, C.muted)); Text(state.time(jd), style = T.mono(13.sp))
        }
        val rows = listOf("Tithi" to Anga.TITHI, "Nakṣatra" to Anga.NAKSHATRA, "Yoga" to Anga.YOGA, "Karaṇa" to Anga.KARANA)
        rows.forEachIndexed { i, (label, kind) ->
            val a = state.anga(kind, jd)
            val name = when (kind) { Anga.TITHI -> state.tithi(a.idx); Anga.NAKSHATRA -> state.nakshatra(a.idx); Anga.YOGA -> state.yoga(a.idx); else -> state.karana(a.idx) }
            val warn = (kind == Anga.YOGA && !Limbs.isShubhaYoga(a.idx + 1)) || (kind == Anga.KARANA && Limbs.karanaName(a.idx + 1) == "Viṣṭi")
            val ringKey = when (kind) { Anga.TITHI -> "tithi"; Anga.NAKSHATRA -> "nakshatra"; Anga.YOGA -> "yoga"; else -> "karana" }
            val stagger = smooth(0.55f + i * 0.08f, 0.85f + i * 0.08f, intro)
            Box(Modifier.graphicsLayer { alpha = stagger; translationY = (1 - stagger) * 40f }) {
                LimbRowColored(label, RingColor.of(ringKey), name, "ends ${Nazhigai.format(a.end, day.sunrise)} · ${state.time(a.end)}", a.end > day.nextSunrise,
                    ((jd - a.start) / (a.end - a.start)).toFloat(), warn)
            }
        }
        Column(Modifier.padding(top = 8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            for ((name, col, span) in listOf(Triple("Rāhu kālam", C.kumkum, day.rahu), Triple("Yamagaṇḍam", C.plum, day.yama), Triple("Kuḷikai", C.copper, day.gulika))) {
                KalaRow(name, col, "${state.time(span.first)}–${state.time(span.second)}", jd >= span.first && jd < span.second)
            }
        }
    }
}

/** A limb row: ring-coloured edge and label, the name (slides when it changes), end time, progress. */
@Composable
private fun LimbRowColored(label: String, ringColor: Color, name: String, ends: String, nextDay: Boolean, progress: Float, warn: Boolean) {
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(Color(0x8C080B18))
            .border(1.dp, ringColor.copy(alpha = 0.35f), RoundedCornerShape(10.dp)).padding(start = 0.dp, end = 12.dp),
    ) {
        Box(Modifier.width(4.dp).heightIn(min = 64.dp).background(ringColor))
        Column(Modifier.padding(start = 10.dp, top = 7.dp, bottom = 7.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Caps(label, ringColor, 11)
                Spacer(Modifier.weight(1f))
                Text(ends, style = T.mono(11.sp, C.muted))
                if (nextDay) Text("  next day", style = T.mono(10.sp, C.gold))
            }
            AnimatedContent(
                targetState = name, label = "limb",
                transitionSpec = { (slideInVertically(tween(420, easing = EASE)) { it } + fadeIn(tween(420))) togetherWith (slideOutVertically(tween(320)) { -it } + fadeOut(tween(260))) },
            ) { n -> Text(n, style = T.skt(22.sp, if (warn) C.kumkum else C.star)) }
            Box(Modifier.padding(top = 6.dp).fillMaxWidth().heightIn(min = 3.dp, max = 3.dp).clip(RoundedCornerShape(2.dp)).background(C.muted.copy(alpha = 0.2f))) {
                Box(Modifier.fillMaxWidth(progress.coerceIn(0f, 1f)).heightIn(min = 3.dp, max = 3.dp).background(ringColor))
            }
        }
    }
}

/** Digits that roll vertically when they change. */
@Composable
private fun RollingDigits(text: String, size: Int) {
    Row {
        text.forEachIndexed { i, ch ->
            AnimatedContent(
                targetState = ch, label = "digit$i",
                transitionSpec = { (slideInVertically(tween(380, easing = EASE)) { -it } + fadeIn(tween(300))) togetherWith (slideOutVertically(tween(380, easing = EASE)) { it } + fadeOut(tween(240))) },
            ) { c -> Text(c.toString(), style = T.mono(size.sp, weight = androidx.compose.ui.text.font.FontWeight.Normal)) }
        }
    }
}

@Composable
private fun TargetChip(key: Int, t: Target, on: Boolean, onClick: () -> Unit) {
    Row(
        Modifier.clip(RoundedCornerShape(10.dp)).background(if (on) C.gold.copy(alpha = 0.12f) else Color(0xB8080B18))
            .border(1.dp, if (on) C.gold.copy(alpha = 0.7f) else C.muted.copy(alpha = 0.18f), RoundedCornerShape(10.dp))
            .clickable(onClick = onClick).padding(horizontal = 10.dp, vertical = 7.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text("$key", style = T.mono(10.sp, C.muted), modifier = Modifier.border(1.dp, C.muted.copy(alpha = 0.35f), RoundedCornerShape(4.dp)).padding(horizontal = 5.dp, vertical = 1.dp))
        Spacer(Modifier.width(8.dp))
        Column {
            Text(t.label, style = T.skt(16.sp, if (on) C.goldSoft else C.star, italic = true))
            Text(t.gloss.uppercase(), style = T.caps(9.sp))
        }
    }
}

/** The locked target's card (Sky Navigator "dossier"): name, science and lore. */
@Composable
private fun Dossier(state: AppState, lock: Target, now: SkyNow, onLand: () -> Unit) {
    val jd = now.jd
    val day = state.day(jd)
    val ls = now.sunSid; val lm = now.moonSid; val e = now.elong; val ys = Engine.norm(ls + lm)
    val ti = Limbs.tithiIndex(e); val ki = Limbs.karanaIndex(e); val ni = Limbs.nakshatraIndex(lm); val yi = Limbs.yogaIndex(ls, lm)
    val pada = Limbs.pada(lm)
    val lit = Math.round(Limbs.illumination(e) * 100)
    data class D(val kicker: String, val coord: String, val name: String, val gloss: String, val text: String, val rows: List<Pair<String, String>>)
    val d = when (lock) {
        Target.NAKSHATRA -> { val info = Tables.nakshatra[ni - 1]
            D("Locked", "${deg((ni - 1) * 40.0 / 3)}–${deg(ni * 40.0 / 3)}", state.nakshatra(ni - 1), "Nakṣatra $ni of 27 · ${info.deity}",
                "27 lunar mansions of 13°20′, each split into 4 padas. ${info.iast} is ${Tables.natures[info.nature]?.meaning} — ${info.temperament.lowercase()}.",
                listOf("Moon at" to deg(lm), "Pada" to "$pada of 4", "Ends" to state.time(state.anga(Anga.NAKSHATRA, jd).end))) }
        Target.TITHI -> D("Locked", "E ${deg(e)}", state.tithi(ti - 1), "Tithi $ti of 30 · ${Limbs.tithiCategory(ti)}",
            "A tithi is each 12° the Moon gains on the Sun. The gold arc around Earth is that angle; thirty tithis make one synodic month.",
            listOf("E = λ☾ − λ☉" to deg(e), "⌊E ÷ 12°⌋ + 1" to "$ti", "Karaṇa ⌊E ÷ 6°⌋ + 1" to "$ki · ${Limbs.karanaName(ki)}", "Ends" to state.time(state.anga(Anga.TITHI, jd).end)))
        Target.YOGA -> D("Locked", "Σ ${deg(ys)}", state.yoga(yi - 1), "Yoga $yi of 27 · ${if (Limbs.isShubhaYoga(yi)) "śubha" else "aśubha"}",
            "Add the Sun's and the Moon's longitudes; the sum in 27 parts of 13°20′ names the yoga. The ring now shows yoga names; 17 and 27 are red.",
            listOf("Σ = λ☉ + λ☾" to deg(ys), "⌊Σ ÷ 13°20′⌋ + 1" to "$yi", "Ends" to state.time(state.anga(Anga.YOGA, jd).end)))
        Target.OVERVIEW -> D("Overview", "", "Kālacakra", "Wheel of time · drag to orbit · pinch to zoom · tap a body",
            "Earth at the centre, the tithi dial around it, the Moon's orbit with Rāhu and Ketu, the five grahas, then the 12 rāśis and 27 nakṣatras against the real Milky Way.",
            listOf("Tithi" to state.tithi(ti - 1), "Nakṣatra" to state.nakshatra(ni - 1), "Yoga" to state.yoga(yi - 1), "Karaṇa" to Limbs.karanaName(ki)))
        else -> {
            val g = Tables.graha(lock.graha!!)
            val lon = when (lock) { Target.SUN -> ls; Target.MOON -> lm; Target.EARTH -> Engine.norm(ls + 180); else -> now.graha(lock.graha).sidLon }
            val pos = now.grahas.firstOrNull { it.key == lock.graha }
            val rows = mutableListOf("Longitude" to deg(lon), "Rāśi" to Tables.rasi[Limbs.rasiIndex(lon) - 1].iast, "Nakṣatra" to "${state.nakshatra(Limbs.nakshatraIndex(lon) - 1)} · ${Limbs.pada(lon)}")
            when (lock) {
                Target.SUN -> { rows += "Sunrise" to state.time(day.sunrise); rows += "Sunset" to state.time(day.sunset) }
                Target.MOON -> { rows += "Lit" to "$lit%"; rows += "Elongation" to deg(e) }
                Target.EARTH -> { rows.clear(); rows += "Observer" to state.place.name; rows += "Sunrise" to state.time(day.sunrise); rows += "Next sunrise" to state.time(day.nextSunrise) }
                else -> pos?.let { if (it.distAu > 0) rows += "Distance" to "%.2f AU".format(it.distAu); rows += "Motion" to if (it.retrograde) "retrograde (vakri)" else "direct" }
            }
            D("Locked", "λ ${deg(lon)}", g.iast, g.english, "${g.science} ${g.lore}", rows)
        }
    }
    var expanded by remember(lock) { mutableStateOf(false) }
    Panel(Modifier.fillMaxWidth().heightIn(max = 300.dp).clickable { expanded = !expanded }, pad = 14.dp) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Caps(d.kicker, C.gold); Spacer(Modifier.width(8.dp)); Text(d.coord, style = T.mono(11.sp, C.muted))
            Spacer(Modifier.weight(1f))
            Text("CLOCK FACE", style = T.caps(10.sp, C.goldSoft), modifier = Modifier.clip(RoundedCornerShape(999.dp)).border(1.dp, C.gold.copy(alpha = 0.5f), RoundedCornerShape(999.dp)).clickable(onClick = onLand).padding(horizontal = 10.dp, vertical = 5.dp))
        }
        Text(d.name, style = T.skt(26.sp, C.goldSoft))
        Text(d.gloss.uppercase(), style = T.caps(9.sp))
        Text(d.text, style = T.body(12.5.sp), maxLines = if (expanded) 8 else 2, overflow = TextOverflow.Ellipsis)
        if (expanded) Column(Modifier.fillMaxWidth()) {
            for ((k, v) in d.rows) Row(Modifier.fillMaxWidth().padding(vertical = 1.dp)) {
                Caps(k, size = 10); Spacer(Modifier.weight(1f)); Text(v, style = T.mono(12.sp))
            }
        } else Text("TAP FOR DETAILS", style = T.caps(9.sp, C.muted.copy(alpha = 0.7f)))
    }
}

@Composable
private fun HorizonPanel(state: AppState, now: SkyNow, onLook: (Target) -> Unit) {
    val h = horizonInfo(now.jd, state.place.lat, state.place.lon)
    fun fa(alt: Double, az: Double) = "${if (alt >= 0) "+" else "−"}${"%.1f".format(kotlin.math.abs(alt))}° alt · ${Math.round(az)}° az"
    Panel(Modifier.fillMaxWidth()) {
        Caps("Observer · ${state.place.name}", C.gold)
        Row(Modifier.fillMaxWidth()) { Text("Sūrya", style = T.skt(15.sp, C.goldSoft, true)); Spacer(Modifier.weight(1f)); Text(fa(h.sunAlt, h.sunAz), style = T.mono(12.sp)) }
        Row(Modifier.fillMaxWidth()) { Text("Candra", style = T.skt(15.sp, italic = true)); Spacer(Modifier.weight(1f)); Text(fa(h.moonAlt, h.moonAz), style = T.mono(12.sp)) }
        Text("Gold line: the ecliptic. The Milky Way and 1,600 real stars are placed for this moment and place; the grahas ride near the ecliptic.", style = T.body(12.sp, C.muted))
        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            for (t in listOf(Target.SUN, Target.MOON, Target.NAKSHATRA, Target.MERCURY, Target.VENUS, Target.MARS, Target.JUPITER, Target.SATURN)) {
                Text(t.label, style = T.skt(15.sp, C.star, true), modifier = Modifier.clip(RoundedCornerShape(999.dp)).border(1.dp, C.muted.copy(alpha = 0.3f), RoundedCornerShape(999.dp)).clickable { onLook(t) }.padding(horizontal = 12.dp, vertical = 5.dp))
            }
        }
    }
}

