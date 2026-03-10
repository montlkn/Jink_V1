import Foundation
import Supabase

@Observable
final class PassportViewModel {
    var profile: Profile? = nil
    var aestheticProfile: AestheticProfile? = nil
    var stampCount: Int = 0
    var achievementCount: Int = 0
    var walkSummaries: [WalkSummary] = []
    var isLoading = false
    var errorMessage: String? = nil

    private var userId: String? = nil

    var passportNumber: String {
        guard let userId = userId else { return "AR-0000-0000" }
        let raw = userId.replacingOccurrences(of: "[^a-zA-Z0-9]", with: "", options: .regularExpression).uppercased()
        guard raw.count >= 8 else { return "AR-0000-0000" }
        return "AR-\(raw.prefix(4))-\(raw.dropFirst(4).prefix(4))"
    }

    var issueDateLabel: String? { nil } // created_at not on profiles table

    func load(userId: String) async {
        self.userId = userId
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.fetchProfile(userId: userId) }
            group.addTask { await self.fetchAestheticProfile(userId: userId) }
            group.addTask { await self.fetchCounts(userId: userId) }
            group.addTask { await self.fetchWalkSummaries(userId: userId) }
        }
    }

    // profiles table: id, username, xp, level, level_title, level_tier, daily_streak_count, stamps
    private func fetchProfile(userId: String) async {
        do {
            let row: Profile = try await SupabaseService.shared.client
                .from("profiles")
                .select("id, username, xp, level, level_title, level_tier, daily_streak_count, stamps")
                .eq("id", value: userId)
                .single()
                .execute()
                .value
            profile = row
            print("[PassportViewModel] Profile loaded: level \(row.level)")
        } catch {
            errorMessage = error.localizedDescription
            print("[PassportViewModel] Profile fetch error: \(error)")
        }
    }

    // user_aesthetic_profiles table: user_id, normalized_scores JSONB (scores 0–100)
    private func fetchAestheticProfile(userId: String) async {
        do {
            struct AestheticRow: Decodable {
                let normalizedScores: AestheticProfile?
                enum CodingKeys: String, CodingKey {
                    case normalizedScores = "normalized_scores"
                }
            }
            let rows: [AestheticRow] = try await SupabaseService.shared.client
                .from("user_aesthetic_profiles")
                .select("normalized_scores")
                .eq("user_id", value: userId)
                .execute()
                .value
            if let first = rows.first {
                aestheticProfile = first.normalizedScores
                print("[PassportViewModel] Aesthetic profile loaded: \(aestheticProfile?.dominant?.name ?? "none")")
            } else {
                print("[PassportViewModel] No aesthetic profile row found for user \(userId)")
            }
        } catch {
            print("[PassportViewModel] Aesthetic profile error: \(error)")
        }
    }

    private func fetchCounts(userId: String) async {
        do {
            let stampsData = try await SupabaseService.shared.client
                .from("user_stamps")
                .select("id", head: true, count: .exact)
                .eq("user_id", value: userId)
                .execute()
            stampCount = stampsData.count ?? 0
        } catch {
            print("[PassportViewModel] Stamps count error: \(error)")
        }

        do {
            let achievementsData = try await SupabaseService.shared.client
                .from("user_achievements")
                .select("id", head: true, count: .exact)
                .eq("user_id", value: userId)
                .execute()
            achievementCount = achievementsData.count ?? 0
        } catch {
            print("[PassportViewModel] Achievements count error: \(error)")
        }
    }

    // walk_summaries table/view: id, route_tier, started_at, ended_at, xp_earned, distance_km, custom_label
    private func fetchWalkSummaries(userId: String) async {
        do {
            let summaries: [WalkSummary] = try await SupabaseService.shared.client
                .from("walk_summaries")
                .select("id, route_tier, started_at, ended_at, xp_earned, distance_km, custom_label")
                .eq("user_id", value: userId)
                .not("ended_at", operator: .is, value: "null")
                .order("ended_at", ascending: false)
                .limit(5)
                .execute()
                .value
            walkSummaries = summaries
        } catch {
            print("[PassportViewModel] Walk summaries error: \(error)")
        }
    }
}
