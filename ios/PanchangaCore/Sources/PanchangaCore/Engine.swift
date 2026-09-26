// Swift port of Hora engine/panchanga.js (Sun: Meeus ch.25, Moon: Meeus ch.47 main series,
// Lahiri ayanamsa, sunrise/sunset with h0 = -0.833°, the five angas with end times by bisection,
// Tamil solar month/date and samvatsara). Changes from the JS reference, per SPEC §3:
//  - ΔT from the Espenak–Meeus polynomials instead of a fixed 69.5 s
//  - civil dates are resolved in an IANA time zone (DST-aware) via `Place.zoneId`
// Kept line-for-line parallel with android/core/.../Engine.kt; both run data/test-vectors.json.
import Foundation

public struct Place: Equatable, Hashable, Codable, Sendable {
    public let name: String
    public let lat: Double
    public let lon: Double
    public let zoneId: String
    public init(name: String, lat: Double, lon: Double, zoneId: String) {
        self.name = name; self.lat = lat; self.lon = lon; self.zoneId = zoneId
    }
}

/// A proleptic-Gregorian civil date (no time zone attached).
public struct CivilDate: Equatable, Hashable, Comparable, Sendable {
    public let year: Int, month: Int, day: Int
    public init(_ y: Int, _ m: Int, _ d: Int) { year = y; month = m; day = d }

    /// Days since 1970-01-01 (Howard Hinnant's algorithm).
    public var epochDay: Int {
        let y = month <= 2 ? year - 1 : year
        let era = (y >= 0 ? y : y - 399) / 400
        let yoe = y - era * 400
        let mp = (month + 9) % 12
        let doy = (153 * mp + 2) / 5 + day - 1
        let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy
        return era * 146097 + doe - 719468
    }
    public init(epochDay z0: Int) {
        let z = z0 + 719468
        let era = (z >= 0 ? z : z - 146096) / 146097
        let doe = z - era * 146097
        let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365
        let doy = doe - (365 * yoe + yoe / 4 - yoe / 100)
        let mp = (5 * doy + 2) / 153
        let d = doy - (153 * mp + 2) / 5 + 1
        let m = mp < 10 ? mp + 3 : mp - 9
        self.init(yoe + era * 400 + (m <= 2 ? 1 : 0), m, d)
    }
    public func adding(days n: Int) -> CivilDate { CivilDate(epochDay: epochDay + n) }
    /// 0 = Sunday
    public var weekday: Int { ((epochDay % 7) + 11) % 7 }
    public static func < (a: CivilDate, b: CivilDate) -> Bool { a.epochDay < b.epochDay }
}

/// A limb value in force from the previous boundary until `end` (JD, UT). `idx` is 0-based.
public struct Span: Equatable, Sendable { public let idx: Int; public let end: Double }

public struct DayPanchanga: Equatable, Sendable {
    public let date: CivilDate
    public let tzHours: Double
    public let sunrise, sunset, nextSunrise: Double
    /// 0 = Sunday
    public let weekday: Int
    public let tithi, nakshatra, yoga, karana: [Span]
    /// 0 = Chithirai (Sun in Meṣa)
    public let tamilMonth: Int
    public let tamilDay: Int
    public let samvat: Int
    public let rahu, yama, gulika, abhijit: (Double, Double)
    public let sunSid, moonSid, ayanamsa: Double

    public static func == (a: DayPanchanga, b: DayPanchanga) -> Bool { a.date == b.date && a.sunrise == b.sunrise }
}

public enum Anga: CaseIterable, Sendable {
    case tithi, karana, nakshatra, yoga, rasi, solar
    public var n: Int { switch self { case .tithi: 30; case .karana: 60; case .nakshatra, .yoga: 27; case .rasi, .solar: 12 } }
    public var span: Double { switch self { case .tithi: 12; case .karana: 6; case .nakshatra, .yoga: 360.0 / 27; case .rasi, .solar: 30 } }
}

public enum Engine {
    static let d2r = Double.pi / 180
    static let r2d = 180 / Double.pi
    public static func norm(_ x: Double) -> Double { let r = x.truncatingRemainder(dividingBy: 360); return r < 0 ? r + 360 : r }
    static func sind(_ d: Double) -> Double { sin(d * d2r) }
    static func cosd(_ d: Double) -> Double { cos(d * d2r) }

    public static func jd(from date: Date) -> Double { date.timeIntervalSince1970 / 86400 + 2440587.5 }
    public static func date(fromJd jd: Double) -> Date { Date(timeIntervalSince1970: (jd - 2440587.5) * 86400) }

