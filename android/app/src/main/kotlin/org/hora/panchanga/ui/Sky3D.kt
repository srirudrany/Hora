// GPU rendering for the celestial models (Android 13+, AGSL runtime shaders):
//  - one sphere shader for every body: equirectangular texture, true lighting (the Moon's phase comes from
//    the real Sun direction), Earth night lights + clouds + atmosphere rim, Sun limb darkening and moving
//    granulation, Saturn's rings with correct occlusion
//  - a backdrop shader that paints the real Milky Way on the celestial sphere (ecliptic → equatorial → galactic)
//  - the HYG bright-star catalogue (V ≤ 5) as twinkling points on the same sphere
// Textures: Solar System Scope (CC BY 4.0), see assets/textures/ATTRIBUTION.txt.
package org.hora.panchanga.ui

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.BitmapShader
import android.graphics.RuntimeShader
import android.graphics.Shader
import android.os.Build
import androidx.annotation.RequiresApi
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ShaderBrush
import androidx.compose.ui.graphics.drawscope.DrawScope
import org.json.JSONObject
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

/** A 3-vector in the camera's view space: x right, y up, z toward the viewer. */
data class V3(val x: Float, val y: Float, val z: Float) {
    fun norm(): V3 { val l = sqrt(x * x + y * y + z * z).coerceAtLeast(1e-6f); return V3(x / l, y / l, z / l) }
    fun cross(o: V3) = V3(y * o.z - z * o.y, z * o.x - x * o.z, x * o.y - y * o.x)
    operator fun unaryMinus() = V3(-x, -y, -z)
}

/** Body-fixed axes expressed in view space: [z] points at the texture's centre meridian, [y] at the north pole. */
data class BodyFrame(val x: V3, val y: V3, val z: V3) {
    companion object { val FACING = BodyFrame(V3(1f, 0f, 0f), V3(0f, 1f, 0f), V3(0f, 0f, 1f)) }
}

private const val SPHERE_SKSL = """
uniform shader tex;
uniform shader night;
uniform shader clouds;
uniform shader ring;
uniform float2 texSize;
uniform float2 ringSize;
uniform float2 center;
uniform float radius;
uniform float3 bx;
uniform float3 by;
uniform float3 bz;
uniform float3 light;
uniform float emissive;
uniform float hasNight;
uniform float hasClouds;
uniform float hasRing;
uniform float cloudShift;
uniform float time;
uniform float3 atmo;
uniform float atmoK;
uniform float alpha;

const float PI = 3.14159265;

half3 surface(float3 n) {
    float3 b = float3(dot(n, bx), dot(n, by), dot(n, bz));
    float lon = atan(b.x, b.z);
    float lat = asin(clamp(b.y, -1.0, 1.0));
    float2 uv = float2((lon / (2.0 * PI) + 0.5) * texSize.x, (0.5 - lat / PI) * texSize.y);
    if (emissive > 0.5) {
        // Sun: slowly drifting granulation, two octaves, plus limb darkening
        half3 c1 = tex.eval(uv + float2(time * 6.0, 0.0)).rgb;
        half3 c2 = tex.eval(uv * 1.0 + float2(-time * 9.0, time * 2.0)).rgb;
        return mix(c1, c2, 0.5);
    }
    half3 c = tex.eval(uv).rgb;
    float ndl = dot(n, light);
    float day = smoothstep(-0.06, 0.22, ndl);
    half3 col = c * half(0.035 + 1.08 * day);
    if (hasClouds > 0.5) {
        float cl = clouds.eval(uv + float2(cloudShift, 0.0)).r;
        col = mix(col, half3(0.035 + 1.0 * day), half(cl * 0.8));
    }
    if (hasNight > 0.5) {
        half3 nl = night.eval(uv).rgb;
        col += nl * half((1.0 - smoothstep(-0.25, 0.05, ndl)) * 1.4);
    }
    return col;
}

half4 main(float2 p) {
    float2 q = (p - center) / radius;
    q.y = -q.y;
    float r2 = dot(q, q);
    float r = sqrt(r2);
    float aa = 1.5 / radius;
    half4 outc = half4(0.0);

    // --- rings (Saturn): intersect the view ray with the body's equatorial plane
    half4 ringBack = half4(0.0);
    half4 ringFront = half4(0.0);
    if (hasRing > 0.5 && abs(by.z) > 0.001) {
        float t = -(q.x * by.x + q.y * by.y) / by.z;
        float3 rp = float3(q.x, q.y, t);
        float rr = length(rp);
        if (rr > 1.24 && rr < 2.27) {
            float u = (rr - 1.24) / (2.27 - 1.24);
            half4 rc = ring.eval(float2(u * ringSize.x, ringSize.y * 0.5));
            // lit side of the rings follows the light's elevation over the ring plane
            float lit = 1.25 + 0.35 * abs(dot(light, by));
            rc.rgb *= half(lit); // child shaders return premultiplied colour already
            if (t > 0.0) ringFront = rc; else ringBack = rc;
        }
    }

    if (r < 1.0 + aa) {
        float3 n = float3(q.x, q.y, sqrt(max(0.0, 1.0 - r2)));
        half3 col = surface(n);
        if (emissive > 0.5) {
            float mu = n.z;
            col *= half(0.42 + 0.58 * pow(mu, 0.55));
            col = col * half3(1.45, 1.22, 0.92);
        } else {
            float rim = pow(1.0 - n.z, 3.0);
            col += half3(atmo) * half(rim * atmoK * clamp(dot(n, light) + 0.35, 0.0, 1.0));
        }
        float edge = 1.0 - smoothstep(1.0 - aa, 1.0 + aa, r);
        outc = half4(col * half(edge), half(edge));
        // back half of the rings is hidden by the disc
        outc = outc + ringBack * half(1.0 - edge);
    } else {
        outc = ringBack;
        // atmosphere / corona halo outside the disc
        float d = r - 1.0;
        if (emissive > 0.5) {
            float g = exp(-d * 3.2) * 0.9;
            float rays = 0.75 + 0.25 * sin(atan(q.y, q.x) * 14.0 + time * 0.6) * sin(atan(q.y, q.x) * 5.0 - time * 0.4);
            g *= rays;
            outc += half4(half3(1.0, 0.78, 0.42) * half(g), half(g * 0.9));
        } else if (atmoK > 0.0) {
            float g = exp(-d * 26.0) * atmoK * 0.55 * clamp(dot(normalize(float3(q, 0.0)), light) + 0.45, 0.0, 1.0);
            outc += half4(half3(atmo) * half(g), half(g));
        }
    }
    outc = ringFront + outc * half(1.0 - ringFront.a);
    return outc * half(alpha);
}
"""

