import SwiftUI
import ARKit
import SceneKit
import CoreLocation
import Auth
import CoreLocation

// MARK: - WalkARProximityView

/// Fullscreen AR overlay triggered when the user is within ~50m of the current walk stop.
/// The user must aim at the building for 3 continuous seconds to verify it.
/// During the 3-second dwell a silent camera scan fires against ScanAPIService.
struct WalkARProximityView: View {
    @Bindable var vm: WalkViewModel
    @Environment(AppState.self) private var appState
    @Environment(LocationService.self) private var locationService
    @Environment(\.dismiss) private var dismiss

    // Dwell ring progress 0…1
    @State private var dwellProgress: Double = 0
    @State private var dwellTimer: Task<Void, Never>? = nil
    @State private var isAligned = false
    @State private var scanFired = false
    @State private var arSession = ARSession()
    @State private var currentDeviceBearing: Double = 0
    @State private var currentDevicePitch: Double = 0
    @State private var scanImage: UIImage? = nil
    @State private var hapticFired = false

    private let dwellDuration: Double = 3.0
    private let alignmentTolerance: Double = 20.0 // degrees

    var body: some View {
        ZStack {
            // AR camera feed
            ARViewContainer(session: arSession, onFrame: handleFrame)
                .ignoresSafeArea()

            // Dark vignette
            RadialGradient(
                colors: [.clear, .black.opacity(0.55)],
                center: .center,
                startRadius: 80,
                endRadius: 300
            )
            .ignoresSafeArea()
            .allowsHitTesting(false)

            // Reticle overlay
            VStack(spacing: 0) {
                Spacer()

                // Top label
                VStack(spacing: 6) {
                    Text(vm.currentStop?.name ?? "Building")
                        .font(.system(size: 17, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                        .lineLimit(1)
                        .shadow(color: .black.opacity(0.5), radius: 4)

                    if let _ = vm.currentStop, let dist = vm.distanceToCurrentStop {
                        HStack(spacing: 6) {
                            Image(systemName: "location.fill")
                                .font(.caption2)
                            Text(WalkViewModel.formatDistance(dist))
                                .font(.system(size: 13, weight: .semibold, design: .rounded))
                        }
                        .foregroundStyle(isAligned ? Color(red: 0.4, green: 1.0, blue: 0.5) : .white.opacity(0.8))
                        .padding(.horizontal, 14)
                        .padding(.vertical, 6)
                        .background(.ultraThinMaterial, in: Capsule())
                    }
                }
                .padding(.bottom, 24)

                // Bearing reticle
                BearingReticle(
                    bearing: vm.bearingToCurrentStop ?? 0,
                    deviceBearing: currentDeviceBearing,
                    dwellProgress: dwellProgress,
                    isAligned: isAligned,
                    tolerance: alignmentTolerance
                )
                .frame(width: 220, height: 220)

                // Instruction text
                Text(instructionText)
                    .font(.system(size: 14, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.9))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)
                    .padding(.top, 20)
                    .shadow(color: .black.opacity(0.4), radius: 4)
                    .animation(.easeInOut(duration: 0.25), value: isAligned)

                Spacer()
            }

            // Dismiss button — top left
            VStack {
                HStack {
                    Button {
                        dwellTimer?.cancel()
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(.white)
                            .frame(width: 40, height: 40)
                            .background(.ultraThinMaterial, in: Circle())
                    }
                    .padding(.leading, 20)
                    .padding(.top, 60)
                    Spacer()
                }
                Spacer()
            }
        }
        .onAppear { startARSession() }
        .onDisappear { arSession.pause() }
        .onChange(of: isAligned) { _, aligned in
            if aligned { startDwell() } else { cancelDwell() }
        }
    }

    // MARK: - Instruction text

    private var instructionText: String {
        if dwellProgress > 0 {
            return "Hold steady… \(Int((1 - dwellProgress) * dwellDuration) + 1)s"
        }
        let diff = relativeBearing
        if abs(diff) <= alignmentTolerance {
            return "Aim at the building and hold"
        } else if diff > 0 {
            return "Rotate right to find the building"
        } else {
            return "Rotate left to find the building"
        }
    }

    // Relative bearing: positive = target is to the right
    private var relativeBearing: Double {
        guard let target = vm.bearingToCurrentStop else { return 0 }
        var diff = target - currentDeviceBearing
        while diff > 180 { diff -= 360 }
        while diff < -180 { diff += 360 }
        return diff
    }

    // MARK: - AR Session

    private func startARSession() {
        guard ARWorldTrackingConfiguration.isSupported else { return }
        let config = ARWorldTrackingConfiguration()
        config.worldAlignment = .gravityAndHeading
        arSession.run(config, options: [.resetTracking])
    }

    private func handleFrame(frame: ARFrame, image: UIImage) {
        // Extract device bearing from AR camera transform
        let transform = frame.camera.transform
        // Camera -Z is the look direction; project onto horizontal plane for bearing
        let lookX = Double(-transform.columns.2.x)
        let lookZ = Double(-transform.columns.2.z)
        let bearing = (atan2(lookX, -lookZ) * 180 / .pi + 360).truncatingRemainder(dividingBy: 360)

        // Pitch: positive = tilted up (camera looking upward)
        let pitch = Double(frame.camera.eulerAngles.x) * (180 / .pi)

        DispatchQueue.main.async {
            currentDeviceBearing = bearing
            currentDevicePitch = pitch

            var diff = (vm.bearingToCurrentStop ?? 0) - bearing
            while diff > 180 { diff -= 360 }
            while diff < -180 { diff += 360 }

            // Alignment: bearing within tolerance AND not pointing at ground
            let newAligned = abs(diff) <= alignmentTolerance && pitch > -30
            if newAligned != isAligned {
                isAligned = newAligned
            }
            // Capture snapshot for scan
            if newAligned && scanImage == nil {
                scanImage = image
            }
        }
    }

    // MARK: - Dwell logic

    private func startDwell() {
        guard !scanFired else { return }
        dwellTimer?.cancel()
        dwellTimer = Task {
            let steps = 60
            let interval = dwellDuration / Double(steps)
            for i in 1...steps {
                try? await Task.sleep(nanoseconds: UInt64(interval * 1_000_000_000))
                guard !Task.isCancelled else { return }
                await MainActor.run {
                    dwellProgress = Double(i) / Double(steps)
                    // Mid-point haptic
                    if i == steps / 2 && !hapticFired {
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    }
                }
            }
            // Dwell complete
            await MainActor.run {
                hapticFired = true
                UINotificationFeedbackGenerator().notificationOccurred(.success)
                UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
                scanFired = true
            }
            await fireScan()
        }
    }

    private func cancelDwell() {
        dwellTimer?.cancel()
        dwellTimer = nil
        withAnimation(.easeOut(duration: 0.2)) { dwellProgress = 0 }
    }

    // MARK: - Scan

    private func fireScan() async {
        guard let userId = appState.currentUser?.id.uuidString,
              let image = scanImage else {
            // Fallback: complete without scan verification
            await MainActor.run { dismiss() }
            return
        }
        await vm.verifyWithImage(image, userId: userId)
        await MainActor.run { dismiss() }
    }
}

// MARK: - BearingReticle

private struct BearingReticle: View {
    let bearing: Double
    let deviceBearing: Double
    let dwellProgress: Double
    let isAligned: Bool
    let tolerance: Double

