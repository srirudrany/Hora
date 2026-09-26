package org.hora.panchanga

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.location.LocationManager
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameMillis
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import kotlinx.coroutines.delay
import org.hora.panchanga.core.Place
import org.hora.panchanga.core.Tables
import org.hora.panchanga.ui.C
import org.hora.panchanga.ui.Caps
import org.hora.panchanga.ui.DayScreen
import org.hora.panchanga.ui.LocalGlossary
import org.hora.panchanga.ui.LocalSkyGpu
import org.hora.panchanga.ui.SkyGpu
import org.hora.panchanga.ui.MonthScreen
import org.hora.panchanga.ui.NowSkyStage
import org.hora.panchanga.ui.Panel
import org.hora.panchanga.ui.Pill
import org.hora.panchanga.ui.PillGroup
import org.hora.panchanga.ui.T
import java.time.ZoneId

enum class Tab { NOW, SKY, DAY, MONTH }

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val state = AppState(applicationContext)
        val gpu = SkyGpu(applicationContext)
        Thread { gpu.load() }.start()
        setContent { CompositionLocalProvider(LocalSkyGpu provides gpu) { App(state) } }
    }
}

@Composable
fun App(state: AppState) {
    var tab by remember { mutableStateOf(Tab.NOW) }
    var settings by remember { mutableStateOf(false) }
    var gloss by remember { mutableStateOf<String?>(null) }

    // clock: tick every second when live/paused; advance per frame while playing
    LaunchedEffect(Unit) {
        while (true) { state.nowMs = System.currentTimeMillis(); delay(1000) }
    }
    LaunchedEffect(state.playing) {
        if (!state.playing) return@LaunchedEffect
        var last = withFrameMillis { it }
        val max = 15 * 24.0
        while (state.playing) {
            withFrameMillis { now ->
                val dt = ((now - last) / 1000.0).coerceAtMost(0.1); last = now
                val o = state.offsetH + state.speed * dt
                if (o >= max) { state.offsetH = max; state.playing = false } else state.offsetH = o
            }
        }
    }
    BackHandler(enabled = settings || gloss != null || tab != Tab.NOW) {
        when { gloss != null -> gloss = null; settings -> settings = false; else -> tab = Tab.NOW }
    }

    CompositionLocalProvider(LocalGlossary provides { term -> gloss = term }) {
        Box(Modifier.fillMaxSize().background(C.stage)) {
            Box(Modifier.fillMaxSize().statusBarsPadding().padding(bottom = 64.dp).navigationBarsPadding()) {
                // Now and Sky share one stage (the lift-off); Day and Month slide in from the side of their tab
                val screen = if (tab == Tab.SKY) Tab.NOW else tab
                AnimatedContent(
                    targetState = screen, label = "tabs",
                    transitionSpec = {
                        val dir = if (targetState.ordinal > initialState.ordinal) 1 else -1
                        (slideInHorizontally(tween(520, easing = FastOutSlowInEasing)) { it / 4 * dir } + fadeIn(tween(420, 80)) + scaleIn(tween(520), initialScale = 0.96f)) togetherWith
                            (slideOutHorizontally(tween(420, easing = FastOutSlowInEasing)) { -it / 4 * dir } + fadeOut(tween(280)) + scaleOut(tween(420), targetScale = 0.97f))
                    },
                ) { sc ->
                    when (sc) {
                        Tab.NOW, Tab.SKY -> NowSkyStage(state, sky = tab == Tab.SKY) { tab = if (it) Tab.SKY else Tab.NOW }
                        Tab.DAY -> DayScreen(state)
                        Tab.MONTH -> MonthScreen(state)
                    }
                }
                // header: brand + place / settings
                Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text("९ ", style = T.skt(18.sp, C.gold))
                    Text("Kālacakra", style = T.skt(19.sp, C.star, italic = true))
                    Spacer(Modifier.width(8.dp)); Text("कालचक्र", style = T.skt(16.sp, C.muted))
                    Spacer(Modifier.weight(1f))
                    Row(
                        Modifier.clip(RoundedCornerShape(999.dp)).border(1.dp, C.line2, RoundedCornerShape(999.dp)).clickable { settings = true }.padding(horizontal = 10.dp, vertical = 5.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(Modifier.size(6.dp).clip(CircleShape).background(C.gold)); Spacer(Modifier.width(6.dp))
                        Text(state.place.name, style = T.body(12.sp, C.star))
                    }
                }
            }
            TabBar(tab, Modifier.align(Alignment.BottomCenter)) { tab = it }
            if (settings) SettingsSheet(state) { settings = false }
            gloss?.let { g ->
                Box(Modifier.fillMaxSize().background(Color(0x99000000)).clickable { gloss = null }, contentAlignment = Alignment.BottomCenter) {
                    Panel(Modifier.fillMaxWidth().padding(16.dp).navigationBarsPadding().padding(bottom = 64.dp), pad = 20.dp) {
                        Caps("Glossary", C.gold)
                        Text(g, style = T.skt(26.sp, C.goldSoft))
                        Text(Tables.glossary[g] ?: "", style = T.body(15.sp))
                    }
                }
            }
        }
    }
}

