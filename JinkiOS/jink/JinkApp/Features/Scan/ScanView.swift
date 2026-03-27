import Auth
import Supabase
import SwiftUI
import AVFoundation
import UIKit
import CoreLocation

struct ScanView: View {
    @Environment(AppState.self) private var appState
    @Environment(LocationService.self) private var locationService
    @Environment(\.dismiss) private var dismiss
    @State private var vm: ScanViewModel
    @State private var capturedImage: UIImage? = nil
    @State private var profileLoaded = false
    @State private var useUltraWide = false
    @State private var communityMode = false
    @State private var showCommunityPost = false

    var showDismissButton: Bool = false

    init(showDismissButton: Bool = false) {
        self.showDismissButton = showDismissButton
        // vm initialized in onAppear after environment is set
        _vm = State(initialValue: ScanViewModel(locationService: LocationService()))
    }

    var body: some View {
        NavigationStack {
            ZStack {
                // Camera preview
                CameraPreviewView(onCapture: handleCapture, useUltraWide: useUltraWide)
                    .ignoresSafeArea()
                
                cameraGuide

                // UI overlay
                VStack {
                    if showDismissButton {
                        HStack {
                            Button(action: { dismiss() }) {
                                Image(systemName: "xmark")
                                    .font(.title3.bold())
                                    .foregroundStyle(.white)
                                    .padding(14)
                                    .background(.black.opacity(0.4), in: Circle())
                                    .overlay(Circle().stroke(.white.opacity(0.3), lineWidth: 1))
                            }
                            .padding(.leading, 20)
                            .padding(.top, 10)
                            Spacer()
                            communityToggleButton
                                .padding(.trailing, 20)
                                .padding(.top, 10)
                        }
                    } else {
                        HStack {
                            Spacer()
                            communityToggleButton
                                .padding(.trailing, 20)
                                .padding(.top, 10)
                        }
                    }
                    
                    Spacer()

                    // GPS acquiring indicator
                    if locationService.location == nil {
                        Label("Acquiring GPS…", systemImage: "location.slash")
                            .font(.caption)
                            .foregroundStyle(.white)
                            .padding(8)
                            .background(.ultraThinMaterial, in: Capsule())
                    }

                    // Lens toggle + scan button row
                    VStack(spacing: 12) {
                        // 0.5x / 1x lens toggle
                        Button(action: { useUltraWide.toggle() }) {
                            Text(useUltraWide ? "0.5×" : "1×")
                                .font(.system(size: 15, weight: .semibold, design: .rounded))
                                .foregroundStyle(.white)
                                .frame(width: 44, height: 44)
                                .background(.black.opacity(0.5), in: Circle())
                        }

                        // Scan button — ArchetypeOrb if profile loaded, else fallback camera circle
                        Group {
                            if vm.isScanning {
                                ZStack {
                                    Circle()
                                        .fill(.white.opacity(0.15))
                                        .frame(width: 80, height: 80)
                                    ProgressView()
                                        .tint(.white)
                                        .scaleEffect(1.2)
                                }
                            } else if profileLoaded, let profile = appState.aestheticProfile {
                                ArchetypeOrb(
                                    aesthetic: profile,
                                    size: 80,
                                    tapAction: triggerScan
                                )
                                .opacity(profileLoaded ? 1 : 0)
                                .animation(.easeIn(duration: 0.3), value: profileLoaded)
                                .disabled(locationService.location == nil)
                            } else {
                                Button(action: triggerScan) {
                                    ZStack {
                                        Circle()
                                            .fill(.white)
                                            .frame(width: 72, height: 72)
                                        Image(systemName: "camera.viewfinder")
                                            .font(.system(size: 28, weight: .semibold))
                                            .foregroundStyle(AppColors.accent)
                                    }
                                }
                                .disabled(locationService.location == nil)
                            }
                        }
                    }
                    .padding(.bottom, 8)
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
                if let match = vm.scanResult?.topMatch {
                    BuildingInfoView(
                        bin: match.bin,
                        name: match.name ?? "Unknown Building",
                        address: match.address ?? "",
                        latitude: match.latitude,
                        longitude: match.longitude,
                        fromScan: true,
                        scanMatch: match
                    )
                }
            }
            .navigationDestination(isPresented: $vm.notFound) {
                NotFoundView(
                    photo: vm.scanPhoto,
                    location: locationService.location,
                    buildingBin: vm.scanResult?.topMatch?.bin ?? ""
                )
            }
            .sheet(isPresented: $showCommunityPost) {
                if let image = capturedImage {
                    CommunityPostSheet(
                        image: image,
                        latitude: locationService.location?.coordinate.latitude ?? 0,
                        longitude: locationService.location?.coordinate.longitude ?? 0
                    )
                }
            }
            .onAppear {
                vm = ScanViewModel(locationService: locationService)
                Task {
                    if let loc = locationService.location {
                        await GPSGridCacheService.shared.initialize(lat: loc.coordinate.latitude, lng: loc.coordinate.longitude)
                    }
                }
                loadAestheticProfile()
            }
        }
    }
    
    private var cameraGuide: some View {
        ZStack {
            // Crosshair dot
            Circle()
                .fill(.white.opacity(0.6))
                .frame(width: 4, height: 4)

            // Caption
            VStack {
                Spacer()
                Text("POINT AT BUILDING FACADE")
                    .font(.caption.monospaced())
                    .foregroundStyle(.white.opacity(0.7))
                    .padding(.bottom, 160)
            }
        }
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

    private func loadAestheticProfile() {
        guard appState.currentUser != nil else {
            appState.aestheticProfile = AestheticProfile.default
            profileLoaded = true
            return
        }
        Task {
            await appState.refreshAestheticProfile()
            if appState.aestheticProfile == nil {
                appState.aestheticProfile = AestheticProfile.default
            }
            profileLoaded = true
        }
    }

    private func triggerScan() {
        NotificationCenter.default.post(name: .capturePhoto, object: nil)
    }

    private func handleCapture(_ image: UIImage) {
        capturedImage = image
        if communityMode {
            // Community mode: open post compose sheet instead of scanning
            showCommunityPost = true
            return
        }
        guard let userId = appState.currentUser?.id.uuidString else { return }
        Task { await vm.scan(image: image, userId: userId, appState: appState) }
    }

    private var communityToggleButton: some View {
        Button(action: {
            withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                communityMode.toggle()
            }
        }) {
            Image(systemName: communityMode ? "lightbulb.fill" : "lightbulb")
                .font(.title3.bold())
                .foregroundStyle(communityMode ? AppColors.accent : .white)
                .padding(14)
                .background(communityMode ? AppColors.accent.opacity(0.2) : .black.opacity(0.4), in: Circle())
                .overlay(Circle().stroke(communityMode ? AppColors.accent.opacity(0.6) : .white.opacity(0.3), lineWidth: 1))
                .scaleEffect(communityMode ? 1.1 : 1.0)
        }
    }
}

// MARK: - Community Post Compose Sheet
struct CommunityPostSheet: View {
    let image: UIImage
    let latitude: Double
    let longitude: Double
    @Environment(AppState.self) private var appState
    @Environment(\.dismiss) private var dismiss
    @State private var caption: String = ""
    @State private var isSubmitting = false
    @State private var errorMessage: String? = nil

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                // Preview image
                Image(uiImage: image)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(height: 200)
                    .clipped()
                    .cornerRadius(12)
                    .padding(.horizontal)