    /// ΔT = TT − UT in days, Espenak & Meeus (NASA Five Millennium Canon) polynomials.
    public static func deltaT(_ jdUT: Double) -> Double {
        let y = 2000.0 + (jdUT - 2451544.5) / 365.2425
        func p(_ t: Double, _ c: [Double]) -> Double { c.reversed().reduce(0) { $0 * t + $1 } }
        let s: Double
        switch y {
        case ..<(-500): let u = (y - 1820) / 100; s = -20 + 32 * u * u
        case ..<500: s = p(y / 100, [10583.6, -1014.41, 33.78311, -5.952053, -0.1798452, 0.022174192, 0.0090316521])
        case ..<1600: s = p((y - 1000) / 100, [1574.2, -556.01, 71.23472, 0.319781, -0.8503463, -0.005050998, 0.0083572073])
        case ..<1700: s = p(y - 1600, [120, -0.9808, -0.01532, 1.0 / 7129])
        case ..<1800: s = p(y - 1700, [8.83, 0.1603, -0.0059285, 0.00013336, -1.0 / 1174000])
        case ..<1860: s = p(y - 1800, [13.72, -0.332447, 0.0068612, 0.0041116, -0.00037436, 0.0000121272, -0.0000001699, 0.000000000875])
        case ..<1900: s = p(y - 1860, [7.62, 0.5737, -0.251754, 0.01680668, -0.0004473624, 1.0 / 233174])
        case ..<1920: s = p(y - 1900, [-2.79, 1.494119, -0.0598939, 0.0061966, -0.000197])
        case ..<1941: s = p(y - 1920, [21.20, 0.84493, -0.076100, 0.0020936])
        case ..<1961: s = p(y - 1950, [29.07, 0.407, -1.0 / 233, 1.0 / 2547])
        case ..<1986: s = p(y - 1975, [45.45, 1.067, -1.0 / 260, -1.0 / 718])
        case ..<2005: s = p(y - 2000, [63.86, 0.3345, -0.060374, 0.0017275, 0.000651814, 0.00002373599])
        case ..<2050: s = p(y - 2000, [62.92, 0.32217, 0.005589])
        case ..<2150: let u = (y - 1820) / 100; s = -20 + 32 * u * u - 0.5628 * (2150 - y)
        default: let u = (y - 1820) / 100; s = -20 + 32 * u * u
        }
        return s / 86400
    }

    static func centuriesTT(_ jdUT: Double) -> Double { (jdUT + deltaT(jdUT) - 2451545) / 36525 }

    /// Apparent tropical longitude of the Sun, degrees.
    public static func sunLon(_ jdUT: Double) -> Double {
        let t = centuriesTT(jdUT)
        let l0 = 280.46646 + 36000.76983 * t + 0.0003032 * t * t
        let m = 357.52911 + 35999.05029 * t - 0.0001537 * t * t
        let c = (1.914602 - 0.004817 * t - 0.000014 * t * t) * sind(m)
            + (0.019993 - 0.000101 * t) * sind(2 * m) + 0.000289 * sind(3 * m)
        let om = 125.04 - 1934.136 * t
        return norm(l0 + c - 0.00569 - 0.00478 * sind(om))
    }

    // Meeus table 47.A longitude terms: D, M, M', F, coeff (1e-6 deg)
    static let mt: [(Double, Double, Double, Double, Double)] = [
        (0,0,1,0,6288774),(2,0,-1,0,1274027),(2,0,0,0,658314),(0,0,2,0,213618),(0,1,0,0,-185116),
        (0,0,0,2,-114332),(2,0,-2,0,58793),(2,-1,-1,0,57066),(2,0,1,0,53322),(2,-1,0,0,45758),
        (0,1,-1,0,-40923),(1,0,0,0,-34720),(0,1,1,0,-30383),(2,0,0,-2,15327),(0,0,1,2,-12528),
        (0,0,1,-2,10980),(4,0,-1,0,10675),(0,0,3,0,10034),(4,0,-2,0,8548),(2,1,-1,0,-7888),
        (2,1,0,0,-6766),(1,0,-1,0,-5163),(1,1,0,0,4987),(2,-1,1,0,4036),(2,0,2,0,3994),
        (4,0,0,0,3861),(2,0,-3,0,3665),(0,1,-2,0,-2689),(2,0,-1,2,-2602),(2,-1,-2,0,2390),
        (1,0,1,0,-2348),(2,-2,0,0,2236),(0,1,2,0,-2120),(0,2,0,0,-2069),(2,-2,-1,0,2048),
        (2,0,1,-2,-1773),(2,0,0,2,-1595),(4,-1,-1,0,1215),(0,0,2,2,-1110),(3,0,-1,0,-892),
        (2,1,1,0,-810),(4,-1,-2,0,759),(0,2,-1,0,-713),(2,2,-1,0,-700),(2,1,-2,0,691),
        (2,-1,0,-2,596),(4,0,1,0,549),(0,0,4,0,537),(4,-1,0,0,520),(1,0,-2,0,-487),
        (2,1,0,-2,-399),(0,0,2,-2,-381),(1,1,1,0,351),(3,0,-2,0,-340),(4,0,-3,0,330),
        (2,-1,2,0,327),(0,2,1,0,-323),(1,1,-1,0,299),(2,0,3,0,294),
    ]

