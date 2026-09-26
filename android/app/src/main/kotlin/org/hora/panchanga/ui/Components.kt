package org.hora.panchanga.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.takeOrElse
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.hora.panchanga.AppState
import org.hora.panchanga.core.Engine
import org.hora.panchanga.core.Tables
import kotlin.math.abs
import kotlin.math.floor

/** Opens the glossary card for a term. Provided by the app shell. */
val LocalGlossary = staticCompositionLocalOf<(String) -> Unit> { {} }

/** A glossary term: dotted-underlined; tap for its plain-language one-liner. */
@Composable
fun Term(term: String, style: TextStyle, display: String = term, modifier: Modifier = Modifier) {
    val open = LocalGlossary.current
    val known = Tables.glossary.containsKey(term)
    // dotted underline drawn below the descenders so dot-below letters (ṭ ḷ ḻ ṇ ṣ) stay legible
    Text(
        display, style = style,
        modifier = modifier.clickable(enabled = known) { open(term) }.then(
            if (!known) Modifier else Modifier.padding(bottom = 3.dp).drawBehind {
                val y = size.height + 1.dp.toPx()
                drawLine((style.color.takeOrElse { C.star }).copy(alpha = 0.55f), Offset(0f, y), Offset(size.width, y), 1.dp.toPx(),
                    pathEffect = androidx.compose.ui.graphics.PathEffect.dashPathEffect(floatArrayOf(2.dp.toPx(), 2.dp.toPx())))
            }
        ),
    )
}

@Composable
fun Caps(text: String, color: Color = C.muted, size: Int = 11, modifier: Modifier = Modifier) {
    if (Tables.glossary.containsKey(text)) Term(text, T.caps(size.sp, color), text.uppercase(), modifier)
    else Text(text.uppercase(), style = T.caps(size.sp, color), modifier = modifier)
}

@Composable
fun Panel(modifier: Modifier = Modifier, border: Color = C.line, pad: Dp = 16.dp, content: @Composable ColumnScope.() -> Unit) {
    Column(
        modifier.clip(RoundedCornerShape(14.dp)).background(C.panel).border(1.dp, border, RoundedCornerShape(14.dp)).padding(pad),
        verticalArrangement = Arrangement.spacedBy(8.dp), content = content,
    )
}

@Composable
fun Pill(text: String, on: Boolean, modifier: Modifier = Modifier, style: TextStyle = T.caps(11.sp), onClick: () -> Unit) {
    Box(
        modifier.clip(RoundedCornerShape(999.dp)).background(if (on) C.gold.copy(alpha = 0.18f) else Color.Transparent)
            .clickable(onClick = onClick).padding(horizontal = 12.dp, vertical = 6.dp),
    ) { Text(text, style = style.copy(color = if (on) C.goldSoft else C.muted)) }
}

@Composable
fun PillGroup(content: @Composable RowScope.() -> Unit) {
    Row(
        Modifier.clip(RoundedCornerShape(999.dp)).background(Color(0xC7080B18)).border(1.dp, C.line2, RoundedCornerShape(999.dp)).padding(3.dp),
        horizontalArrangement = Arrangement.spacedBy(2.dp), content = content,
    )
}

/** One limb row of the readout: name, "ends NN:VV · h:mm am", progress bar, "next day" flag. */
@Composable
fun LimbRow(label: String, value: String, ends: String, nextDay: Boolean, progress: Float, highlight: Boolean = false, warn: Boolean = false) {
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(Color(0x8C080B18))
            .border(1.dp, if (highlight) C.gold.copy(alpha = 0.74f) else C.gold.copy(alpha = 0.14f), RoundedCornerShape(10.dp))
            .padding(horizontal = 12.dp, vertical = 7.dp),
    ) {
        Box(Modifier.width(92.dp).padding(top = 4.dp)) { Caps(label, size = 12) }
        Column(Modifier.weight(1f)) {
            Text(value, style = T.skt(21.sp, if (warn) C.kumkum else C.star))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(ends, style = T.mono(12.sp, C.muted))
                if (nextDay) Text("  next day", style = T.mono(11.sp, C.gold))
            }
            Box(Modifier.padding(top = 6.dp).fillMaxWidth().height(3.dp).clip(RoundedCornerShape(2.dp)).background(C.muted.copy(alpha = 0.2f))) {
                Box(Modifier.fillMaxWidth(progress.coerceIn(0f, 1f)).height(3.dp).background(C.gold))
            }
        }
    }
}

