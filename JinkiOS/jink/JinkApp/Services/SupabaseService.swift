import Foundation
import Supabase

final class SupabaseService {
    static let shared = SupabaseService()

    private(set) var client: SupabaseClient!
    private(set) var buildingsClient: SupabaseClient!

    private init() {}

    func configure() {
        let info = Bundle.main.infoDictionary ?? [:]
        func resolved(_ key: String) -> String? {
            guard let v = info[key] as? String, !v.isEmpty, !v.hasPrefix("$(") else { return nil }
            return v
        }

        guard
            let supabaseURLString = resolved("SUPABASE_URL"),
            let supabaseKey = resolved("SUPABASE_ANON_KEY"),
            let supabaseURL = URL(string: supabaseURLString),
            let buildingsURLString = resolved("BUILDINGS_SUPABASE_URL"),
            let buildingsKey = resolved("BUILDINGS_SUPABASE_ANON_KEY"),
            let buildingsURL = URL(string: buildingsURLString)
        else {
            fatalError("[SupabaseService] Missing Supabase config in Info.plist. Ensure Secrets.xcconfig has URLs escaped with /$()/  instead of //")
        }

        client = SupabaseClient(
            supabaseURL: supabaseURL,
            supabaseKey: supabaseKey,
            options: SupabaseClientOptions(
                auth: SupabaseClientOptions.AuthOptions(
                    redirectToURL: URL(string: "jink://auth/callback"),
                    emitLocalSessionAsInitialSession: true
                )
            )
        )
        buildingsClient = SupabaseClient(
            supabaseURL: buildingsURL,
            supabaseKey: buildingsKey,
            options: SupabaseClientOptions(
                auth: SupabaseClientOptions.AuthOptions(
                    emitLocalSessionAsInitialSession: true
                )
            )
        )
        print("[SupabaseService] Configured")
    }
}
