// Month — Tamil solar month grid (Phone Screens 1e) + the muhūrta finder. Mirrors MonthScreen.kt.
import SwiftUI
import PanchangaCore

func specialColor(_ k: SpecialDay.Kind) -> Color {
    switch k {
    case .purnima: C.goldSoft; case .amavasya: C.muted; case .ekadashi: C.teal; case .shashthi: C.copper
    case .pradosham: C.plum; case .sankatahara: C.kumkum; case .karttikai, .festival: C.gold
    }
}

struct MonthView: View {
    let state: AppState
    @State private var finder = false
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            PillGroup {
                Pill(text: "Month", on: !finder) { finder = false }
                Pill(text: "Find a day", on: finder) { finder = true }
            }.padding(.leading, 16).padding(.top, 52)
            if finder { FinderView(state: state) } else { MonthGrid(state: state) }
        }
    }
}

private struct MonthGrid: View {
    let state: AppState
    @State private var days: [DayPanchanga] = []

    var body: some View {
        let today = state.day()
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 0) {
                        Term(term: "Saṃvatsara", display: Tables.samvatsara[today.samvat].uppercased(), font: F.caps(11), color: C.muted)
                        Text(" · Tamil solar month").capsStyle(11)
                    }
                    HStack(alignment: .lastTextBaseline, spacing: 10) {
                        Text(Tables.rasi[today.tamilMonth].tamilMonth).font(F.skt(32)).foregroundStyle(C.goldSoft)
                        Text(Tables.rasi[today.tamilMonth].tamilMonthScript).font(F.tamil(20)).foregroundStyle(C.muted)
                    }
                    if let f = days.first, let l = days.last {
                        Text("\(state.civil(f.date)) – \(state.civil(l.date)) · Sun in \(Tables.rasi[today.tamilMonth].iast)").font(F.mono(12)).foregroundStyle(C.muted)
                    }
                }.padding(.horizontal, 4)
                let cols = Array(repeating: GridItem(.flexible(), spacing: 3), count: 7)
                LazyVGrid(columns: cols, spacing: 3) {
                    ForEach(["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"], id: \.self) { Text($0).capsStyle(10).padding(.vertical, 4) }
                    ForEach(0..<(days.first?.weekday ?? 0), id: \.self) { _ in Color.clear.frame(height: 66) }
                    ForEach(days, id: \.date) { d in DayCell(state: state, d: d, isToday: d.date == today.date) }
                }
                Panel {
                    Caps(text: "Today at sunrise", color: C.gold)
                    ForEach([("Tithi", state.tithi(today.tithi[0].idx)), ("Nakṣatra", state.nakshatra(today.nakshatra[0].idx)), ("Yoga", state.yoga(today.yoga[0].idx)), ("Karaṇa", state.karana(today.karana[0].idx))], id: \.0) { k, v in
                        HStack { Caps(text: k, size: 10); Spacer(); Text(v).font(F.skt(17)).foregroundStyle(C.star) }
                    }
                }
                VStack(alignment: .leading, spacing: 2) {
                    Caps(text: "This month")
                    ForEach(days, id: \.date) { d in
                        ForEach(Specials.of(d), id: \.name) { s in
                            HStack {
                                Text(state.civil(d.date, "EEE d MMM")).font(F.mono(12)).foregroundStyle(C.muted).frame(width: 88, alignment: .leading)
                                Text(s.name).font(F.skt(16, italic: true)).foregroundStyle(specialColor(s.kind))
                                Spacer()
                                Text("\(state.month(d.tamilMonth)) \(d.tamilDay)").font(F.body(12)).foregroundStyle(C.muted)
                            }.padding(.vertical, 6)
                            Divider().overlay(C.muted.opacity(0.14))
                        }
                    }
                }.padding(.horizontal, 4)
            }
            .padding(.horizontal, 16).padding(.top, 12).padding(.bottom, 100)
        }
        .scrollIndicators(.hidden)
        .task(id: "\(state.place.name)-\(today.tamilMonth)-\(today.date.year)") {
            let place = state.place, start = today.date.adding(days: -(today.tamilDay - 1)), m = today.tamilMonth
            days = await Task.detached {
                (0..<33).map { Engine.panchanga(start.adding(days: $0), place) }.filter { $0.tamilMonth == m }
            }.value
        }
    }
}

private struct DayCell: View {
    let state: AppState, d: DayPanchanga, isToday: Bool
    var body: some View {
        let t = d.tithi[0].idx, sp = Specials.of(d)
        VStack(alignment: .leading) {
            HStack(alignment: .top) {
                Text("\(d.tamilDay)").font(F.mono(15)).foregroundStyle(isToday ? C.goldSoft : C.star)
                Spacer()
                if t == 14 || t == 29 { Circle().fill(t == 14 ? C.moon : C.stage).overlay(Circle().stroke(C.moon, lineWidth: 1)).frame(width: 9, height: 9).padding(.top, 3) }
            }
            Spacer(minLength: 0)
            Text(state.civil(d.date)).font(F.mono(9.5)).foregroundStyle(C.muted)
            Text(sp.first?.name ?? state.nakshatra(d.nakshatra[0].idx)).font(F.body(8.5, weight: .semibold)).foregroundStyle(sp.first.map { specialColor($0.kind) } ?? C.muted).lineLimit(1)
        }
        .padding(5).frame(height: 66)
        .background(isToday ? C.gold.opacity(0.14) : (t < 15 ? C.ink2 : C.ink), in: RoundedRectangle(cornerRadius: 9))
        .overlay(RoundedRectangle(cornerRadius: 9).stroke(isToday ? C.gold : C.muted.opacity(0.14), lineWidth: 1))
    }
}