@Composable
fun KalaRow(name: String, color: Color, span: String, active: Boolean) {
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp))
            .background(if (active) color.copy(alpha = 0.18f) else Color.Transparent).padding(horizontal = 10.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(12.dp).clip(RoundedCornerShape(3.dp)).background(color))
        Spacer(Modifier.width(10.dp))
        Term(name, T.body(15.sp, if (active) Color.White else C.muted))
        Spacer(Modifier.weight(1f))
        Text(span, style = T.mono(13.sp))
    }
}

/**
 * Time console: play/pause, speed presets, Live, the cursor time, and a ±[days] drag track with
 * Pūrṇimā (filled) and Amāvāsyā (hollow) markers.
 */
@Composable
fun Scrubber(state: AppState, days: Int = 15, modifier: Modifier = Modifier) {
    val maxH = days * 24.0
    var width by remember { mutableStateOf(1f) }
    val baseJd = Engine.jdFromEpochMillis(state.nowMs)
    val markers = remember(state.nowMs / 3_600_000, days) {
        val out = mutableListOf<Pair<Float, Boolean>>()
        var prev = floor(Engine.elong(baseJd - days) / 12).toInt()
        var h = -maxH
        while (h <= maxH) {
            val i = floor(Engine.elong(baseJd + h / 24) / 12).toInt()
            if (i != prev) { if (i == 14) out += ((h / maxH + 1) / 2).toFloat() to true; if (i == 29) out += ((h / maxH + 1) / 2).toFloat() to false; prev = i }
            h += 2
        }
        out
    }
    fun scrubTo(x: Float) {
        state.playing = false
        var o = ((x / width).coerceIn(0f, 1f) * 2 - 1) * maxH
        if (abs(o) < maxH * 0.015) o = 0.0
        state.offsetH = o
    }
    Column(
        modifier.clip(RoundedCornerShape(14.dp)).background(Color(0xF7080B18)).border(1.dp, C.line2, RoundedCornerShape(14.dp))
            .padding(start = 12.dp, end = 12.dp, top = 10.dp, bottom = 8.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Box(
                Modifier.size(32.dp).clip(CircleShape).border(1.dp, C.gold, CircleShape)
                    .background(if (state.playing) C.gold.copy(alpha = 0.2f) else Color.Transparent)
                    .clickable {
                        if (!state.playing && state.offsetH >= maxH - 0.01) state.offsetH = -maxH
                        state.playing = !state.playing
                    },
                contentAlignment = Alignment.Center,
            ) {
                Canvas(Modifier.size(12.dp)) {
                    if (state.playing) {
                        drawRect(C.goldSoft, Offset(size.width * 0.15f, 0f), androidx.compose.ui.geometry.Size(size.width * 0.25f, size.height))
                        drawRect(C.goldSoft, Offset(size.width * 0.6f, 0f), androidx.compose.ui.geometry.Size(size.width * 0.25f, size.height))
                    } else drawPath(Path().apply { moveTo(size.width * 0.2f, 0f); lineTo(size.width, size.height / 2); lineTo(size.width * 0.2f, size.height); close() }, C.goldSoft)
                }
            }
            Row(Modifier.clip(RoundedCornerShape(999.dp)).border(1.dp, C.line2, RoundedCornerShape(999.dp)).padding(2.dp)) {
                for ((lab, v) in listOf("1h/s" to 1f, "6h/s" to 6f, "1d/s" to 24f)) {
                    Box(
                        Modifier.clip(RoundedCornerShape(999.dp)).background(if (state.speed == v) C.gold.copy(alpha = 0.18f) else Color.Transparent)
                            .clickable { state.speed = v }.padding(horizontal = 7.dp, vertical = 3.dp),
                    ) { Text(lab, style = T.mono(11.sp, if (state.speed == v) C.goldSoft else C.muted)) }
                }
            }
            val liveOn = state.live
            Row(
                Modifier.clip(RoundedCornerShape(999.dp)).border(1.dp, if (liveOn) C.kumkum.copy(alpha = 0.6f) else C.muted.copy(alpha = 0.3f), RoundedCornerShape(999.dp))
                    .clickable { state.playing = false; state.offsetH = 0.0 }.padding(horizontal = 8.dp, vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(Modifier.size(6.dp).clip(CircleShape).background(if (liveOn) C.kumkum else C.muted))
                Spacer(Modifier.width(5.dp))
                Text("LIVE", style = T.caps(10.sp, if (liveOn) C.kumkum else C.muted))
            }
            Spacer(Modifier.weight(1f))
            Column(horizontalAlignment = Alignment.End) {
                Text(state.time(state.jd), style = T.mono(12.sp), maxLines = 1)
                Row {
                    Text(state.date(state.jd, "EEE d MMM"), style = T.mono(10.sp, C.muted), maxLines = 1)
                    Text(" " + offsetLabel(state.offsetH), style = T.mono(10.sp, C.gold), maxLines = 1)
                }
            }
        }
        Canvas(
            Modifier.fillMaxWidth().height(30.dp)
                .pointerInput(Unit) { detectTapGestures { scrubTo(it.x) } }
                .pointerInput(Unit) { detectHorizontalDragGestures(onDragStart = { scrubTo(it.x) }) { ch, _ -> scrubTo(ch.position.x) } },
        ) {
            width = size.width
            val mid = size.height / 2
            drawLine(C.muted.copy(alpha = 0.35f), Offset(0f, mid), Offset(size.width, mid), 1f)
            for (d in -days..days) {
                val x = ((d / days.toFloat()) + 1) / 2 * size.width
                val major = d % 7 == 0
                drawLine(C.muted.copy(alpha = 0.5f), Offset(x, mid - if (major) 7f else 4f), Offset(x, mid + if (major) 7f else 4f), 1f)
            }
            for ((f, full) in markers) {
                val o = Offset(f * size.width, 7f)
                if (full) drawCircle(C.moon, 5f, o) else drawCircle(C.moon, 5f, o, style = androidx.compose.ui.graphics.drawscope.Stroke(1.5f))
            }
            drawLine(C.gold, Offset(size.width / 2, mid + 4f), Offset(size.width / 2, size.height), 1.5f)
            val kx = ((state.offsetH / maxH + 1) / 2 * size.width).toFloat()
            drawCircle(C.gold.copy(alpha = 0.25f), 13f, Offset(kx, mid))
            drawCircle(C.goldSoft, 8f, Offset(kx, mid))
        }
    }
}

fun offsetLabel(oh: Double): String {
    if (abs(oh) < 1.0 / 60) return "now"
    val ah = abs(oh); val d = floor(ah / 24).toInt(); val h = floor(ah % 24).toInt(); val m = floor(ah * 60 % 60).toInt()
    return (if (oh > 0) "+" else "−") + (if (d > 0) "${d}d " else "") + "${h}h" + (if (d > 0) "" else " %02dm".format(m))
}

/** Degrees as d°mm′ */
fun deg(x: Double): String {
    val v = Engine.norm(x); var d = floor(v).toInt(); var m = Math.round((v - d) * 60).toInt()
    if (m == 60) { d += 1; m = 0 }
    return "$d°%02d′".format(m)
}
