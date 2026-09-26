// The Kālacakra clock face — geometry from design/clock-face.md (units: face radii, outer rim = 5.0).
// Nāḻigai dial runs clockwise from 12 o'clock; the sky rings run counter-clockwise from 12 o'clock
// (Meṣa 0° at top), as if facing the southern sky. Mirrors ClockFace.kt.
import SwiftUI
import UIKit
import PanchangaCore

/// Screen angle (degrees clockwise from +x, y down) for a sky longitude measured counter-clockwise from the top.
func skyAngle(_ lon: Double) -> Double { -90 - lon }
/// Screen angle for a dial fraction measured clockwise from the top.
func dialAngle(_ frac: Double) -> Double { -90 + 360 * frac }

func polar(_ c: CGPoint, _ r: CGFloat, _ deg: Double) -> CGPoint {
    CGPoint(x: c.x + r * CGFloat(cos(deg * .pi / 180)), y: c.y + r * CGFloat(sin(deg * .pi / 180)))
}

/// Annular sector between radii r0..r1, from screen angle `start` sweeping `sweep` degrees clockwise.
func annulus(_ c: CGPoint, _ r0: CGFloat, _ r1: CGFloat, _ start: Double, _ sweep: Double) -> Path {
    Path { p in
        let n = max(2, Int(abs(sweep) / 3))
        for i in 0...n { let pt = polar(c, r1, start + sweep * Double(i) / Double(n)); i == 0 ? p.move(to: pt) : p.addLine(to: pt) }
        for i in stride(from: n, through: 0, by: -1) { p.addLine(to: polar(c, r0, start + sweep * Double(i) / Double(n))) }
        p.closeSubpath()
    }
}

func circle(_ c: CGPoint, _ r: CGFloat) -> Path { Path(ellipseIn: CGRect(x: c.x - r, y: c.y - r, width: 2 * r, height: 2 * r)) }
func segment(_ a: CGPoint, _ b: CGPoint) -> Path { Path { $0.move(to: a); $0.addLine(to: b) } }

extension GraphicsContext {
    func text(_ s: String, _ font: Font, _ color: Color, at p: CGPoint, rotate: Double = 0) {
        let t = resolve(Text(s).font(font).foregroundStyle(color))
        if rotate == 0 { draw(t, at: p) } else {
            var g = self
            g.translateBy(x: p.x, y: p.y); g.rotate(by: .degrees(rotate)); g.draw(t, at: .zero)
        }
    }

    /// Moon disc with the true phase for elongation e (lit side right while waxing).
    func moonPhase(_ c: CGPoint, _ r: CGFloat, _ e: Double, lit: Color = C.moon) {
        fill(circle(c, r), with: .color(C.moonDark))
        let side: CGFloat = e < 180 ? 1 : -1
        let k = CGFloat(cos(e * .pi / 180))
        let n = 48
        let p = Path { p in
            for i in 0...n {
                let phi = Double.pi * Double(i) / Double(n)
                let pt = CGPoint(x: c.x + side * r * CGFloat(sin(phi)), y: c.y - r * CGFloat(cos(phi)))
                i == 0 ? p.move(to: pt) : p.addLine(to: pt)
            }
            for i in stride(from: n, through: 0, by: -1) {
                let phi = Double.pi * Double(i) / Double(n)
                p.addLine(to: CGPoint(x: c.x + side * r * k * CGFloat(sin(phi)), y: c.y - r * CGFloat(cos(phi))))
            }
            p.closeSubpath()
        }
        fill(p, with: .color(lit))
        fill(circle(c, r), with: .radialGradient(Gradient(colors: [.clear, .black.opacity(0.33)]), center: c, startRadius: 0, endRadius: r))
    }
}

/// Ring hues — one per limb, from data/sky.json.
enum RingColor {
    static func of(_ key: String) -> Color { Color(hex: Tables.ring(key).color) }
    static let nazhigai = of("nazhigai"), nakshatra = of("nakshatra"), tithi = of("tithi"), yoga = of("yoga"), karana = of("karana")
}

