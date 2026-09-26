// Day timeline — sunrise to sunrise (Phone Screens 1d).
package org.hora.panchanga.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.hora.panchanga.AppState
import org.hora.panchanga.core.Nazhigai
import org.hora.panchanga.core.Tables

private data class Ev(val t: Double, val kind: String, val kc: Color, val title: String, val sub: String, val dot: Color)

@Composable
fun DayScreen(state: AppState) {
    val jd = state.jd
    val day = state.day(jd)
    val len = day.nextSunrise - day.sunrise
    fun pct(x: Double) = ((x - day.sunrise) / len).coerceIn(0.0, 1.0).toFloat()

    val ev = mutableListOf(
        Ev(day.sunrise, "Sunrise", C.gold, "Sūryodaya", "The day begins · nāḻigai 00:00", C.gold),
        Ev(day.sunset, "Sunset", C.gold, "Sūryāsta", "Daylight lasted ${Nazhigai.format(day.sunset, day.sunrise)} nāḻigai", C.copper),
        Ev(day.nextSunrise, "Next sunrise", C.gold, Tables.vara[(day.weekday + 1) % 7].iast, "A new day begins", C.gold),
    )
    for ((n, c, r) in listOf(Triple("Rāhu kālam", C.kumkum, day.rahu), Triple("Yamagaṇḍam", C.plum, day.yama), Triple("Kuḷikai", C.copper, day.gulika), Triple("Abhijit", C.teal, day.abhijit))) {
        ev += Ev(r.first, if (n == "Abhijit") "Auspicious window" else "Kāla period", c, if (n == "Abhijit") "Abhijit muhūrta" else n, "${state.time(r.first)} – ${state.time(r.second)}", c)
    }
    // limb transitions in their clock-ring colours
    data class L(val label: String, val spans: List<org.hora.panchanga.core.Span>, val color: Color, val name: (Int) -> String)
    val limbs = listOf(
        L("Tithi", day.tithi, RingColor.TITHI) { state.tithi(it) },
        L("Nakṣatra", day.nakshatra, RingColor.NAKSHATRA) { state.nakshatra(it) },
        L("Yoga", day.yoga, RingColor.YOGA) { state.yoga(it) },
        L("Karaṇa", day.karana, RingColor.KARANA) { state.karana(it) },
    )
    for (l in limbs) l.spans.forEachIndexed { i, s ->
        if (s.end < day.nextSunrise && i + 1 < l.spans.size) ev += Ev(s.end, "${l.label} changes", l.color, l.name(l.spans[i + 1].idx), "after ${l.name(s.idx)}", l.color)
    }
    ev.sortBy { it.t }

    // horā: 12 by day, 12 by night; lord of the first names the day
    val wdLord = intArrayOf(3, 6, 2, 5, 1, 4, 0)
    val dh = (day.sunset - day.sunrise) / 12; val nh = (day.nextSunrise - day.sunset) / 12

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(start = 20.dp, end = 20.dp, top = 54.dp, bottom = 100.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Column {
            Caps(if (state.live) "Today" else state.date(jd, "EEE d MMM yyyy"))
            Row(verticalAlignment = Alignment.Bottom) {
                Text(state.vara(day.weekday), style = T.skt(32.sp, C.goldSoft)); Spacer(Modifier.width(10.dp)); Text(Tables.vara[day.weekday].tamil, style = T.tamil(20.sp))
            }
            Text("${state.date(day.sunrise + 0.3, "d MMM")} · ${state.month(day.tamilMonth)} ${day.tamilDay} · ${state.place.name}", style = T.body(14.sp))
        }
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            BoxWithConstraints(Modifier.fillMaxWidth().height(30.dp).clip(RoundedCornerShape(8.dp)).background(C.nightArc).border(1.dp, C.line, RoundedCornerShape(8.dp))) {
                val w = maxWidth
                Box(Modifier.fillMaxHeight().width(w * pct(day.sunset)).background(C.dayArc))
                for ((c, r) in listOf(C.copper to day.gulika, C.kumkum to day.rahu, C.plum to day.yama)) {
                    Box(Modifier.offset(x = w * pct(r.first), y = 21.dp).width(w * (pct(r.second) - pct(r.first))).height(9.dp).background(c))
                }
                Box(Modifier.offset(x = w * pct(jd) - 1.dp).width(2.dp).fillMaxHeight().shadow(6.dp).background(C.goldSoft))
            }
            Row(Modifier.fillMaxWidth()) {
                Text("00 · ${state.time(day.sunrise)}", style = T.mono(11.sp, C.muted)); Spacer(Modifier.weight(1f))
                Text("${Nazhigai.format(day.sunset, day.sunrise)} · ${state.time(day.sunset)}", style = T.mono(11.sp, C.muted)); Spacer(Modifier.weight(1f))
                Text("60", style = T.mono(11.sp, C.muted))
            }
        }
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Caps("Horā")
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                for (i in 0 until 24) {
                    val s = if (i < 12) day.sunrise + i * dh else day.sunset + (i - 12) * nh
                    val e = s + if (i < 12) dh else nh
                    val lord = Tables.horaChaldean[(wdLord[day.weekday] + i) % 7]
                    val on = jd >= s && jd < e
                    Column(
                        Modifier.widthIn(min = 64.dp).clip(RoundedCornerShape(9.dp)).background(if (on) C.gold.copy(alpha = 0.12f) else Color(0xB8080B18))
                            .border(1.dp, if (on) C.gold.copy(alpha = 0.7f) else C.muted.copy(alpha = 0.18f), RoundedCornerShape(9.dp)).padding(horizontal = 8.dp, vertical = 6.dp),
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(Modifier.size(7.dp).clip(CircleShape).background(C.graha[lord] ?: C.star)); Spacer(Modifier.width(5.dp))
                            Text(lord, style = T.skt(14.sp, if (on) C.goldSoft else C.star, italic = true))
                        }
                        Text(state.time(s), style = T.mono(10.sp, C.muted))
                    }
                }
            }
        }
        Column {
            var nowDone = false
            for (e in ev) {
                if (!nowDone && e.t > jd) {
                    nowDone = true
                    TimelineRow(state.time(jd), Nazhigai.format(jd, day.sunrise), "Now", C.goldSoft, "${Nazhigai.format(jd, day.sunrise)} nāḻigai", "since sunrise", C.goldSoft, if (jd < day.sunset) C.dayArc else C.lapis2, 1f)
                }
                TimelineRow(state.time(e.t), Nazhigai.format(e.t, day.sunrise), e.kind, e.kc, e.title, e.sub, e.dot, if (e.t < day.sunset) C.dayArc else C.lapis2, if (e.t < jd) 0.5f else 1f)
            }
        }
    }
}

