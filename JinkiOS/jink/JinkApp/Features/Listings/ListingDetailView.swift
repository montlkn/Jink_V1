import SwiftUI
import Auth

struct ListingDetailView: View {
    let listing: PropertyListing
    @Environment(AppState.self) private var appState
    @State private var showTourRequestForm = false
    @State private var currentPhotoIndex = 0

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                // Photo carousel
                photoCarousel

                VStack(alignment: .leading, spacing: 16) {
                    // Price + specs
                    VStack(alignment: .leading, spacing: 6) {
                        Text(listing.priceLabel)
                            .font(.largeTitle.bold())
                        if !listing.specsLabel.isEmpty {
                            Text(listing.specsLabel)
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                        if let status = listing.status {
                            Text(status.uppercased())
                                .font(.caption2.bold())
                                .foregroundStyle(statusColor)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(statusColor.opacity(0.12), in: Capsule())
                        }
                    }

                    Divider()

                    // Description
                    if let desc = listing.description {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("About")
                                .font(.headline)
                            Text(desc)
                                .font(.body)
                                .foregroundStyle(.secondary)
                        }
                    }

                    // Additional photos grid
                    if listing.photos.count > 1 {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Photos")
                                .font(.headline)
                            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 4) {
                                ForEach(Array(listing.photos.dropFirst())) { photo in
                                    AsyncImage(url: URL(string: photo.url)) { phase in
                                        switch phase {
                                        case .success(let image):
                                            image.resizable().aspectRatio(contentMode: .fill)
                                        default:
                                            Rectangle().fill(Color(.systemGray5))
                                        }
                                    }
                                    .frame(height: 80)
                                    .clipped()
                                    .cornerRadius(6)
                                }
                            }
                        }
                    }

                    Divider()

                    // Agent card
                    if let agent = listing.agent {
                        AgentCard(agent: agent)
                    }

                    // Request tour CTA
                    Button(action: { showTourRequestForm = true }) {
                        HStack {
                            Image(systemName: "calendar.badge.plus")
                            Text("Request a Tour")
                        }
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(AppColors.accent, in: RoundedRectangle(cornerRadius: 12))
                        .foregroundStyle(.white)
                    }
                    .padding(.bottom)
                }
                .padding()
            }
        }
        .navigationTitle("Listing Detail")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showTourRequestForm) {
            TourRequestFormView(listing: listing, userId: appState.currentUser?.id.uuidString ?? "")
        }
        .task {
            let userId = appState.currentUser?.id.uuidString ?? ""
            await ListingsService.shared.trackEvent(listingId: listing.id, userId: userId, eventType: "view")
        }
    }

    private var statusColor: Color {
        switch listing.status?.lowercased() {
        case "active": return .green
        case "pending": return .orange
        case "sold": return .red
        default: return .gray
        }
    }

    private var photoCarousel: some View {
        Group {
            if !listing.photos.isEmpty {
                TabView(selection: $currentPhotoIndex) {
                    ForEach(Array(listing.photos.enumerated()), id: \.offset) { idx, photo in
                        AsyncImage(url: URL(string: photo.url)) { phase in
                            switch phase {
                            case .success(let image):
                                image.resizable().aspectRatio(contentMode: .fill)
                            default:
                                Rectangle().fill(Color(.systemGray5))
                                    .overlay(Image(systemName: "photo").foregroundStyle(.secondary))
                            }
                        }
                        .tag(idx)
                    }
                }
                .tabViewStyle(.page)
                .frame(height: 280)
                .clipped()
            } else {
                Rectangle()
                    .fill(Color(.systemGray5))
                    .frame(height: 200)
                    .overlay(Image(systemName: "building.2").font(.largeTitle).foregroundStyle(.secondary))
            }
        }
    }
}

// MARK: - Agent Card

struct AgentCard: View {
    let agent: ListingAgent

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Listed by")
                .font(.caption)
                .foregroundStyle(.secondary)