/// Ring bands in face units, outside in — for drawing, name tags and tap hit-testing.
let faceRings: [(String, Double, Double)] = [("nazhigai", 4.30, 5.00), ("nakshatra", 3.35, 4.20), ("tithi", 2.45, 3.25), ("yoga", 1.75, 2.35)]

func lerpColor(_ a: Color, _ b: Color, _ t: Double) -> Color {
    let ua = UIColor(a), ub = UIColor(b)
    var r1: CGFloat = 0, g1: CGFloat = 0, b1: CGFloat = 0, a1: CGFloat = 0, r2: CGFloat = 0, g2: CGFloat = 0, b2: CGFloat = 0, a2: CGFloat = 0
    ua.getRed(&r1, green: &g1, blue: &b1, alpha: &a1); ub.getRed(&r2, green: &g2, blue: &b2, alpha: &a2)
    let k = CGFloat(t)
    return Color(.sRGB, red: Double(r1 + (r2 - r1) * k), green: Double(g1 + (g2 - g1) * k), blue: Double(b1 + (b2 - b1) * k), opacity: Double(a1 + (a2 - a1) * k))
}

private func smooth01(_ x: Double) -> Double { let t = min(1, max(0, x)); return t * t * (3 - 2 * t) }

/// Every ring has its own hue and a name tag; tapping a ring highlights it. The rings self-draw on first show
/// (`intro` 0 → 1). The centre Moon is the textured model lit by the true elongation.
struct ClockFace: View {
    let jd: Double
    let day: DayPanchanga
    let sunSid: Double, moonSid: Double, elong: Double
    var t: Double = 0
    var intro: Double = 1
    var highlight: String? = nil
    var onRingTap: (String?) -> Void = { _ in }
    @Environment(\.skyAssets) private var assets

    var body: some View {
        GeometryReader { geo in
            Canvas { g, size in draw(g, size) }
                .contentShape(Rectangle())
                .onTapGesture { loc in
                    let u = min(geo.size.width, geo.size.height) / 2 / 5.32
                    let d = hypot(loc.x - geo.size.width / 2, loc.y - geo.size.height / 2) / u
                    onRingTap(faceRings.first { Double(d) >= $0.1 && Double(d) <= $0.2 }?.0)
                }
        }
    }

