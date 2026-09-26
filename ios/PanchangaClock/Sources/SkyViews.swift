// Celestial mode — Kālacakra (geocentric wheel from space: Earth, tithi dial, Moon's orbit with the nodes, the
// five grahas (not to scale), rāśis and nakṣatras, the Sun; real Milky Way and bright stars behind) and Horizon
// (first-person alt/az sky from the selected place). Textured bodies via SkyAssets. Mirrors SkyView.kt.
import SwiftUI
import PanchangaCore

enum Target: String, CaseIterable, Identifiable {
    case overview, sun, moon, earth, nakshatra, tithi, yoga, mercury, venus, mars, jupiter, saturn, rahu, ketu
    var id: String { rawValue }
    var label: String {
        switch self {
        case .overview: "Kālacakra"; case .sun: "Sūrya"; case .moon: "Candra"; case .earth: "Pṛthvī"; case .nakshatra: "Nakṣatra"
        case .tithi: "Tithi"; case .yoga: "Yoga"; case .mercury: "Budha"; case .venus: "Śukra"; case .mars: "Maṅgala"
        case .jupiter: "Guru"; case .saturn: "Śani"; case .rahu: "Rāhu"; case .ketu: "Ketu"
        }
    }
    var gloss: String {
        switch self {
        case .overview: "Overview"; case .sun: "Sun"; case .moon: "Moon"; case .earth: "You are here"; case .nakshatra: "Lunar mansion"
        case .tithi: "Lunar day"; case .yoga: "Sun + Moon"; case .mercury: "Mercury"; case .venus: "Venus"; case .mars: "Mars"
        case .jupiter: "Jupiter"; case .saturn: "Saturn"; case .rahu: "North node"; case .ketu: "South node"
        }
    }
    /// Key into Tables.grahas / Planets for bodies
    var graha: String? {
        switch self { case .overview, .nakshatra, .tithi, .yoga: nil; default: rawValue }
    }
}

/// Orbit camera. `el` = tilt above the ecliptic plane (90 = top-down, i.e. the clock face).
struct Cam: Equatable {
    var tx: Double, tz: Double, fit: Double, el: Double, az: Double
    static func lerp(_ a: Cam, _ b: Cam, _ k: Double) -> Cam {
        let dAz = ((b.az - a.az).truncatingRemainder(dividingBy: 360) + 540).truncatingRemainder(dividingBy: 360) - 180
        return Cam(tx: a.tx + (b.tx - a.tx) * k, tz: a.tz + (b.tz - a.tz) * k, fit: a.fit + (b.fit - a.fit) * k, el: a.el + (b.el - a.el) * k, az: a.az + dAz * k)
    }
}

enum Radii {
    static let earth = 1.0, arc0 = 1.35, arc1 = 1.8, dial0 = 2.19, dial1 = 2.9, moonOrbit = 3.5
    static let rasi0 = 7.4, rasi1 = 8.3, nak0 = 8.5, nak1 = 10.4, nakLabel = 9.45, sun = 14.0
    /// Grahas sit between the Moon's orbit and the zodiac band, in order of period — not to scale.
    static let planet: [String: Double] = ["mercury": 4.25, "venus": 4.9, "mars": 5.55, "jupiter": 6.2, "saturn": 6.85]
    static let planetSize: [String: Double] = ["mercury": 0.13, "venus": 0.2, "mars": 0.16, "jupiter": 0.34, "saturn": 0.28]
}

let grahaColor: [String: Color] = [
    "mercury": Color(hex: 0x57A872), "venus": Color(hex: 0xF4EFE6), "mars": Color(hex: 0xD0473A),
    "jupiter": Color(hex: 0xE0B040), "saturn": Color(hex: 0x6F7FB0), "rahu": Color(hex: 0x6A6F86), "ketu": Color(hex: 0x8C7A6A),
]

