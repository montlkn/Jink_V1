import Foundation
import Supabase

final class SupabaseService {
    static let shared = SupabaseService()

    private(set) var client: SupabaseClient!
    private(set) var buildingsClient: SupabaseClient!

    private init() {}

    func configure() {
        client = SupabaseClient(
            supabaseURL: URL(string: "https://gzzvhmmywaaxljpmoacm.supabase.co")!,
            supabaseKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6enZobW15d2FheGxqcG1vYWNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4ODA4NTYsImV4cCI6MjA2NjQ1Njg1Nn0.Euv81JmeXShGmyyXcD7Am3Gi0SjsLqMLSevC1PZVBaA",
            options: SupabaseClientOptions(
                auth: SupabaseClientOptions.AuthOptions(
                    redirectToURL: URL(string: "jink://auth/callback"),
                    emitLocalSessionAsInitialSession: true
                )
            )
        )
        buildingsClient = SupabaseClient(
            supabaseURL: URL(string: "https://cglsuoymdcchrxyzofjb.supabase.co")!,
            supabaseKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnbHN1b3ltZGNjaHJ4eXpvZmpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NzYyNTIsImV4cCI6MjA3NTI1MjI1Mn0.4GqCKT3fe8HTDTx_O5BTYe7m4TXOWgKYkAdmZfl4jG0",
            options: SupabaseClientOptions(
                auth: SupabaseClientOptions.AuthOptions(
                    emitLocalSessionAsInitialSession: true
                )
            )
        )
        print("[SupabaseService] ✅ Configured")
    }
}
