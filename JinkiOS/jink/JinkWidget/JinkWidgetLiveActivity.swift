import ActivityKit
import WidgetKit
import SwiftUI

// MARK: - Shared types (must match WalkActivityAttributes in main app exactly)

struct WalkActivityAttributes: ActivityAttributes {
    typealias ContentState = WalkActivityState

    let walkId: String
    let totalBuildings: Int
}

struct WalkActivityState: Codable, Hashable {
    let buildingName: String
    let distanceString: String
    let etaString: String
    let bearingToBuilding: Double
    let userHeading: Double
    let verifiedCount: Int
    let walkXP: Int
}

// MARK: - Live Activity Widget

struct JinkWalkLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: WalkActivityAttributes.self) { context in
            // Lock screen / banner
            LockScreenView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading, spacing: 6) {
                        // Direction arrow + label
                        HStack(spacing: 6) {
                            Image(systemName: bearingSymbol(context.state))
                                .font(.system(size: 22, weight: .bold))
                                .foregroundStyle(.cyan)
                            Text(cardinalLabel(context.state))
                                .font(.system(.caption, design: .monospaced, weight: .bold))
                                .foregroundStyle(.cyan)
                        }

                        // Building name
                        Text(context.state.buildingName)
                            .font(.system(.subheadline, design: .monospaced, weight: .bold))
                            .foregroundStyle(.white)
                            .lineLimit(2)
                    }
                    .padding(.leading, 4)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 6) {
                        // Distance
                        Text(context.state.distanceString)
                            .font(.system(.title3, design: .monospaced, weight: .bold))
                            .foregroundStyle(.cyan)

                        // ETA
                        Text(context.state.etaString)
                            .font(.system(.caption, design: .monospaced))
                            .foregroundStyle(.gray)

                        // XP pill
                        Text("+\(context.state.walkXP) XP")
                            .font(.system(.caption2, design: .monospaced, weight: .bold))
                            .foregroundStyle(.black)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(.cyan, in: Capsule())
                    }
                    .padding(.trailing, 4)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(spacing: 6) {
                        // Progress bar — taller
                        GeometryReader { geo in
                            ZStack(alignment: .leading) {
                                Capsule().fill(Color.white.opacity(0.15))
                                Capsule()
                                    .fill(Color.cyan)
                                    .frame(width: geo.size.width * progress(context))
                            }
                        }
                        .frame(height: 6)

                        // Stats row
                        HStack {
                            Label("\(context.state.verifiedCount)/\(context.attributes.totalBuildings)", systemImage: "building.2.fill")
                                .font(.system(.caption2, design: .monospaced, weight: .bold))
                                .foregroundStyle(.white)

                            Spacer()

                            Text("JINK WALK")
                                .font(.system(.caption2, design: .monospaced, weight: .bold))
                                .foregroundStyle(.gray)

                            Spacer()

                            Image(systemName: "figure.walk")
                                .font(.caption2)
                                .foregroundStyle(.cyan)
                        }
                    }
                    .padding(.horizontal, 8)
                    .padding(.bottom, 4)
                }
            } compactLeading: {
                HStack(spacing: 4) {
                    Image(systemName: bearingSymbol(context.state))
                        .font(.caption.bold())
                        .foregroundStyle(.cyan)
                    Text(context.state.buildingName)
                        .font(.caption.bold())
                        .foregroundStyle(.white)
                        .lineLimit(1)
                }
            } compactTrailing: {
                Text(context.state.distanceString)
                    .font(.caption2.bold())
                    .foregroundStyle(.cyan)
                    .monospacedDigit()
            } minimal: {
                Image(systemName: "figure.walk")
                    .foregroundStyle(.cyan)
            }
            .keylineTint(.cyan)
        }
    }

    private func cardinalLabel(_ state: WalkActivityState) -> String {
        var rel = state.bearingToBuilding - state.userHeading
        while rel < 0 { rel += 360 }
        while rel >= 360 { rel -= 360 }
        switch rel {
        case 337.5...360, 0..<22.5: return "AHEAD"
        case 22.5..<67.5:           return "NE"
        case 67.5..<112.5:          return "RIGHT"
        case 112.5..<157.5:         return "SE"
        case 157.5..<202.5:         return "BEHIND"
        case 202.5..<247.5:         return "SW"
        case 247.5..<292.5:         return "LEFT"
        case 292.5..<337.5:         return "NW"
        default:                    return "AHEAD"
        }
    }

    private func bearingSymbol(_ state: WalkActivityState) -> String {
        var rel = state.bearingToBuilding - state.userHeading
        while rel < 0 { rel += 360 }
        while rel >= 360 { rel -= 360 }
        switch rel {
        case 337.5...360, 0..<22.5: return "arrow.up"
        case 22.5..<67.5:           return "arrow.up.right"
        case 67.5..<112.5:          return "arrow.right"
        case 112.5..<157.5:         return "arrow.down.right"
        case 157.5..<202.5:         return "arrow.down"
        case 202.5..<247.5:         return "arrow.down.left"
        case 247.5..<292.5:         return "arrow.left"
        case 292.5..<337.5:         return "arrow.up.left"
        default:                    return "arrow.up"
        }
    }

    private func progress(_ context: ActivityViewContext<WalkActivityAttributes>) -> Double {
        let total = context.attributes.totalBuildings
        guard total > 0 else { return 0 }
        return min(1.0, Double(context.state.verifiedCount) / Double(total))
    }
}

// MARK: - Lock Screen Banner

private struct LockScreenView: View {
    let context: ActivityViewContext<WalkActivityAttributes>

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "figure.walk")
                .font(.title2)
                .foregroundStyle(.cyan)

            VStack(alignment: .leading, spacing: 4) {
                Text(context.state.buildingName)
                    .font(.system(.subheadline, design: .monospaced, weight: .bold))
                    .foregroundStyle(.white)
                    .lineLimit(1)

                HStack(spacing: 8) {
                    Text(context.state.distanceString)
                        .font(.caption.bold())
                        .foregroundStyle(.cyan)
                    Text("·")
                        .foregroundStyle(.gray)
                    Text(context.state.etaString)
                        .font(.caption)
                        .foregroundStyle(.gray)
                }
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                Text("+\(context.state.walkXP) XP")
                    .font(.caption.bold())
                    .foregroundStyle(.cyan)
                Text("\(context.state.verifiedCount)/\(context.attributes.totalBuildings)")
                    .font(.caption2)
                    .foregroundStyle(.gray)
            }
        }
        .padding(16)
        .background(Color.black.opacity(0.85))
        .activityBackgroundTint(Color.black)
        .activitySystemActionForegroundColor(.cyan)
    }
}
