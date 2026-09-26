// "Now" (clock face + readout) and "Sky" (Kālacakra / Horizon) share one stage so the clock face can
// lift off into the sky: the face tilts flat and fades as the orbit camera descends. Motion: rings self-draw
// on first show, the hand sweeps continuously, lock-on flights warp the stars, Kālacakra ⇄ Horizon
// zoom-crossfade, changing values slide in. Mirrors NowSky.kt.
import SwiftUI
import PanchangaCore

enum SkyDir { case kalacakra, horizon }

private func smooth(_ a: Double, _ b: Double, _ x: Double) -> Double { let t = min(1, max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
private func ease(_ t: Double) -> Double { t < 0.5 ? 4 * t * t * t : 1 - pow(-2 * t + 2, 3) / 2 }

/// Remembers that the face intro has played, so tab switches don't replay it.
private enum IntroOnce { static var start: Date? }

/// A 0→1 (or 1→0) tween driven by the TimelineView clock.
struct Tween {
    var from = 0.0, to = 0.0, start = Date.distantPast, duration = 1.0
    func value(_ now: Date) -> Double { from + (to - from) * min(1, max(0, now.timeIntervalSince(start) / duration)) }
    func running(_ now: Date) -> Bool { now.timeIntervalSince(start) < duration }
    mutating func go(_ target: Double, _ now: Date, _ d: Double) { from = start == .distantPast ? target : value(now); to = target; start = now; duration = d }
}

struct NowSkyStage: View {
    @Bindable var state: AppState
    let sky: Bool
    let onLift: (Bool) -> Void
    @Environment(\.skyAssets) private var assets

    @State private var lift = Tween()
    @State private var hMix = Tween()
    @State private var camT = Tween(from: 1, to: 1)
    @State private var dir = SkyDir.kalacakra
    @State private var lock = Target.overview
    @State private var camFrom = Cam(tx: 0, tz: 0, fit: 13.5, el: 42, az: 0)
    @State private var userAz = 0.0, userEl = 0.0, zoomF = 1.0
    @State private var dragLast: CGSize = .zero
    @State private var heading = 90.0, pitch = 20.0, fov = 80.0
    @State private var picks: [Target: CGPoint] = [:]
    @State private var ring: String?
    @State private var starDirs: StarDirs?
    private let stars = Starfield(420, seed: 7)
    private let t0 = Date()

    var body: some View {
        TimelineView(.animation) { tl in
            let now = tl.date
            let jd = Engine.jd(from: now) + state.offsetH / 24   // read every frame → smooth hand and sky
            let day = state.day(jd)
            let sn = SkyNow.at(jd)
            let e01 = ease(lift.value(now))
            let intro = IntroOnce.start.map { min(1, now.timeIntervalSince($0) / 2.4) } ?? 0
            let introE = 1 - pow(1 - intro, 3)
            let k = camT.value(now)
            let base = Cam.lerp(camFrom, goal(lock, sn), ease(k))
            let warp = camT.running(now) ? sin(.pi * k) * 0.9 : 0
            let orbit0 = Cam(tx: base.tx, tz: base.tz, fit: base.fit * zoomF, el: min(89, max(5, base.el + userEl)), az: base.az + userAz)
            let hm = ease(hMix.value(now))
            let orbit = Cam.lerp(orbit0, Cam(tx: 0, tz: 0, fit: 1.3, el: 6, az: orbit0.az), hm)
            let cam = Cam.lerp(Cam(tx: 0, tz: 0, fit: 11.2, el: 89.5, az: 0), orbit, e01)
            let t = now.timeIntervalSince(t0)

            ZStack(alignment: .top) {
                C.stage.ignoresSafeArea()
                // sky layer
                if e01 > 0.02 {
                    let skyAlpha = smooth(0.3, 0.85, e01)
                    if hm < 0.999 {
                        Canvas { g, size in
                            let p = drawKalacakra(g, size, cam: cam, now: sn, lock: lock, t: t, stars: stars, dirs: starDirs, assets: assets, alpha: skyAlpha * (1 - smooth(0.4, 1, hm)), warp: warp)
                            DispatchQueue.main.async { picks = p }
                        }
                        .gesture(DragGesture(minimumDistance: 6).onChanged { v in
                            guard sky else { return }
                            let d = CGSize(width: v.translation.width - dragLast.width, height: v.translation.height - dragLast.height); dragLast = v.translation
                            userAz -= Double(d.width) * 0.25; userEl += Double(d.height) * 0.18
                        }.onEnded { _ in dragLast = .zero })
                        .simultaneousGesture(MagnificationGesture().onChanged { z in if sky { zoomF = min(3, max(0.3, 1 / Double(z))) } })
                        .onTapGesture(coordinateSpace: .local) { loc in
                            guard sky, let hit = picks.min(by: { dist($0.value, loc) < dist($1.value, loc) }), dist(hit.value, loc) < 60 else { return }
                            lockTo(hit.key, orbit0: orbit0)
                        }
                    }
                    if hm > 0.001 && sky {
                        Canvas { g, size in drawHorizon(g, size, now: sn, place: state.place, heading: heading, pitch: pitch, fov: fov, t: t, stars: assets?.stars ?? [], assets: assets) }
                            .scaleEffect(1.25 - 0.25 * hm).opacity(smooth(0.25, 1, hm))
                            .gesture(DragGesture().onChanged { v in
                                let d = CGSize(width: v.translation.width - dragLast.width, height: v.translation.height - dragLast.height); dragLast = v.translation
                                heading = Engine.norm(heading - Double(d.width) * fov / 1000); pitch = min(88, max(-20, pitch + Double(d.height) * fov / 1000))
                            }.onEnded { _ in dragLast = .zero })
                            .gesture(MagnificationGesture().onChanged { z in fov = min(110, max(25, 80 / Double(z))) })
                    }
                }
                // clock face layer
                let faceAlpha = 1 - smooth(0.45, 0.9, e01)
                if faceAlpha > 0.01 {
                    ScrollView {
                        VStack(spacing: 0) {
                            ClockFace(jd: jd, day: day, sunSid: sn.sunSid, moonSid: sn.moonSid, elong: sn.elong, t: t, intro: introE, highlight: ring) { tapped in
                                withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) { ring = ring == tapped ? nil : tapped }
                            }
                            .aspectRatio(1, contentMode: .fit)
                            .rotation3DEffect(.degrees(62 * e01), axis: (x: 1, y: 0, z: 0), perspective: 0.5)
                            .scaleEffect(1 + 0.5 * e01)
                            .opacity(faceAlpha)
                            .padding(.horizontal, 10).padding(.top, 44)
                            VStack(spacing: 0) {
                                if !sky {
                                    Button { onLift(true) } label: {
                                        HStack(spacing: 8) { Image(systemName: "triangle.fill").font(.system(size: 8)).foregroundStyle(C.gold); Text("Lift off into the sky").capsStyle(12, C.goldSoft) }
                                            .padding(.horizontal, 18).padding(.vertical, 10)
                                            .background(Color(hex: 0x080B18, alpha: 0.82), in: Capsule()).overlay(Capsule().stroke(C.gold, lineWidth: 1))
                                    }.buttonStyle(.plain).padding(.top, 6)
                                }
                                RingLegend(selected: ring) { key in withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) { ring = ring == key ? nil : key } }
                                Readout(state: state, jd: jd, intro: introE)
                            }
                            .opacity(faceAlpha * smooth(0.55, 1, introE))
                            .offset(y: 40 * e01 + 20 * (1 - introE))
                        }
                    }
                    .scrollIndicators(.hidden)
                    .scrollDisabled(sky)
                }
                // sky HUD
                if e01 > 0.6 {
                    VStack(spacing: 8) {
                        HStack(alignment: .top) {
                            PillGroup {
                                Pill(text: "Kālacakra", on: dir == .kalacakra) { setDir(.kalacakra) }
                                Pill(text: "Horizon", on: dir == .horizon) { setDir(.horizon) }
                            }
                            Spacer()
                            TopRead(state: state, jd: jd)
                        }.padding(.top, 50)
                        Spacer()
                        Group {
                            if dir == .kalacakra {
                                VStack(spacing: 8) {
                                    Dossier(state: state, lock: lock, now: sn) { onLift(false) }
                                        .id(lock)
                                        .transition(.asymmetric(insertion: .opacity.combined(with: .offset(y: 24)), removal: .opacity))
                                    ScrollView(.horizontal, showsIndicators: false) {
                                        HStack(spacing: 4) {
                                            ForEach(Array(Target.allCases.enumerated()), id: \.element) { i, tg in
                                                TargetChip(key: i + 1, target: tg, on: lock == tg) { lockTo(tg, orbit0: orbit0) }
                                            }
                                        }
                                    }
                                }
                                .transition(.opacity.combined(with: .offset(y: 30)))
                            } else {
                                HorizonPanel(state: state, now: sn) { lookAt($0, sn: sn, auto: false) }
                                    .transition(.opacity.combined(with: .offset(y: 30)))
                            }
                        }
                        .animation(.spring(response: 0.5, dampingFraction: 0.85), value: dir)
                        .animation(.spring(response: 0.45, dampingFraction: 0.8), value: lock)
                    }
                    .padding(.horizontal, 12).padding(.bottom, 128)
                    .opacity(smooth(0.6, 1, e01))
                }
                VStack { Spacer(); Scrubber(state: state).padding(.horizontal, 12).padding(.bottom, 12) }
            }
        }
        .onChange(of: sky, initial: true) { _, new in lift.go(new ? 1 : 0, Date(), 1.7) }
        .onAppear { if IntroOnce.start == nil { IntroOnce.start = Date() } }
        .onChange(of: assets?.ready ?? false, initial: true) { _, ready in
            if ready, let a = assets { let sn = SkyNow.at(state.jd); starDirs = StarDirs(a.stars, eps: sn.eps, ayan: sn.ayan) }
        }
    }

    private func dist(_ a: CGPoint, _ b: CGPoint) -> CGFloat { hypot(a.x - b.x, a.y - b.y) }

    private func lockTo(_ t: Target, orbit0: Cam) {
        camFrom = Cam(tx: orbit0.tx, tz: orbit0.tz, fit: orbit0.fit, el: orbit0.el, az: orbit0.az - userAz)
        userAz = 0; userEl = 0; zoomF = 1
        lock = t
        camT = Tween(from: 0, to: 1, start: Date(), duration: 1.6)
    }

    private func setDir(_ d: SkyDir) {
        dir = d
        hMix.go(d == .horizon ? 1 : 0, Date(), 1.3)
        if d == .horizon { lookAt(.moon, sn: SkyNow.at(state.jd), auto: true) }
    }

    private func lookAt(_ t: Target, sn: SkyNow, auto: Bool) {
        let h = horizonInfo(sn.jd, state.place)
        var target = t
        if auto && h.moonAlt < -2 { target = .sun }
        switch target {
        case .sun: heading = h.sunAz; pitch = min(80, max(-15, h.sunAlt))
        case .moon: heading = h.moonAz; pitch = min(80, max(-15, h.moonAlt))
        default:
            let a: (alt: Double, az: Double)
            if let key = target.graha, let gp = sn.grahas.first(where: { $0.key == key }) {
                a = Engine.altAz(gp.sidLon, gp.lat, sn.jd, lat: state.place.lat, lon: state.place.lon)
            } else {
                let span = 360.0 / 27, n = floor(sn.moonSid / span)
                a = Engine.altAz(n * span + span / 2, 0, sn.jd, lat: state.place.lat, lon: state.place.lon)
            }
            heading = a.az; pitch = min(80, max(-15, a.alt))
        }
    }
}

