// Month — Tamil solar month grid with tithi at sunrise and special days (Phone Screens 1e),
// plus the holy-day / muhūrta finder (SPEC §4.3, rules from data/rules.json).
package org.hora.panchanga.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
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
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.hora.panchanga.AppState
import org.hora.panchanga.core.Activity
import org.hora.panchanga.core.DayPanchanga
import org.hora.panchanga.core.DayVerdict
import org.hora.panchanga.core.Engine
import org.hora.panchanga.core.MuhurtaFinder
import org.hora.panchanga.core.SpecialDay
import org.hora.panchanga.core.Specials
import org.hora.panchanga.core.Tables
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

fun specialColor(k: SpecialDay.Kind) = when (k) {
    SpecialDay.Kind.PURNIMA -> C.goldSoft; SpecialDay.Kind.AMAVASYA -> C.muted; SpecialDay.Kind.EKADASHI -> C.teal
    SpecialDay.Kind.SHASHTHI -> C.copper; SpecialDay.Kind.PRADOSHAM -> C.plum; SpecialDay.Kind.SANKATAHARA -> C.kumkum
    SpecialDay.Kind.KARTTIKAI -> C.gold; SpecialDay.Kind.FESTIVAL -> C.gold
}

private val DMY = DateTimeFormatter.ofPattern("EEE d MMM", Locale.ENGLISH)

@Composable
fun MonthScreen(state: AppState) {
    var finder by remember { mutableStateOf(false) }
    Column(Modifier.fillMaxSize()) {
        Row(Modifier.padding(start = 16.dp, top = 52.dp)) {
            PillGroup {
                Pill("Month", !finder) { finder = false }
                Pill("Find a day", finder) { finder = true }
            }
        }
        if (finder) FinderView(state) else MonthGrid(state)
    }
}

@Composable
private fun MonthGrid(state: AppState) {
    val jd = state.jd
    val today = state.day(jd)
    val key = Triple(state.place, today.tamilMonth, today.date.year)
    var days by remember { mutableStateOf<List<DayPanchanga>>(emptyList()) }
    LaunchedEffect(key) {
        days = withContext(Dispatchers.Default) {
            val start = today.date.minusDays((today.tamilDay - 1).toLong())
            (0 until 33).map { Engine.panchanga(start.plusDays(it.toLong()), state.place) }.filter { it.tamilMonth == today.tamilMonth }
        }
    }
    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 100.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Column(Modifier.padding(horizontal = 4.dp)) {
            Row { Term("Saṃvatsara", T.caps(11.sp), Tables.samvatsara[today.samvat].uppercase()); Text(" · TAMIL SOLAR MONTH", style = T.caps(11.sp)) }
            Row(verticalAlignment = Alignment.Bottom) {
                Text(Tables.rasi[today.tamilMonth].tamilMonth, style = T.skt(32.sp, C.goldSoft)); Spacer(Modifier.width(10.dp))
                Text(Tables.rasi[today.tamilMonth].tamilMonthScript, style = T.tamil(20.sp))
            }
            if (days.isNotEmpty()) Text("${days.first().date.format(DateTimeFormatter.ofPattern("d MMM", Locale.ENGLISH))} – ${days.last().date.format(DateTimeFormatter.ofPattern("d MMM", Locale.ENGLISH))} · Sun in ${Tables.rasi[today.tamilMonth].iast}", style = T.mono(12.sp, C.muted))
        }
        // grid
        val lead = days.firstOrNull()?.weekday ?: 0
        val cells: List<DayPanchanga?> = List(lead) { null } + days
        Row(Modifier.fillMaxWidth()) { for (w in listOf("Su", "Mo", "Tu", "We", "Th", "Fr", "Sa")) Text(w.uppercase(), style = T.caps(10.sp), modifier = Modifier.weight(1f).padding(vertical = 4.dp), textAlign = androidx.compose.ui.text.style.TextAlign.Center) }
        for (row in cells.chunked(7)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                for (i in 0 until 7) {
                    val d = row.getOrNull(i)
                    Box(Modifier.weight(1f)) { if (d != null) DayCell(state, d, d.date == today.date) else Spacer(Modifier.height(66.dp)) }
                }
            }
        }
        Panel {
            Caps("Today at sunrise", C.gold)
            for ((k, v) in listOf("Tithi" to state.tithi(today.tithi[0].idx), "Nakṣatra" to state.nakshatra(today.nakshatra[0].idx), "Yoga" to state.yoga(today.yoga[0].idx), "Karaṇa" to state.karana(today.karana[0].idx))) {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) { Caps(k, size = 10); Spacer(Modifier.weight(1f)); Text(v, style = T.skt(17.sp)) }
            }
        }
        Column(Modifier.padding(horizontal = 4.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Caps("This month")
            for (d in days) for (s in Specials.of(d)) {
                Row(Modifier.fillMaxWidth().padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(d.date.format(DMY), style = T.mono(12.sp, C.muted), modifier = Modifier.width(88.dp))
                    Text(s.name, style = T.skt(16.sp, specialColor(s.kind), italic = true))
                    Spacer(Modifier.weight(1f))
                    Text("${state.month(d.tamilMonth)} ${d.tamilDay}", style = T.body(12.sp, C.muted))
                }
                Box(Modifier.fillMaxWidth().height(1.dp).background(C.muted.copy(alpha = 0.14f)))
            }
        }
    }
}

