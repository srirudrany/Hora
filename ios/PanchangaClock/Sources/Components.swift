import SwiftUI
import PanchangaCore

/// Opens the glossary card for a term. Injected by the app shell.
struct GlossaryAction { var open: (String) -> Void = { _ in } }
private struct GlossaryKey: EnvironmentKey { static let defaultValue = GlossaryAction() }
extension EnvironmentValues {
    var glossary: GlossaryAction { get { self[GlossaryKey.self] } set { self[GlossaryKey.self] = newValue } }
}

func glossaryEntry(_ term: String) -> String? { Tables.glossary.first { $0.key == term }?.value }

/// A glossary term: underlined; tap for its plain-language one-liner.
struct Term: View {
    let term: String
    var display: String? = nil
    var font: Font
    var color: Color = C.star
    @Environment(\.glossary) private var glossary
    var body: some View {
        let known = glossaryEntry(term) != nil
        Text(display ?? term).font(font).foregroundStyle(color).underline(known, pattern: .dot, color: color.opacity(0.6))
            .onTapGesture { if known { glossary.open(term) } }
    }
}

struct Caps: View {
    let text: String
    var color: Color = C.muted
    var size: CGFloat = 11
    @Environment(\.glossary) private var glossary
    var body: some View {
        Text(text).capsStyle(size, color).onTapGesture { if glossaryEntry(text) != nil { glossary.open(text) } }
    }
}

struct Panel<Content: View>: View {
    var border: Color = C.line
    var pad: CGFloat = 16
    @ViewBuilder var content: Content
    var body: some View {
        VStack(alignment: .leading, spacing: 8) { content }
            .padding(pad).frame(maxWidth: .infinity, alignment: .leading)
            .background(C.panel, in: RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(border, lineWidth: 1))
    }
}

struct Pill: View {
    let text: String
    let on: Bool
    var font: Font = F.caps(11)
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            Text(text).font(font).kerning(1.2).textCase(.uppercase).foregroundStyle(on ? C.goldSoft : C.muted)
                .padding(.horizontal, 12).padding(.vertical, 6)
                .background(on ? C.gold.opacity(0.18) : .clear, in: Capsule())
        }.buttonStyle(.plain)
    }
}

struct PillGroup<Content: View>: View {
    @ViewBuilder var content: Content
    var body: some View {
        HStack(spacing: 2) { content }.padding(3)
            .background(Color(hex: 0x080B18, alpha: 0.78), in: Capsule())
            .overlay(Capsule().stroke(C.line2, lineWidth: 1))
    }
}

/// One limb row: name, "ends NN:VV · h:mm am", progress bar, "next day" flag.
struct LimbRow: View {
    let label: String, value: String, ends: String
    let nextDay: Bool
    let progress: Double
    var highlight = false, warn = false
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Caps(text: label, size: 12).frame(width: 92, alignment: .leading).padding(.top, 5)
            VStack(alignment: .leading, spacing: 2) {
                Text(value).font(F.skt(21)).foregroundStyle(warn ? C.kumkum : C.star)
                HStack(spacing: 6) {
                    Text(ends).font(F.mono(12)).foregroundStyle(C.muted)
                    if nextDay { Text("next day").font(F.mono(11)).foregroundStyle(C.gold) }
                }
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Capsule().fill(C.muted.opacity(0.2))
                        Capsule().fill(C.gold).frame(width: geo.size.width * min(1, max(0, progress)))
                    }
                }.frame(height: 3).padding(.top, 5)
            }
        }
        .padding(.horizontal, 12).padding(.vertical, 7)
        .background(Color(hex: 0x080B18, alpha: 0.55), in: RoundedRectangle(cornerRadius: 10))
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(C.gold.opacity(highlight ? 0.74 : 0.14), lineWidth: 1))
    }
}

struct KalaRow: View {
    let name: String, color: Color, span: String
    let active: Bool
    var body: some View {
        HStack(spacing: 10) {
            RoundedRectangle(cornerRadius: 3).fill(color).frame(width: 12, height: 12)
            Term(term: name, font: F.body(15), color: active ? .white : C.muted)
            Spacer()
            Text(span).font(F.mono(13)).foregroundStyle(C.star)
        }
        .padding(.horizontal, 10).padding(.vertical, 4)
        .background(active ? color.opacity(0.18) : .clear, in: RoundedRectangle(cornerRadius: 8))
    }
}

func offsetLabel(_ oh: Double) -> String {
    if abs(oh) < 1.0 / 60 { return "now" }
    let ah = abs(oh), d = Int(ah / 24), h = Int(ah.truncatingRemainder(dividingBy: 24)), m = Int((ah * 60).truncatingRemainder(dividingBy: 60))
    return (oh > 0 ? "+" : "−") + (d > 0 ? "\(d)d " : "") + "\(h)h" + (d > 0 ? "" : String(format: " %02dm", m))
}

func deg(_ x: Double) -> String {
    let v = Engine.norm(x); var d = Int(v); var m = Int(((v - Double(d)) * 60).rounded())
    if m == 60 { d += 1; m = 0 }
    return String(format: "%d°%02d′", d, m)
}