/// Everything the sky needs for one instant.
struct SkyNow {
    let jd, sunSid, moonSid, elong: Double
    let grahas: [GrahaPos]
    var ayan: Double { Engine.ayanamsa(jd) }
    var eps: Double { Engine.obliquity(jd) }
    func graha(_ key: String) -> GrahaPos { grahas.first { $0.key == key }! }
    static func at(_ jd: Double) -> SkyNow {
        SkyNow(jd: jd, sunSid: Engine.sidSun(jd), moonSid: Engine.sidMoon(jd), elong: Engine.elong(jd), grahas: Planets.all(jd))
    }
}

/// World position (ecliptic plane) for sidereal longitude λ at radius r; λ runs counter-clockwise seen from above.
func world(_ lon: Double, _ r: Double) -> (Double, Double) { let a = lon * .pi / 180; return (-r * sin(a), -r * cos(a)) }

func bodyPos(_ t: Target, _ s: SkyNow) -> (Double, Double)? {
    switch t {
    case .sun: return world(s.sunSid, Radii.sun)
    case .moon: return world(s.moonSid, Radii.moonOrbit)
    case .earth: return (0, 0)
    case .mercury, .venus, .mars, .jupiter, .saturn: return world(s.graha(t.rawValue).sidLon, Radii.planet[t.rawValue]!)
    case .rahu, .ketu: return world(s.graha(t.rawValue).sidLon, Radii.moonOrbit)
    default: return nil
    }
}

func goal(_ t: Target, _ s: SkyNow) -> Cam {
    let span = 360.0 / 27
    let p = bodyPos(t, s) ?? (0, 0)
    switch t {
    case .overview: return Cam(tx: 0, tz: 0, fit: 13.5, el: 42, az: 0)
    case .sun: return Cam(tx: p.0, tz: p.1, fit: 4.5, el: 26, az: 0)
    case .moon: return Cam(tx: p.0, tz: p.1, fit: 1.5, el: 22, az: 0)
    case .earth: return Cam(tx: 0, tz: 0, fit: 2.4, el: 20, az: 0)
    case .nakshatra: let w = world((floor(s.moonSid / span) + 0.5) * span, Radii.nakLabel); return Cam(tx: w.0, tz: w.1, fit: 4.2, el: 50, az: 0)
    case .tithi: return Cam(tx: 0, tz: 0, fit: 3.6, el: 82, az: 0)
    case .yoga: return Cam(tx: 0, tz: 0, fit: 11.5, el: 62, az: 0)
    case .jupiter, .saturn: return Cam(tx: p.0, tz: p.1, fit: 1.4, el: 18, az: 0)
    case .rahu, .ketu: return Cam(tx: p.0, tz: p.1, fit: 2.2, el: 30, az: 0)
    default: return Cam(tx: p.0, tz: p.1, fit: 0.9, el: 18, az: 0)
    }
}