private const val BACKDROP_SKSL = """
uniform shader sky;
uniform float2 texSize;
uniform float2 res;
uniform float2 center;
uniform float focal;
uniform float az;
uniform float el;
uniform float ayan;
uniform float eps;
uniform float gain;
uniform float mode;
uniform float heading;
uniform float pitch;
uniform float ppd;
uniform float lat;
uniform float lst;
const float PI = 3.14159265;
const float D2R = 0.01745329;

half4 main(float2 p) {
    float3 eq;
    if (mode < 0.5) {
        // Kālacakra orbit camera: pixel → view ray → world (ecliptic plane) → sidereal ecliptic → equatorial
        float3 v = normalize(float3((p.x - center.x) / focal, -(p.y - center.y) / focal, -1.0));
        float sE = sin(el * D2R), cE = cos(el * D2R), sA = sin(az * D2R), cA = cos(az * D2R);
        float rz = -v.y * sE + v.z * cE;
        float wy = v.y * cE + v.z * sE;
        float wx = v.x * cA + rz * sA;
        float wz = -v.x * sA + rz * cA;
        float lam = atan(-wx, -wz) + ayan * D2R;
        float bet = asin(clamp(wy, -1.0, 1.0));
        float se = sin(eps * D2R), ce = cos(eps * D2R);
        float3 ec = float3(cos(bet) * cos(lam), cos(bet) * sin(lam), sin(bet));
        eq = float3(ec.x, ec.y * ce - ec.z * se, ec.y * se + ec.z * ce);
    } else {
        // Horizon view: pixel → alt/az → equatorial via local sidereal time
        float azm = (heading + (p.x - center.x) / ppd) * D2R;
        float alt = (pitch - (p.y - center.y) / ppd) * D2R;
        if (alt < -0.02) return half4(0.0);
        float phi = lat * D2R;
        float sd = sin(phi) * sin(alt) + cos(phi) * cos(alt) * cos(azm);
        float dec = asin(clamp(sd, -1.0, 1.0));
        float H = atan(-sin(azm) * cos(alt), cos(phi) * sin(alt) - sin(phi) * cos(alt) * cos(azm));
        float ra = lst * D2R - H;
        eq = float3(cos(dec) * cos(ra), cos(dec) * sin(ra), sin(dec));
    }
    // equatorial (J2000) → galactic
    float3 g = float3(
        -0.0548755604 * eq.x - 0.8734370902 * eq.y - 0.4838350155 * eq.z,
         0.4941094279 * eq.x - 0.4448296300 * eq.y + 0.7469822445 * eq.z,
        -0.8676661490 * eq.x - 0.1980763734 * eq.y + 0.4559837762 * eq.z);
    float l = atan(g.y, g.x);
    float b = asin(clamp(g.z, -1.0, 1.0));
    float2 uv = float2((0.5 - l / (2.0 * PI)) * texSize.x, (0.5 - b / PI) * texSize.y);
    half3 c = sky.eval(uv).rgb;
    c = c * half(gain);
    return half4(c, 1.0);
}
"""

