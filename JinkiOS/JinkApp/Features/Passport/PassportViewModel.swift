import Foundation
import Supabase

@Observable
final class PassportViewModel {
    var profile: Profile? = nil
    var stampCount: Int = 0
    var achievementCount: Int = 0
    var visaCount: Int = 0
    var walkSummaries: [WalkSummary] = []
    var isLoading = false
    var errorMessage: String? = nil

    private var userId: String? = nil

    func load(userId: String) async {
        self.userId = userId
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.fetchProfile(userId: userId) }
            group.addTask { await self.fetchCounts(userId: userId) }
            group.addTask { await self.fetchWalkSummaries(userId: userId) }
        }
    }

    private func fetchProfile(userId: String) async {
        do {
            let row: Profile = try await SupabaseService.shared.client
                .from("profiles")
                .select("id, username, display_name, xp, level, level_title, level_tier, streak_count, stamps, aesthetic_profile")
                .eq("id", value: userId)
                .single()
                .execute()
                .value
            profile = row
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func fetchCounts(userId: String) async {
        do {
            struct CountResult: Decodable { let count: Int }

            // stamps count from profile.stamps array length — already in profile fetch
            // user_stamps table count
            let stampsData = try await SupabaseService.shared.client
                .from("user_stamps")
                .select("id", head: true, count: .exact)
                .eq("user_id", value: userId)
                .execute()
            stampCount = stampsData.count ?? 0

            let achievementsData = try await SupabaseService.shared.client
                .from("user_achievements")
                .select("id", head: true, count: .exact)
                .eq("user_id", value: userId)
                .execute()
            achievementCount = achievementsData.count ?? 0

            let visasData = try await SupabaseService.shared.client
                .from("user_visas")
                .select("id", head: true, count: .exact)
                .eq("user_id", value: userId)
                .execute()
            visaCount = visasData.count ?? 0
        } catch {
            // Non-critical — counts default to 0
            print("[PassportViewModel] Count fetch error: \(error)")
        }
    }

    private func fetchWalkSummaries(userId: String) async {
        do {
            let summaries: [WalkSummary] = try await SupabaseService.shared.client
                .from("walks")
                .select("id, route_type, started_at, completed_at, xp_earned")
                .eq("user_id", value: userId)
                .not("completed_at", operator: .is, value: "null")
                .order("completed_at", ascending: false)
                .limit(20)
                .execute()
                .value
            walkSummaries = summaries
        } catch {
            print("[PassportViewModel] Walk summaries error: \(error)")
        }
    }
}
