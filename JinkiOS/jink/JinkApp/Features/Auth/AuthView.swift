import SwiftUI

struct AuthView: View {
    @Environment(AppState.self) private var appState
    @State private var vm = AuthViewModel()
    @State private var mode: AuthMode = .signIn

    enum AuthMode { case signIn, signUp, magicLink }

    var body: some View {
        NavigationStack {
        VStack(spacing: 32) {
            // Logo / wordmark
            VStack(spacing: 8) {
                Text("jink")
                    .font(.system(size: 48, weight: .black, design: .rounded))
                    .foregroundStyle(AppColors.accent)
                Text("Architecture, rediscovered.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            .padding(.top, 60)

            // Mode picker
            Picker("", selection: $mode) {
                Text("Sign In").tag(AuthMode.signIn)
                Text("Sign Up").tag(AuthMode.signUp)
            }
            .pickerStyle(.segmented)
            .padding(.horizontal)

            // Fields
            VStack(spacing: 16) {
                TextField("Email", text: $vm.email)
                    .textFieldStyle(.roundedBorder)
                    .textInputAutocapitalization(.never)
                    .keyboardType(.emailAddress)

                if mode != .magicLink {
                    SecureField("Password", text: $vm.password)
                        .textFieldStyle(.roundedBorder)
                }
            }
            .padding(.horizontal)

            // Error
            if let err = vm.errorMessage {
                Text(err)
                    .foregroundStyle(.red)
                    .font(.caption)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
            }

            // Magic link confirmation
            if vm.showMagicLinkSent {
                Label("Check your email for a sign-in link", systemImage: "envelope.badge")
                    .foregroundStyle(AppColors.success)
                    .font(.callout)
            }

            // CTA
            Button(action: handleAction) {
                if vm.isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity)
                } else {
                    Text(ctaLabel)
                        .frame(maxWidth: .infinity)
                }
            }
            .buttonStyle(.borderedProminent)
            .tint(AppColors.accent)
            .padding(.horizontal)
            .disabled(vm.isLoading || vm.email.isEmpty)

            // Magic link as secondary option
            if mode == .signIn {
                Button(action: {
                    mode = .magicLink
                    Task { await vm.sendMagicLink() }
                }) {
                    Text("Trouble signing in? Send a magic link")
                        .font(.caption)
                        .foregroundStyle(AppColors.accent)
                }
                .disabled(vm.email.isEmpty || vm.isLoading)
            }

            Spacer()
        }
        }
    }

    private var ctaLabel: String {
        switch mode {
        case .signIn: return "Sign In"
        case .signUp: return "Create Account"
        case .magicLink: return "Send Magic Link"
        }
    }

    private func handleAction() {
        Task {
            switch mode {
            case .signIn: await vm.signIn()
            case .signUp: await vm.signUp()
            case .magicLink: await vm.sendMagicLink()
            }
        }
    }
}

#Preview {
    AuthView()
        .environment(AppState())
}