data class Star(val ra: Double, val dec: Double, val mag: Float, val bv: Float, val name: String) {
    val color: Color get() = when {
        bv < 0.0f -> Color(0xFFB9CCFF); bv < 0.3f -> Color(0xFFDDE6FF); bv < 0.6f -> Color(0xFFFFF6E8)
        bv < 1.0f -> Color(0xFFFFE2B8); bv < 1.4f -> Color(0xFFFFC98E); else -> Color(0xFFFFAE78)
    }
}

/** Textures + shaders, loaded once in the background. `ready` flips when everything is decoded. */
class SkyGpu(private val ctx: Context) {
    val supported = Build.VERSION.SDK_INT >= 33
    @Volatile var ready = false; private set
    private val bitmaps = HashMap<String, Bitmap>()
    private val shaders = HashMap<String, BitmapShader>()
    var stars: List<Star> = emptyList(); private set
    private var sphereShader: Any? = null
    private var backdropShader: Any? = null

    fun load() {
        stars = runCatching {
            val a = JSONObject(ctx.assets.open("stars.json").bufferedReader().readText()).getJSONArray("stars")
            (0 until a.length()).map { i -> val s = a.getJSONArray(i); Star(s.getDouble(0), s.getDouble(1), s.getDouble(2).toFloat(), s.getDouble(3).toFloat(), s.getString(4)) }
        }.getOrDefault(emptyList())
        val specs = listOf(
            "earth" to 1, "earth_night" to 1, "earth_clouds" to 1, "moon" to 1, "sun" to 2, "mercury" to 2, "venus" to 2,
            "mars" to 2, "jupiter" to 2, "saturn" to 2, "saturn_ring" to 1, "milky_way" to 1,
        )
        for ((key, sample) in specs) {
            val ext = if (key == "saturn_ring") "png" else "jpg"
            val opts = BitmapFactory.Options().apply {
                inSampleSize = sample
                inPreferredConfig = if (key == "saturn_ring") Bitmap.Config.ARGB_8888 else Bitmap.Config.RGB_565
            }
            val bmp = runCatching { ctx.assets.open("textures/$key.$ext").use { BitmapFactory.decodeStream(it, null, opts) } }.getOrNull() ?: continue
            bitmaps[key] = bmp
            shaders[key] = BitmapShader(bmp, Shader.TileMode.REPEAT, Shader.TileMode.CLAMP).also {
                if (Build.VERSION.SDK_INT >= 33) it.filterMode = BitmapShader.FILTER_MODE_LINEAR
            }
        }
        if (supported) createShaders()
        ready = true
    }

    @RequiresApi(33)
    private fun createShaders() {
        sphereShader = RuntimeShader(SPHERE_SKSL)
        backdropShader = RuntimeShader(BACKDROP_SKSL)
    }

    fun size(key: String) = bitmaps[key]?.let { Size(it.width.toFloat(), it.height.toFloat()) } ?: Size(1f, 1f)