                // Caption field
                VStack(alignment: .leading, spacing: 8) {
                    Text("What did you find?")
                        .font(.headline)
                    TextField("An interesting detail, a memory, a hidden gem...", text: $caption, axis: .vertical)
                        .lineLimit(3...6)
                        .textFieldStyle(.roundedBorder)
                }
                .padding(.horizontal)

                // Location indicator
                HStack(spacing: 6) {
                    Image(systemName: "location.fill")
                        .font(.caption)
                        .foregroundStyle(AppColors.accent)
                    Text(String(format: "%.4f, %.4f", latitude, longitude))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .padding(.horizontal)

                if let err = errorMessage {
                    Text(err)
                        .font(.caption)
                        .foregroundStyle(.red)
                        .padding(.horizontal)
                }

                Spacer()

                Button(action: submitPost) {
                    HStack {
                        if isSubmitting {
                            ProgressView()
                                .tint(.white)
                        }
                        Text(isSubmitting ? "Posting..." : "Post to Community")
                            .fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(caption.trimmingCharacters(in: .whitespaces).isEmpty ? Color.gray : AppColors.accent)
                    .foregroundStyle(.white)
                    .cornerRadius(12)
                }
                .disabled(caption.trimmingCharacters(in: .whitespaces).isEmpty || isSubmitting)
                .padding(.horizontal)
                .padding(.bottom, 20)
            }
            .navigationTitle("Community Post")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }

    private func submitPost() {
        guard let userId = appState.currentUser?.id.uuidString,
              let imageData = image.jpegData(compressionQuality: 0.8) else {
            errorMessage = "Not signed in"
            return
        }
        isSubmitting = true
        Task {
            do {
                try await CommunityPostService.shared.submitPost(
                    userId: userId,
                    imageData: imageData,
                    caption: caption.trimmingCharacters(in: .whitespaces),
                    latitude: latitude,
                    longitude: longitude
                )
                dismiss()
            } catch {
                errorMessage = "Failed to post: \(error.localizedDescription)"
                isSubmitting = false
            }
        }
    }
}

// MARK: - Capture Notification
extension Notification.Name {
    static let capturePhoto = Notification.Name("capturePhoto")
}

// MARK: - Camera Preview (UIViewRepresentable)
struct CameraPreviewView: UIViewRepresentable {
    var captureNotificationName: Notification.Name = .capturePhoto
    var onCapture: (UIImage) -> Void
    var useUltraWide: Bool = false

    func makeUIView(context: Context) -> CameraUIView {
        let view = CameraUIView(captureNotificationName: captureNotificationName)
        view.onCapture = onCapture
        return view
    }

    func updateUIView(_ uiView: CameraUIView, context: Context) {
        uiView.switchCamera(ultraWide: useUltraWide)
    }
}

final class CameraUIView: UIView {
    var onCapture: ((UIImage) -> Void)?

    private let session = AVCaptureSession()
    private var photoOutput = AVCapturePhotoOutput()
    private var previewLayer: AVCaptureVideoPreviewLayer!
    private var captureObserver: Any?
    private let captureNotificationName: Notification.Name
    private var currentInput: AVCaptureDeviceInput?
    private var isUltraWide = false

    init(frame: CGRect = .zero, captureNotificationName: Notification.Name) {
        self.captureNotificationName = captureNotificationName
        super.init(frame: frame)
        setupCamera(ultraWide: false)
        captureObserver = NotificationCenter.default.addObserver(
            forName: captureNotificationName, object: nil, queue: .main
        ) { [weak self] _ in
            self?.capturePhoto()
        }
    }

    required init?(coder: NSCoder) { fatalError() }

    deinit {
        if let obs = captureObserver { NotificationCenter.default.removeObserver(obs) }
        session.stopRunning()
    }

    func switchCamera(ultraWide: Bool) {
        guard ultraWide != isUltraWide else { return }
        isUltraWide = ultraWide
        let deviceType: AVCaptureDevice.DeviceType = ultraWide ? .builtInUltraWideCamera : .builtInWideAngleCamera
        guard let device = AVCaptureDevice.default(deviceType, for: .video, position: .back),
              let newInput = try? AVCaptureDeviceInput(device: device) else { return }
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self else { return }
            self.session.beginConfiguration()
            if let old = self.currentInput { self.session.removeInput(old) }
            if self.session.canAddInput(newInput) {
                self.session.addInput(newInput)
                self.currentInput = newInput
            }
            self.session.commitConfiguration()
        }
    }

    private func setupCamera(ultraWide: Bool) {
        session.sessionPreset = .photo
        let deviceType: AVCaptureDevice.DeviceType = ultraWide ? .builtInUltraWideCamera : .builtInWideAngleCamera
        guard
            let device = AVCaptureDevice.default(deviceType, for: .video, position: .back),
            let input = try? AVCaptureDeviceInput(device: device),
            session.canAddInput(input)
        else { return }

        session.addInput(input)
        currentInput = input
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