struct Projector {
    let cam: Cam, size: CGSize
    let s, sinEl, cosEl, ca, sa, dist, focal: Double
    let center: CGPoint
    init(_ cam: Cam, _ size: CGSize) {
        self.cam = cam; self.size = size
        s = Double(min(size.width, size.height)) / 2 / cam.fit
        sinEl = sin(cam.el * .pi / 180); cosEl = cos(cam.el * .pi / 180)
        ca = cos(cam.az * .pi / 180); sa = sin(cam.az * .pi / 180)
        dist = cam.fit * 3.2
        focal = Double(min(size.width, size.height)) * 0.9
        center = CGPoint(x: size.width / 2, y: size.height * 0.36)
    }
    /// Screen point, perspective factor and depth (positive = farther) for a world point (y = height above the plane).
    func p(_ x: Double, _ z: Double, _ y: Double = 0) -> (CGPoint, Double, Double) {
        let dx = x - cam.tx, dz = z - cam.tz
        let rx = dx * ca - dz * sa, rz = dx * sa + dz * ca
        let depth = -rz * cosEl - y * sinEl
        let f = dist / max(0.2 * dist, dist + depth)
        return (CGPoint(x: center.x + CGFloat(rx * s * f), y: center.y + CGFloat((rz * sinEl - y * cosEl) * s * f)), f, depth)
    }
    func at(_ lon: Double, _ r: Double) -> (CGPoint, Double, Double) { let w = world(lon, r); return p(w.0, w.1) }
    func view(_ dx: Double, _ dy: Double, _ dz: Double) -> V3 {
        let rx = dx * ca - dz * sa, rz = dx * sa + dz * ca
        return V3(x: rx, y: -(rz * sinEl - dy * cosEl), z: rz * cosEl + dy * sinEl)
    }
    func viewLon(_ lon: Double) -> V3 { let w = world(lon, 1); return view(w.0, 0, w.1) }
    func sky(_ v: V3) -> CGPoint? { v.z >= -0.05 ? nil : CGPoint(x: center.x + CGFloat(focal * v.x / -v.z), y: center.y - CGFloat(focal * v.y / -v.z)) }
    /// Body frame: north = ecliptic north, centre meridian toward sidereal longitude `meridian`.
    func frame(_ meridian: Double) -> BodyFrame { BodyFrame(x: viewLon(meridian + 90), y: view(0, 1, 0), z: viewLon(meridian)) }
    func ring(_ r: Double) -> Path {
        Path { path in for i in 0...120 { let o = at(Double(i) * 3, r).0; i == 0 ? path.move(to: o) : path.addLine(to: o) } }
    }
    func band(_ r0: Double, _ r1: Double, _ from: Double, _ to: Double, steps: Int = 12) -> Path {
        Path { path in
            for i in 0...steps { let o = at(from + (to - from) * Double(i) / Double(steps), r1).0; i == 0 ? path.move(to: o) : path.addLine(to: o) }
            for i in stride(from: steps, through: 0, by: -1) { path.addLine(to: at(from + (to - from) * Double(i) / Double(steps), r0).0) }
            path.closeSubpath()
        }
    }
}

/// HYG stars as unit vectors in the world (sidereal ecliptic) frame.
struct StarDirs {
    let v: [(Double, Double, Double)], mag: [Double], col: [Color]
    init(_ stars: [Star], eps: Double, ayan: Double) {
        var v: [(Double, Double, Double)] = []
        for s in stars {
            let (lam, bet) = eqToSidEcl(ra: s.ra, dec: s.dec, eps: eps, ayan: ayan)
            let l = lam * .pi / 180, b = bet * .pi / 180
            v.append((-cos(b) * sin(l), sin(b), -cos(b) * cos(l)))
        }
        self.v = v; mag = stars.map(\.mag); col = stars.map(\.color)
    }
}

func drawStars(_ g: GraphicsContext, _ size: CGSize, _ pr: Projector, _ dirs: StarDirs?, _ fallback: Starfield, t: Double, alpha: Double, warp: Double) {
    guard let dirs, !dirs.v.isEmpty else { fallback.draw(g, t, size, parallax: CGPoint(x: pr.cam.az * 3, y: pr.cam.el * 2), alpha: alpha); return }
    let c = pr.center
    for i in dirs.v.indices {
        guard let o = pr.sky(pr.view(dirs.v[i].0, dirs.v[i].1, dirs.v[i].2)), o.x > -20, o.y > -20, o.x < size.width + 20, o.y < size.height + 20 else { continue }
        let b = min(1, max(0.08, (5.2 - dirs.mag[i]) / 6.5))
        let tw = 0.8 + 0.2 * sin(t * (1.1 + Double(i % 5) * 0.37) + Double(i))
        let r = CGFloat(0.55 + 2.3 * b * b), a = min(1, max(0, b * tw * alpha))
        if warp > 0.02 {
            let dx = o.x - c.x, dy = o.y - c.y, len = max(1, hypot(dx, dy)), k = len * 0.35 * CGFloat(warp)
            g.stroke(segment(o, CGPoint(x: o.x + dx / len * k, y: o.y + dy / len * k)), with: .color(dirs.col[i].opacity(a)), style: StrokeStyle(lineWidth: r, lineCap: .round))
        }
        if b > 0.55 { g.fill(circle(o, r * 3.2), with: .color(dirs.col[i].opacity(a * 0.25))) }
        g.fill(circle(o, r), with: .color(dirs.col[i].opacity(a)))
    }
}

