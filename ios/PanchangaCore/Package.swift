// swift-tools-version:5.9
// PanchangaCore — Swift port of the Hora engine + generated name tables + muhūrta rules.
// Platform-independent: `swift test` runs the data/test-vectors.json suite on macOS and Linux.
import PackageDescription

let package = Package(
    name: "PanchangaCore",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [.library(name: "PanchangaCore", targets: ["PanchangaCore"])],
    targets: [
        .target(name: "PanchangaCore"),
        .testTarget(name: "PanchangaCoreTests", dependencies: ["PanchangaCore"]),
    ]
)