private struct FinderView: View {
    let state: AppState
    @State private var activity = Activity.wedding
    @State private var open: CivilDate?
    @State private var results: [DayVerdict]?

    var body: some View {
        let startDate = state.day().date
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                VStack(alignment: .leading, spacing: 2) {
                    Caps(text: "When is it good to…")
                    Term(term: "Muhūrta", display: "Muhūrta finder", font: F.skt(28), color: C.goldSoft)
                }
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        ForEach(Activity.allCases, id: \.self) { a in
                            Button { activity = a } label: {
                                VStack(alignment: .leading, spacing: 0) {
                                    Text(a.label).font(F.skt(16, italic: true)).foregroundStyle(a == activity ? C.goldSoft : C.star)
                                    Text(a.gloss).capsStyle(9)
                                }
                                .padding(.horizontal, 12).padding(.vertical, 8)
                                .background(a == activity ? C.gold.opacity(0.14) : Color(hex: 0x080B18, alpha: 0.72), in: RoundedRectangle(cornerRadius: 10))
                                .overlay(RoundedRectangle(cornerRadius: 10).stroke(a == activity ? C.gold.opacity(0.7) : C.muted.opacity(0.2), lineWidth: 1))
                            }.buttonStyle(.plain)
                        }
                    }
                }
                Text(Tables.disclaimer).font(F.body(12)).foregroundStyle(C.muted)
                if let r = results {
                    let good = r.filter { !$0.excluded }.sorted { $0.score > $1.score }
                    Caps(text: "Best days in the next 60 · \(good.count) candidates", color: C.gold)
                    ForEach(good.prefix(8), id: \.day.date) { v in VerdictRow(state: state, v: v, expanded: open == v.day.date) { open = open == v.day.date ? nil : v.day.date } }
                    Caps(text: "Excluded — and why")
                    ForEach(r.filter { $0.excluded }.prefix(12), id: \.day.date) { v in VerdictRow(state: state, v: v, expanded: open == v.day.date) { open = open == v.day.date ? nil : v.day.date } }
                } else {
                    Text("Reading the next 60 days…").font(F.body(13)).foregroundStyle(C.muted)
                }
            }
            .padding(.horizontal, 16).padding(.top, 12).padding(.bottom, 100)
        }
        .scrollIndicators(.hidden)
        .task(id: "\(activity)-\(state.place.name)-\(startDate.epochDay)") {
            results = nil
            let place = state.place, act = activity
            results = await Task.detached { (0..<60).map { MuhurtaFinder.judge(Engine.panchanga(startDate.adding(days: $0), place), act) } }.value
        }
    }
}

private struct VerdictRow: View {
    let state: AppState, v: DayVerdict, expanded: Bool
    let action: () -> Void
    var body: some View {
        let d = v.day
        Button(action: action) {
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    VStack(alignment: .leading, spacing: 0) {
                        Text("\(state.civil(d.date, "EEE d MMM")) · \(state.month(d.tamilMonth)) \(d.tamilDay)").font(F.mono(12)).foregroundStyle(v.excluded ? C.muted : C.star)
                        Text("\(state.tithi(d.tithi[0].idx)) · \(state.nakshatra(d.nakshatra[0].idx))").font(F.skt(15)).foregroundStyle(v.excluded ? C.muted : C.star)
                    }
                    Spacer()
                    if !v.excluded { Text("\(v.score)").font(F.mono(18)).foregroundStyle(C.goldSoft) }
                }
                if expanded {
                    ForEach(Array(v.reasons.enumerated()), id: \.offset) { _, r in
                        HStack(alignment: .top, spacing: 4) {
                            Text(r.ok ? "+" : "−").font(F.mono(12)).foregroundStyle(r.ok ? C.teal : C.kumkum).frame(width: 14)
                            Text(r.text).font(F.body(12)).foregroundStyle(C.star).multilineTextAlignment(.leading)
                        }
                    }
                    Text("Rāhu kālam \(state.time(d.rahu.0))–\(state.time(d.rahu.1)) · Abhijit \(state.time(d.abhijit.0))–\(state.time(d.abhijit.1))").font(F.mono(11)).foregroundStyle(C.muted)
                }
            }
            .padding(.horizontal, 12).padding(.vertical, 8).frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(hex: 0x080B18, alpha: 0.55), in: RoundedRectangle(cornerRadius: 10))
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(v.excluded ? C.muted.opacity(0.14) : C.gold.opacity(0.3), lineWidth: 1))
        }.buttonStyle(.plain)
    }
}