/// The ring key under the face: colour and name of each ring; tap one to highlight it on the face.
private struct RingLegend: View {
    let selected: String?
    let onSelect: (String) -> Void
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("The rings · outside in — tap one").capsStyle(10)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    ForEach(["nazhigai", "nakshatra", "tithi", "karana", "yoga"], id: \.self) { key in
                        let col = RingColor.of(key), on = selected == key
                        Button { onSelect(key) } label: {
                            HStack(spacing: 8) {
                                Circle().fill(col).frame(width: 10, height: 10)
                                Text(Tables.ring(key).iast).font(F.skt(16, italic: true)).foregroundStyle(on ? col : C.star)
                            }
                            .padding(.horizontal, 12).padding(.vertical, 8)
                            .background(on ? col.opacity(0.16) : Color(hex: 0x080B18, alpha: 0.72), in: RoundedRectangle(cornerRadius: 12))
                            .overlay(RoundedRectangle(cornerRadius: 12).stroke(on ? col : col.opacity(0.35), lineWidth: 1))
                        }.buttonStyle(.plain)
                    }
                }
            }
            if let key = selected {
                Text(Tables.ring(key).english).font(F.body(13)).foregroundStyle(RingColor.of(key)).transition(.opacity)
            }
        }
        .padding(.horizontal, 14).padding(.top, 12)
    }
}

