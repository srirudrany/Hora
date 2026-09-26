// Day timeline — sunrise to sunrise (Phone Screens 1d). Mirrors DayScreen.kt.
import SwiftUI
import PanchangaCore

private struct Ev: Identifiable {
    let id = UUID()
    let t: Double, kind: String, kc: Color, title: String, sub: String, dot: Color
}

struct DayView: View {
    let state: AppState

    var body: some View {
        let jd = state.jd
        let day = state.day(jd)
        let len = day.nextSunrise - day.sunrise
        let pct = { (x: Double) -> CGFloat in CGFloat(min(1, max(0, (x - day.sunrise) / len))) }
        let events = buildEvents(day)
        let wdLord = [3, 6, 2, 5, 1, 4, 0]
        let dh = (day.sunset - day.sunrise) / 12, nh = (day.nextSunrise - day.sunset) / 12

        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                VStack(alignment: .leading, spacing: 2) {
                    Caps(text: state.live ? "Today" : state.date(jd, "EEE d MMM yyyy"))
                    HStack(alignment: .lastTextBaseline, spacing: 10) {
                        Text(state.vara(day.weekday)).font(F.skt(32)).foregroundStyle(C.goldSoft)
                        Text(Tables.vara[day.weekday].tamil).font(F.tamil(20)).foregroundStyle(C.muted)
                    }
                    Text("\(state.date(day.sunrise + 0.3, "d MMM")) · \(state.month(day.tamilMonth)) \(day.tamilDay) · \(state.place.name)").font(F.body(14)).foregroundStyle(C.star)
                }
                VStack(spacing: 6) {
                    GeometryReader { geo in
                        let w = geo.size.width
                        ZStack(alignment: .topLeading) {
                            Rectangle().fill(C.nightArc)
                            Rectangle().fill(C.dayArc).frame(width: w * pct(day.sunset))
                            ForEach(Array([(C.copper, day.gulika), (C.kumkum, day.rahu), (C.plum, day.yama)].enumerated()), id: \.offset) { _, b in
                                Rectangle().fill(b.0).frame(width: w * (pct(b.1.1) - pct(b.1.0)), height: 9).offset(x: w * pct(b.1.0), y: 21)
                            }
                            Rectangle().fill(C.goldSoft).frame(width: 2).shadow(color: C.gold, radius: 6).offset(x: w * pct(jd) - 1)
                        }
                    }
                    .frame(height: 30).clipShape(RoundedRectangle(cornerRadius: 8)).overlay(RoundedRectangle(cornerRadius: 8).stroke(C.line, lineWidth: 1))
                    HStack {
                        Text("00 · \(state.time(day.sunrise))"); Spacer()
                        Text("\(Nazhigai.format(day.sunset, sunrise: day.sunrise)) · \(state.time(day.sunset))"); Spacer()
                        Text("60")
                    }.font(F.mono(11)).foregroundStyle(C.muted)
                }
                VStack(alignment: .leading, spacing: 6) {
                    Caps(text: "Horā")
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 4) {
                            ForEach(0..<24, id: \.self) { i in
                                let s = i < 12 ? day.sunrise + Double(i) * dh : day.sunset + Double(i - 12) * nh
                                let e = s + (i < 12 ? dh : nh)
                                let lord = Tables.horaChaldean[(wdLord[day.weekday] + i) % 7]
                                let on = jd >= s && jd < e
                                VStack(alignment: .leading, spacing: 2) {
                                    HStack(spacing: 5) {
                                        Circle().fill(C.graha[lord] ?? C.star).frame(width: 7, height: 7)
                                        Text(lord).font(F.skt(14, italic: true)).foregroundStyle(on ? C.goldSoft : C.star)
                                    }
                                    Text(state.time(s)).font(F.mono(10)).foregroundStyle(C.muted)
                                }
                                .padding(.horizontal, 8).padding(.vertical, 6).frame(minWidth: 64, alignment: .leading)
                                .background(on ? C.gold.opacity(0.12) : Color(hex: 0x080B18, alpha: 0.72), in: RoundedRectangle(cornerRadius: 9))
                                .overlay(RoundedRectangle(cornerRadius: 9).stroke(on ? C.gold.opacity(0.7) : C.muted.opacity(0.18), lineWidth: 1))
                            }
                        }
                    }
                }
                VStack(spacing: 0) {
                    let firstFuture = events.firstIndex { $0.t > jd }
                    ForEach(Array(events.enumerated()), id: \.element.id) { i, e in
                        if i == firstFuture {
                            TimelineRow(time: state.time(jd), nz: Nazhigai.format(jd, sunrise: day.sunrise), kind: "Now", kc: C.goldSoft,
                                        title: "\(Nazhigai.format(jd, sunrise: day.sunrise)) nāḻigai", sub: "since sunrise", dot: C.goldSoft, rail: jd < day.sunset ? C.dayArc : C.lapis2, alpha: 1)
                        }
                        TimelineRow(time: state.time(e.t), nz: Nazhigai.format(e.t, sunrise: day.sunrise), kind: e.kind, kc: e.kc, title: e.title, sub: e.sub,
                                    dot: e.dot, rail: e.t < day.sunset ? C.dayArc : C.lapis2, alpha: e.t < jd ? 0.5 : 1)
                    }
                }
            }
            .padding(.horizontal, 20).padding(.top, 54).padding(.bottom, 100)
        }.scrollIndicators(.hidden)
    }

    private func buildEvents(_ day: DayPanchanga) -> [Ev] {
        var ev = [
            Ev(t: day.sunrise, kind: "Sunrise", kc: C.gold, title: "Sūryodaya", sub: "The day begins · nāḻigai 00:00", dot: C.gold),
            Ev(t: day.sunset, kind: "Sunset", kc: C.gold, title: "Sūryāsta", sub: "Daylight lasted \(Nazhigai.format(day.sunset, sunrise: day.sunrise)) nāḻigai", dot: C.copper),
            Ev(t: day.nextSunrise, kind: "Next sunrise", kc: C.gold, title: Tables.vara[(day.weekday + 1) % 7].iast, sub: "A new day begins", dot: C.gold),
        ]
        for (n, c, r) in [("Rāhu kālam", C.kumkum, day.rahu), ("Yamagaṇḍam", C.plum, day.yama), ("Kuḷikai", C.copper, day.gulika), ("Abhijit", C.teal, day.abhijit)] {
            ev.append(Ev(t: r.0, kind: n == "Abhijit" ? "Auspicious window" : "Kāla period", kc: c, title: n == "Abhijit" ? "Abhijit muhūrta" : n, sub: "\(state.time(r.0)) – \(state.time(r.1))", dot: c))
        }
        // limb transitions in their clock-ring colours
        let limbs: [(String, [Span], Color, (Int) -> String)] = [
            ("Tithi", day.tithi, RingColor.tithi, state.tithi), ("Nakṣatra", day.nakshatra, RingColor.nakshatra, state.nakshatra),
            ("Yoga", day.yoga, RingColor.yoga, state.yoga), ("Karaṇa", day.karana, RingColor.karana, state.karana),
        ]
        for (label, spans, color, name) in limbs {
            for (i, s) in spans.enumerated() where s.end < day.nextSunrise && i + 1 < spans.count {
                ev.append(Ev(t: s.end, kind: "\(label) changes", kc: color, title: name(spans[i + 1].idx), sub: "after \(name(s.idx))", dot: color))
            }
        }
        return ev.sorted { $0.t < $1.t }
    }
}

private struct TimelineRow: View {
    let time, nz, kind: String
    let kc: Color
    let title, sub: String
    let dot, rail: Color
    let alpha: Double
    var body: some View {
        HStack(alignment: .top, spacing: 0) {
            VStack(alignment: .trailing, spacing: 0) {
                Text(time).font(F.mono(12.5)).foregroundStyle(C.star)
                Text(nz).font(F.mono(10.5)).foregroundStyle(C.muted)
            }.frame(width: 70, alignment: .trailing).padding(.top, 10)
            ZStack(alignment: .top) {
                Rectangle().fill(rail).frame(width: 2)
                Circle().fill(dot).frame(width: 10, height: 10).overlay(Circle().stroke(C.stage, lineWidth: 3)).padding(.top, 14)
            }.frame(width: 28)
            VStack(alignment: .leading, spacing: 2) {
                Text(kind).capsStyle(10, kc)
                Text(title).font(F.skt(18)).foregroundStyle(C.star)
                Text(sub).font(F.body(12.5)).foregroundStyle(C.muted)
            }.padding(.top, 8).padding(.bottom, 12)
            Spacer(minLength: 0)
        }
        .opacity(alpha)
        .fixedSize(horizontal: false, vertical: true)
    }
}
