import SwiftUI
import CoreLocation
import Auth

struct NotFoundView: View {
    let photo: UIImage?
    let location: CLLocation?
    let buildingBin: String

    @Environment(\.dismiss) private var dismiss
    @Environment(AppState.self) private var appState
    @State private var vm = NotFoundViewModel()

    var body: some View {
        ZStack {
            switch vm.step {
            case .initial:
                initialScreen
            case .capturing(let index):
                capturingScreen(index: index)
            case .submitting:
                submittingScreen
            case .done:
                doneScreen
            }
        }
        .navigationBarHidden(true)
        .toolbar(.hidden, for: .navigationBar)
    }

    private var initialScreen: some View {
        VStack(spacing: 24) {
            Text("BUILDING NOT FOUND")
                .font(.title2.bold().monospaced())
                .foregroundStyle(AppColors.error)
            
            VStack(alignment: .leading, spacing: 12) {
                Text("Tips for a successful scan:")
                    .font(.headline)
                
                Label("Capture the full facade", systemImage: "building.2.crop.circle")
                Label("Avoid extreme angles", systemImage: "angle")
                Label("Ensure good lighting", systemImage: "sun.max")
            }
            .padding()
            .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12))
            
            Spacer()
            
            Button("RETRY SCAN") {
                dismiss()
            }
            .buttonStyle(.borderedProminent)
            .tint(AppColors.accent)
            
            Button("CONTRIBUTE DATA →") {
                vm.step = .capturing(0)
            }
            .buttonStyle(.bordered)
            .tint(.primary)
        }
        .padding(40)
    }

    private func capturingScreen(index: Int) -> some View {
        ZStack {
            CameraPreviewView { image in
                vm.captureAngle(image, angle: vm.currentAngle)
            }
            .ignoresSafeArea()

            VStack {
                // Header
                HStack {
                    Text("CAPTURE \(vm.currentAngle)")
                        .font(.headline.monospaced())
                        .foregroundStyle(.white)
                        .padding(8)
                        .background(.ultraThinMaterial, in: Capsule())
                    Spacer()
                    Button("Skip") {
                        vm.skipAngle()
                    }
                    .foregroundStyle(.white)
                    .padding(8)
                    .background(.ultraThinMaterial, in: Capsule())
                }
                .padding()

                // Dots
                HStack {
                    ForEach(0..<4, id: \.self) { i in
                        Circle()
                            .fill(i == index ? AppColors.accent : .gray)
                            .frame(width: 8, height: 8)
                    }
                }

                Text("+\(vm.xpPreview) XP earned")
                    .font(.caption)
                    .foregroundStyle(.white)
                    .padding(.top, 4)

                Spacer()

                Button(action: {
                    NotificationCenter.default.post(name: .capturePhoto, object: nil)
                }) {
                    ZStack {
                        Circle()
                            .fill(.white)
                            .frame(width: 72, height: 72)
                        Image(systemName: "camera.viewfinder")
                            .font(.system(size: 28, weight: .semibold))
                            .foregroundStyle(AppColors.accent)
                    }
                }
                .padding(.bottom, 40)
            }
        }
    }

    private var submittingScreen: some View {
        VStack {
            ProgressView()
                .tint(AppColors.accent)
            Text("Submitting contribution...")
                .font(.headline)
                .padding(.top)
        }
        .onAppear {
            guard let userId = appState.currentUser?.id.uuidString,
                  let loc = location else { return }
            Task {
                await vm.submit(userId: userId, lat: loc.coordinate.latitude, lng: loc.coordinate.longitude, bin: buildingBin)
            }
        }
    }

    private var doneScreen: some View {
        VStack(spacing: 16) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 64))
                .foregroundStyle(AppColors.success)
            
            Text("Contribution Saved!")
                .font(.title2.bold())
            
            Text("+\(vm.xpEarned) XP")
                .font(.headline)
                .foregroundStyle(AppColors.accent)
            
            Button("Done") {
                dismiss()
            }
            .buttonStyle(.borderedProminent)
            .padding(.top, 24)
        }
    }
}