private struct TopRead: View {
    let state: AppState
    let jd: Double
    var body: some View {
        let day = state.day(jd)
        let v = max(0, Nazhigai.vinazhigai(jd, sunrise: day.sunrise))
        VStack(alignment: .trailing, spacing: 2) {
            HStack(alignment: .lastTextBaseline, spacing: 8) {
                Text(state.vara(day.weekday)).font(F.skt(22)).foregroundStyle(C.goldSoft)
                Text(Tables.vara[day.weekday].tamil).font(F.tamil(15)).foregroundStyle(C.muted)
            }
            Text(String(format: "%02d:%02d", v / 60, v % 60)).font(F.mono(30, weight: .regular)).foregroundStyle(C.star)
                .contentTransition(.numericText()).animation(.snappy, value: v)
            HStack(spacing: 0) {
                Term(term: "Nāḻigai", display: "nāḻigai", font: F.body(11), color: C.muted)
                Text(" since sunrise · ").font(F.body(11)).foregroundStyle(C.muted)
                Text(state.time(jd)).font(F.mono(11)).foregroundStyle(C.star)
            }
        }.shadow(color: .black, radius: 8)
    }
}

/// SPEC §4.2 readout.
struct Readout: View {
    let state: AppState
    let jd: Double
    var intro: Double = 1
    var body: some View {
        let day = state.day(jd)
        let v = max(0, Nazhigai.vinazhigai(jd, sunrise: day.sunrise))
        VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .lastTextBaseline, spacing: 12) {
                Term(term: "Vāra", display: state.vara(day.weekday), font: F.skt(34), color: C.goldSoft)
                Text(Tables.vara[day.weekday].tamil).font(F.tamil(22)).foregroundStyle(C.muted)
            }
            Text("\(state.date(day.sunrise + 0.3)) · \(state.month(day.tamilMonth)) \(day.tamilDay) · \(Tables.samvatsara[day.samvat])").font(F.body(15)).foregroundStyle(C.star)
            Text("\(state.place.name) · sunrise \(state.time(day.sunrise)) · sunset \(state.time(day.sunset))").font(F.body(13)).foregroundStyle(C.muted)
            HStack(spacing: 0) {
                Text(String(format: "%02d", v / 60)).contentTransition(.numericText())
                Text(":").foregroundStyle(C.gold)
                Text(String(format: "%02d", v % 60)).contentTransition(.numericText())
            }
            .font(F.mono(54, weight: .regular)).foregroundStyle(C.star).padding(.top, 8)
            .animation(.snappy, value: v)
            HStack(spacing: 0) {
                Term(term: "Nāḻigai", display: "nāḻigai", font: F.body(13), color: C.muted)
                Text(" : ").font(F.body(13)).foregroundStyle(C.muted)
                Term(term: "Vināḻigai", display: "vināḻigai", font: F.body(13), color: C.muted)
                Text(" since sunrise · ").font(F.body(13)).foregroundStyle(C.muted)
                Text(state.time(jd)).font(F.mono(13)).foregroundStyle(C.star)
            }.padding(.bottom, 8)
            ForEach(Array([("Tithi", Anga.tithi, "tithi"), ("Nakṣatra", Anga.nakshatra, "nakshatra"), ("Yoga", Anga.yoga, "yoga"), ("Karaṇa", Anga.karana, "karana")].enumerated()), id: \.offset) { i, row in
                let (label, kind, ringKey) = row
                let a = state.anga(kind, jd)
                let name = kind == .tithi ? state.tithi(a.idx) : kind == .nakshatra ? state.nakshatra(a.idx) : kind == .yoga ? state.yoga(a.idx) : state.karana(a.idx)
                let warn = (kind == .yoga && !Limbs.isShubhaYoga(a.idx + 1)) || (kind == .karana && Limbs.karanaName(a.idx + 1) == "Viṣṭi")
                let stagger = smooth(0.55 + Double(i) * 0.08, 0.85 + Double(i) * 0.08, intro)
                ColoredLimbRow(label: label, color: RingColor.of(ringKey), name: name, ends: "ends \(Nazhigai.format(a.end, sunrise: day.sunrise)) · \(state.time(a.end))",
                               nextDay: a.end > day.nextSunrise, progress: (jd - a.start) / (a.end - a.start), warn: warn)
                    .opacity(stagger).offset(y: (1 - stagger) * 20)
            }
            VStack(spacing: 4) {
                ForEach([("Rāhu kālam", C.kumkum, day.rahu), ("Yamagaṇḍam", C.plum, day.yama), ("Kuḷikai", C.copper, day.gulika)], id: \.0) { name, col, span in
                    KalaRow(name: name, color: col, span: "\(state.time(span.0))–\(state.time(span.1))", active: jd >= span.0 && jd < span.1)
                }
            }.padding(.top, 8)
        }
        .padding(.horizontal, 16).padding(.top, 16).padding(.bottom, 150)
    }
}