/// Draws the Kālacakra and returns screen positions of pickable targets.
func drawKalacakra(_ g: GraphicsContext, _ size: CGSize, cam: Cam, now: SkyNow, lock: Target, t: Double, stars fallback: Starfield,
                   dirs: StarDirs?, assets: SkyAssets?, alpha: Double, warp: Double) -> [Target: CGPoint] {
    let pr = Projector(cam, size)
    let sun = now.sunSid, moon = now.moonSid, elong = now.elong
    assets?.backdropOrbit(g, size, center: pr.center, focal: pr.focal, az: cam.az, el: cam.el, ayan: now.ayan, eps: now.eps, gain: 0.9 * alpha)
    drawStars(g, size, pr, dirs, fallback, t: t, alpha: alpha, warp: warp)
    let span = 360.0 / 27
    let ys = Engine.norm(sun + moon)
    let curNak = Int(moon / span) % 27, curTithi = Int(elong / 12) % 30, curYoga = Int(ys / span) % 27
    let yogaMode = lock == .yoga

    for i in 0..<12 {
        g.fill(pr.band(Radii.rasi0, Radii.rasi1, Double(i) * 30, Double(i + 1) * 30), with: .color((i % 2 == 0 ? C.cellA : C.cellB).opacity(0.6 * alpha)))
        let (o, f, _) = pr.at(Double(i) * 30 + 15, (Radii.rasi0 + Radii.rasi1) / 2)
        g.text(Tables.rasi[i].devanagari, F.skt(11 * min(1.6, max(0.6, f))), C.goldSoft.opacity(0.85 * alpha), at: o)
    }
    for i in 0..<27 {
        let cur = yogaMode ? curYoga == i : curNak == i
        let warn = yogaMode && (i == 16 || i == 26)
        let col: Color = cur ? RingColor.nakshatra.opacity(0.55) : warn ? C.kumkum.opacity(0.6) : (i % 2 == 0 ? C.cellA : C.cellB)
        g.fill(pr.band(Radii.nak0, Radii.nak1, Double(i) * span, Double(i + 1) * span), with: .color(col.opacity(0.82 * alpha)))
        let (o, f, _) = pr.at((Double(i) + 0.5) * span, Radii.nakLabel)
        g.text(yogaMode ? Tables.yoga[i].iast : Tables.nakshatra[i].iast, F.skt(9.5 * min(2.2, max(0.55, f)), italic: true), (cur ? C.goldSoft : C.star.opacity(0.7)).opacity(alpha), at: o)
    }
    for i in 0..<12 { g.stroke(segment(pr.at(Double(i) * 30, Radii.rasi0).0, pr.at(Double(i) * 30, Radii.nak1).0), with: .color(C.gold.opacity(0.7 * alpha)), lineWidth: 1) }
    g.stroke(pr.ring(Radii.nak1 + 0.05), with: .color(C.gold.opacity(0.5 * alpha)), lineWidth: 1)

    for (_, r) in Radii.planet { g.stroke(pr.ring(r), with: .color(C.muted.opacity(0.16 * alpha)), style: StrokeStyle(lineWidth: 0.7, dash: [4, 6])) }
    g.stroke(pr.ring(Radii.moonOrbit), with: .color(Color(hex: 0x9AA6C0).opacity(0.35 * alpha)), lineWidth: 0.8)
    for i in 0..<30 {
        let a0 = sun + Double(i) * 12
        let col: Color = i == curTithi ? C.goldSoft.opacity(0.6) : i == 14 ? C.purnima.opacity(0.6) : i == 29 ? C.amavasya : i < 15 ? C.sukla.opacity(0.55) : C.krsna.opacity(0.8)
        g.fill(pr.band(Radii.dial0, Radii.dial1, a0, a0 + 12, steps: 4), with: .color(col.opacity(alpha)))
        if cam.fit < 7 {
            let (o, f, _) = pr.at(a0 + 6, (Radii.dial0 + Radii.dial1) / 2)
            g.text("\(i % 15 + 1)", F.mono(8 * min(2, max(0.6, f))), C.star.opacity(0.8 * alpha), at: o)
        }
    }
    g.fill(pr.band(Radii.arc0, Radii.arc1, sun, sun + elong, steps: 60), with: .color(C.gold.opacity(0.45 * alpha)))
    func rod(_ lon: Double, _ col: Color, _ w: CGFloat) { g.stroke(segment(pr.at(lon, 1.05).0, pr.at(lon, Radii.nak1).0), with: .color(col), style: StrokeStyle(lineWidth: w, lineCap: .round)) }
    rod(sun, C.gold.opacity(0.8 * alpha), 1.5)
    rod(moon, C.moon.opacity(0.8 * alpha), 1.2)
    if yogaMode { rod(ys, C.goldSoft.opacity(alpha), 2); g.fill(circle(pr.at(ys, Radii.nak1 + 0.4).0, 5), with: .color(C.goldSoft.opacity(alpha))) }

    // bodies, painted far → near
    let light = pr.viewLon(sun)
    var bodies: [(Target, CGPoint, Double, () -> Void)] = []
    do {
        let (o, f, d) = pr.p(0, 0)
        let r = CGFloat(pr.s * f * Radii.earth)
        bodies.append((.earth, o, d, {
            // Greenwich faces sidereal longitude GMST − ayanamsa, so the lit hemisphere is the real daytime side
            if assets?.sphere(g, "earth", o, r, pr.frame(Engine.gmst(now.jd) - now.ayan), light, t: t, alpha: alpha, atmo: (0.44, 0.66, 1.0), atmoK: 0.9) != true {
                g.fill(circle(o, r), with: .radialGradient(Gradient(colors: [Color(hex: 0x3A6FB0), Color(hex: 0x16305C), Color(hex: 0x0A1428)]), center: o, startRadius: 0, endRadius: r * 1.4))
            }
        }))
    }
    do {
        let (o, f, d) = pr.at(moon, Radii.moonOrbit)
        let r = max(3, CGFloat(pr.s * f * 0.34))
        bodies.append((.moon, o, d, {
            g.fill(circle(o, r * 3), with: .radialGradient(Gradient(colors: [C.moon.opacity(0.22 * alpha), .clear]), center: o, startRadius: 0, endRadius: r * 3))
            let y = pr.view(0, 1, 0), z = pr.viewLon(moon + 180)
            if assets?.sphere(g, "moon", o, r, BodyFrame(x: y.cross(z), y: y, z: z), light, t: t, alpha: alpha) != true { g.moonPhase(o, r, elong) }
        }))
    }
    do {
        let (o, f, d) = pr.at(sun, Radii.sun)
        let r = max(5, CGFloat(pr.s * f * 0.9))
        bodies.append((.sun, o, d, {
            if assets?.sphere(g, "sun", o, r, pr.frame(t * 2), light, t: t, alpha: alpha) != true {
                g.fill(circle(o, r * 4), with: .radialGradient(Gradient(colors: [Color(hex: 0xFFF4D6, alpha: alpha), C.gold.opacity(0.5 * alpha), .clear]), center: o, startRadius: 0, endRadius: r * 4))
                g.fill(circle(o, r), with: .color(Color(hex: 0xFFF4D6, alpha: alpha)))
            }
        }))
    }
    for gp in now.grahas {
        guard let tgt = Target(rawValue: gp.key) else { continue }
        let col = grahaColor[gp.key] ?? C.star
        if gp.key == "rahu" || gp.key == "ketu" {
            let (o, f, d) = pr.at(gp.sidLon, Radii.moonOrbit)
            let r = max(3, CGFloat(pr.s * f * 0.17))
            bodies.append((tgt, o, d, {
                g.fill(circle(o, r), with: .color(Color(hex: 0x05060C).opacity(0.9 * alpha)))
                g.stroke(circle(o, r), with: .color(col.opacity(0.9 * alpha)), lineWidth: 1.2)
                let near = min(angDiff(gp.sidLon, sun), angDiff(gp.sidLon, moon))
                if near < 12 { g.fill(circle(o, r * 2.4), with: .color(C.kumkum.opacity((12 - near) / 12 * 0.45 * alpha))) }
                g.text(Tables.graha(gp.key).iast, F.skt(11, italic: true), C.muted.opacity(alpha), at: CGPoint(x: o.x, y: o.y + r + 11))
            }))
        } else {
            let (o, f, d) = pr.at(gp.sidLon, Radii.planet[gp.key]!)
            let r = max(2.5, CGFloat(pr.s * f * Radii.planetSize[gp.key]!))
            bodies.append((tgt, o, d, {
                let spin = t * (gp.key == "jupiter" || gp.key == "saturn" ? 24 : 8)
                let isVenus = gp.key == "venus"
                if assets?.sphere(g, gp.key, o, r, pr.frame(spin), light, t: t, alpha: alpha, atmo: isVenus ? (1, 0.91, 0.75) : (0, 0, 0), atmoK: isVenus ? 0.5 : 0) != true {
                    g.fill(circle(o, r), with: .color(col.opacity(alpha)))
                }
                g.text(Tables.graha(gp.key).iast + (gp.retrograde ? " ℞" : ""), F.skt(11, italic: true), col.opacity(0.95 * alpha), at: CGPoint(x: o.x, y: o.y + r + 11))
            }))
        }
    }
    var picks: [Target: CGPoint] = [:]
    for b in bodies.sorted(by: { $0.2 > $1.2 }) { b.3(); picks[b.0] = b.1 }
    picks[.nakshatra] = pr.at((Double(curNak) + 0.5) * span, Radii.nakLabel).0
    picks[.tithi] = pr.at(sun + Double(curTithi) * 12 + 6, (Radii.dial0 + Radii.dial1) / 2).0
    picks[.yoga] = pr.at(ys, Radii.nak1 + 0.4).0
    if lock != .overview, let o = picks[lock] { reticle(g, o, 26, alpha * (1 - warp)) }
    return picks
}

