import Auth
import SwiftUI
import AVFoundation
import UIKit
import CoreLocation

struct ScanView: View {
    @Environment(AppState.self) private var appState
    @Environment(LocationService.self) private var locationService
    @State private var vm: ScanViewModel
    @State private var capturedImage: UIImage? = nil

    init() {
        // vm initialized in onAppear after environment is set
        _vm = State(initialValue: ScanViewModel(locationService: LocationService()))
    }

    var body: some View {
        NavigationStack {
            ZStack {
                // Camera preview
                CameraPreviewView(onCapture: handleCapture)
                    .ignoresSafeArea()
                
                cameraGuide

                // UI overlay
                VStack {
                    Spacer()

                    // GPS status
                    if locationService.location == nil {
                        Label("Acquiring GPS…", systemImage: "location.slash")
                            .font(.caption)
                            .foregroundStyle(.white)
                            .padding(8)
                            .background(.ultraThinMaterial, in: Capsule())
                    }

                    // Scan button
                    Button(action: triggerScan) {
                        ZStack {
                            Circle()
                                .fill(.white)
                                .frame(width: 72, height: 72)
                            if vm.isScanning {
                                ProgressView()
                                    .tint(AppColors.accent)
                            } else {
                                Image(systemName: "camera.viewfinder")
                                    .font(.system(size: 28, weight: .semibold))
                                    .foregroundStyle(AppColors.accent)
                            }
                        }
                    }
                    .disabled(vm.isScanning || locationService.location == nil)
                    .padding(.bottom, 40)
                }

                if vm.isScanning {
                    loadingOverlay
                }

                // Error toast
                if let err = vm.errorMessage, !vm.isScanning {
                    VStack {
                        Text(err)
                            .font(.caption)
                            .foregroundStyle(.white)
                            .padding(10)
                            .background(.red.opacity(0.85), in: Capsule())
                            .padding(.top, 60)
                        Spacer()
                    }
                }
            }
            .navigationDestination(isPresented: $vm.showResult) {
                if let building = vm.scanResult?.building {
                    BuildingInfoView(
                        bin: building.bin ?? "",
                        name: building.name ?? "Unknown Building",
                        address: building.address ?? "",
                        latitude: building.latitude,
                        longitude: building.longitude,
                        fromScan: true
                    )
                }
            }
            .navigationDestination(isPresented: $vm.notFound) {
                NotFoundView(
                    photo: vm.scanPhoto,
                    location: locationService.location,
                    buildingBin: vm.scanResult?.building?.bin ?? ""
                )
            }
            .onAppear {
                vm = ScanViewModel(locationService: locationService)
                Task {
                    if let loc = locationService.location {
                        await GPSGridCacheService.shared.initialize(lat: loc.coordinate.latitude, lng: loc.coordinate.longitude)
                    }
                }
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
                Text("POINT AT BUILDING FACADE")
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
                
                Text(vm.loadingMessage)
                    .font(.headline.monospaced())
                    .foregroundStyle(.primary)
                    .animation(.easeInOut, value: vm.loadingMessage)
                
                if vm.showRetryButton {
                    Button("Retry") {
                        vm.isScanning = false // Cancels current wait logically for user
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(AppColors.accent)
                    .padding(.top)
                }
            }
        }
    }

    private func triggerScan() {
        NotificationCenter.default.post(name: .capturePhoto, object: nil)
    }

    private func handleCapture(_ image: UIImage) {
        capturedImage = image
        guard let userId = appState.currentUser?.id.uuidString else { return }
        Task { await vm.scan(image: image, userId: userId) }
    }
}

// MARK: - Capture Notification
extension Notification.Name {
    static let capturePhoto = Notification.Name("capturePhoto")
}

// MARK: - Camera Preview (UIViewRepresentable)
struct CameraPreviewView: UIViewRepresentable {
    var onCapture: (UIImage) -> Void

    func makeUIView(context: Context) -> CameraUIView {
        let view = CameraUIView()
        view.onCapture = onCapture
        return view
    }

    func updateUIView(_ uiView: CameraUIView, context: Context) {}
}

final class CameraUIView: UIView {
    var onCapture: ((UIImage) -> Void)?

    private let session = AVCaptureSession()
    private var photoOutput = AVCapturePhotoOutput()
    private var previewLayer: AVCaptureVideoPreviewLayer!
    private var captureObserver: Any?

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupCamera()
        captureObserver = NotificationCenter.default.addObserver(
            forName: .capturePhoto, object: nil, queue: .main
        ) { [weak self] _ in
            self?.capturePhoto()
        }
    }

    required init?(coder: NSCoder) { fatalError() }

    deinit {
        if let obs = captureObserver { NotificationCenter.default.removeObserver(obs) }
        session.stopRunning()
    }

    private func setupCamera() {
        session.sessionPreset = .photo
        guard
            let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
            let input = try? AVCaptureDeviceInput(device: device),
            session.canAddInput(input)
        else { return }

        session.addInput(input)
        if session.canAddOutput(photoOutput) { session.addOutput(photoOutput) }

        previewLayer = AVCaptureVideoPreviewLayer(session: session)
        previewLayer.videoGravity = .resizeAspectFill
        layer.addSublayer(previewLayer)

        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            self?.session.startRunning()
        }
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        previewLayer?.frame = bounds
    }

    private func capturePhoto() {
        let settings = AVCapturePhotoSettings()
        photoOutput.capturePhoto(with: settings, delegate: self)
    }
}

extension CameraUIView: AVCapturePhotoCaptureDelegate {
    func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?) {
        guard let data = photo.fileDataRepresentation(), let image = UIImage(data: data) else { return }
        DispatchQueue.main.async { [weak self] in
            self?.onCapture?(image)
        }
    }
}
