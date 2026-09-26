// Special days and the muhūrta finder, driven by data/rules.json (via Tables).
// Always presented as guidance (Tables.disclaimer), never prescription. Mirrors Muhurta.kt.
import Foundation

public struct SpecialDay: Equatable, Sendable {
    public enum Kind: Sendable { case purnima, amavasya, ekadashi, shashthi, pradosham, sankatahara, karttikai, festival }
    public let name: String
    public let kind: Kind
}

public enum Specials {
    /// Special observances for a day, judged by the limbs in force at sunrise (Tamil convention).
    public static func of(_ day: DayPanchanga) -> [SpecialDay] {
        let t = day.tithi[0].idx, n = day.nakshatra[0].idx
        var o: [SpecialDay] = Tables.festivals.filter { $0.tamilMonth == day.tamilMonth && $0.nakshatra == n }.map { SpecialDay(name: $0.name, kind: .festival) }
        if t == 14 { o.append(SpecialDay(name: "Pūrṇimā", kind: .purnima)) }
        if t == 29 { o.append(SpecialDay(name: "Amāvāsyā", kind: .amavasya)) }
        if t == 10 || t == 25 { o.append(SpecialDay(name: "Ekādaśī", kind: .ekadashi)) }
        if t == 5 || t == 20 { o.append(SpecialDay(name: "Ṣaṣṭhī", kind: .shashthi)) }
        if t == 12 || t == 27 { o.append(SpecialDay(name: "Pradoṣam", kind: .pradosham)) }
        if t == 18 { o.append(SpecialDay(name: "Saṅkaṭahara Caturthī", kind: .sankatahara)) }
        if n == 2 { o.append(SpecialDay(name: "Kārttikai", kind: .karttikai)) }
        return o
    }
}

public enum Activity: CaseIterable, Sendable {
    case wedding, grihapravesha, travel, study, business
    public var label: String { switch self { case .wedding: "Vivāha"; case .grihapravesha: "Gṛhapraveśa"; case .travel: "Yātrā"; case .study: "Vidyārambha"; case .business: "Vyāpāra" } }
    public var gloss: String { switch self { case .wedding: "Wedding"; case .grihapravesha: "House-warming"; case .travel: "Travel"; case .study: "Starting study"; case .business: "Starting a business" } }
    var goodNatures: Set<String> {
        switch self {
        case .wedding: []
        case .grihapravesha: ["dhruva", "mrdu"]
        case .travel: ["cara", "ksipra", "mrdu"]
        case .study: ["ksipra", "mrdu", "cara"]
        case .business: ["ksipra", "cara", "dhruva"]
        }
    }
}

/// One reason for or against a day. `ok` = favourable, otherwise an exclusion.
public struct Reason: Sendable { public let ok: Bool; public let text: String }

public struct DayVerdict: Sendable { public let day: DayPanchanga; public let score: Int; public let excluded: Bool; public let reasons: [Reason] }

public enum MuhurtaFinder {
    public static func judge(_ day: DayPanchanga, _ activity: Activity) -> DayVerdict {
        var r: [Reason] = []
        var ex = false, score = 50
        let t = day.tithi[0].idx, tNum = t % 15 + 1
        let n = day.nakshatra[0].idx
        let y = day.yoga[0].idx + 1, k = day.karana[0].idx + 1
        let nak = Tables.nakshatra[n]
        if [4, 9, 14].contains(tNum) { ex = true; r.append(Reason(ok: false, text: "\(Limbs.tithiLabel(t)) is a Riktā (\"empty\") tithi — avoided for beginnings")) }
        else if t == 29 { ex = true; r.append(Reason(ok: false, text: "Amāvāsyā — avoided for beginnings")) }
        else { score += t < 15 ? 10 : 4; r.append(Reason(ok: true, text: "\(Limbs.tithiLabel(t)) (\(Tables.tithi[t].family)) at sunrise")) }
        if y == 17 || y == 27 { ex = true; r.append(Reason(ok: false, text: "\(Limbs.yogaLabel(y - 1)) yoga — avoided for beginnings")) }
        else if Limbs.isShubhaYoga(y) { score += 6; r.append(Reason(ok: true, text: "\(Limbs.yogaLabel(y - 1)) yoga is śubha")) }
        else { score -= 6; r.append(Reason(ok: false, text: "\(Limbs.yogaLabel(y - 1)) yoga is aśubha")) }
        if Limbs.karanaName(k) == "Viṣṭi" { score -= 12; r.append(Reason(ok: false, text: "Viṣṭi (Bhadrā) karaṇa at sunrise — wait until it ends")) }
        if activity == .wedding {
            if Tables.weddingNakshatras.contains(n) { score += 20; r.append(Reason(ok: true, text: "\(nak.iast) is a favoured wedding star")) }
            else { ex = true; r.append(Reason(ok: false, text: "\(nak.iast) is not among the wedding stars")) }
            if Tables.weddingAvoidMonths.contains(day.tamilMonth) { ex = true; r.append(Reason(ok: false, text: "\(Tables.rasi[day.tamilMonth].tamilMonth) is commonly avoided for weddings")) }
        } else {
            let info = Tables.natures[nak.nature]
            if activity.goodNatures.contains(nak.nature) { score += 18; r.append(Reason(ok: true, text: "\(nak.iast) is \(info?.meaning ?? "") — suited to \(info?.uses ?? "")")) }
            else if nak.nature == "ugra" || nak.nature == "tiksna" { ex = true; r.append(Reason(ok: false, text: "\(nak.iast) is \(info?.meaning ?? "") — avoided for gentle work")) }
            else { r.append(Reason(ok: true, text: "\(nak.iast) is \(info?.meaning ?? "") (\(info?.uses ?? ""))")) }
        }
        r.append(Reason(ok: true, text: "Avoid Rāhu kālam and Yamagaṇḍam within the day"))
        return DayVerdict(day: day, score: ex ? 0 : max(0, min(100, score)), excluded: ex, reasons: r)
    }
}
