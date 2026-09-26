// The five visible grahas and the lunar nodes (SPEC §7). Mirrors Planets.kt:
// JPL approximate Keplerian elements (Standish, Table 1, 1800–2050), light-time corrected, precessed to
// the ecliptic of date and made sidereal with Lahiri; Rāhu = Meeus mean node, Ketu opposite.
import Foundation

public struct GrahaPos: Sendable { public let key: String; public let sidLon, lat, distAu: Double; public let retrograde: Bool }

public enum Planets {
    typealias E = (Double, Double)
    struct El { let a, e, i, l, w, o: E }
    static let el: [String: El] = [
        "mercury": El(a: (0.38709927, 0.00000037), e: (0.20563593, 0.00001906), i: (7.00497902, -0.00594749), l: (252.25032350, 149472.67411175), w: (77.45779628, 0.16047689), o: (48.33076593, -0.12534081)),
        "venus": El(a: (0.72333566, 0.00000390), e: (0.00677672, -0.00004107), i: (3.39467605, -0.00078890), l: (181.97909950, 58517.81538729), w: (131.60246718, 0.00268329), o: (76.67984255, -0.27769418)),
        "earth": El(a: (1.00000261, 0.00000562), e: (0.01671123, -0.00004392), i: (-0.00001531, -0.01294668), l: (100.46457166, 35999.37244981), w: (102.93768193, 0.32327364), o: (0, 0)),
        "mars": El(a: (1.52371034, 0.00001847), e: (0.09339410, 0.00007882), i: (1.84969142, -0.00813131), l: (-4.55343205, 19140.30268499), w: (-23.94362959, 0.44441088), o: (49.55953891, -0.29257343)),
        "jupiter": El(a: (5.20288700, -0.00011607), e: (0.04838624, -0.00013253), i: (1.30439695, -0.00183714), l: (34.39644051, 3034.74612775), w: (14.72847983, 0.21252668), o: (100.47390909, 0.20469106)),
        "saturn": El(a: (9.53667594, -0.00125060), e: (0.05386179, -0.00050991), i: (2.48599187, 0.00193609), l: (49.95424423, 1222.49362201), w: (92.59887831, -0.41897216), o: (113.66242448, -0.28867794)),
    ]
    public static let keys = ["mercury", "venus", "mars", "jupiter", "saturn"]

    static func rad(_ d: Double) -> Double { d * .pi / 180 }
    static func deg(_ r: Double) -> Double { r * 180 / .pi }

    static func helio(_ key: String, _ t: Double) -> (Double, Double, Double) {
        let p = el[key]!
        func v(_ x: E) -> Double { x.0 + x.1 * t }
        let a = v(p.a), e = v(p.e), inc = v(p.i), l = v(p.l), wBar = v(p.w), om = v(p.o)
        let w = wBar - om
        var m = Engine.norm(l - wBar); if m > 180 { m -= 360 }
        var ecc = m + deg(e) * sin(rad(m))
        for _ in 0..<8 { let dM = m - (ecc - deg(e) * sin(rad(ecc))); ecc += dM / (1 - e * cos(rad(ecc))) }
        let xp = a * (cos(rad(ecc)) - e), yp = a * (1 - e * e).squareRoot() * sin(rad(ecc))
        let cw = cos(rad(w)), sw = sin(rad(w)), co = cos(rad(om)), so = sin(rad(om)), ci = cos(rad(inc)), si = sin(rad(inc))
        return ((cw * co - sw * so * ci) * xp + (-sw * co - cw * so * ci) * yp,
                (cw * so + sw * co * ci) * xp + (-sw * so + cw * co * ci) * yp,
                (sw * si) * xp + (cw * si) * yp)
    }

    /// Geocentric tropical ecliptic longitude of date, latitude (deg) and distance (AU).
    public static func geocentric(_ key: String, _ jdUT: Double) -> (lon: Double, lat: Double, dist: Double) {
        let t = (jdUT + Engine.deltaT(jdUT) - 2451545) / 36525
        let earth = helio("earth", t)
        var p = helio(key, t)
        var d = (p.0 - earth.0, p.1 - earth.1, p.2 - earth.2)
        let tau = (d.0 * d.0 + d.1 * d.1 + d.2 * d.2).squareRoot() * 0.0057755183 / 36525
        p = helio(key, t - tau); d = (p.0 - earth.0, p.1 - earth.1, p.2 - earth.2)
        let r = (d.0 * d.0 + d.1 * d.1 + d.2 * d.2).squareRoot()
        let precession = (5029.0966 * t + 1.11113 * t * t) / 3600
        return (Engine.norm(deg(atan2(d.1, d.0)) + precession), deg(asin(d.2 / r)), r)
    }

    public static func position(_ key: String, _ jdUT: Double) -> GrahaPos {
        let g = geocentric(key, jdUT)
        var dl = geocentric(key, jdUT + 0.5).lon - g.lon
        if dl > 180 { dl -= 360 }; if dl < -180 { dl += 360 }
        return GrahaPos(key: key, sidLon: Engine.norm(g.lon - Engine.ayanamsa(jdUT)), lat: g.lat, distAu: g.dist, retrograde: dl < 0)
    }

    /// Mean ascending node of the Moon, tropical of date (Meeus 47.7).
    public static func meanNode(_ jdUT: Double) -> Double {
        let t = (jdUT + Engine.deltaT(jdUT) - 2451545) / 36525
        return Engine.norm(125.0445479 - 1934.1362891 * t + 0.0020754 * t * t + t * t * t / 467441)
    }

    public static func all(_ jdUT: Double) -> [GrahaPos] {
        let rahu = Engine.norm(meanNode(jdUT) - Engine.ayanamsa(jdUT))
        return keys.map { position($0, jdUT) } + [
            GrahaPos(key: "rahu", sidLon: rahu, lat: 0, distAu: 0, retrograde: true),
            GrahaPos(key: "ketu", sidLon: Engine.norm(rahu + 180), lat: 0, distAu: 0, retrograde: true),
        ]
    }
}
