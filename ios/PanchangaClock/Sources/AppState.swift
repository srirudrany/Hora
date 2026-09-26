import Foundation
import Observation
import PanchangaCore

enum Script: String, CaseIterable { case iast = "IAST", devanagari = "देवनागरी", tamil = "தமிழ்" }

enum Places {
    static let cities: [Place] = [
        Place(name: "Chennai", lat: 13.0827, lon: 80.2707, zoneId: "Asia/Kolkata"),
        Place(name: "Madurai", lat: 9.9252, lon: 78.1198, zoneId: "Asia/Kolkata"),
        Place(name: "Coimbatore", lat: 11.0168, lon: 76.9558, zoneId: "Asia/Kolkata"),
        Place(name: "Tiruchirappalli", lat: 10.7905, lon: 78.7047, zoneId: "Asia/Kolkata"),
        Place(name: "Bengaluru", lat: 12.9716, lon: 77.5946, zoneId: "Asia/Kolkata"),
        Place(name: "Hyderabad", lat: 17.3850, lon: 78.4867, zoneId: "Asia/Kolkata"),
        Place(name: "Mumbai", lat: 19.0760, lon: 72.8777, zoneId: "Asia/Kolkata"),
        Place(name: "Delhi", lat: 28.6139, lon: 77.2090, zoneId: "Asia/Kolkata"),
        Place(name: "Kolkata", lat: 22.5726, lon: 88.3639, zoneId: "Asia/Kolkata"),
        Place(name: "Varanasi", lat: 25.3176, lon: 82.9739, zoneId: "Asia/Kolkata"),
        Place(name: "Colombo", lat: 6.9271, lon: 79.8612, zoneId: "Asia/Colombo"),
        Place(name: "Jaffna", lat: 9.6615, lon: 80.0255, zoneId: "Asia/Colombo"),
        Place(name: "Kathmandu", lat: 27.7172, lon: 85.3240, zoneId: "Asia/Kathmandu"),
        Place(name: "Singapore", lat: 1.3521, lon: 103.8198, zoneId: "Asia/Singapore"),
        Place(name: "Kuala Lumpur", lat: 3.1390, lon: 101.6869, zoneId: "Asia/Kuala_Lumpur"),
        Place(name: "Dubai", lat: 25.2048, lon: 55.2708, zoneId: "Asia/Dubai"),
        Place(name: "London", lat: 51.5074, lon: -0.1278, zoneId: "Europe/London"),
        Place(name: "Toronto", lat: 43.6532, lon: -79.3832, zoneId: "America/Toronto"),
        Place(name: "New York", lat: 40.7128, lon: -74.0060, zoneId: "America/New_York"),
        Place(name: "San Francisco", lat: 37.7749, lon: -122.4194, zoneId: "America/Los_Angeles"),
        Place(name: "Sydney", lat: -33.8688, lon: 151.2093, zoneId: "Australia/Sydney"),
    ]
}

/// Live time, scrub offset, place and preferences. All panchanga values derive from `jd`.
@Observable
final class AppState {
    var place: Place { didSet { save() } }
    var use24h: Bool { didSet { UserDefaults.standard.set(use24h, forKey: "use24h") } }
    var script: Script { didSet { UserDefaults.standard.set(script.rawValue, forKey: "script") } }

    /// Wall-clock now, ticked by the UI.
    var now = Date()
    /// Scrub offset from now, hours. 0 = live.
    var offsetH: Double = 0
    var playing = false
    /// Playback speed in hours per second
    var speed: Double = 6

    var live: Bool { offsetH == 0 && !playing }
    var jd: Double { Engine.jd(from: now) + offsetH / 24 }

    init() {
        let d = UserDefaults.standard
        if let data = d.data(forKey: "place"), let p = try? JSONDecoder().decode(Place.self, from: data) { place = p } else { place = Places.cities[0] }
        use24h = d.bool(forKey: "use24h")
        script = Script(rawValue: d.string(forKey: "script") ?? "") ?? .iast
    }
    private func save() {
        if let data = try? JSONEncoder().encode(place) { UserDefaults.standard.set(data, forKey: "place") }
        dayCache = nil
    }

    @ObservationIgnored private var dayCache: DayPanchanga?
    func day(_ at: Double? = nil) -> DayPanchanga {
        let t = at ?? jd
        if let c = dayCache, t >= c.sunrise, t < c.nextSunrise { return c }
        let d = Engine.dayContaining(t, place)
        dayCache = d
        return d
    }

    struct AngaNow { let idx: Int; let start: Double; let end: Double }
    @ObservationIgnored private var angaCache: [Anga: AngaNow] = [:]
    func anga(_ kind: Anga, _ at: Double? = nil) -> AngaNow {
        let t = at ?? jd
        if let q = angaCache[kind], t >= q.start, t < q.end { return q }
        let q = AngaNow(idx: Engine.angaAt(kind, t), start: Engine.angaStart(kind, t), end: Engine.angaEnd(kind, t))
        angaCache[kind] = q
        return q
    }

    // ---------- formatting in the place's zone ----------
    private var zone: TimeZone { TimeZone(identifier: place.zoneId) ?? .current }
    func time(_ jd: Double) -> String {
        var cal = Calendar(identifier: .gregorian); cal.timeZone = zone
        let c = cal.dateComponents([.hour, .minute], from: Engine.date(fromJd: jd + 0.5 / 86400))
        let h = c.hour ?? 0, m = c.minute ?? 0
        if use24h { return String(format: "%02d:%02d", h, m) }
        return String(format: "%d:%02d %@", h % 12 == 0 ? 12 : h % 12, m, h < 12 ? "am" : "pm")
    }
    func date(_ jd: Double, _ pattern: String = "d MMM yyyy") -> String {
        let f = DateFormatter(); f.locale = Locale(identifier: "en_US_POSIX"); f.timeZone = zone; f.dateFormat = pattern
        return f.string(from: Engine.date(fromJd: jd))
    }
    func civil(_ d: CivilDate, _ pattern: String = "d MMM") -> String {
        let f = DateFormatter(); f.locale = Locale(identifier: "en_US_POSIX"); f.timeZone = TimeZone(identifier: "UTC"); f.dateFormat = pattern
        return f.string(from: Date(timeIntervalSince1970: Double(d.epochDay) * 86400 + 43200))
    }

    // ---------- names in the chosen script ----------
    func tithi(_ i: Int) -> String {
        if script == .devanagari { return Tables.tithi[i].devanagari + ((15...28).contains(i) ? " (कृष्ण)" : i < 14 ? " (शुक्ल)" : "") }
        return "\(Tables.tithi[i].paksha) \(Tables.tithi[i].iast)"
    }
    func nakshatra(_ i: Int) -> String {
        switch script { case .iast: Tables.nakshatra[i].iast; case .devanagari: Tables.nakshatra[i].devanagari; case .tamil: Tables.nakshatra[i].tamil }
    }
    func yoga(_ i: Int) -> String { script == .devanagari ? Tables.yoga[i].devanagari : Tables.yoga[i].iast }
    func karana(_ slot: Int) -> String { let k = Tables.karanaOfSlot(slot); return script == .devanagari ? k.devanagari : k.iast }
    func vara(_ w: Int) -> String { script == .devanagari ? Tables.vara[w].devanagari : Tables.vara[w].iast }
    func month(_ m: Int) -> String { script == .tamil ? Tables.rasi[m].tamilMonthScript : Tables.rasi[m].tamilMonth }
}
