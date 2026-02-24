// swift-tools-version: 5.9
// This Package.swift is NOT the app target — it documents the SPM dependencies
// to add in Xcode via File > Add Package Dependencies.
//
// Dependencies to add:
//   • https://github.com/supabase/supabase-swift  — Up to Next Major 2.0.0
//   • https://github.com/mapbox/mapbox-maps-ios   — Up to Next Major 11.0.0

import PackageDescription

let package = Package(
    name: "JinkApp",
    platforms: [.iOS(.v17)],
    dependencies: [
        .package(url: "https://github.com/supabase/supabase-swift", from: "2.0.0"),
        .package(url: "https://github.com/mapbox/mapbox-maps-ios", from: "11.0.0"),
    ],
    targets: [
        .target(
            name: "JinkApp",
            dependencies: [
                .product(name: "Supabase", package: "supabase-swift"),
                .product(name: "MapboxMaps", package: "mapbox-maps-ios"),
            ]
        ),
    ]
)
