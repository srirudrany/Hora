import SwiftUI
import CoreLocation
import PanchangaCore

@main
struct PanchangaClockApp: App {
    @State private var state = AppState()
    @State private var assets = SkyAssets()
    var body: some Scene {
        WindowGroup {
            RootView(state: state)
                .environment(\.skyAssets, assets)
                .preferredColorScheme(.dark)
                .task { assets.load() }
        }
    }
}

enum Tab: String, CaseIterable { case now = "Now", sky = "Sky", day = "Day", month = "Month" }

struct RootView: View {
    @Bindable var state: AppState
    @State private var tab = Tab.now
    @State private var forward = true
    private var screen: Tab { tab == .sky ? .now : tab }
    @State private var settings = false
    @State private var gloss: String?
    private let tick = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    var body: some View {
        ZStack(alignment: .bottom) {
            C.stage.ignoresSafeArea()
            ZStack(alignment: .top) {
                // Now and Sky share one stage (the lift-off); Day and Month slide in from the side of their tab
                Group {
                    switch screen {
                    case .now, .sky: NowSkyStage(state: state, sky: tab == .sky) { tab = $0 ? .sky : .now }
                    case .day: DayView(state: state)
                    case .month: MonthView(state: state)
                    }
                }
                .id(screen)
                .transition(.asymmetric(
                    insertion: .offset(x: forward ? 60 : -60).combined(with: .opacity).combined(with: .scale(scale: 0.97)),
                    removal: .offset(x: forward ? -60 : 60).combined(with: .opacity)))
                HStack(spacing: 0) {
                    Text("९ ").font(F.skt(18)).foregroundStyle(C.gold)
                    Text("Kālacakra").font(F.skt(19, italic: true)).foregroundStyle(C.star)
                    Text("  कालचक्र").font(F.skt(16)).foregroundStyle(C.muted)
                    Spacer()
                    Button { settings = true } label: {
                        HStack(spacing: 6) { Circle().fill(C.gold).frame(width: 6, height: 6); Text(state.place.name).font(F.body(12)).foregroundStyle(C.star) }
                            .padding(.horizontal, 10).padding(.vertical, 5).overlay(Capsule().stroke(C.line2, lineWidth: 1))
                    }.buttonStyle(.plain)
                }.padding(.horizontal, 16).padding(.vertical, 10)
            }
            .padding(.bottom, 64)
            TabBar(tab: Binding(get: { tab }, set: { new in
                forward = Tab.allCases.firstIndex(of: new)! > Tab.allCases.firstIndex(of: tab)!
                withAnimation(.spring(response: 0.5, dampingFraction: 0.86)) { tab = new }
            }))
            if let g = gloss {
                Color.black.opacity(0.6).ignoresSafeArea().onTapGesture { gloss = nil }
                Panel(pad: 20) {
                    Caps(text: "Glossary", color: C.gold)
                    Text(g).font(F.skt(26)).foregroundStyle(C.goldSoft)
                    Text(glossaryEntry(g) ?? "").font(F.body(15)).foregroundStyle(C.star)
                }.padding(16).padding(.bottom, 64).onTapGesture { gloss = nil }
            }
        }
        .environment(\.glossary, GlossaryAction { gloss = $0 })
        .sheet(isPresented: $settings) { SettingsView(state: state) }
        .onReceive(tick) { _ in state.now = Date() }
        .task(id: state.playing) { await play() }
    }

    /// Advance the scrub offset while playing, at `speed` hours per second.
    private func play() async {
        guard state.playing else { return }
        var last = Date()
        let maxH = 15 * 24.0
        while state.playing && !Task.isCancelled {
            try? await Task.sleep(nanoseconds: 16_000_000)
            let now = Date(), dt = min(0.1, now.timeIntervalSince(last)); last = now
            let o = state.offsetH + state.speed * dt
            if o >= maxH { state.offsetH = maxH; state.playing = false } else { state.offsetH = o }
        }
    }
}

private struct TabBar: View {
    @Binding var tab: Tab
    var body: some View {
        HStack {
            ForEach(Tab.allCases, id: \.self) { t in
                Button { tab = t } label: {
                    VStack(spacing: 5) {
                        Circle().fill(C.gold).frame(width: 5, height: 5).scaleEffect(t == tab ? 1 : 0.2).opacity(t == tab ? 1 : 0)
                        Text(t.rawValue).capsStyle(11, t == tab ? C.goldSoft : C.muted).offset(y: t == tab ? -2 : 0)
                    }
                    .frame(maxWidth: .infinity).padding(.vertical, 6)
                    .animation(.spring(response: 0.35, dampingFraction: 0.55), value: tab)
                }.buttonStyle(.plain)
            }
        }
        .frame(height: 64).padding(.horizontal, 16)
        .background(Color(hex: 0x04060D, alpha: 0.95).ignoresSafeArea(edges: .bottom))
        .overlay(alignment: .top) { Rectangle().fill(C.line2).frame(height: 1) }
    }
}

