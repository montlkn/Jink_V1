import Foundation
import Supabase

final class SupabaseService {
    static let shared = SupabaseService()

    private(set) var client: SupabaseClient!
    private(set) var buildingsClient: SupabaseClient!

    private init() {}

    func configure() {
        guard
            let supabaseURLString = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String,
            let supabaseURL = URL(string: supabaseURLString),
            let supabaseKey = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String,
            let buildingsURLString = Bundle.main.object(forInfoDictionaryKey: "BUILDINGS_SUPABASE_URL") as? String,
            let buildingsURL = URL(string: buildingsURLString),
            let buildingsKey = Bundle.main.object(forInfoDictionaryKey: "BUILDINGS_SUPABASE_ANON_KEY") as? String
        else {
            fatalError("Missing Supabase config in Info.plist. Check Secrets.xcconfig.")
        }

        client = SupabaseClient(supabaseURL: supabaseURL, supabaseKey: supabaseKey)
        buildingsClient = SupabaseClient(supabaseURL: buildingsURL, supabaseKey: buildingsKey)
    }
}