/// A limb row with a ring-coloured edge and label; the name slides when it changes.
private struct ColoredLimbRow: View {
    let label: String, color: Color, name: String, ends: String
    let nextDay: Bool
    let progress: Double
    let warn: Bool
    var body: some View {
        HStack(spacing: 0) {
            Rectangle().fill(color).frame(width: 4)
            VStack(alignment: .leading, spacing: 3) {
                HStack {
                    Caps(text: label, color: color, size: 11)
                    Spacer()
                    Text(ends).font(F.mono(11)).foregroundStyle(C.muted)
                    if nextDay { Text("next day").font(F.mono(10)).foregroundStyle(C.gold) }
                }
                Text(name).font(F.skt(22)).foregroundStyle(warn ? C.kumkum : C.star)
                    .id(name)
                    .transition(.asymmetric(insertion: .move(edge: .bottom).combined(with: .opacity), removal: .move(edge: .top).combined(with: .opacity)))
                    .animation(.easeInOut(duration: 0.42), value: name)
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Capsule().fill(C.muted.opacity(0.2))
                        Capsule().fill(color).frame(width: geo.size.width * min(1, max(0, progress)))
                    }
                }.frame(height: 3).padding(.top, 3)
            }
            .padding(.leading, 10).padding(.trailing, 12).padding(.vertical, 7)
        }
        .clipped()
        .background(Color(hex: 0x080B18, alpha: 0.55), in: RoundedRectangle(cornerRadius: 10))
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(color.opacity(0.35), lineWidth: 1))
    }
}

