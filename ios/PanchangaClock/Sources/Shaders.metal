// SwiftUI stitchable shaders for the celestial models — the Metal twin of Android's Sky3D.kt (AGSL).
//  sphere():   textured, lit sphere; Earth = day/night/cloud atlas (stacked thirds) with an atmosphere rim;
//              Saturn = planet + ring-strip atlas with ring occlusion; Sun = emissive, limb darkening,
//              drifting granulation and a corona.
//  backdrop(): the Milky Way glow on the celestial sphere (orbit camera or horizon view), galactic mapping.
#include <metal_stdlib>
#include <SwiftUI/SwiftUI_Metal.h>
using namespace metal;

constexpr sampler texSampler(address::repeat, filter::linear);
constant float PI = 3.14159265;
constant float D2R = 0.01745329;

// kind: 0 = plain, 1 = earth atlas, 2 = saturn atlas, 3 = sun
static half3 surface(texture2d<half> tex, float3 n, float3 bx, float3 by, float3 bz, float3 light, float kind, float time) {
    float3 b = float3(dot(n, bx), dot(n, by), dot(n, bz));
    float lon = atan2(b.x, b.z);
    float lat = asin(clamp(b.y, -1.0, 1.0));
    float2 uv = float2(lon / (2.0 * PI) + 0.5, 0.5 - lat / PI);
    if (kind > 2.5) {
        half3 c1 = tex.sample(texSampler, uv + float2(time * 0.003, 0.0)).rgb;
        half3 c2 = tex.sample(texSampler, uv + float2(-time * 0.0045, time * 0.001)).rgb;
        return mix(c1, c2, 0.5h);
    }
    float ndl = dot(n, light);
    float day = smoothstep(-0.06, 0.22, ndl);
    if (kind > 0.5 && kind < 1.5) {
        float third = 1.0 / 3.0;
        half3 c = tex.sample(texSampler, float2(uv.x, uv.y * third)).rgb;
        half3 col = c * half(0.035 + 1.08 * day);
        float cl = tex.sample(texSampler, float2(uv.x + time * 0.0007, (uv.y + 2.0) * third)).r;
        col = mix(col, half3(half(0.035 + day)), half(cl * 0.8));
        half3 nl = tex.sample(texSampler, float2(uv.x, (uv.y + 1.0) * third)).rgb;
        col += nl * half((1.0 - smoothstep(-0.25, 0.05, ndl)) * 1.4);
        return col;
    }
    if (kind > 1.5) uv.y *= 512.0 / 576.0;
    half3 c = tex.sample(texSampler, uv).rgb;
    return c * half(0.035 + 1.08 * day);
}

/// geo = (cx, cy, radius, alpha); flags = (kind, time, atmoK, _); atmo = rgb
[[ stitchable ]] half4 sphere(float2 p, texture2d<half> tex, float4 geo, float3 bx, float3 by, float3 bz, float3 light, float4 flags, float3 atmo) {
    float2 q = (p - geo.xy) / geo.z;
    q.y = -q.y;
    float r2 = dot(q, q), r = sqrt(r2);
    float aa = 1.5 / geo.z;
    float kind = flags.x, time = flags.y, atmoK = flags.z;
    half4 outc = half4(0.0);
    half4 ringBack = half4(0.0), ringFront = half4(0.0);
    if (kind > 1.5 && kind < 2.5 && abs(by.z) > 0.001) {
        float t = -(q.x * by.x + q.y * by.y) / by.z;
        float rr = length(float3(q.x, q.y, t));
        if (rr > 1.24 && rr < 2.27) {
            float u = (rr - 1.24) / (2.27 - 1.24);
            half4 rc = tex.sample(texSampler, float2(u, (512.0 + 32.0) / 576.0));
            float lit = 1.25 + 0.35 * abs(dot(light, by));
            rc.rgb *= half(lit); // samples are premultiplied
            if (t > 0.0) ringFront = rc; else ringBack = rc;
        }
    }
    if (r < 1.0 + aa) {
        float3 n = float3(q.x, q.y, sqrt(max(0.0, 1.0 - r2)));
        half3 col = surface(tex, n, bx, by, bz, light, kind, time);
        if (kind > 2.5) {
            col *= half(0.42 + 0.58 * pow(n.z, 0.55));
            col *= half3(1.45h, 1.22h, 0.92h);
        } else {
            float rim = pow(1.0 - n.z, 3.0);
            col += half3(atmo) * half(rim * atmoK * clamp(dot(n, light) + 0.35, 0.0, 1.0));
        }
        float edge = 1.0 - smoothstep(1.0 - aa, 1.0 + aa, r);
        outc = half4(col * half(edge), half(edge)) + ringBack * half(1.0 - edge);
    } else {
        outc = ringBack;
        float d = r - 1.0;
        if (kind > 2.5) {
            float ang = atan2(q.y, q.x);
            float g = exp(-d * 3.2) * 0.9 * (0.75 + 0.25 * sin(ang * 14.0 + time * 0.6) * sin(ang * 5.0 - time * 0.4));
            outc += half4(half3(1.0h, 0.78h, 0.42h) * half(g), half(g * 0.9));
        } else if (atmoK > 0.0) {
            float g = exp(-d * 26.0) * atmoK * 0.55 * clamp(dot(normalize(float3(q, 0.0)), light) + 0.45, 0.0, 1.0);
            outc += half4(half3(atmo) * half(g), half(g));
        }
    }
    outc = ringFront + outc * (1.0h - ringFront.a);
    return outc * half(geo.w);
}