    private func draw(_ g: GraphicsContext, _ size: CGSize) {
        let c = CGPoint(x: size.width / 2, y: size.height / 2)
        let u = min(size.width, size.height) / 2 / 5.32
        func r(_ x: Double) -> CGFloat { CGFloat(x) * u }
        let len = day.nextSunrise - day.sunrise
        func frac(_ x: Double) -> Double { (x - day.sunrise) / len }
        func ringAlpha(_ key: String) -> Double { highlight == nil || highlight == key ? 1 : 0.28 }
        func prog(_ i: Int) -> Double { smooth01((intro - Double(i) * 0.14) / 0.45) }
        /// clip to the part of ring `i` already swept in by the intro
        func swept(_ i: Int, _ block: (GraphicsContext) -> Void) {
            let p = prog(i)
            guard p > 0 else { return }
            if p >= 1 { block(g); return }
            var cg = g
            cg.clip(to: Path { w in w.move(to: c); w.addArc(center: c, radius: max(size.width, size.height), startAngle: .degrees(-90), endAngle: .degrees(-90 + 360 * p), clockwise: false); w.closeSubpath() })
            block(cg)
        }

        g.fill(circle(c, r(6.2)), with: .radialGradient(Gradient(colors: [C.lapis.opacity(0.55), .clear]), center: c, startRadius: 0, endRadius: r(6.2)))
        g.fill(circle(c, r(5.28)), with: .conicGradient(Gradient(colors: [C.brass, C.goldSoft, C.brass, Color(hex: 0x7A5528), C.brass]), center: c))
        g.fill(circle(c, r(5.0)), with: .color(C.ink))

        // 1. nāḻigai dial (gold)
        swept(0) { g in
            let a = ringAlpha("nazhigai")
            let ssF = frac(day.sunset)
            g.fill(annulus(c, r(4.6), r(5.0), dialAngle(0), 360 * ssF), with: .color(C.dayArc.opacity(a)))
            g.fill(annulus(c, r(4.6), r(5.0), dialAngle(ssF), 360 * (1 - ssF)), with: .color(C.nightArc.opacity(a)))
            g.fill(circle(c, r(4.6)), with: .color(C.ink2))
            for (span, col) in [(day.rahu, C.kumkum), (day.yama, C.plum), (day.gulika, C.copper)] {
                g.fill(annulus(c, r(4.32), r(4.58), dialAngle(frac(span.0)), 360 * (frac(span.1) - frac(span.0))), with: .color(col.opacity(0.85 * a)))
            }
            for i in 0..<240 {
                let major = i % 4 == 0, ang = dialAngle(Double(i) / 240)
                g.stroke(segment(polar(c, r(major ? 4.78 : 4.88), ang), polar(c, r(4.98), ang)), with: .color((major ? RingColor.nazhigai.opacity(0.9) : C.muted.opacity(0.5)).opacity(a)), lineWidth: major ? 1.3 : 0.6)
            }
            for n in stride(from: 0, to: 60, by: 5) { g.text("\(n)", F.mono(8), C.star.opacity(0.9 * a), at: polar(c, r(4.66), dialAngle(Double(n) / 60))) }
            g.stroke(circle(c, r(4.30)), with: .color(RingColor.nazhigai.opacity(0.55 * a)), lineWidth: 1)
        }

        // 2. nakṣatra ring (blue)
        let span27 = 360.0 / 27
        let curNak = Int(moonSid / span27) % 27
        swept(1) { g in
            let a = ringAlpha("nakshatra")
            let bA = lerpColor(C.cellA, RingColor.nakshatra, 0.22), bB = lerpColor(C.cellB, RingColor.nakshatra, 0.12)
            for i in 0..<27 {
                let col = i == curNak ? RingColor.nakshatra.opacity(0.75) : (i % 2 == 0 ? bA : bB)
                g.fill(annulus(c, r(3.35), r(4.2), skyAngle(Double(i + 1) * span27), span27), with: .color(col.opacity(a)))
                g.text("\(i + 1)", F.mono(7), (i == curNak ? Color.white : C.muted).opacity(a), at: polar(c, r(3.56), skyAngle((Double(i) + 0.5) * span27)))
            }
            for i in 0..<12 {
                let ang = skyAngle(Double(i) * 30)
                g.stroke(segment(polar(c, r(3.35), ang), polar(c, r(4.2), ang)), with: .color(C.gold.opacity(a)), lineWidth: 1.2)
                let mid = skyAngle(Double(i) * 30 + 15)
                g.text(Tables.rasi[i].devanagari, F.skt(9), C.goldSoft.opacity(0.9 * a), at: polar(c, r(3.9), mid), rotate: uprightRotation(mid + 90))
            }
            g.stroke(circle(c, r(4.2)), with: .color(RingColor.nakshatra.opacity(0.7 * a)), lineWidth: 1.2)
            g.stroke(circle(c, r(3.35)), with: .color(RingColor.nakshatra.opacity(0.7 * a)), lineWidth: 1.2)
        }
        if prog(1) > 0.9 {
            let sp = polar(c, r(4.2), skyAngle(sunSid))
            g.fill(circle(sp, r(0.5)), with: .radialGradient(Gradient(colors: [C.gold.opacity(0.7), .clear]), center: sp, startRadius: 0, endRadius: r(0.5)))
            g.fill(circle(sp, r(0.16)), with: .color(C.goldSoft))
            g.fill(circle(polar(c, r(4.2), skyAngle(moonSid)), r(0.13)), with: .color(C.moon))
        }

        // 3. tithi ring (silver) with karaṇa half-ticks (copper)
        let curTithi = Int(elong / 12) % 30
        swept(2) { g in
            let a = ringAlpha("tithi")
            let ka = highlight == nil || highlight == "karana" || highlight == "tithi" ? 1.0 : 0.28
            for i in 0..<30 {
                let col: Color = i == 14 ? C.purnima : i == 29 ? C.amavasya : i < 15 ? lerpColor(C.sukla, RingColor.tithi, 0.18) : C.krsna
                let start = skyAngle(sunSid + Double(i + 1) * 12)
                g.fill(annulus(c, r(2.45), r(3.25), start, 12), with: .color(col.opacity(a)))
                g.stroke(segment(polar(c, r(2.45), start), polar(c, r(3.25), start)), with: .color(C.ink.opacity(a)), lineWidth: 0.8)
                let mid = skyAngle(sunSid + Double(i) * 12 + 6)
                g.stroke(segment(polar(c, r(3.02), mid), polar(c, r(3.25), mid)), with: .color(RingColor.karana.opacity(0.9 * ka)), lineWidth: highlight == "karana" ? 2 : 1.2)
                g.text("\(i % 15 + 1)", F.mono(7), (i == 14 ? C.ink : C.star.opacity(0.85)).opacity(a), at: polar(c, r(2.78), skyAngle(sunSid + Double(i) * 12 + 3)))
            }
            g.stroke(annulus(c, r(2.45), r(3.25), skyAngle(sunSid + Double(curTithi + 1) * 12), 12), with: .color(C.goldSoft.opacity(a)), lineWidth: 2)
            let kHalf = Int(elong / 6) % 2
            g.fill(annulus(c, r(3.12), r(3.25), skyAngle(sunSid + Double(curTithi) * 12 + Double(kHalf + 1) * 6), 6), with: .color(RingColor.karana.opacity(ka)))
            g.stroke(circle(c, r(3.25)), with: .color(RingColor.tithi.opacity(0.6 * a)), lineWidth: 1)
        }

        // 4. yoga ring (teal)
        let ys = Engine.norm(sunSid + moonSid)
        let curYoga = Int(ys / span27) % 27
        swept(3) { g in
            let a = ringAlpha("yoga")
            let tA = lerpColor(C.cellA, RingColor.yoga, 0.25), tB = lerpColor(C.cellB, RingColor.yoga, 0.14)
            for i in 0..<27 {
                let base = (i == 16 || i == 26) ? C.kumkum.opacity(0.8) : (i % 2 == 0 ? tA : tB)
                g.fill(annulus(c, r(1.75), r(2.35), skyAngle(Double(i + 1) * span27), span27), with: .color((i == curYoga ? RingColor.yoga.opacity(0.85) : base).opacity(a)))
            }
            g.stroke(annulus(c, r(1.75), r(2.35), skyAngle(Double(curYoga + 1) * span27), span27), with: .color(Color.white.opacity(0.8 * a)), lineWidth: 1.2)
            g.fill(circle(polar(c, r(2.42), skyAngle(ys)), r(0.08)), with: .color(C.goldSoft.opacity(a)))
            g.stroke(circle(c, r(2.35)), with: .color(RingColor.yoga.opacity(0.7 * a)), lineWidth: 1)
        }

        if prog(3) > 0.8 {
            g.stroke(segment(polar(c, r(1.55), skyAngle(sunSid)), polar(c, r(3.8), skyAngle(sunSid))), with: .color(C.gold), style: StrokeStyle(lineWidth: 1.6, lineCap: .round))
            g.stroke(segment(polar(c, r(1.55), skyAngle(moonSid)), polar(c, r(3.8), skyAngle(moonSid))), with: .color(C.moon), style: StrokeStyle(lineWidth: 1.3, lineCap: .round))
        }

        // centre Moon — textured, light vector (sin e, 0, −cos e)
        g.fill(circle(c, r(1.5)), with: .color(C.ink))
        let e = elong * .pi / 180
        let moonA = smooth01((intro - 0.35) / 0.4)
        if moonA > 0, assets?.sphere(g, "moon", c, r(1.4), .facing, V3(x: sin(e), y: 0, z: -cos(e)), t: t, alpha: moonA) != true { g.moonPhase(c, r(1.4), elong) }
        g.stroke(circle(c, r(1.52)), with: .color(C.gold.opacity(0.7)), lineWidth: 1.2)

        // ring name tags pinned on each ring along the upper-left diagonal
        if intro >= 1 {
            for (key, r0, r1) in faceRings {
                let col = RingColor.of(key)
                let at = polar(c, r((r0 + r1) / 2), 225)
                let text = g.resolve(Text(Tables.ring(key).iast.uppercased()).font(F.caps(8)).kerning(1).foregroundStyle(col))
                let ts = text.measure(in: CGSize(width: 300, height: 40))
                let rect = CGRect(x: at.x - ts.width / 2 - 7, y: at.y - ts.height / 2 - 3, width: ts.width + 14, height: ts.height + 6)
                let a = max(0.45, ringAlpha(key))
                g.fill(Path(roundedRect: rect, cornerRadius: rect.height / 2), with: .color(Color(hex: 0x050712, alpha: 0.94 * a)))
                g.stroke(Path(roundedRect: rect, cornerRadius: rect.height / 2), with: .color(col.opacity(a)), lineWidth: 1)
                var tg = g; tg.opacity = a
                tg.draw(text, at: at)
            }
        }

        // main hand — continuous sweep
        let ha = dialAngle(min(1, max(0, frac(jd))) * prog(0))
        g.stroke(segment(CGPoint(x: polar(c, r(1.56), ha).x + 2, y: polar(c, r(1.56), ha).y + 3), CGPoint(x: polar(c, r(4.98), ha).x + 2, y: polar(c, r(4.98), ha).y + 3)), with: .color(.black.opacity(0.33)), style: StrokeStyle(lineWidth: 2.8, lineCap: .round))
        g.stroke(segment(polar(c, r(1.56), ha), polar(c, r(4.98), ha)), with: .color(C.goldSoft), style: StrokeStyle(lineWidth: 2.2, lineCap: .round))
        g.fill(circle(polar(c, r(4.98), ha), r(0.09)), with: .color(C.goldSoft))
    }
}

