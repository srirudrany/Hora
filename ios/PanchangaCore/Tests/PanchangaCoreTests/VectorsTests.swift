import Foundation
import XCTest
@testable import PanchangaCore

/// data/test-vectors.json — every day must match within 1 minute and with exact indices.
/// Note: in that file ALL limb indices (tithi, nakshatra, yoga, karana) are 0-based.
final class VectorsTests: XCTestCase {
    static let dataDir = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
        .appendingPathComponent("../../../../data").standardized
    let chennai = Place(name: "Chennai", lat: 13.0827, lon: 80.2707, zoneId: "Asia/Kolkata")

    func iso(_ s: String) -> Double {
        let f = ISO8601DateFormatter()
        return Engine.jd(from: f.date(from: s)!)
    }

    func assertTime(_ label: String, _ expected: String, _ jd: Double, tol: Double, file: StaticString = #filePath, line: UInt = #line) {
        let diff = abs(jd - iso(expected)) * 1440
        XCTAssertLessThanOrEqual(diff, tol, "\(label): expected \(expected), off by \(String(format: "%.2f", diff)) min", file: file, line: line)
    }

    func testAllSixtyVectors() throws {
        let data = try Data(contentsOf: Self.dataDir.appendingPathComponent("test-vectors.json"))
        let json = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let tol = json["tolerance_minutes"] as! Double
        let vs = json["vectors"] as! [[String: Any]]
        XCTAssertEqual(vs.count, 60)
        for v in vs {
            let parts = (v["date"] as! String).split(separator: "-").map { Int($0)! }
            let tag = "\(v["city"]!) \(v["date"]!)"
            let place = Place(name: v["city"] as! String, lat: v["lat"] as! Double, lon: v["lon"] as! Double, zoneId: "Asia/Kolkata")
            let p = Engine.panchanga(CivilDate(parts[0], parts[1], parts[2]), place)
            assertTime("\(tag) sunrise", v["sunrise"] as! String, p.sunrise, tol: tol)
            assertTime("\(tag) sunset", v["sunset"] as! String, p.sunset, tol: tol)
            assertTime("\(tag) next sunrise", v["next_sunrise"] as! String, p.nextSunrise, tol: tol)
            let vara = v["vara"] as! [String: Any], tm = v["tamil_month"] as! [String: Any], sv = v["samvatsara"] as! [String: Any]
            XCTAssertEqual(vara["index"] as! Int, p.weekday, tag)
            XCTAssertEqual(vara["name"] as! String, Tables.vara[p.weekday].iast, tag)
            XCTAssertEqual(tm["index"] as! Int, p.tamilMonth, tag)
            XCTAssertEqual(tm["day"] as! Int, p.tamilDay, tag)
            XCTAssertEqual(sv["index"] as! Int, p.samvat, tag)
            XCTAssertEqual(v["ayanamsa_deg"] as! Double, p.ayanamsa, accuracy: 0.001, tag)
            XCTAssertEqual(v["sun_sidereal_deg"] as! Double, p.sunSid, accuracy: 0.002, tag)
            XCTAssertEqual(v["moon_sidereal_deg"] as! Double, p.moonSid, accuracy: 0.005, tag)
            let limbs: [(String, [Span], (Int) -> String)] = [
                ("tithi", p.tithi, Limbs.tithiLabel), ("nakshatra", p.nakshatra, Limbs.nakshatraLabel),
                ("yoga", p.yoga, Limbs.yogaLabel), ("karana", p.karana, Limbs.karanaLabel),
            ]
            for (key, got, name) in limbs {
                let exp = v[key] as! [[String: Any]]
                XCTAssertEqual(exp.count, got.count, "\(tag) \(key) count")
                for (j, e) in exp.enumerated() where j < got.count {
                    XCTAssertEqual(e["index"] as! Int, got[j].idx, "\(tag) \(key)[\(j)]")
                    XCTAssertEqual(e["name"] as! String, name(got[j].idx), "\(tag) \(key)[\(j)] name")
                    assertTime("\(tag) \(key)[\(j)] end", e["ends"] as! String, got[j].end, tol: tol)
                }
            }
            for (key, pair) in [("rahu_kalam", p.rahu), ("yamagandam", p.yama), ("kulikai", p.gulika), ("abhijit", p.abhijit)] {
                let a = v[key] as! [String]
                assertTime("\(tag) \(key) start", a[0], pair.0, tol: tol)
                assertTime("\(tag) \(key) end", a[1], pair.1, tol: tol)
            }
        }
    }