    struct MoonArgs {
        let lp, d, m, mp, f, e: Double
        init(_ t: Double) {
            let t2 = t * t, t3 = t2 * t, t4 = t3 * t
            lp = 218.3164477 + 481267.88123421 * t - 0.0015786 * t2 + t3 / 538841 - t4 / 65194000
            d = 297.8501921 + 445267.1114034 * t - 0.0018819 * t2 + t3 / 545868 - t4 / 113065000
            m = 357.5291092 + 35999.0502909 * t - 0.0001536 * t2 + t3 / 24490000
            mp = 134.9633964 + 477198.8675055 * t + 0.0087414 * t2 + t3 / 69699 - t4 / 14712000
            f = 93.2720950 + 483202.0175233 * t - 0.0036539 * t2 - t3 / 3526000 + t4 / 863310000
            e = 1 - 0.002516 * t - 0.0000074 * t2
        }
    }

    /// Apparent tropical longitude of the Moon (mean equinox + nutation), degrees.
    public static func moonLon(_ jdUT: Double) -> Double {
        let t = centuriesTT(jdUT)
        let a = MoonArgs(t)
        let a1 = 119.75 + 131.849 * t, a2 = 53.09 + 479264.290 * t
        var sl = 0.0
        for (d, m, mp, f, c) in mt {
            var k = c
            let am = abs(m)
            if am == 1 { k *= a.e } else if am == 2 { k *= a.e * a.e }
            sl += k * sind(d * a.d + m * a.m + mp * a.mp + f * a.f)
        }
        sl += 3958 * sind(a1) + 1962 * sind(a.lp - a.f) + 318 * sind(a2)
        let om = 125.04452 - 1934.136261 * t
        let dpsi = (-17.2 * sind(om) - 1.32 * sind(2 * (280.4665 + 36000.7698 * t)) - 0.23 * sind(2 * a.lp)) / 3600
        return norm(a.lp + sl / 1e6 + dpsi)
    }

    /// Ecliptic latitude of the Moon (largest Meeus 47.B terms), degrees. Used for the horizon view only.
    public static func moonLat(_ jdUT: Double) -> Double {
        let a = MoonArgs(centuriesTT(jdUT))
        var sb = 5128122 * sind(a.f) + 280602 * sind(a.mp + a.f) + 277693 * sind(a.mp - a.f)
        sb += 173237 * sind(2 * a.d - a.f) + 55413 * sind(2 * a.d - a.mp + a.f) + 46271 * sind(2 * a.d - a.mp - a.f)
        sb += 32573 * sind(2 * a.d + a.f) + 17198 * sind(2 * a.mp + a.f)
        return sb / 1e6
    }

    /// Lahiri (Chitrapaksha) ayanamsa including nutation, so it matches apparent longitudes.
    public static func ayanamsa(_ jdUT: Double) -> Double {
        let t = centuriesTT(jdUT)
        let om = 125.04452 - 1934.136261 * t
        let dpsi = (-17.2 * sind(om) - 1.32 * sind(2 * (280.4665 + 36000.7698 * t))) / 3600
        return 23.85709 + (5029.0966 * t + 1.11113 * t * t) / 3600 + dpsi
    }

    public static func sidSun(_ jd: Double) -> Double { norm(sunLon(jd) - ayanamsa(jd)) }
    public static func sidMoon(_ jd: Double) -> Double { norm(moonLon(jd) - ayanamsa(jd)) }
    /// Elongation E = λ☾ − λ☉ (ayanamsa cancels).
    public static func elong(_ jd: Double) -> Double { norm(moonLon(jd) - sunLon(jd)) }

