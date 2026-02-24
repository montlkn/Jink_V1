import SwiftUI

struct BuildingResultView: View {
    let result: ScanAPIResponse
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    // Verified badge
                    HStack {
                        if result.verified {
                            Label("Verified", systemImage: "checkmark.seal.fill")
                                .foregroundStyle(AppColors.success)
                                .font(.headline)
                        } else {
                            Label("Not verified", systemImage: "questionmark.circle")
                                .foregroundStyle(.secondary)
                                .font(.headline)
                        }
                        Spacer()
                        if result.verified {
                            Text("+50 XP")
                                .font(.headline.bold())
                                .foregroundStyle(AppColors.accent)
                        }
                    }
                    .padding()
                    .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12))

                    if let building = result.building {
                        // Building info
                        VStack(alignment: .leading, spacing: 12) {
                            if let name = building.name {
                                Text(name)
                                    .font(.title2.bold())
                            }
                            if let address = building.address {
                                Label(address, systemImage: "mappin.circle")
                                    .foregroundStyle(.secondary)
                                    .font(.subheadline)
                            }

                            Divider()

                            if let architect = building.architect {
                                InfoRow(label: "Architect", value: architect)
                            }
                            if let year = building.yearBuilt {
                                InfoRow(label: "Built", value: "\(year)")
                            }
                            if let style = building.style {
                                InfoRow(label: "Style", value: style)
                            }

                            if let desc = building.description {
                                Divider()
                                Text(desc)
                                    .font(.body)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .padding()
                        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12))

                        // Archetype arc
                        if let profile = building.aestheticProfile {
                            ArchetypeArcView(profile: profile)
                                .frame(height: 200)
                                .padding()
                                .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12))
                        }
                    } else if let message = result.message {
                        Text(message)
                            .foregroundStyle(.secondary)
                            .padding()
                    }
                }
                .padding()
            }
            .navigationTitle("Scan Result")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

struct InfoRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .foregroundStyle(.secondary)
                .font(.subheadline)
            Spacer()
            Text(value)
                .font(.subheadline.weight(.medium))
        }
    }
}