private struct TargetChip: View {
    let key: Int, target: Target, on: Bool
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                Text("\(key)").font(F.mono(10)).foregroundStyle(C.muted).padding(.horizontal, 5).padding(.vertical, 1)
                    .overlay(RoundedRectangle(cornerRadius: 4).stroke(C.muted.opacity(0.35), lineWidth: 1))
                VStack(alignment: .leading, spacing: 0) {
                    Text(target.label).font(F.skt(16, italic: true)).foregroundStyle(on ? C.goldSoft : C.star)
                    Text(target.gloss).capsStyle(9)
                }
            }
            .padding(.horizontal, 10).padding(.vertical, 7)
            .background(on ? C.gold.opacity(0.12) : Color(hex: 0x080B18, alpha: 0.72), in: RoundedRectangle(cornerRadius: 10))
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(on ? C.gold.opacity(0.7) : C.muted.opacity(0.18), lineWidth: 1))
            .scaleEffect(on ? 1.04 : 1)
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: on)
        }.buttonStyle(.plain)
    }
}

/// The locked target's card (Sky Navigator "dossier"): name, science and lore.
private struct Dossier: View {
    let state: AppState, lock: Target, now: SkyNow
    let onLand: () -> Void
    @State private var expanded = false
    var body: some View {
        let d = content()
        Panel {
            HStack {
                Caps(text: d.kicker, color: C.gold); Text(d.coord).font(F.mono(11)).foregroundStyle(C.muted)
                Spacer()
                Button(action: onLand) { Text("Clock face").capsStyle(10, C.goldSoft).padding(.horizontal, 10).padding(.vertical, 5).overlay(Capsule().stroke(C.gold.opacity(0.5), lineWidth: 1)) }.buttonStyle(.plain)
            }
            Text(d.name).font(F.skt(26)).foregroundStyle(C.goldSoft)
            Text(d.gloss).capsStyle(9)
            Text(d.text).font(F.body(12.5)).foregroundStyle(C.star).lineLimit(expanded ? 8 : 2)
            if expanded {
                VStack(spacing: 1) { ForEach(d.rows, id: \.0) { k, v in HStack { Caps(text: k, size: 10); Spacer(); Text(v).font(F.mono(12)).foregroundStyle(C.star) } } }
            } else {
                Text("Tap for details").capsStyle(9, C.muted.opacity(0.7))
            }
        }
        .onTapGesture { withAnimation(.spring(response: 0.4, dampingFraction: 0.85)) { expanded.toggle() } }
    }

