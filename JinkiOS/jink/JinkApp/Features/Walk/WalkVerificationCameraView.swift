import SwiftUI
import UIKit
import Auth

struct WalkVerificationCameraView: View {
    @Bindable var vm: WalkViewModel
    @Environment(\.dismiss) private var dismiss
    @Environment(AppState.self) private var appState

    @State private var capturedImage: UIImage? = nil
    private let captureNotification = Notification.Name("capturePhotoWalkVerification")

    var body: some View {
        ZStack {
            // Camera preview
            CameraPreviewView(captureNotificationName: captureNotification, onCapture: handleCapture)
                .ignoresSafeArea()
            
            cameraGuide

            // UI overlay
            VStack {
                HStack {
                    Button(action: { dismiss() }) {
                        Image(systemName: "xmark")
                            .font(.title2)
                            .foregroundStyle(.white)
                            .padding()
                            .background(.ultraThinMaterial, in: Circle())
                    }
                    .padding()
                    Spacer()
                }
                Spacer()

                // Scan button
                Button(action: triggerScan) {
                    ZStack {
                        Circle()
                            .fill(.white)
                            .frame(width: 72, height: 72)
                        if vm.isVerifying {
                            ProgressView()
                                .tint(AppColors.accent)
                        } else {
                            Image(systemName: "camera.viewfinder")
                                .font(.system(size: 28, weight: .semibold))
                                .foregroundStyle(AppColors.accent)
                        }
                    }
                }
                .disabled(vm.isVerifying)
                .padding(.bottom, 40)
            }

            if vm.isVerifying {
                loadingOverlay
            }
        }
        .onChange(of: vm.showInsights) { _, show in
            if show {
                dismiss() // Close camera when verified and insights are ready to show on parent
            }
        }
    }
    
    private var cameraGuide: some View {
        ZStack {
            // Brackets
            VStack {
                HStack {
                    bracket(angle: 0)
                    Spacer()
                    bracket(angle: 90)
                }
                Spacer()
                HStack {
                    bracket(angle: 270)
                    Spacer()
                    bracket(angle: 180)
                }
            }
            .padding(40)
            
            // Crosshair
            Circle()
                .fill(AppColors.accent.opacity(0.8))
                .frame(width: 4, height: 4)
            
            // Caption
            VStack {
                Spacer()
                Text("POINT AT THE DESTINATION")
                    .font(.caption.monospaced())
                    .foregroundStyle(.white)
                    .padding(.bottom, 140)
            }
        }
    }
    
    private func bracket(angle: Double) -> some View {
        Path { path in
            path.move(to: CGPoint(x: 0, y: 20))
            path.addLine(to: CGPoint(x: 0, y: 0))
            path.addLine(to: CGPoint(x: 20, y: 0))
        }
        .stroke(AppColors.accent, lineWidth: 2)
        .frame(width: 20, height: 20)
        .rotationEffect(.degrees(angle))
    }

    private var loadingOverlay: some View {
        ZStack {
            Rectangle()
                .fill(.ultraThinMaterial)
                .ignoresSafeArea()
            
            VStack(spacing: 20) {
                ProgressView()
                    .scaleEffect(1.5)
                    .tint(AppColors.accent)
                
                Text(vm.verificationLoadingMessage)
                    .font(.headline.monospaced())
                    .foregroundStyle(.primary)
            }
        }
    }

    private func triggerScan() {
        NotificationCenter.default.post(name: captureNotification, object: nil)
    }

    private func handleCapture(_ image: UIImage) {
        capturedImage = image
        guard let userId = appState.currentUser?.id.uuidString else { return }
        Task {
            await vm.verifyWithImage(image, userId: userId)
        }
    }
}
