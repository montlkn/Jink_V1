import Foundation
import Supabase

final class ProgressService {
    static let shared = ProgressService()
    private init() {}

    /// Triggered after a successful building scan
    func processScan(userId: String, building: BuildingResult?) async {
        // 1. Recalculate Aesthetic Profile
        await recalculateAestheticProfile(userId: userId)

        // 2. Process Streak
        await processStreak(userId: userId)

        // 3. Evaluate Achievements
        await evaluateAchievements(userId: userId)

        // 4. Evaluate Stamps
        if let building = building {
            await evaluateStamps(userId: userId, building: building)
        }
    }

    /// Triggered after a completed walk
    func processWalk(userId: String) async {
        await recalculateAestheticProfile(userId: userId)
        await evaluateAchievements(userId: userId)
    }

    // MARK: - Aesthetic Update

    private func recalculateAestheticProfile(userId: String) async {
        do {
            try await SupabaseService.shared.client
                .rpc("calculate_aesthetic_profile", params: ["p_user_id": AnyJSON.string(userId)])
                .execute()
        } catch {
            print("[ProgressService] ❌ Failed to recalculate aesthetic profile: \(error)")
        }
    }

    // MARK: - Streaks

    private func processStreak(userId: String) async {
        do {
            // Get the user's current streak and last scan timestamp
            struct ProfileData: Decodable {
                let daily_streak_count: Int
            }
            let profile: ProfileData = try await SupabaseService.shared.client
                .from("profiles")
                .select("daily_streak_count")
                .eq("id", value: userId)
                .single()
                .execute()
                .value

            struct EventData: Decodable {
                let created_at: Date
            }
            // Find the *second to last* scan event to determine streak continuation.
            // (Because the current scan was just inserted moments ago).
            let events: [EventData] = try await SupabaseService.shared.client
                .from("user_aesthetic_events")
                .select("created_at")
                .eq("user_id", value: userId)
                .order("created_at", ascending: false)
                .limit(2)
                .execute()
                .value

            let currentStreak = profile.daily_streak_count
            let calendar = Calendar.current
            
            // If this is their very first scan ever
            if events.count < 2 {
                if currentStreak == 0 {
                    await updateStreak(userId: userId, newStreak: 1)
                }
                return
            }

            // `events[0]` is the scan they JUST did. `events[1]` is their previous scan.
            let lastScanDate = events[1].created_at
            let today = Date()

            if calendar.isDateInYesterday(lastScanDate) {
                // Continuation!
                await updateStreak(userId: userId, newStreak: currentStreak + 1)
            } else if calendar.isDateInToday(lastScanDate) {
                // Already scanned today, do nothing.
            } else {
                // Streak broken. Last scan was > 48 hours ago. Reset to 1.
                await updateStreak(userId: userId, newStreak: 1)
            }

        } catch {
            print("[ProgressService] ❌ Failed to process streak: \(error)")
        }
    }

    private func updateStreak(userId: String, newStreak: Int) async {
        do {
            try await SupabaseService.shared.client
                .from("profiles")
                .update(["daily_streak_count": AnyJSON.integer(newStreak)])
                .eq("id", value: userId)
                .execute()
            print("[ProgressService] 🔥 Streak updated to \(newStreak)")
        } catch {
            print("[ProgressService] ❌ Failed to update streak count: \(error)")
        }
    }

    // MARK: - Achievements

    private func evaluateAchievements(userId: String) async {
        do {
            struct Earned: Decodable { let achievement_id: String }
            let earnedRows: [Earned] = try await SupabaseService.shared.client
                .from("user_achievements")
                .select("achievement_id")
                .eq("user_id", value: userId)
                .execute()
                .value
            let earnedIds = Set(earnedRows.map { $0.achievement_id })

            // Evaluate First Scan
            if !earnedIds.contains("first_scan") {
                let scans = try await SupabaseService.shared.client
                    .from("user_aesthetic_events")
                    .select("id", head: true, count: .exact)
                    .eq("user_id", value: userId)
                    .execute()
                
                if (scans.count ?? 0) >= 1 {
                    await awardAchievement(userId: userId, achievementId: "first_scan")
                }
            }
            
            // Evaluate Century Scanner (100 Scans)
            if !earnedIds.contains("100_scans") {
                let scans = try await SupabaseService.shared.client
                    .from("user_aesthetic_events")
                    .select("id", head: true, count: .exact)
                    .eq("user_id", value: userId)
                    .execute()
                
                if (scans.count ?? 0) >= 100 {
                    await awardAchievement(userId: userId, achievementId: "100_scans")
                }
            }

            // Evaluate Dedicated Traveler (5 Walks)
            if !earnedIds.contains("dedicated_traveler") {
                let walks = try await SupabaseService.shared.client
                    .from("walks")
                    .select("id", head: true, count: .exact)
                    .eq("user_id", value: userId)
                    .not("ended_at", operator: .is, value: "null")
                    .execute()
                
                if (walks.count ?? 0) >= 5 {
                    await awardAchievement(userId: userId, achievementId: "dedicated_traveler")
                }
            }

        } catch {
            print("[ProgressService] ❌ Error evaluating achievements: \(error)")
        }
    }

    // MARK: - Stamps

    private func evaluateStamps(userId: String, building: BuildingResult) async {
        do {
            struct Earned: Decodable { let stamp_slug: String }
            let earnedRows: [Earned] = try await SupabaseService.shared.client
                .from("user_stamps")
                .select("stamp_slug")
                .eq("user_id", value: userId)
                .execute()
                .value
            let earnedIds = Set(earnedRows.map { $0.stamp_slug })

            // Flatiron First Scan Stamp
            if !earnedIds.contains("flatiron_first_scan") {
                let isFlatiron = building.name?.lowercased().contains("flatiron") == true || building.bin == "1001830"
                if isFlatiron {
                    await awardStamp(userId: userId, stampSlug: "flatiron_first_scan")
                }
            }

        } catch {
            print("[ProgressService] ❌ Error evaluating stamps: \(error)")
        }
    }

    // MARK: - Helpers

    private func awardAchievement(userId: String, achievementId: String) async {
        do {
            let payload: [String: AnyJSON] = [
                "user_id": .string(userId),
                "achievement_id": .string(achievementId)
            ]
            try await SupabaseService.shared.client
                .from("user_achievements")
                .insert(payload)
                .execute()
            print("[ProgressService] 🏆 Awarded Achievement: \(achievementId)")
        } catch {
            print("[ProgressService] ❌ Error awarding achievement: \(error)")
        }
    }

    private func awardStamp(userId: String, stampSlug: String) async {
        do {
            let payload: [String: AnyJSON] = [
                "user_id": .string(userId),
                "stamp_slug": .string(stampSlug)
            ]
            try await SupabaseService.shared.client
                .from("user_stamps")
                .insert(payload)
                .execute()
            print("[ProgressService] 🪪 Awarded Stamp: \(stampSlug)")
        } catch {
            print("[ProgressService] ❌ Error awarding stamp: \(error)")
        }
    }
}