/// Tangential label rotation, flipped in the lower half so text never reads upside down.
func uprightRotation(_ deg: Double) -> Double { let d = (deg.truncatingRemainder(dividingBy: 360) + 360).truncatingRemainder(dividingBy: 360); return d > 90 && d < 270 ? d - 180 : d }

/// Seeded starfield with twinkle.
struct Starfield {
    struct Star { let x, y, mag, phase: Double; let tint: Int }
    let stars: [Star]
    init(_ n: Int, seed: UInt64) {
        var s = seed
        func next() -> Double { s = s &* 6364136223846793005 &+ 1442695040888963407; return Double(s >> 11) / Double(1 << 53) }
        stars = (0..<n).map { _ in let g = next(); return Star(x: next(), y: next(), mag: g * g * g, phase: next() * 6.28, tint: Int(next() * 10)) }
    }
    func draw(_ g: GraphicsContext, _ t: Double, _ size: CGSize, parallax: CGPoint = .zero, alpha: Double = 1) {
        for (i, st) in stars.enumerated() {
            let tw = 0.75 + 0.25 * sin(t * (0.8 + Double(i % 7) * 0.2) + st.phase)
            let a = min(1, max(0, (0.25 + 0.75 * st.mag) * tw * alpha))
            let col: Color = st.tint == 0 ? Color(hex: 0xBFD4FF) : st.tint == 1 ? Color(hex: 0xFFE2B0) : st.tint == 2 ? Color(hex: 0xFFC9A0) : C.star
            let w = size.width, h = size.height
            let px = (st.x * w + parallax.x * (0.3 + st.mag)).truncatingRemainder(dividingBy: w)
            let py = (st.y * h + parallax.y * (0.3 + st.mag)).truncatingRemainder(dividingBy: h)
            g.fill(circle(CGPoint(x: px < 0 ? px + w : px, y: py < 0 ? py + h : py), CGFloat(0.5 + 1.3 * st.mag)), with: .color(col.opacity(a)))
        }
    }
}
