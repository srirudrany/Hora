import XCTest
@testable import PanchangaCore

/// docs/test-vectors.md §2 — index-formula unit vectors (1-based).
final class FormulaTests: XCTestCase {
    func testTithi() {
        XCTAssertEqual(Limbs.tithiIndex(90.5), 8)
        XCTAssertEqual(Limbs.tithiIndex(179.999), 15); XCTAssertEqual(Tables.tithi[14].iast, "Pūrṇimā")
        XCTAssertEqual(Limbs.tithiIndex(180), 16); XCTAssertEqual(Limbs.tithiLabel(15), "Kṛṣṇa Pratipadā")
        XCTAssertEqual(Limbs.tithiIndex(359.999), 30); XCTAssertEqual(Tables.tithi[29].iast, "Amāvāsyā")
        XCTAssertEqual(Limbs.tithiIndex(0), 1)
    }
    func testKarana() {
        XCTAssertEqual(Limbs.karanaIndex(90.5), 16); XCTAssertEqual(Limbs.karanaName(16), "Bava")
        XCTAssertEqual(Limbs.karanaIndex(271), 46); XCTAssertEqual(Limbs.karanaName(46), "Kaulava")
        XCTAssertEqual(Limbs.karanaIndex(42), 8); XCTAssertEqual(Limbs.karanaName(8), "Viṣṭi")
        XCTAssertEqual(Limbs.karanaIndex(0.5), 1); XCTAssertEqual(Limbs.karanaName(1), "Kiṃstughna")
        XCTAssertEqual(Limbs.karanaIndex(342), 58); XCTAssertEqual(Limbs.karanaName(58), "Śakuni")
        XCTAssertEqual(Limbs.karanaIndex(179.999), 30)
        for k in 1...60 { XCTAssertEqual(Limbs.karanaName(k), Tables.karanaOfSlot(k - 1).iast, "slot \(k)") }
    }
    func testNakshatra() {
        XCTAssertEqual(Limbs.nakshatraIndex(0), 1); XCTAssertEqual(Limbs.pada(0), 1)
        XCTAssertEqual(Limbs.nakshatraIndex(13.2), 1); XCTAssertEqual(Limbs.pada(13.2), 4)
        XCTAssertEqual(Limbs.nakshatraIndex(13.34), 2); XCTAssertEqual(Limbs.pada(13.34), 1)
        XCTAssertEqual(Limbs.nakshatraIndex(228.4144), 18)
    }
    /// V-YOGA-01: the guide's §5.2 erratum — 110° + 45° = 155° is Dhruva (12), not Ganda.
    func testYoga() {
        XCTAssertEqual(Limbs.yogaIndex(sun: 110, moon: 45), 12); XCTAssertEqual(Tables.yoga[11].iast, "Dhruva")
        XCTAssertTrue(Limbs.isShubhaYoga(12))
        XCTAssertEqual(Limbs.yogaIndex(sun: 130, moon: 0), 10)
        XCTAssertEqual(Limbs.yogaIndex(sun: 133.34, moon: 0), 11)
        XCTAssertEqual(Limbs.yogaIndex(sun: 146.67, moon: 0), 12)
        XCTAssertEqual(Set((1...27).filter { !Limbs.isShubhaYoga($0) }), [1, 6, 9, 10, 13, 15, 17, 19, 27])
    }
    func testPresets() {
        XCTAssertEqual([359.999, 90, 179.999, 270].map(Limbs.tithiIndex), [30, 8, 15, 23])
        XCTAssertEqual([359.999, 90, 179.999, 270].map(Limbs.karanaIndex), [60, 16, 30, 46])
        XCTAssertEqual((1...5).map(Limbs.tithiCategory), ["Nanda", "Bhadra", "Jaya", "Rikta", "Purna"])
    }
}