/// cam = (centerX, centerY, focal, mode); ori = (az, el, ayan, eps) for mode 0, (heading, pitch, ppd, lat) for mode 1; extra = (lst, gain)
[[ stitchable ]] half4 backdrop(float2 p, texture2d<half> tex, float4 cam, float4 ori, float2 extra) {
    float3 eq;
    if (cam.w < 0.5) {
        float3 v = normalize(float3((p.x - cam.x) / cam.z, -(p.y - cam.y) / cam.z, -1.0));
        float sE = sin(ori.y * D2R), cE = cos(ori.y * D2R), sA = sin(ori.x * D2R), cA = cos(ori.x * D2R);
        float rz = -v.y * sE + v.z * cE;
        float wy = v.y * cE + v.z * sE;
        float wx = v.x * cA + rz * sA;
        float wz = -v.x * sA + rz * cA;
        float lam = atan2(-wx, -wz) + ori.z * D2R;
        float bet = asin(clamp(wy, -1.0, 1.0));
        float se = sin(ori.w * D2R), ce = cos(ori.w * D2R);
        float3 ec = float3(cos(bet) * cos(lam), cos(bet) * sin(lam), sin(bet));
        eq = float3(ec.x, ec.y * ce - ec.z * se, ec.y * se + ec.z * ce);
    } else {
        float azm = (ori.x + (p.x - cam.x) / ori.z) * D2R;
        float alt = (ori.y - (p.y - cam.y) / ori.z) * D2R;
        if (alt < -0.02) return half4(0.0);
        float phi = ori.w * D2R;
        float dec = asin(clamp(sin(phi) * sin(alt) + cos(phi) * cos(alt) * cos(azm), -1.0, 1.0));
        float H = atan2(-sin(azm) * cos(alt), cos(phi) * sin(alt) - sin(phi) * cos(alt) * cos(azm));
        float ra = extra.x * D2R - H;
        eq = float3(cos(dec) * cos(ra), cos(dec) * sin(ra), sin(dec));
    }
    float3 g = float3(
        -0.0548755604 * eq.x - 0.8734370902 * eq.y - 0.4838350155 * eq.z,
         0.4941094279 * eq.x - 0.4448296300 * eq.y + 0.7469822445 * eq.z,
        -0.8676661490 * eq.x - 0.1980763734 * eq.y + 0.4559837762 * eq.z);
    float l = atan2(g.y, g.x);
    float b = asin(clamp(g.z, -1.0, 1.0));
    half3 c = tex.sample(texSampler, float2(0.5 - l / (2.0 * PI), 0.5 - b / PI)).rgb * half(extra.y);
    return half4(c, 1.0h);
}