@Composable
private fun TabBar(tab: Tab, modifier: Modifier, onTab: (Tab) -> Unit) {
    Row(
        modifier.fillMaxWidth().background(Color(0xF204060D)).navigationBarsPadding().height(64.dp).padding(horizontal = 26.dp),
        horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically,
    ) {
        for (t in Tab.entries) {
            val on = t == tab
            // the active dot grows in and the label warms to gold
            val k by animateFloatAsState(if (on) 1f else 0f, spring(dampingRatio = 0.55f, stiffness = 380f), label = "tab")
            Column(Modifier.clickable { onTab(t) }.padding(horizontal = 10.dp, vertical = 6.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Box(Modifier.size(5.dp).graphicsLayer { scaleX = 0.2f + 0.8f * k; scaleY = 0.2f + 0.8f * k; alpha = k }.clip(CircleShape).background(C.gold))
                Spacer(Modifier.height(5.dp))
                Text(t.name, style = T.caps(11.sp, org.hora.panchanga.ui.lerp(C.muted, C.goldSoft, k)), modifier = Modifier.graphicsLayer { translationY = -2f * k })
            }
        }
    }
}

@SuppressLint("MissingPermission")
@Composable
private fun SettingsSheet(state: AppState, onClose: () -> Unit) {
    val ctx = LocalContext.current
    var msg by remember { mutableStateOf<String?>(null) }
    fun useGps() {
        val lm = ctx.getSystemService(LocationManager::class.java)
        val loc = listOf(LocationManager.NETWORK_PROVIDER, LocationManager.GPS_PROVIDER, LocationManager.PASSIVE_PROVIDER)
            .mapNotNull { runCatching { lm.getLastKnownLocation(it) }.getOrNull() }.maxByOrNull { it.time }
        if (loc == null) { msg = "No recent location fix — pick a city below."; return }
        state.choosePlace(Place("Here", loc.latitude, loc.longitude, ZoneId.systemDefault().id))
        msg = "Using %.2f°, %.2f° · %s".format(loc.latitude, loc.longitude, ZoneId.systemDefault().id)
    }
    val perm = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { ok -> if (ok) useGps() else msg = "Location permission denied." }
    Box(Modifier.fillMaxSize().background(Color(0xE604060D)).clickable(enabled = false) {}) {
        Column(Modifier.fillMaxSize().statusBarsPadding().verticalScroll(rememberScrollState()).padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Settings", style = T.skt(28.sp, C.goldSoft)); Spacer(Modifier.weight(1f))
                Text("DONE", style = T.caps(12.sp, C.goldSoft), modifier = Modifier.clip(RoundedCornerShape(999.dp)).border(1.dp, C.gold, RoundedCornerShape(999.dp)).clickable(onClick = onClose).padding(horizontal = 14.dp, vertical = 7.dp))
            }
            Caps("Names")
            PillGroup { for (s in Script.entries) Pill(s.label, state.script == s, style = T.body(13.sp)) { state.chooseScript(s) } }
            Caps("Clock")
            PillGroup { Pill("12 h", !state.use24h) { state.chooseUse24h(false) }; Pill("24 h", state.use24h) { state.chooseUse24h(true) } }
            Caps("Place")
            Text(
                "USE MY LOCATION", style = T.caps(12.sp, C.goldSoft),
                modifier = Modifier.clip(RoundedCornerShape(999.dp)).border(1.dp, C.gold.copy(alpha = 0.6f), RoundedCornerShape(999.dp)).clickable {
                    if (ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED) useGps()
                    else perm.launch(Manifest.permission.ACCESS_COARSE_LOCATION)
                }.padding(horizontal = 14.dp, vertical = 8.dp),
            )
            msg?.let { Text(it, style = T.body(12.sp, C.muted)) }
            for (p in Places.cities) {
                val on = p.name == state.place.name
                Row(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(if (on) C.gold.copy(alpha = 0.12f) else Color.Transparent).clickable { state.choosePlace(p) }.padding(horizontal = 12.dp, vertical = 9.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(p.name, style = T.body(15.sp, if (on) C.goldSoft else C.star)); Spacer(Modifier.weight(1f))
                    Text("%.2f° %.2f° · %s".format(p.lat, p.lon, p.zoneId.substringAfter('/')), style = T.mono(11.sp, C.muted))
                }
            }
            Caps("Ayanāṁśa")
            Text("Lahiri (Citrā-pakṣa) — Spica at 180°. Engine: Meeus Sun/Moon, Espenak–Meeus ΔT.", style = T.body(13.sp, C.muted))
            Text("Computation and name tables from the Hora project (srirudrany). Muhūrta results are guidance, not prescription.", style = T.body(12.sp, C.muted))
        }
    }
}