func reticle(_ g: GraphicsContext, _ o: CGPoint, _ h: CGFloat, _ alpha: Double = 1) {
    let l = h * 0.45
    for (sx, sy) in [(-1.0, -1.0), (1.0, -1.0), (-1.0, 1.0), (1.0, 1.0)] {
        let c = CGPoint(x: o.x + CGFloat(sx) * h, y: o.y + CGFloat(sy) * h)
        g.stroke(Path { p in p.move(to: CGPoint(x: c.x - CGFloat(sx) * l, y: c.y)); p.addLine(to: c); p.addLine(to: CGPoint(x: c.x, y: c.y - CGFloat(sy) * l)) }, with: .color(C.goldSoft.opacity(alpha)), lineWidth: 2)
    }
}

func angDiff(_ a: Double, _ b: Double) -> Double { abs(((a - b).truncatingRemainder(dividingBy: 360) + 540).truncatingRemainder(dividingBy: 360) - 180) }

// MARK: - Horizon

struct HorizonInfo { let sunAlt, sunAz, moonAlt, moonAz: Double }
func horizonInfo(_ jd: Double, _ p: Place) -> HorizonInfo {
    let s = Engine.altAz(Engine.sidSun(jd), 0, jd, lat: p.lat, lon: p.lon)
    let m = Engine.altAz(Engine.sidMoon(jd), Engine.moonLat(jd), jd, lat: p.lat, lon: p.lon)
    return HorizonInfo(sunAlt: s.alt, sunAz: s.az, moonAlt: m.alt, moonAz: m.az)
}

