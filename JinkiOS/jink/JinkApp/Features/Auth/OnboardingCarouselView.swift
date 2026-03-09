import SwiftUI

struct OnboardingCarouselView: View {
    @State private var currentPage = 0
    @Environment(\.dismiss) private var dismiss
    
    // Once they finish the carousel, we will show the quiz
    @State private var showQuiz = false

    let slides: [(title: String, subtitle: String, icon: String)] = [
        ("Welcome to Jink", "Your personal architectural passport. Discover the world built around you.", "building.2.fill"),
        ("Scan to Discover", "Point your camera at any building to reveal its history, style, and secrets.", "camera.viewfinder"),
        ("Walk the City", "Generate personalized routes based on your architectural tastes and time.", "figure.walk"),
        ("Build Your Passport", "Earn stamps, unlock achievements, and map your unique aesthetic profile.", "book.closed.fill")
    ]

    var body: some View {
        NavigationStack {
            ZStack {
                Color(.systemBackground).ignoresSafeArea()
                
                VStack(spacing: 0) {
                    TabView(selection: $currentPage) {
                        ForEach(0..<slides.count, id: \.self) { index in
                            let slide = slides[index]
                            
                            VStack(spacing: 32) {
                                Spacer()
                                
                                Image(systemName: slide.icon)
                                    .font(.system(size: 80))
                                    .foregroundStyle(AppColors.accent)
                                
                                VStack(spacing: 16) {
                                    Text(slide.title)
                                        .font(.system(size: 32, weight: .bold))
                                        .multilineTextAlignment(.center)
                                    
                                    Text(slide.subtitle)
                                        .font(.title3)
                                        .foregroundStyle(.secondary)
                                        .multilineTextAlignment(.center)
                                        .padding(.horizontal, 32)
                                }
                                
                                Spacer()
                            }
                            .tag(index)
                        }
                    }
                    .tabViewStyle(.page(indexDisplayMode: .always))
                    .indexViewStyle(.page(backgroundDisplayMode: .always))
                    
                    VStack(spacing: 16) {
                        if currentPage == slides.count - 1 {
                            Button(action: { showQuiz = true }) {
                                Text("Find Your Aesthetic")
                                    .font(.headline.bold())
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 16)
                                    .background(AppColors.accent, in: Capsule())
                                    .foregroundStyle(.white)
                            }
                        } else {
                            Button(action: {
                                withAnimation { currentPage += 1 }
                            }) {
                                Text("Next")
                                    .font(.headline.bold())
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 16)
                                    .background(Color(.systemGray5), in: Capsule())
                                    .foregroundStyle(.primary)
                            }
                        }
                    }
                    .padding(24)
                    .padding(.bottom, 20)
                }
            }
            .navigationDestination(isPresented: $showQuiz) {
                OnboardingQuizView()
                    .navigationBarBackButtonHidden(true)
            }
        }
    }
}
