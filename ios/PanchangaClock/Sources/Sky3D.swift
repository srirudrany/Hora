// Celestial models for iOS — the Swift half of Shaders.metal (twin of Android's Sky3D.kt).
// Textures: Solar System Scope (CC BY 4.0), see Resources/Textures/ATTRIBUTION.txt.
// Stars: HYG v4.1 (CC BY-SA 4.0), V ≤ 5, Resources/Data/stars.json.
import SwiftUI
import UIKit
import PanchangaCore

/// A 3-vector in view space: x right, y up, z toward the viewer.
struct V3 {
    var x, y, z: Double
    func norm() -> V3 { let l = max(1e-6, (x * x + y * y + z * z).squareRoot()); return V3(x: x / l, y: y / l, z: z / l) }
    func cross(_ o: V3) -> V3 { V3(x: y * o.z - z * o.y, y: z * o.x - x * o.z, z: x * o.y - y * o.x) }
}

/// Body-fixed axes in view space: `z` points at the texture's centre meridian, `y` at the north pole.
struct BodyFrame {
    var x, y, z: V3
    static let facing = BodyFrame(x: V3(x: 1, y: 0, z: 0), y: V3(x: 0, y: 1, z: 0), z: V3(x: 0, y: 0, z: 1))
}

struct Star {
    let ra, dec, mag, bv: Double
    let name: String
    var color: Color {
        switch bv {
        case ..<0.0: Color(hex: 0xB9CCFF); case ..<0.3: Color(hex: 0xDDE6FF); case ..<0.6: Color(hex: 0xFFF6E8)
        case ..<1.0: Color(hex: 0xFFE2B8); case ..<1.4: Color(hex: 0xFFC98E); default: Color(hex: 0xFFAE78)
        }
    }
}

/// Textures and the star catalogue, loaded once off the main thread.
@Observable
final class SkyAssets {
    private(set) var ready = false
    private(set) var stars: [Star] = []
    @ObservationIgnored private var images: [String: Image] = [:]

    func load() {
        Task.detached(priority: .userInitiated) {
            var imgs: [String: Image] = [:]
            for (key, ext) in [("earth_atlas", "jpg"), ("moon", "jpg"), ("sun", "jpg"), ("mercury", "jpg"), ("venus", "jpg"), ("mars", "jpg"),
                               ("jupiter", "jpg"), ("saturn_atlas", "png"), ("milky_way", "jpg")] {
                if let path = Bundle.main.path(forResource: key, ofType: ext, inDirectory: "Textures"), let ui = UIImage(contentsOfFile: path) {
                    imgs[key] = Image(uiImage: ui)
                }
            }
            var stars: [Star] = []
            if let url = Bundle.main.url(forResource: "stars", withExtension: "json", subdirectory: "Data"),
               let data = try? Data(contentsOf: url),
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let arr = json["stars"] as? [[Any]] {
                stars = arr.compactMap { s in
                    guard s.count >= 5, let ra = s[0] as? Double, let dec = s[1] as? Double, let mag = s[2] as? Double else { return nil }
                    return Star(ra: ra, dec: dec, mag: mag, bv: (s[3] as? Double) ?? 0.6, name: (s[4] as? String) ?? "")
                }
            }
            await MainActor.run { self.images = imgs; self.stars = stars; self.ready = true }
        }
    }

    private func textureKey(_ body: String) -> String {
        switch body { case "earth": "earth_atlas"; case "saturn": "saturn_atlas"; default: body }
    }

    /// Draw a textured, lit sphere. Returns false if the texture isn't loaded yet (caller draws a fallback).
    @discardableResult
    func sphere(_ g: GraphicsContext, _ body: String, _ c: CGPoint, _ radius: CGFloat, _ f: BodyFrame, _ light: V3,
                t: Double = 0, alpha: Double = 1, atmo: (Double, Double, Double) = (0, 0, 0), atmoK: Double = 0) -> Bool {
        guard ready, radius >= 0.5, let img = images[textureKey(body)] else { return false }
        let l = light.norm()
        let kind: Double = body == "earth" ? 1 : body == "saturn" ? 2 : body == "sun" ? 3 : 0
        let shader = ShaderLibrary.sphere(
            .image(img),
            .float4(Float(c.x), Float(c.y), Float(radius), Float(alpha)),
            .float3(Float(f.x.x), Float(f.x.y), Float(f.x.z)),
            .float3(Float(f.y.x), Float(f.y.y), Float(f.y.z)),
            .float3(Float(f.z.x), Float(f.z.y), Float(f.z.z)),
            .float3(Float(l.x), Float(l.y), Float(l.z)),
            .float4(Float(kind), Float(t), Float(atmoK), 0),
            .float3(Float(atmo.0), Float(atmo.1), Float(atmo.2)))
        let ext = radius * (body == "sun" ? 3.2 : body == "saturn" ? 2.35 : 1.25)
        g.fill(Path(CGRect(x: c.x - ext, y: c.y - ext, width: 2 * ext, height: 2 * ext)), with: .shader(shader))
        return true
    }

    /// Milky Way glow behind the orbit camera.
    func backdropOrbit(_ g: GraphicsContext, _ size: CGSize, center: CGPoint, focal: Double, az: Double, el: Double, ayan: Double, eps: Double, gain: Double) {
        guard ready, let img = images["milky_way"] else { return }
        let shader = ShaderLibrary.backdrop(.image(img), .float4(Float(center.x), Float(center.y), Float(focal), 0),
                                            .float4(Float(az), Float(el), Float(ayan), Float(eps)), .float2(0, Float(gain)))
        g.fill(Path(CGRect(origin: .zero, size: size)), with: .shader(shader))
    }

    /// Milky Way glow on the real sky for the horizon view.
    func backdropHorizon(_ g: GraphicsContext, _ size: CGSize, center: CGPoint, heading: Double, pitch: Double, ppd: Double, lat: Double, lst: Double, gain: Double) {
        guard ready, let img = images["milky_way"] else { return }
        let shader = ShaderLibrary.backdrop(.image(img), .float4(Float(center.x), Float(center.y), 1, 1),
                                            .float4(Float(heading), Float(pitch), Float(ppd), Float(lat)), .float2(Float(lst), Float(gain)))
        g.fill(Path(CGRect(origin: .zero, size: size)), with: .shader(shader))
    }
}

private struct SkyAssetsKey: EnvironmentKey { static let defaultValue: SkyAssets? = nil }
extension EnvironmentValues {
    var skyAssets: SkyAssets? { get { self[SkyAssetsKey.self] } set { self[SkyAssetsKey.self] = newValue } }
}

/// Equatorial J2000 (deg) → sidereal ecliptic (λ, β) in degrees (precession since J2000 ≈ 0.36° added).
func eqToSidEcl(ra: Double, dec: Double, eps: Double, ayan: Double) -> (Double, Double) {
    let r = ra * .pi / 180, d = dec * .pi / 180, e = eps * .pi / 180
    let lam = atan2(sin(r) * cos(e) + tan(d) * sin(e), cos(r))
    let bet = asin(sin(d) * cos(e) - cos(d) * sin(e) * sin(r))
    return (Engine.norm(lam * 180 / .pi + 0.36 - ayan), bet * 180 / .pi)
}