    struct D { let kicker, coord, name, gloss, text: String; let rows: [(String, String)] }
    func content() -> D {
        let jd = now.jd, day = state.day(jd)
        let ls = now.sunSid, lm = now.moonSid, e = now.elong, ys = Engine.norm(ls + lm)
        let ti = Limbs.tithiIndex(e), ki = Limbs.karanaIndex(e), ni = Limbs.nakshatraIndex(lm), yi = Limbs.yogaIndex(sun: ls, moon: lm)
        let pada = Limbs.pada(lm), lit = Int((Limbs.illumination(e) * 100).rounded())
        switch lock {
        case .nakshatra:
            let info = Tables.nakshatra[ni - 1]
            return D(kicker: "Locked", coord: "\(deg(Double(ni - 1) * 40 / 3))–\(deg(Double(ni) * 40 / 3))", name: state.nakshatra(ni - 1), gloss: "Nakṣatra \(ni) of 27 · \(info.deity)",
                     text: "27 lunar mansions of 13°20′, each split into 4 padas. \(info.iast) is \(Tables.natures[info.nature]?.meaning ?? "") — \(info.temperament.lowercased()).",
                     rows: [("Moon at", deg(lm)), ("Pada", "\(pada) of 4"), ("Ends", state.time(state.anga(.nakshatra, jd).end))])
        case .tithi:
            return D(kicker: "Locked", coord: "E \(deg(e))", name: state.tithi(ti - 1), gloss: "Tithi \(ti) of 30 · \(Limbs.tithiCategory(ti))",
                     text: "A tithi is each 12° the Moon gains on the Sun. The gold arc around Earth is that angle; thirty tithis make one synodic month.",
                     rows: [("E = λ☾ − λ☉", deg(e)), ("⌊E ÷ 12°⌋ + 1", "\(ti)"), ("Karaṇa ⌊E ÷ 6°⌋ + 1", "\(ki) · \(Limbs.karanaName(ki))"), ("Ends", state.time(state.anga(.tithi, jd).end))])
        case .yoga:
            return D(kicker: "Locked", coord: "Σ \(deg(ys))", name: state.yoga(yi - 1), gloss: "Yoga \(yi) of 27 · \(Limbs.isShubhaYoga(yi) ? "śubha" : "aśubha")",
                     text: "Add the Sun's and the Moon's longitudes; the sum in 27 parts of 13°20′ names the yoga. The ring now shows yoga names; 17 and 27 are red.",
                     rows: [("Σ = λ☉ + λ☾", deg(ys)), ("⌊Σ ÷ 13°20′⌋ + 1", "\(yi)"), ("Ends", state.time(state.anga(.yoga, jd).end))])
        case .overview:
            return D(kicker: "Overview", coord: "", name: "Kālacakra", gloss: "Wheel of time · drag to orbit · pinch to zoom · tap a body",
                     text: "Earth at the centre, the tithi dial around it, the Moon's orbit with Rāhu and Ketu, the five grahas, then the 12 rāśis and 27 nakṣatras against the real Milky Way.",
                     rows: [("Tithi", state.tithi(ti - 1)), ("Nakṣatra", state.nakshatra(ni - 1)), ("Yoga", state.yoga(yi - 1)), ("Karaṇa", Limbs.karanaName(ki))])
        default:
            let key = lock.graha!, g = Tables.graha(key)
            let lon: Double = lock == .sun ? ls : lock == .moon ? lm : lock == .earth ? Engine.norm(ls + 180) : now.graha(key).sidLon
            var rows: [(String, String)] = [("Longitude", deg(lon)), ("Rāśi", Tables.rasi[Limbs.rasiIndex(lon) - 1].iast), ("Nakṣatra", "\(state.nakshatra(Limbs.nakshatraIndex(lon) - 1)) · \(Limbs.pada(lon))")]
            switch lock {
            case .sun: rows += [("Sunrise", state.time(day.sunrise)), ("Sunset", state.time(day.sunset))]
            case .moon: rows += [("Lit", "\(lit)%"), ("Elongation", deg(e))]
            case .earth: rows = [("Observer", state.place.name), ("Sunrise", state.time(day.sunrise)), ("Next sunrise", state.time(day.nextSunrise))]
            default:
                if let p = now.grahas.first(where: { $0.key == key }) {
                    if p.distAu > 0 { rows.append(("Distance", String(format: "%.2f AU", p.distAu))) }
                    rows.append(("Motion", p.retrograde ? "retrograde (vakri)" : "direct"))
                }
            }
            return D(kicker: "Locked", coord: "λ \(deg(lon))", name: g.iast, gloss: g.english, text: "\(g.science) \(g.lore)", rows: rows)
        }
    }
}