    public static func obliquity(_ jd: Double) -> Double { 23.439291 - 0.0130042 * centuriesTT(jd) }
    public static func gmst(_ jd: Double) -> Double {
        let t = (jd - 2451545) / 36525
        return norm(280.46061837 + 360.98564736629 * (jd - 2451545) + 0.000387933 * t * t)
    }

    static func sunEvent(_ jdGuess: Double, _ lat: Double, _ lon: Double, rise: Bool) -> Double {
        var jd = jdGuess
        for _ in 0..<6 {
            let lam = sunLon(jd), eps = obliquity(jd)
            let ra = norm(atan2(cosd(eps) * sind(lam), cosd(lam)) * r2d)
            let dec = asin(sind(eps) * sind(lam)) * r2d
            let cosH = (sind(-0.833) - sind(lat) * sind(dec)) / (cosd(lat) * cosd(dec))
            let h = acos(max(-1, min(1, cosH))) * r2d
            let target = rise ? norm(ra - h) : norm(ra + h)
            let lst = norm(gmst(jd) + lon)
            var dh = target - lst
            if dh > 180 { dh -= 360 }
            if dh < -180 { dh += 360 }
            jd += dh / 360.98564736629
        }
        return jd
    }

    static func localMidnightJd(_ date: CivilDate, _ tz: Double) -> Double { Double(date.epochDay) + 2440587.5 - tz / 24 }

    /// UTC offset in hours of `zoneId` at local noon on `date` (DST-aware).
    public static func tzHours(_ zoneId: String, _ date: CivilDate) -> Double {
        guard let zone = TimeZone(identifier: zoneId) else { return 0 }
        // offset at 12:00 UTC is within an hour of local noon for all real zones; refine once
        let noonUTC = Date(timeIntervalSince1970: Double(date.epochDay) * 86400 + 43200)
        let guess = Double(zone.secondsFromGMT(for: noonUTC))
        return Double(zone.secondsFromGMT(for: noonUTC.addingTimeInterval(-guess))) / 3600
    }

    public static func sunriseOn(_ date: CivilDate, _ place: Place) -> Double {
        sunEvent(localMidnightJd(date, tzHours(place.zoneId, date)) + 0.25, place.lat, place.lon, rise: true)
    }
    public static func sunsetOn(_ date: CivilDate, _ place: Place) -> Double {
        sunEvent(localMidnightJd(date, tzHours(place.zoneId, date)) + 0.75, place.lat, place.lon, rise: false)
    }

    static func angaValue(_ kind: Anga, _ jd: Double) -> Double {
        switch kind {
        case .tithi, .karana: return elong(jd)
        case .nakshatra, .rasi: return sidMoon(jd)
        case .yoga: return norm(sidMoon(jd) + sidSun(jd))
        case .solar: return sidSun(jd)
        }
    }

    public static func angaAt(_ kind: Anga, _ jd: Double) -> Int { Int(floor(angaValue(kind, jd) / kind.span)) % kind.n }

    /// Time when the anga index changes from its value at `jd` (forward search).
    public static func angaEnd(_ kind: Anga, _ jd: Double) -> Double {
        let boundary = norm(Double(angaAt(kind, jd) + 1) * kind.span)
        let g = { (t: Double) -> Double in let d = norm(angaValue(kind, t) - boundary); return d > 180 ? d - 360 : d }
        var lo = jd, hi = jd + 0.25
        while g(hi) < 0 { lo = hi; hi += 0.25; if hi - jd > 40 { break } }
        for _ in 0..<40 { let mid = (lo + hi) / 2; if g(mid) < 0 { lo = mid } else { hi = mid } }
        return hi
    }

    public static func angaStart(_ kind: Anga, _ jd: Double) -> Double {
        let boundary = norm(Double(angaAt(kind, jd)) * kind.span)
        let g = { (t: Double) -> Double in let d = norm(angaValue(kind, t) - boundary); return d > 180 ? d - 360 : d }
        var hi = jd, lo = jd - 0.25
        while g(lo) >= 0 { hi = lo; lo -= 0.25; if jd - lo > 40 { break } }
        for _ in 0..<40 { let mid = (lo + hi) / 2; if g(mid) < 0 { lo = mid } else { hi = mid } }
        return hi
    }