    /// test-vectors.md §3 — the externally verified day (drikpanchang), IST clock times.
    func testRegressionDayChennai() {
        let p = Engine.panchanga(CivilDate(2026, 9, 26), chennai)
        func near(_ label: String, _ jd: Double, _ h: Int, _ m: Int) {
            let local = (jd - 2440587.5) * 86400 + 5.5 * 3600
            let minutes = (local / 60).truncatingRemainder(dividingBy: 1440)
            XCTAssertLessThanOrEqual(abs(minutes - Double(h * 60 + m) - 0.5), 1.5, label)
        }
        near("sunrise", p.sunrise, 5, 58); near("sunset", p.sunset, 18, 2)
        XCTAssertEqual(Limbs.tithiLabel(p.tithi[0].idx), "Śukla Pūrṇimā"); near("tithi", p.tithi[0].end, 22, 18)
        XCTAssertEqual(p.nakshatra[0].idx + 1, 25); near("nakshatra", p.nakshatra[0].end, 11, 32)
        XCTAssertEqual(Limbs.yogaLabel(p.yoga[0].idx), "Gaṇḍa"); near("yoga", p.yoga[0].end, 13, 17)
        // 1-based karana k = floor(E/6)+1: Viṣṭi is k = 29 (docs/test-vectors.md §3 prints 28 — see README)
        XCTAssertEqual(p.karana[0].idx + 1, 29); XCTAssertEqual(Limbs.karanaLabel(p.karana[0].idx), "Viṣṭi"); near("viṣṭi", p.karana[0].end, 10, 46)
        XCTAssertEqual(Limbs.karanaLabel(p.karana[1].idx), "Bava"); near("bava", p.karana[1].end, 22, 18)
        near("rahu start", p.rahu.0, 8, 59); near("rahu end", p.rahu.1, 10, 30)
        XCTAssertEqual(Tables.rasi[p.tamilMonth].tamilMonth, "Puraṭṭāsi"); XCTAssertEqual(p.tamilDay, 10)
    }

    /// SPEC §6: kṣaya day (2 Sep 2026) and adhika day (17 Oct 2026), Chennai.
    func testKshayaAndAdhika() {
        let k = Engine.panchanga(CivilDate(2026, 9, 2), chennai)
        XCTAssertEqual(k.tithi.map(\.idx), [19, 20, 21]); XCTAssertLessThan(k.tithi[1].end, k.nextSunrise)
        let a = Engine.panchanga(CivilDate(2026, 10, 17), chennai)
        XCTAssertEqual(a.tithi.map(\.idx), [6]); XCTAssertGreaterThan(a.tithi[0].end, a.nextSunrise)
        XCTAssertEqual(Engine.panchanga(CivilDate(2026, 10, 18), chennai).tithi[0].idx, 6)
    }

    func testDstZone() {
        let ny = Place(name: "New York", lat: 40.7128, lon: -74.006, zoneId: "America/New_York")
        XCTAssertEqual(Engine.panchanga(CivilDate(2026, 7, 1), ny).tzHours, -4)
        XCTAssertEqual(Engine.panchanga(CivilDate(2026, 1, 15), ny).tzHours, -5)
    }

    func testCivilDate() {
        XCTAssertEqual(CivilDate(1970, 1, 1).epochDay, 0)
        XCTAssertEqual(CivilDate(2026, 9, 26).weekday, 6) // Saturday
        XCTAssertEqual(CivilDate(epochDay: CivilDate(2024, 2, 29).epochDay), CivilDate(2024, 2, 29))
    }
}
