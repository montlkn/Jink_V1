import SwiftUI

/// A shape that draws a rectangle with semicircular perforations along all 4 edges,
/// matching the classic postage stamp look.
struct PerforatedStampShape: Shape {
    var perforationRadius: CGFloat = 4.5
    var inset: CGFloat = 5

    func path(in rect: CGRect) -> Path {
        var path = Path()

        let r = perforationRadius
        let spacing: CGFloat = r * 2.8

        // Calculate perforation centers for each edge
        func perforations(length: CGFloat) -> [CGFloat] {
            let count = max(1, Int((length - r * 2) / spacing))
            let totalWidth = CGFloat(count - 1) * spacing
            let start = (length - totalWidth) / 2
            return (0..<count).map { start + CGFloat($0) * spacing }
        }

        let topPerfs = perforations(length: rect.width)
        let bottomPerfs = topPerfs
        let leftPerfs = perforations(length: rect.height)
        let rightPerfs = leftPerfs

        // Start at top-left corner, going clockwise
        path.move(to: CGPoint(x: rect.minX + r, y: rect.minY))

        // Top edge — left to right
        for x in topPerfs {
            path.addLine(to: CGPoint(x: rect.minX + x - r, y: rect.minY))
            path.addArc(
                center: CGPoint(x: rect.minX + x, y: rect.minY),
                radius: r,
                startAngle: .degrees(180),
                endAngle: .degrees(0),
                clockwise: true   // inward arc (clockwise in SwiftUI coords)
            )
        }
        path.addLine(to: CGPoint(x: rect.maxX - r, y: rect.minY))

        // Top-right corner
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.minY + r))

        // Right edge — top to bottom
        for y in rightPerfs {
            path.addLine(to: CGPoint(x: rect.maxX, y: rect.minY + y - r))
            path.addArc(
                center: CGPoint(x: rect.maxX, y: rect.minY + y),
                radius: r,
                startAngle: .degrees(270),
                endAngle: .degrees(90),
                clockwise: true
            )
        }
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY - r))

        // Bottom-right corner
        path.addLine(to: CGPoint(x: rect.maxX - r, y: rect.maxY))

        // Bottom edge — right to left
        for x in bottomPerfs.reversed() {
            path.addLine(to: CGPoint(x: rect.minX + x + r, y: rect.maxY))
            path.addArc(
                center: CGPoint(x: rect.minX + x, y: rect.maxY),
                radius: r,
                startAngle: .degrees(0),
                endAngle: .degrees(180),
                clockwise: true
            )
        }
        path.addLine(to: CGPoint(x: rect.minX + r, y: rect.maxY))

        // Bottom-left corner
        path.addLine(to: CGPoint(x: rect.minX, y: rect.maxY - r))

        // Left edge — bottom to top
        for y in leftPerfs.reversed() {
            path.addLine(to: CGPoint(x: rect.minX, y: rect.minY + y + r))
            path.addArc(
                center: CGPoint(x: rect.minX, y: rect.minY + y),
                radius: r,
                startAngle: .degrees(90),
                endAngle: .degrees(270),
                clockwise: true
            )
        }
        path.addLine(to: CGPoint(x: rect.minX, y: rect.minY + r))

        // Back to start
        path.addLine(to: CGPoint(x: rect.minX + r, y: rect.minY))
        path.closeSubpath()

        return path
    }
}