func mix(_ a: (Double, Double, Double), _ b: (Double, Double, Double), _ t: Double) -> Color {
    Color(.sRGB, red: a.0 + (b.0 - a.0) * t, green: a.1 + (b.1 - a.1) * t, blue: a.2 + (b.2 - a.2) * t)
}

func drawHorizon(_ g: GraphicsContext, _ size: CGSize, now: SkyNow, place: Place, heading: Double, pitch: Double, fov: Double, t: Double, stars: [Star], assets: SkyAssets?) {
    let jd = now.jd
    let ppd = Double(size.width) / fov
    let cx = Double(size.width) / 2, cy = Double(size.height) / 2
    func scr(_ alt: Double, _ az: Double) -> CGPoint? {
        var d = az - heading; d = ((d.truncatingRemainder(dividingBy: 360)) + 540).truncatingRemainder(dividingBy: 360) - 180
        if abs(d) > fov * 0.75 { return nil }
        return CGPoint(x: cx + d * ppd, y: cy - (alt - pitch) * ppd)
    }
    let info = horizonInfo(jd, place)
    let day = min(1, max(0, (info.sunAlt + 8) / 14))
    let horizonY = cy + pitch * ppd
    let lst = Engine.norm(Engine.gmst(jd) + place.lon)
    g.fill(Path(CGRect(origin: .zero, size: size)), with: .color(Color(hex: 0x02030A)))
    assets?.backdropHorizon(g, size, center: CGPoint(x: cx, y: cy), heading: heading, pitch: pitch, ppd: ppd, lat: place.lat, lst: lst, gain: 1.15 * (1 - day))
    g.fill(Path(CGRect(origin: .zero, size: size)), with: .linearGradient(Gradient(colors: [Color(hex: 0x1F3A74).opacity(day), Color(hex: 0x5C7FB8).opacity(day * 0.95), mix((0.047, 0.075, 0.19), (0.91, 0.72, 0.5), day).opacity(0.45 + 0.05 * day)]), startPoint: CGPoint(x: 0, y: horizonY - 90 * ppd), endPoint: CGPoint(x: 0, y: horizonY)))
    for (i, s) in stars.enumerated() {
        let h = Engine.eqToHor(ra: s.ra, dec: s.dec, lst: lst, lat: place.lat)
        guard h.alt > 0, let o = scr(h.alt, h.az) else { continue }
        let b = min(1, max(0.08, (5.2 - s.mag) / 6.5))
        let a = min(1, max(0, b * (0.8 + 0.2 * sin(t * 1.3 + Double(i))) * (1 - day * 0.95)))
        let r = CGFloat(0.6 + 2.6 * b * b)
        if b > 0.55 { g.fill(circle(o, r * 3.4), with: .color(s.color.opacity(a * 0.25))) }
        g.fill(circle(o, r), with: .color(s.color.opacity(a)))
        if s.mag < 1.3, !s.name.isEmpty, day < 0.5 { g.text(s.name, F.body(9), C.muted.opacity(0.8), at: CGPoint(x: o.x, y: o.y + 13)) }
    }
    for a in [30.0, 60.0] {
        let y = CGFloat(cy - (a - pitch) * ppd)
        g.stroke(segment(CGPoint(x: 0, y: y), CGPoint(x: size.width, y: y)), with: .color(C.muted.opacity(0.18)), lineWidth: 1)
        g.text("\(Int(a))°", F.mono(9), C.muted, at: CGPoint(x: 20, y: y - 9))
    }
    var path = Path(); var pen = false
    for i in stride(from: 0, through: 360, by: 2) {
        let a = Engine.altAz(Double(i), 0, jd, lat: place.lat, lon: place.lon)
        guard let o = scr(a.alt, a.az) else { pen = false; continue }
        if pen { path.addLine(to: o) } else { path.move(to: o) }
        pen = true
    }
    g.stroke(path, with: .color(C.gold.opacity(0.85)), lineWidth: 1.4)
    let span = 360.0 / 27, curNak = Int(now.moonSid / span) % 27
    for i in 0..<27 {
        let a1 = Engine.altAz(Double(i) * span, 1.6, jd, lat: place.lat, lon: place.lon), a2 = Engine.altAz(Double(i) * span, -1.6, jd, lat: place.lat, lon: place.lon)
        if let o1 = scr(a1.alt, a1.az), let o2 = scr(a2.alt, a2.az) { g.stroke(segment(o1, o2), with: .color(C.goldSoft.opacity(0.7)), lineWidth: 1) }
        let m = Engine.altAz(Double(i) * span + span / 2, 4.2, jd, lat: place.lat, lon: place.lon)
        if let o = scr(m.alt, m.az) { g.text(Tables.nakshatra[i].iast, F.skt(12, italic: true), i == curNak ? C.goldSoft : C.star.opacity(0.62), at: o) }
    }
    for i in 0..<12 {
        let m = Engine.altAz(Double(i) * 30 + 15, -5.5, jd, lat: place.lat, lon: place.lon)
        if let o = scr(m.alt, m.az) { g.text(Tables.rasi[i].devanagari, F.skt(13), C.goldSoft.opacity(0.8), at: o) }
    }
    let sunO = scr(info.sunAlt, info.sunAz)
    func lightFrom(_ o: CGPoint) -> V3 {
        guard let s = sunO else { return V3(x: 0, y: 0, z: -1) }
        let v = V3(x: Double(s.x - o.x), y: -Double(s.y - o.y), z: 0).norm()
        return V3(x: v.x, y: v.y, z: 0.2)
    }
    for gp in now.grahas where gp.key != "rahu" && gp.key != "ketu" {
        let a = Engine.altAz(gp.sidLon, gp.lat, jd, lat: place.lat, lon: place.lon)
        guard let o = scr(a.alt, a.az) else { continue }
        let r: CGFloat = gp.key == "jupiter" || gp.key == "saturn" ? 7 : 5
        if assets?.sphere(g, gp.key, o, r, .facing, lightFrom(o), t: t) != true { g.fill(circle(o, r), with: .color(grahaColor[gp.key] ?? C.star)) }
        g.text(Tables.graha(gp.key).iast + (gp.retrograde ? " ℞" : ""), F.skt(12, italic: true), grahaColor[gp.key] ?? C.star, at: CGPoint(x: o.x, y: o.y + r + 11))
    }
    if let o = scr(info.moonAlt, info.moonAz) {
        g.fill(circle(o, 60), with: .radialGradient(Gradient(colors: [C.moon.opacity(0.3), .clear]), center: o, startRadius: 0, endRadius: 60))
        let e = now.elong * .pi / 180
        if assets?.sphere(g, "moon", o, 18, .facing, V3(x: sin(e), y: 0, z: -cos(e)), t: t) != true { g.moonPhase(o, 13, now.elong) }
    }
    if let o = sunO, assets?.sphere(g, "sun", o, 18, .facing, V3(x: 0, y: 0, z: 1), t: t) != true {
        g.fill(circle(o, 14), with: .color(Color(hex: 0xFFF4D6)))
    }
    let hy = CGFloat(horizonY)
    if hy < size.height {
        g.fill(Path(CGRect(x: 0, y: hy, width: size.width, height: size.height - hy)), with: .linearGradient(Gradient(colors: [mix((0.027, 0.035, 0.07), (0.1, 0.13, 0.21), day), Color(hex: 0x030408)]), startPoint: CGPoint(x: 0, y: hy), endPoint: CGPoint(x: 0, y: size.height)))
    }
    g.stroke(segment(CGPoint(x: 0, y: hy), CGPoint(x: size.width, y: hy)), with: .color(C.gold.opacity(0.8)), lineWidth: 1.4)
    for (lab, az) in [("N", 0.0), ("E", 90.0), ("S", 180.0), ("W", 270.0)] {
        if let o = scr(0, az) { g.text(lab, F.caps(14), C.goldSoft, at: CGPoint(x: o.x, y: hy + 18)) }
    }
    g.stroke(circle(CGPoint(x: cx, y: cy), 20), with: .color(C.goldSoft.opacity(0.55)), lineWidth: 1)
}
