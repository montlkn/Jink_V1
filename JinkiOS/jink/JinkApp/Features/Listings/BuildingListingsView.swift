import SwiftUI

@Observable
final class BuildingListingsViewModel {
    var listings: [PropertyListing] = []
    var isLoading = false
    var errorMessage: String? = nil

    func load(bin: String) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            listings = try await ListingsService.shared.fetchListings(for: bin)
        } catch {
            errorMessage = error.localizedDescription
            print("[BuildingListingsViewModel] Error: \(error)")
        }
    }
}

struct BuildingListingsView: View {
    let buildingBin: String
    let buildingName: String
    @State private var vm = BuildingListingsViewModel()
    @State private var selectedListing: PropertyListing? = nil

    var premiumListings: [PropertyListing] { vm.listings.filter { $0.isPremium } }
    var freeListings: [PropertyListing] { vm.listings.filter { !$0.isPremium } }

    var body: some View {
        Group {
            if vm.isLoading {
                ProgressView("Loading listings…")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if vm.listings.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "house.fill")
                        .font(.largeTitle)
                        .foregroundStyle(.secondary)
                    Text("No listings available")
                        .foregroundStyle(.secondary)
                    if let error = vm.errorMessage {
                        Text(error).font(.caption).foregroundStyle(.red)
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        if !premiumListings.isEmpty {
                            VStack(alignment: .leading, spacing: 12) {
                                Text("Featured")
                                    .font(.headline)
                                    .padding(.horizontal)
                                ForEach(premiumListings) { listing in
                                    PremiumListingCard(listing: listing)
                                        .onTapGesture { selectedListing = listing }
                                        .padding(.horizontal)
                                }
                            }
                        }

                        if !freeListings.isEmpty {
                            VStack(alignment: .leading, spacing: 12) {
                                Text("More Listings")
                                    .font(.headline)
                                    .padding(.horizontal)
                                ForEach(freeListings) { listing in
                                    FreeListingCard(listing: listing)
                                        .onTapGesture { selectedListing = listing }
                                        .padding(.horizontal)
                                }
                            }
                        }
                    }
                    .padding(.vertical)
                }
            }
        }
        .navigationTitle("Listings")
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(item: $selectedListing) { listing in
            ListingDetailView(listing: listing)
        }
        .task {
            await vm.load(bin: buildingBin)
        }
    }
}

// MARK: - Premium Listing Card

struct PremiumListingCard: View {
    let listing: PropertyListing

    var firstPhotoUrl: String? { listing.photos.first?.url }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Photo
            if let url = firstPhotoUrl {
                AsyncImage(url: URL(string: url)) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().aspectRatio(contentMode: .fill)
                    default:
                        Rectangle().fill(Color(.systemGray5))
                            .overlay(Image(systemName: "photo").foregroundStyle(.secondary))
                    }
                }
                .frame(height: 200)
                .clipped()
            } else {
                Rectangle().fill(Color(.systemGray5))
                    .frame(height: 160)
                    .overlay(Image(systemName: "building.2").font(.largeTitle).foregroundStyle(.secondary))
            }

            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text(listing.priceLabel)
                        .font(.title3.bold())
                    Spacer()
                    Text("FEATURED")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(AppColors.accent)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 3)
                        .background(AppColors.accent.opacity(0.12), in: Capsule())
                }

                if !listing.specsLabel.isEmpty {
                    Text(listing.specsLabel)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                if let desc = listing.description {
                    Text(desc)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }

                if let agent = listing.agent, let name = agent.name {
                    HStack(spacing: 6) {
                        Image(systemName: "person.circle.fill")
                            .foregroundStyle(.secondary)
                        Text(name)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        if let company = agent.company {
                            Text("· \(company)")
                                .font(.caption)
                                .foregroundStyle(.tertiary)
                        }
                    }
                }
            }
            .padding(12)
        }
        .background(Color(.systemGray6), in: RoundedRectangle(cornerRadius: 14))
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }
}

// MARK: - Free Listing Card

struct FreeListingCard: View {
    let listing: PropertyListing

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color(.systemGray5))
                    .frame(width: 56, height: 56)
                Image(systemName: "house.fill")
                    .foregroundStyle(.secondary)
            }

            VStack(alignment: .leading, spacing: 3) {
                Text(listing.priceLabel)
                    .font(.subheadline.bold())
                if !listing.specsLabel.isEmpty {
                    Text(listing.specsLabel)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                if let status = listing.status {
                    Text(status.capitalized)
                        .font(.system(size: 10))
                        .foregroundStyle(.tertiary)
                }
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundStyle(.tertiary)
        }
        .padding(12)
        .background(Color(.systemGray6), in: RoundedRectangle(cornerRadius: 10))
    }
}