    private var diff: Double {
        var d = bearing - deviceBearing
        while d > 180 { d -= 360 }
        while d < -180 { d += 360 }
        return d
    }

    private var color: Color {
        isAligned ? Color(red: 0.4, green: 1.0, blue: 0.5) : .white.opacity(0.7)
    }

    var body: some View {
        ZStack {
            // Outer guide ring
            Circle()
                .stroke(color.opacity(0.2), lineWidth: 1.5)

            // Direction arrow (only when not aligned)
            if !isAligned {
                DirectionArrow(angleDiff: diff)
                    .foregroundStyle(color)
                    .frame(width: 32, height: 32)
                    .offset(y: -70)
                    .rotationEffect(.degrees(clampedArrowAngle))
            }

            // Crosshair
            Crosshair(isAligned: isAligned)

            // Dwell progress arc
            if dwellProgress > 0 {
                Circle()
                    .trim(from: 0, to: dwellProgress)
                    .stroke(color, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .animation(.linear(duration: 0.05), value: dwellProgress)
            }

            // Alignment pulse
            if isAligned {
                Circle()
                    .stroke(color.opacity(0.5), lineWidth: 2)
                    .scaleEffect(isAligned ? 1.1 : 1.0)
                    .animation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true), value: isAligned)
            }
        }
    }

    // Arrow pointing toward target direction, clamped to circle perimeter
    private var clampedArrowAngle: Double { diff }
}

private struct DirectionArrow: View {
    let angleDiff: Double
    var body: some View {
        Image(systemName: "arrowtriangle.up.fill")
            .font(.system(size: 16, weight: .bold))
    }
}

private struct Crosshair: View {
    let isAligned: Bool
    private var color: Color { isAligned ? Color(red: 0.4, green: 1.0, blue: 0.5) : .white.opacity(0.85) }

    var body: some View {
        ZStack {
            // Four tick marks
            ForEach([0.0, 90.0, 180.0, 270.0], id: \.self) { angle in
                Rectangle()
                    .fill(color)
                    .frame(width: 2, height: 14)
                    .offset(y: -48)
                    .rotationEffect(.degrees(angle))
            }
            // Center dot
            Circle()
                .fill(color)
                .frame(width: 8, height: 8)
                .shadow(color: color.opacity(0.8), radius: 4)
        }
    }
}

// MARK: - ARViewContainer

struct ARViewContainer: UIViewRepresentable {
    let session: ARSession
    let onFrame: (ARFrame, UIImage) -> Void

    func makeUIView(context: Context) -> ARSCNView {
        let view = ARSCNView()
        view.session = session
        view.automaticallyUpdatesLighting = false
        view.delegate = context.coordinator
        context.coordinator.onFrame = onFrame
        return view
    }

    func updateUIView(_ uiView: ARSCNView, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator() }

    class Coordinator: NSObject, ARSCNViewDelegate {
        var onFrame: ((ARFrame, UIImage) -> Void)?
        private var lastFrameTime: TimeInterval = 0
        private let frameInterval: TimeInterval = 0.1 // 10fps for frame processing

        func renderer(_ renderer: SCNSceneRenderer, updateAtTime time: TimeInterval) {
            guard time - lastFrameTime >= frameInterval,
                  let sceneView = renderer as? ARSCNView,
                  let frame = sceneView.session.currentFrame else { return }
            lastFrameTime = time
            let image = sceneView.snapshot()
            onFrame?(frame, image)
        }
    }
}
