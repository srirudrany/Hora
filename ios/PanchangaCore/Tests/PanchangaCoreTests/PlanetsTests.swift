import XCTest
@testable import PanchangaCore

/// Geocentric apparent ecliptic-of-date longitudes from JPL Horizons (QUANTITIES=31), 00:00 UT.
final class PlanetsTests: XCTestCase {
    func testMatchesHorizons() {
        let horizons: [(Double, [String: Double])] = [
            (2461309.5, ["mercury": 203.8110085, "venus": 217.5037571, "mars": 118.7499863, "jupiter": 138.6791011, "saturn": 11.9674089]),
            (2447892.5, ["mars": 249.6482639, "jupiter": 95.2160871]),
        ]
        for (jd, planets) in horizons {
            for (key, lon) in planets {
                var d = Planets.geocentric(key, jd).lon - lon
                if d > 180 { d -= 360 }; if d < -180 { d += 360 }
                XCTAssertLessThan(abs(d), 0.1, "\(key) @ \(jd)")
            }
        }
    }
    func testNodes() {
        let all = Planets.all(2461309.5)
        XCTAssertEqual(all.count, 7)
        XCTAssertEqual(Engine.norm(all[6].sidLon - all[5].sidLon), 180, accuracy: 1e-9)
        XCTAssertEqual(Tables.grahas.count, 10)
        XCTAssertEqual(Tables.rings.count, 7)
    }
}