@Composable
private fun DayCell(state: AppState, d: DayPanchanga, isToday: Boolean) {
    val t = d.tithi[0].idx
    val sp = Specials.of(d)
    Column(
        Modifier.fillMaxWidth().height(66.dp).clip(RoundedCornerShape(9.dp))
            .background(if (isToday) C.gold.copy(alpha = 0.14f) else if (t < 15) C.ink2 else C.ink)
            .border(1.dp, if (isToday) C.gold else C.muted.copy(alpha = 0.14f), RoundedCornerShape(9.dp)).padding(5.dp),
        verticalArrangement = Arrangement.SpaceBetween,
    ) {
        Row(Modifier.fillMaxWidth()) {
            Text("${d.tamilDay}", style = T.mono(15.sp, if (isToday) C.goldSoft else C.star))
            Spacer(Modifier.weight(1f))
            if (t == 14 || t == 29) Box(Modifier.padding(top = 3.dp).size(9.dp).clip(CircleShape).background(if (t == 14) C.moon else C.stage).border(1.dp, C.moon, CircleShape))
        }
        Text(d.date.format(DateTimeFormatter.ofPattern("d MMM", Locale.ENGLISH)), style = T.mono(9.5.sp, C.muted))
        Text(sp.firstOrNull()?.name ?: state.nakshatra(d.nakshatra[0].idx), style = T.body(8.5.sp, sp.firstOrNull()?.let { specialColor(it.kind) } ?: C.muted), maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

@Composable
private fun FinderView(state: AppState) {
    var activity by remember { mutableStateOf(Activity.WEDDING) }
    var open by remember { mutableStateOf<LocalDate?>(null) }
    var results by remember { mutableStateOf<List<DayVerdict>?>(null) }
    val startDate = state.day(state.jd).date
    LaunchedEffect(activity, state.place, startDate) {
        results = null
        results = withContext(Dispatchers.Default) { (0 until 60).map { MuhurtaFinder.judge(Engine.panchanga(startDate.plusDays(it.toLong()), state.place), activity) } }
    }
    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 100.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Column {
            Caps("When is it good to…")
            Term("Muhūrta", T.skt(28.sp, C.goldSoft), "Muhūrta finder")
        }
        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            for (a in Activity.entries) {
                Column(
                    Modifier.clip(RoundedCornerShape(10.dp)).background(if (a == activity) C.gold.copy(alpha = 0.14f) else Color(0xB8080B18))
                        .border(1.dp, if (a == activity) C.gold.copy(alpha = 0.7f) else C.muted.copy(alpha = 0.2f), RoundedCornerShape(10.dp))
                        .clickable { activity = a }.padding(horizontal = 12.dp, vertical = 8.dp),
                ) {
                    Text(a.label, style = T.skt(16.sp, if (a == activity) C.goldSoft else C.star, italic = true))
                    Text(a.gloss.uppercase(), style = T.caps(9.sp))
                }
            }
        }
        Text(Tables.DISCLAIMER, style = T.body(12.sp, C.muted))
        val r = results
        if (r == null) Text("Reading the next 60 days…", style = T.body(13.sp, C.muted))
        else {
            val good = r.filter { !it.excluded }.sortedByDescending { it.score }
            Caps("Best days in the next 60 · ${good.size} candidates", C.gold)
            for (v in good.take(8)) VerdictRow(state, v, open == v.day.date) { open = if (open == v.day.date) null else v.day.date }
            Caps("Excluded — and why")
            for (v in r.filter { it.excluded }.take(12)) VerdictRow(state, v, open == v.day.date) { open = if (open == v.day.date) null else v.day.date }
        }
    }
}

@Composable
private fun VerdictRow(state: AppState, v: DayVerdict, expanded: Boolean, onClick: () -> Unit) {
    val d = v.day
    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(Color(0x8C080B18))
            .border(1.dp, if (v.excluded) C.muted.copy(alpha = 0.14f) else C.gold.copy(alpha = 0.3f), RoundedCornerShape(10.dp))
            .clickable(onClick = onClick).padding(horizontal = 12.dp, vertical = 8.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(d.date.format(DMY) + " · ${state.month(d.tamilMonth)} ${d.tamilDay}", style = T.mono(12.sp, if (v.excluded) C.muted else C.star))
                Text("${state.tithi(d.tithi[0].idx)} · ${state.nakshatra(d.nakshatra[0].idx)}", style = T.skt(15.sp, if (v.excluded) C.muted else C.star))
            }
            if (!v.excluded) Text("${v.score}", style = T.mono(18.sp, C.goldSoft))
        }
        if (expanded) {
            for (r in v.reasons) Row(Modifier.padding(top = 4.dp)) {
                Text(if (r.ok) "+" else "−", style = T.mono(12.sp, if (r.ok) C.teal else C.kumkum), modifier = Modifier.width(14.dp))
                Text(r.text, style = T.body(12.sp, C.star))
            }
            Text("Rāhu kālam ${state.time(d.rahu.first)}–${state.time(d.rahu.second)} · Abhijit ${state.time(d.abhijit.first)}–${state.time(d.abhijit.second)}", style = T.mono(11.sp, C.muted), modifier = Modifier.padding(top = 4.dp))
        }
    }
}