    /** Draw a textured, lit sphere. Returns false if the GPU path is unavailable (caller draws a fallback). */
    fun sphere(
        s: DrawScope, key: String, c: Offset, radius: Float, frame: BodyFrame, light: V3,
        time: Float = 0f, alpha: Float = 1f, atmo: Color = Color.Transparent, atmoK: Float = 0f,
    ): Boolean {
        if (!supported || !ready || radius < 0.5f) return false
        val tex = shaders[key] ?: return false
        val sh = sphereShader as RuntimeShader
        val sz = size(key)
        sh.setInputShader("tex", tex)
        sh.setInputShader("night", shaders["earth_night"] ?: tex)
        sh.setInputShader("clouds", shaders["earth_clouds"] ?: tex)
        sh.setInputShader("ring", shaders["saturn_ring"] ?: tex)
        sh.setFloatUniform("texSize", sz.width, sz.height)
        val rs = size("saturn_ring"); sh.setFloatUniform("ringSize", rs.width, rs.height)
        sh.setFloatUniform("center", c.x, c.y)
        sh.setFloatUniform("radius", radius)
        sh.setFloatUniform("bx", frame.x.x, frame.x.y, frame.x.z)
        sh.setFloatUniform("by", frame.y.x, frame.y.y, frame.y.z)
        sh.setFloatUniform("bz", frame.z.x, frame.z.y, frame.z.z)
        val l = light.norm(); sh.setFloatUniform("light", l.x, l.y, l.z)
        sh.setFloatUniform("emissive", if (key == "sun") 1f else 0f)
        sh.setFloatUniform("hasNight", if (key == "earth") 1f else 0f)
        sh.setFloatUniform("hasClouds", if (key == "earth") 1f else 0f)
        sh.setFloatUniform("hasRing", if (key == "saturn") 1f else 0f)
        sh.setFloatUniform("cloudShift", time * 1.5f)
        sh.setFloatUniform("time", time)
        sh.setFloatUniform("atmo", atmo.red, atmo.green, atmo.blue)
        sh.setFloatUniform("atmoK", atmoK)
        sh.setFloatUniform("alpha", alpha)
        val ext = radius * when (key) { "sun" -> 3.2f; "saturn" -> 2.35f; else -> 1.25f }
        s.drawRect(ShaderBrush(sh), topLeft = Offset(c.x - ext, c.y - ext), size = Size(2 * ext, 2 * ext))
        return true
    }

    /** Milky Way backdrop for the orbit camera. */
    fun backdropOrbit(s: DrawScope, center: Offset, focal: Float, az: Float, el: Float, ayan: Double, eps: Double, gain: Float): Boolean {
        val sh = prepBackdrop(s.size) ?: return false
        sh.setFloatUniform("center", center.x, center.y); sh.setFloatUniform("focal", focal)
        sh.setFloatUniform("az", az); sh.setFloatUniform("el", el)
        sh.setFloatUniform("ayan", ayan.toFloat()); sh.setFloatUniform("eps", eps.toFloat())
        sh.setFloatUniform("gain", gain); sh.setFloatUniform("mode", 0f)
        s.drawRect(ShaderBrush(sh)); return true
    }

    /** Milky Way on the real sky for the horizon view (same equirectangular projection as HorizonView). */
    fun backdropHorizon(s: DrawScope, center: Offset, heading: Float, pitch: Float, ppd: Float, lat: Double, lst: Double, gain: Float): Boolean {
        val sh = prepBackdrop(s.size) ?: return false
        sh.setFloatUniform("center", center.x, center.y)
        sh.setFloatUniform("heading", heading); sh.setFloatUniform("pitch", pitch); sh.setFloatUniform("ppd", ppd)
        sh.setFloatUniform("lat", lat.toFloat()); sh.setFloatUniform("lst", lst.toFloat())
        sh.setFloatUniform("gain", gain); sh.setFloatUniform("mode", 1f)
        s.drawRect(ShaderBrush(sh)); return true
    }

    private fun prepBackdrop(res: Size): RuntimeShader? {
        if (!supported || !ready) return null
        val tex = shaders["milky_way"] ?: return null
        val sh = backdropShader as RuntimeShader
        val sz = size("milky_way")
        sh.setInputShader("sky", tex)
        sh.setFloatUniform("texSize", sz.width, sz.height)
        sh.setFloatUniform("res", res.width, res.height)
        for (u in listOf("focal", "az", "el", "ayan", "eps", "heading", "pitch", "ppd", "lat", "lst")) sh.setFloatUniform(u, 0f)
        sh.setFloatUniform("center", 0f, 0f)
        return sh
    }
}

val LocalSkyGpu = staticCompositionLocalOf<SkyGpu?> { null }

/** Equatorial J2000 (deg) → sidereal ecliptic (λ, β) in degrees, ignoring precession since J2000 (≈0.4°). */
fun eqToSidEcl(raDeg: Double, decDeg: Double, eps: Double, ayan: Double): Pair<Double, Double> {
    val ra = Math.toRadians(raDeg); val dec = Math.toRadians(decDeg); val e = Math.toRadians(eps)
    val lam = kotlin.math.atan2(sin(ra) * cos(e) + kotlin.math.tan(dec) * sin(e), cos(ra))
    val bet = kotlin.math.asin(sin(dec) * cos(e) - cos(dec) * sin(e) * sin(ra))
    val precess = 0.36 // J2000 → 2026 in longitude, degrees (50.29″/yr)
    return Pair(org.hora.panchanga.core.Engine.norm(Math.toDegrees(lam) + precess - ayan), Math.toDegrees(bet))
}
