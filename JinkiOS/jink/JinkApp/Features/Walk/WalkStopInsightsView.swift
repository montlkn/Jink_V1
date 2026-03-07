import SwiftUI

struct WalkStopInsightsView: View {
    let detail: BuildingResult
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
                    
                    // Why it was recommended / Storytelling
                    if let desc = detail.description, !desc.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("WHY YOU'RE HERE")
                                .font(.caption.bold())
                                .foregroundStyle(AppColors.accent)
                                .kerning(1)
                            
                            Text(desc)
                                .font(.body)
                                .lineSpacing(4)
                        }
                        .padding()
                        .background(Color(.systemGray6), in: RoundedRectangle(cornerRadius: 16))
                    }
                    
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
                    
                    // Aesthetic Match
                    if let profile = detail.aestheticProfile, let dominant = profile.dominant {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("AESTHETIC MATCH")
                                .font(.caption.bold())
                                .foregroundStyle(.secondary)
                                .kerning(1)
                            
                            HStack {
                                ArchetypeOrb(aesthetic: profile, showLabels: false)
                                    .frame(width: 48, height: 48)
                                VStack(alignment: .leading) {
                                    Text("\(Int(dominant.score * 100))% \(dominant.name.capitalized)")
                                        .font(.headline)
                                    Text("Fits your architectural style")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }
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