@Composable
private fun TimelineRow(time: String, nz: String, kind: String, kc: Color, title: String, sub: String, dot: Color, rail: Color, alpha: Float) {
    Row(Modifier.fillMaxWidth().height(androidx.compose.foundation.layout.IntrinsicSize.Min)) {
        Column(Modifier.width(70.dp).padding(top = 10.dp), horizontalAlignment = Alignment.End) {
            Text(time, style = T.mono(12.5.sp, C.star.copy(alpha = alpha)))
            Text(nz, style = T.mono(10.5.sp, C.muted.copy(alpha = alpha)))
        }
        Canvas(Modifier.width(28.dp).fillMaxHeight()) {
            drawLine(rail, Offset(size.width / 2, 0f), Offset(size.width / 2, size.height), 2.dp.toPx())
            drawCircle(Color(0xFF04060D), 8.dp.toPx(), Offset(size.width / 2, 19.dp.toPx()))
            drawCircle(dot.copy(alpha = alpha), 5.dp.toPx(), Offset(size.width / 2, 19.dp.toPx()))
        }
        Column(Modifier.padding(top = 8.dp, bottom = 12.dp)) {
            Text(kind.uppercase(), style = T.caps(10.sp, kc.copy(alpha = alpha)))
            Text(title, style = T.skt(18.sp, C.star.copy(alpha = alpha)))
            Text(sub, style = T.body(12.5.sp, C.muted.copy(alpha = alpha)))
        }
    }
}