/// Time console: play/pause, speeds, Live, cursor time, and a ±days drag track with Pūrṇimā / Amāvāsyā markers.
struct Scrubber: View {
    @Bindable var state: AppState
    var days = 15
    var body: some View {
        let maxH = Double(days) * 24
        VStack(spacing: 6) {
            HStack(spacing: 8) {
                Button {
                    if !state.playing && state.offsetH >= maxH - 0.01 { state.offsetH = -maxH }
                    state.playing.toggle()
                } label: {
                    Image(systemName: state.playing ? "pause.fill" : "play.fill").font(.system(size: 11)).foregroundStyle(C.goldSoft)
                        .frame(width: 32, height: 32).background(state.playing ? C.gold.opacity(0.2) : .clear, in: Circle()).overlay(Circle().stroke(C.gold, lineWidth: 1))
                }.buttonStyle(.plain)
                HStack(spacing: 0) {
                    ForEach([("1h/s", 1.0), ("6h/s", 6.0), ("1d/s", 24.0)], id: \.0) { lab, v in
                        Button { state.speed = v } label: {
                            Text(lab).font(F.mono(11)).foregroundStyle(state.speed == v ? C.goldSoft : C.muted).padding(.horizontal, 7).padding(.vertical, 3)
                                .background(state.speed == v ? C.gold.opacity(0.18) : .clear, in: Capsule())
                        }.buttonStyle(.plain)
                    }
                }.padding(2).overlay(Capsule().stroke(C.line2, lineWidth: 1))
                Button { state.playing = false; state.offsetH = 0 } label: {
                    HStack(spacing: 5) { Circle().fill(state.live ? C.kumkum : C.muted).frame(width: 6, height: 6); Text("Live").capsStyle(10, state.live ? C.kumkum : C.muted) }
                        .padding(.horizontal, 8).padding(.vertical, 4).overlay(Capsule().stroke(state.live ? C.kumkum.opacity(0.6) : C.muted.opacity(0.3), lineWidth: 1))
                }.buttonStyle(.plain)
                Spacer(minLength: 0)
                VStack(alignment: .trailing, spacing: 0) {
                    Text("\(state.date(state.jd, "EEE d MMM")) · \(state.time(state.jd))").font(F.mono(12)).foregroundStyle(C.star)
                    Text(offsetLabel(state.offsetH)).font(F.mono(11)).foregroundStyle(C.gold)
                }
            }
            GeometryReader { geo in
                let w = geo.size.width
                Canvas { g, size in
                    let mid = size.height / 2
                    g.stroke(segment(CGPoint(x: 0, y: mid), CGPoint(x: size.width, y: mid)), with: .color(C.muted.opacity(0.35)), lineWidth: 1)
                    for d in -days...days {
                        let x = (CGFloat(d) / CGFloat(days) + 1) / 2 * size.width
                        let hh: CGFloat = d % 7 == 0 ? 7 : 4
                        g.stroke(segment(CGPoint(x: x, y: mid - hh), CGPoint(x: x, y: mid + hh)), with: .color(C.muted.opacity(0.5)), lineWidth: 1)
                    }
                    for (f, full) in moonMarkers(maxH) {
                        let o = CGPoint(x: CGFloat(f) * size.width, y: 6)
                        if full { g.fill(circle(o, 4.5), with: .color(C.moon)) } else { g.stroke(circle(o, 4.5), with: .color(C.moon), lineWidth: 1.3) }
                    }
                    g.stroke(segment(CGPoint(x: size.width / 2, y: mid + 4), CGPoint(x: size.width / 2, y: size.height)), with: .color(C.gold), lineWidth: 1.3)
                    let kx = CGFloat((state.offsetH / maxH + 1) / 2) * size.width
                    g.fill(circle(CGPoint(x: kx, y: mid), 11), with: .color(C.gold.opacity(0.25)))
                    g.fill(circle(CGPoint(x: kx, y: mid), 7), with: .color(C.goldSoft))
                }
                .contentShape(Rectangle())
                .gesture(DragGesture(minimumDistance: 0).onChanged { v in
                    state.playing = false
                    var o = (min(1, max(0, v.location.x / w)) * 2 - 1) * maxH
                    if abs(o) < maxH * 0.015 { o = 0 }
                    state.offsetH = o
                })
            }.frame(height: 30)
        }
        .padding(.horizontal, 12).padding(.top, 10).padding(.bottom, 8)
        .background(C.panel, in: RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(C.line2, lineWidth: 1))
    }

    private func moonMarkers(_ maxH: Double) -> [(Double, Bool)] {
        let base = Engine.jd(from: state.now)
        let hourKey = Int(base * 24)
        if let c = MarkerCache.shared.value, c.0 == hourKey { return c.1 }
        var out: [(Double, Bool)] = []
        var prev = Int(Engine.elong(base - Double(days)) / 12)
        var h = -maxH
        while h <= maxH {
            let i = Int(Engine.elong(base + h / 24) / 12)
            if i != prev { if i == 14 { out.append(((h / maxH + 1) / 2, true)) }; if i == 29 { out.append(((h / maxH + 1) / 2, false)) }; prev = i }
            h += 2
        }
        MarkerCache.shared.value = (hourKey, out)
        return out
    }
}

final class MarkerCache { static let shared = MarkerCache(); var value: (Int, [(Double, Bool)])? }
