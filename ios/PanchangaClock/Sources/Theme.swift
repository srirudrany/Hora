// "Pañcāṅga" design system — design/tokens.json
import SwiftUI

extension Color {
    init(hex: UInt32, alpha: Double = 1) {
        self.init(.sRGB, red: Double((hex >> 16) & 0xFF) / 255, green: Double((hex >> 8) & 0xFF) / 255, blue: Double(hex & 0xFF) / 255, opacity: alpha)
    }
}

enum C {
    static let ink = Color(hex: 0x0A0D1C), ink2 = Color(hex: 0x10152B), ink3 = Color(hex: 0x161D3A), stage = Color(hex: 0x04060D)
    static let lapis = Color(hex: 0x16204A), lapis2 = Color(hex: 0x24336B), cellA = Color(hex: 0x1A234C), cellB = Color(hex: 0x101634)
    static let gold = Color(hex: 0xE3AE4A), goldSoft = Color(hex: 0xF3D491), star = Color(hex: 0xEFE8D8), muted = Color(hex: 0x8A91B0), moon = Color(hex: 0xCBD5DE)
    static let kumkum = Color(hex: 0xD9483E), plum = Color(hex: 0x8F6BB8), copper = Color(hex: 0xC07A43), teal = Color(hex: 0x63B8B2), brass = Color(hex: 0xC8924A)
    static let line = Color(hex: 0xE3AE4A, alpha: 0.26), line2 = Color(hex: 0x8A91B0, alpha: 0.22), panel = Color(hex: 0x080B18, alpha: 0.86)
    static let dayArc = Color(hex: 0x6B4D14), nightArc = Color(hex: 0x0F1A4D), sukla = Color(hex: 0x4E5E92), krsna = Color(hex: 0x141A3A)
    static let purnima = Color(hex: 0xDCCFAE), amavasya = Color(hex: 0x020308), moonDark = Color(hex: 0x1B2238)
    static let graha: [String: Color] = [
        "Śani": Color(hex: 0x6F7FB0), "Guru": Color(hex: 0xE0B040), "Maṅgala": Color(hex: 0xD0473A), "Sūrya": Color(hex: 0xFFD27A),
        "Śukra": Color(hex: 0xF4EFE6), "Budha": Color(hex: 0x57A872), "Candra": Color(hex: 0xCBD5DE),
    ]
}

/// Bundled fonts (Resources/Fonts, registered via UIAppFonts).
enum F {
    static func skt(_ size: CGFloat, italic: Bool = false) -> Font { .custom(italic ? "TiroDevaSanskrit-Italic" : "TiroDevaSanskrit-Regular", size: size) }
    static func tamil(_ size: CGFloat) -> Font { .custom("TiroTamil-Regular", size: size) }
    static func mono(_ size: CGFloat, weight: Font.Weight = .medium) -> Font {
        let name = weight == .semibold ? "IBMPlexMono-SemiBold" : weight == .regular ? "IBMPlexMono-Regular" : "IBMPlexMono-Medium"
        return Font.custom(name, size: size).monospacedDigit()
    }
    static func body(_ size: CGFloat = 14, weight: Font.Weight = .regular) -> Font { .custom("NotoSans-Regular", size: size).weight(weight) }
    static func caps(_ size: CGFloat = 11) -> Font { .custom("NotoSans-Regular", size: size).weight(.semibold) }
}

extension Text {
    /// Caps labels: 11–13px, letter-spacing .12em, muted
    func capsStyle(_ size: CGFloat = 11, _ color: Color = C.muted) -> some View {
        self.font(F.caps(size)).kerning(size * 0.12).textCase(.uppercase).foregroundStyle(color)
    }
}
