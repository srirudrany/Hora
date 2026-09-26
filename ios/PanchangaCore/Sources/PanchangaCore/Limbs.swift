// Index formulas (CLAUDE.md / SPEC §2) — 1-based, half-open intervals, clamped.
import Foundation

public enum Limbs {
    public static let nakSpan = 40.0 / 3.0
    public static let padaSpan = 10.0 / 3.0

    public static func elongation(sun: Double, moon: Double) -> Double { Engine.norm(moon - sun) }
    public static func tithiIndex(_ e: Double) -> Int { min(Int(floor(Engine.norm(e) / 12)) + 1, 30) }
    public static func nakshatraIndex(_ moon: Double) -> Int { min(Int(floor(Engine.norm(moon) / nakSpan)) + 1, 27) }
    public static func pada(_ moon: Double) -> Int { min(Int(floor(Engine.norm(moon).truncatingRemainder(dividingBy: nakSpan) / padaSpan)) + 1, 4) }
    public static func yogaIndex(sun: Double, moon: Double) -> Int { min(Int(floor(Engine.norm(sun + moon) / nakSpan)) + 1, 27) }
    public static func karanaIndex(_ e: Double) -> Int { min(Int(floor(Engine.norm(e) / 6)) + 1, 60) }
    public static func rasiIndex(_ lon: Double) -> Int { min(Int(floor(Engine.norm(lon) / 30)) + 1, 12) }

    /// Karana name by 1-based k: 1 Kiṃstughna, 2..57 movable cycle at (k−2) mod 7, 58–60 fixed.
    public static func karanaName(_ k: Int) -> String {
        if k == 1 { return "Kiṃstughna" }
        if k >= 58 { return ["Śakuni", "Catuṣpāda", "Nāga"][k - 58] }
        return ["Bava", "Bālava", "Kaulava", "Taitila", "Gara", "Vaṇij", "Viṣṭi"][(k - 2) % 7]
    }

    /// Tithi category by ((t − 1) mod 5).
    public static func tithiCategory(_ t: Int) -> String { ["Nanda", "Bhadra", "Jaya", "Rikta", "Purna"][(t - 1) % 5] }
    public static func isShubhaYoga(_ y: Int) -> Bool { !Tables.ashubhaYogas.contains(y) }

    /// "Śukla Pūrṇimā" for a 0-based tithi index.
    public static func tithiLabel(_ idx0: Int) -> String { let t = Tables.tithi[idx0]; return "\(t.paksha) \(t.iast)" }
    public static func nakshatraLabel(_ idx0: Int) -> String { Tables.nakshatra[idx0].iast }
    public static func yogaLabel(_ idx0: Int) -> String { Tables.yoga[idx0].iast }
    public static func karanaLabel(_ idx0: Int) -> String { karanaName(idx0 + 1) }

    /// Illuminated fraction of the Moon's disc for elongation e (degrees).
    public static func illumination(_ e: Double) -> Double { (1 - cos(e * .pi / 180)) / 2 }
}

/// Nāḻigai arithmetic: 1 day (sunrise→sunrise) = 60 nāḻigai; 1 nāḻigai = 24 min = 60 vināḻigai.
public enum Nazhigai {
    /// Whole vināḻigai elapsed from sunrise to `jd`.
    public static func vinazhigai(_ jd: Double, sunrise: Double) -> Int { Int(floor((jd - sunrise) * 86400 / 24)) }
    public static func format(_ jd: Double, sunrise: Double) -> String {
        let v = Int(((jd - sunrise) * 86400 / 24).rounded())
        return String(format: "%02d:%02d", v / 60, v % 60)
    }
}

