import Foundation
import Supabase

final class ProgressService {
    static let shared = ProgressService()
    private init() {}

    /// Triggered after a successful building scan
    func processScan(userId: String, match: ScanMatch?) async {
        let bin = match?.bin ?? ""

        // 1. Check if this building was already scanned (scans are on buildingsClient)
        var isNewScan = true
        if !bin.isEmpty {
            isNewScan = await checkIsNewScan(userId: userId, bin: bin)
        }

        // 2. Award XP only for new buildings
        if isNewScan {
            await callRPC("award_xp", params: [
                "p_user_id": AnyJSON.string(userId),
                "p_amount": AnyJSON.integer(50),
                "p_reason": AnyJSON.string("scan")
            ])
            print("[ProgressService] Awarded 50 XP for new scan (bin=\(bin))")
        } else {
            print("[ProgressService] Skipped XP — already scanned bin=\(bin)")
        }

        // 3. Update daily streak
        await callRPC("update_daily_streak", params: [
            "p_user_id": AnyJSON.string(userId)
        ])

        // 4. Check achievements client-side
        await checkAndAwardAchievements(userId: userId)

        // 5. Recalculate aesthetic profile
        await callRPC("process_aesthetic_events_for_user", params: [
            "p_user_id": AnyJSON.string(userId),
            "p_batch_size": AnyJSON.integer(50)
        ])
    }

    /// Triggered after a completed walk
    func processWalk(userId: String) async {
        await callRPC("process_aesthetic_events_for_user", params: [
            "p_user_id": AnyJSON.string(userId),
            "p_batch_size": AnyJSON.integer(50)
        ])
    }

    // MARK: - Private

    /// Check if user already scanned this BIN (queries buildings Supabase)
    private func checkIsNewScan(userId: String, bin: String) async -> Bool {
        do {
            let data = try await SupabaseService.shared.buildingsClient
                .from("scans")
                .select("id", head: true, count: .exact)
                .eq("user_id", value: userId)
                .eq("confirmed_bin", value: bin)
                .execute()
            let count = data.count ?? 0
            // count <= 1 means this is the first (current) scan for this building
            let isNew = count <= 1
            print("[ProgressService] checkIsNewScan bin=\(bin) count=\(count) isNew=\(isNew)")
            return isNew
        } catch {
            print("[ProgressService] checkIsNewScan failed: \(error)")
            return true
        }
    }

    /// Public entry point for retroactive achievement check
    func checkAndAwardAchievementsPublic(userId: String) async {
        await checkAndAwardAchievements(userId: userId)
    }

    /// Client-side achievement check since scans and achievements are on different DBs
    private func checkAndAwardAchievements(userId: String) async {
        do {
            // Count scans from buildings Supabase
            struct CountRow: Decodable { let confirmedBin: String?
                enum CodingKeys: String, CodingKey { case confirmedBin = "confirmed_bin" }
            }
            let scanRows: [CountRow] = try await SupabaseService.shared.buildingsClient
                .from("scans")
                .select("confirmed_bin")
                .eq("user_id", value: userId)
                .not("confirmed_bin", operator: .is, value: "null")
                .execute()
                .value
            let uniqueBins = Set(scanRows.compactMap { $0.confirmedBin })
            let scanCount = uniqueBins.count
            print("[ProgressService] Achievement check: scanCount=\(scanCount)")

            // Fetch achievement definitions from main Supabase
            let response = try await SupabaseService.shared.client
                .from("achievements_def")
                .select("id, slug, condition_type, condition_value, xp_reward, stamp_slug")
                .execute()

            // Parse manually since condition_value is JSONB
            // Note: achievements_def.id may be UUID or bigint — decode flexibly
            struct RawAch: Decodable {
                let id: FlexId
                let slug: String
                let condition_type: String
                let condition_value: ConditionValue
                let xp_reward: Int
                let stamp_slug: String?
            }

            struct ConditionValue: Decodable {
                let min: Int?
            }

            let defs = try JSONDecoder().decode([RawAch].self, from: response.data)
            print("[ProgressService] Found \(defs.count) achievement definitions")

            // Get already-awarded achievements — achievement_id may be bigint or UUID
            let awardedResponse = try await SupabaseService.shared.client
                .from("user_achievements")
                .select("achievement_id")
                .eq("user_id", value: userId)
                .execute()
            struct AwardedRaw: Decodable { let achievement_id: FlexId }
            let awarded = try JSONDecoder().decode([AwardedRaw].self, from: awardedResponse.data)
            let awardedIds = Set(awarded.map { $0.achievement_id })
            print("[ProgressService] Already awarded: \(awardedIds.count) achievements")

            // Check each achievement
            for def in defs {
                guard !awardedIds.contains(def.id) else { continue }

                var met = false
                if def.condition_type == "scan_count", let minVal = def.condition_value.min {
                    met = scanCount >= minVal
                    if met {
                        print("[ProgressService] Achievement '\(def.slug)' condition met: \(scanCount) >= \(minVal)")
                    }
                }

                if met {
                    // Award achievement
                    do {
                        try await SupabaseService.shared.client
                            .from("user_achievements")
                            .insert([
                                "user_id": AnyJSON.string(userId),
                                "achievement_id": def.id.jsonValue
                            ])
                            .execute()
                        print("[ProgressService] ✅ Awarded achievement: \(def.slug)")
                    } catch {
                        print("[ProgressService] ❌ Failed to insert achievement '\(def.slug)': \(error)")
                        continue
                    }

                    // Award stamp if linked
                    if let slug = def.stamp_slug, !slug.isEmpty {
                        await awardStampBySlug(userId: userId, slug: slug, sourceId: def.id)
                    }

                    // Award XP for achievement
                    if def.xp_reward > 0 {
                        await callRPC("award_xp", params: [
                            "p_user_id": AnyJSON.string(userId),
                            "p_amount": AnyJSON.integer(def.xp_reward),
                            "p_reason": AnyJSON.string("achievement_unlock")
                        ])
                    }
                }
            }
        } catch {
            print("[ProgressService] ❌ checkAndAwardAchievements failed: \(error)")
        }
    }

    private func awardStampBySlug(userId: String, slug: String, sourceId: FlexId) async {
        do {
            // stamps_def.id may be bigint or UUID
            let response = try await SupabaseService.shared.client
                .from("stamps_def")
                .select("id")
                .eq("slug", value: slug)
                .execute()
            struct StampDef: Decodable { let id: FlexId }
            let stamps = try JSONDecoder().decode([StampDef].self, from: response.data)
            guard let stampId = stamps.first?.id else {
                print("[ProgressService] No stamp_def found for slug=\(slug)")
                return
            }

            try await SupabaseService.shared.client
                .from("user_stamps")
                .insert([
                    "user_id": AnyJSON.string(userId),
                    "stamp_id": stampId.jsonValue,
                    "source_type": AnyJSON.string("achievement_unlock"),
                    "source_id": sourceId.jsonValue
                ])
                .execute()
            print("[ProgressService] ✅ Awarded stamp: \(slug)")
        } catch {
            print("[ProgressService] ❌ awardStampBySlug failed for '\(slug)': \(error)")
        }
    }

    private func callRPC(_ name: String, params: [String: AnyJSON]) async {
        do {
            try await SupabaseService.shared.client
                .rpc(name, params: params)
                .execute()
            print("[ProgressService] \(name) succeeded")
        } catch {
            print("[ProgressService] \(name) failed: \(error)")
        }
    }
}