// MARK: - Settings

final class LocationFetcher: NSObject, CLLocationManagerDelegate {
    private let manager = CLLocationManager()
    var onFix: ((CLLocation?) -> Void)?
    override init() { super.init(); manager.delegate = self; manager.desiredAccuracy = kCLLocationAccuracyKilometer }
    func request() {
        switch manager.authorizationStatus {
        case .notDetermined: manager.requestWhenInUseAuthorization()
        case .authorizedWhenInUse, .authorizedAlways: manager.requestLocation()
        default: onFix?(nil)
        }
    }
    func locationManagerDidChangeAuthorization(_ m: CLLocationManager) {
        if m.authorizationStatus == .authorizedWhenInUse || m.authorizationStatus == .authorizedAlways { m.requestLocation() }
        else if m.authorizationStatus != .notDetermined { onFix?(nil) }
    }
    func locationManager(_ m: CLLocationManager, didUpdateLocations locs: [CLLocation]) { onFix?(locs.last) }
    func locationManager(_ m: CLLocationManager, didFailWithError error: Error) { onFix?(nil) }
}

struct SettingsView: View {
    @Bindable var state: AppState
    @Environment(\.dismiss) private var dismiss
    @State private var msg: String?
    @State private var loc = LocationFetcher()

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                HStack {
                    Text("Settings").font(F.skt(28)).foregroundStyle(C.goldSoft)
                    Spacer()
                    Button { dismiss() } label: { Text("Done").capsStyle(12, C.goldSoft).padding(.horizontal, 14).padding(.vertical, 7).overlay(Capsule().stroke(C.gold, lineWidth: 1)) }.buttonStyle(.plain)
                }
                Caps(text: "Names")
                PillGroup { ForEach(Script.allCases, id: \.self) { s in Pill(text: s.rawValue, on: state.script == s, font: F.body(13)) { state.script = s } } }
                Caps(text: "Clock")
                PillGroup { Pill(text: "12 h", on: !state.use24h) { state.use24h = false }; Pill(text: "24 h", on: state.use24h) { state.use24h = true } }
                Caps(text: "Place")
                Button {
                    loc.onFix = { l in
                        DispatchQueue.main.async {
                            guard let l else { msg = "Location unavailable — pick a city below."; return }
                            state.place = Place(name: "Here", lat: l.coordinate.latitude, lon: l.coordinate.longitude, zoneId: TimeZone.current.identifier)
                            msg = String(format: "Using %.2f°, %.2f° · %@", l.coordinate.latitude, l.coordinate.longitude, TimeZone.current.identifier)
                        }
                    }
                    loc.request()
                } label: { Text("Use my location").capsStyle(12, C.goldSoft).padding(.horizontal, 14).padding(.vertical, 8).overlay(Capsule().stroke(C.gold.opacity(0.6), lineWidth: 1)) }.buttonStyle(.plain)
                if let msg { Text(msg).font(F.body(12)).foregroundStyle(C.muted) }
                ForEach(Places.cities, id: \.name) { p in
                    let on = p.name == state.place.name
                    Button { state.place = p } label: {
                        HStack {
                            Text(p.name).font(F.body(15)).foregroundStyle(on ? C.goldSoft : C.star)
                            Spacer()
                            Text(String(format: "%.2f° %.2f° · %@", p.lat, p.lon, String(p.zoneId.split(separator: "/").last ?? ""))).font(F.mono(11)).foregroundStyle(C.muted)
                        }
                        .padding(.horizontal, 12).padding(.vertical, 9)
                        .background(on ? C.gold.opacity(0.12) : .clear, in: RoundedRectangle(cornerRadius: 10))
                    }.buttonStyle(.plain)
                }
                Caps(text: "Ayanāṁśa")
                Text("Lahiri (Citrā-pakṣa) — Spica at 180°. Engine: Meeus Sun/Moon, Espenak–Meeus ΔT.").font(F.body(13)).foregroundStyle(C.muted)
                Text("Computation and name tables from the Hora project (srirudrany). Muhūrta results are guidance, not prescription.").font(F.body(12)).foregroundStyle(C.muted)
            }.padding(20)
        }
        .background(C.stage)
        .preferredColorScheme(.dark)
    }
}