private struct HorizonPanel: View {
    let state: AppState, now: SkyNow
    let onLook: (Target) -> Void
    var body: some View {
        let h = horizonInfo(now.jd, state.place)
        func fa(_ alt: Double, _ az: Double) -> String { String(format: "%@%.1f° alt · %d° az", alt >= 0 ? "+" : "−", abs(alt), Int(az.rounded())) }
        Panel {
            Caps(text: "Observer · \(state.place.name)", color: C.gold)
            HStack { Text("Sūrya").font(F.skt(15, italic: true)).foregroundStyle(C.goldSoft); Spacer(); Text(fa(h.sunAlt, h.sunAz)).font(F.mono(12)).foregroundStyle(C.star) }
            HStack { Text("Candra").font(F.skt(15, italic: true)).foregroundStyle(C.star); Spacer(); Text(fa(h.moonAlt, h.moonAz)).font(F.mono(12)).foregroundStyle(C.star) }
            Text("Gold line: the ecliptic. The Milky Way and 1,600 real stars are placed for this moment and place; the grahas ride near the ecliptic.").font(F.body(12)).foregroundStyle(C.muted).fixedSize(horizontal: false, vertical: true)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    ForEach([Target.sun, .moon, .nakshatra, .mercury, .venus, .mars, .jupiter, .saturn]) { t in
                        Button { onLook(t) } label: {
                            Text(t.label).font(F.skt(15, italic: true)).foregroundStyle(C.star).padding(.horizontal, 12).padding(.vertical, 5).overlay(Capsule().stroke(C.muted.opacity(0.3), lineWidth: 1))
                        }.buttonStyle(.plain)
                    }
                }
            }
        }
    }
}
