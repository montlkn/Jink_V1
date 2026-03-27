import SwiftUI

struct WalkStopInsightsView: View {
    let detail: ScanMatch
    let onContinue: () -> Void

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    
                    // Header / Name
                    VStack(alignment: .leading, spacing: 4) {
                        Text("VERIFIED")
                            .font(.caption.bold())
                            .foregroundStyle(AppColors.success)
                            .kerning(1)
                        
                        Text(detail.name ?? "Destination Reached")
                            .font(.largeTitle.bold())
                        
                        if let address = detail.address {
                            Text(address)
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(.top, 16)
                    
                    // XP Awarded
                    HStack {
                        Image(systemName: "star.circle.fill")
                            .font(.title)
                            .foregroundStyle(AppColors.accent)
                        Text("+25 XP Earned")
                            .font(.headline)
                        Spacer()
                    }
                    .padding()
                    .background(AppColors.accent.opacity(0.1), in: RoundedRectangle(cornerRadius: 16))
                    
                    // Building details
                    if let style = detail.style {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("STYLE")
                                .font(.caption.bold())
                                .foregroundStyle(.secondary)
                                .kerning(1)
                            Text(style)
                                .font(.headline)
                        }
                    }
                    
                    Spacer(minLength: 40)
                    
                    // Continue Button
                    Button(action: onContinue) {
                        Text("CONTINUE WALK")
                            .font(.headline.bold())
                            .kerning(1)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .foregroundStyle(.white)
                            .background(AppColors.accent, in: Capsule())
                    }
                    .padding(.bottom, 24)
                }
                .padding(.horizontal)
            }
            .navigationBarTitleDisplayMode(.inline)
            .interactiveDismissDisabled(true) // Force them to press Continue
        }
        .presentationDetents([.fraction(0.85), .large])
        .presentationDragIndicator(.visible)
    }
}