    /// Local civil date of a JD in `place`'s zone.
    public static func civilDate(_ jd: Double, _ place: Place) -> CivilDate {
        let secs = (jd - 2440587.5) * 86400
        let off = Double(TimeZone(identifier: place.zoneId)?.secondsFromGMT(for: Date(timeIntervalSince1970: secs)) ?? 0)
        return CivilDate(epochDay: Int(floor((secs + off) / 86400)))
    }

    /// Full panchanga for a civil date at a place. All times are JD (UT).
    public static func panchanga(_ date: CivilDate, _ place: Place) -> DayPanchanga {
        let tz = tzHours(place.zoneId, date)
        let sr = sunriseOn(date, place), ss = sunsetOn(date, place)
        let srNext = sunriseOn(date.adding(days: 1), place)
        let weekday = date.weekday
        func spans(_ kind: Anga) -> [Span] {
            var list: [Span] = []
            var t = sr
            while t < srNext && list.count < 4 {
                let idx = angaAt(kind, t + 1e-6), end = angaEnd(kind, t + 1e-6)
                list.append(Span(idx: idx, end: end)); t = end
            }
            return list
        }
        // Tamil solar month: sankranti before sunset => that day is day 1, else the next day
        let mIdx = angaAt(.solar, ss)
        let start = angaStart(.solar, ss)
        let sd = civilDate(start, place)
        let day1 = start > sunsetOn(sd, place) ? sd.adding(days: 1) : sd
        let tamilDay = date.epochDay - day1.epochDay + 1
        let ty = (date.month <= 4 && mIdx >= 8) ? date.year - 1 : date.year
        let samvat = (((ty - 1987) % 60) + 60) % 60
        let part = (ss - sr) / 8
        func seg(_ n: Int) -> (Double, Double) { (sr + Double(n - 1) * part, sr + Double(n) * part) }
        return DayPanchanga(
            date: date, tzHours: tz, sunrise: sr, sunset: ss, nextSunrise: srNext, weekday: weekday,
            tithi: spans(.tithi), nakshatra: spans(.nakshatra), yoga: spans(.yoga), karana: spans(.karana),
            tamilMonth: mIdx, tamilDay: tamilDay, samvat: samvat,
            rahu: seg(Tables.rahuKalam[weekday]), yama: seg(Tables.yamagandam[weekday]), gulika: seg(Tables.kulikai[weekday]),
            abhijit: (sr + 7 * (ss - sr) / 15, sr + 8 * (ss - sr) / 15),
            sunSid: sidSun(sr), moonSid: sidMoon(sr), ayanamsa: ayanamsa(sr))
    }

    /// The panchanga day (sunrise to next sunrise) containing `jd`.
    public static func dayContaining(_ jd: Double, _ place: Place) -> DayPanchanga {
        let d = civilDate(jd, place)
        let p = panchanga(d, place)
        return jd < p.sunrise ? panchanga(d.adding(days: -1), place) : p
    }

    /// Sidereal ecliptic (λ, β) → horizontal (alt, az) for an observer. az: 0 = N, 90 = E.
    public static func altAz(_ lamSid: Double, _ beta: Double, _ jd: Double, lat: Double, lon: Double) -> (alt: Double, az: Double) {
        let lam = lamSid + ayanamsa(jd), eps = obliquity(jd)
        let ra = atan2(sind(lam) * cosd(eps) - tan(beta * d2r) * sind(eps), cosd(lam))
        let dec = asin(sind(beta) * cosd(eps) + cosd(beta) * sind(eps) * sind(lam))
        let h = (gmst(jd) + lon) * d2r - ra, phi = lat * d2r
        let alt = asin(sin(phi) * sin(dec) + cos(phi) * cos(dec) * cos(h))
        let az = atan2(-sin(h) * cos(dec), cos(phi) * sin(dec) - sin(phi) * cos(dec) * cos(h))
        return (alt * r2d, norm(az * r2d))
    }

    /// Equatorial (RA, Dec) → horizontal for a given local sidereal time (degrees).
    public static func eqToHor(ra: Double, dec: Double, lst: Double, lat: Double) -> (alt: Double, az: Double) {
        let h = (lst - ra) * d2r, d = dec * d2r, phi = lat * d2r
        let alt = asin(sin(phi) * sin(d) + cos(phi) * cos(d) * cos(h))
        let az = atan2(-sin(h) * cos(d), cos(phi) * sin(d) - sin(phi) * cos(d) * cos(h))
        return (alt * r2d, norm(az * r2d))
    }
}