            HStack(spacing: 12) {
                if let photoUrl = agent.photoUrl, let url = URL(string: photoUrl) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image.resizable().aspectRatio(contentMode: .fill)
                                .frame(width: 44, height: 44)
                                .clipShape(Circle())
                        default:
                            Circle().fill(Color(.systemGray4))
                                .frame(width: 44, height: 44)
                                .overlay(Image(systemName: "person.fill").foregroundStyle(.secondary))
                        }
                    }
                } else {
                    Circle().fill(Color(.systemGray4))
                        .frame(width: 44, height: 44)
                        .overlay(Image(systemName: "person.fill").foregroundStyle(.secondary))
                }

                VStack(alignment: .leading, spacing: 2) {
                    if let name = agent.name {
                        Text(name)
                            .font(.subheadline.bold())
                    }
                    if let company = agent.company {
                        Text(company)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                HStack(spacing: 12) {
                    if let phone = agent.phone, let url = URL(string: "tel://\(phone.filter { $0.isNumber })") {
                        Link(destination: url) {
                            Image(systemName: "phone.fill")
                                .font(.title3)
                                .foregroundStyle(AppColors.accent)
                        }
                    }
                    if let email = agent.email, let url = URL(string: "mailto:\(email)") {
                        Link(destination: url) {
                            Image(systemName: "envelope.fill")
                                .font(.title3)
                                .foregroundStyle(AppColors.accent)
                        }
                    }
                }
            }
        }
        .padding(12)
        .background(Color(.systemGray6), in: RoundedRectangle(cornerRadius: 12))
    }
}

// MARK: - Tour Request Form

struct TourRequestFormView: View {
    let listing: PropertyListing
    let userId: String
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var email = ""
    @State private var phone = ""
    @State private var message = ""
    @State private var preferredDate = Date()
    @State private var isSubmitting = false
    @State private var didSubmit = false
    @State private var errorMessage: String? = nil

    var body: some View {
        NavigationStack {
            if didSubmit {
                VStack(spacing: 16) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 56))
                        .foregroundStyle(.green)
                    Text("Request Sent!")
                        .font(.title2.bold())
                    Text("An agent will be in touch soon.")
                        .foregroundStyle(.secondary)
                    Button("Done") { dismiss() }
                        .buttonStyle(.borderedProminent)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                Form {
                    Section("Your Info") {
                        TextField("Name", text: $name)
                        TextField("Email", text: $email)
                            .keyboardType(.emailAddress)
                            .autocorrectionDisabled()
                        TextField("Phone", text: $phone)
                            .keyboardType(.phonePad)
                    }
                    Section("Message") {
                        TextField("Message (optional)", text: $message, axis: .vertical)
                            .lineLimit(3...6)
                        DatePicker("Preferred Date", selection: $preferredDate, displayedComponents: .date)
                    }
                    if let errorMessage {
                        Section {
                            Text(errorMessage).foregroundStyle(.red).font(.caption)
                        }
                    }
                }
                .navigationTitle("Request a Tour")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .topBarLeading) {
                        Button("Cancel") { dismiss() }
                    }
                    ToolbarItem(placement: .topBarTrailing) {
                        if isSubmitting {
                            ProgressView()
                        } else {
                            Button("Submit") {
                                Task { await submit() }
                            }
                            .disabled(name.isEmpty || email.isEmpty)
                        }
                    }
                }
            }
        }
    }

    private func submit() async {
        isSubmitting = true
        errorMessage = nil
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let payload = TourRequestPayload(
            listingId: listing.id,
            userId: userId,
            name: name,
            email: email,
            phone: phone,
            message: message,
            preferredDate: formatter.string(from: preferredDate)
        )
        do {
            try await ListingsService.shared.submitTourRequest(payload)
            didSubmit = true
        } catch {
            errorMessage = error.localizedDescription
        }
        isSubmitting = false
    }
}
