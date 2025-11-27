import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

// Secondary Supabase client for buildings database
const buildingsSupabaseUrl =
    Constants.expoConfig?.extra?.buildingsSupabaseUrl ||
    process.env.EXPO_PUBLIC_BUILDINGS_SUPABASE_URL;

const buildingsSupabaseKey =
    Constants.expoConfig?.extra?.buildingsSupabaseAnonKey ||
    process.env.EXPO_PUBLIC_BUILDINGS_SUPABASE_ANON_KEY;

if (!buildingsSupabaseUrl || !buildingsSupabaseKey) {
    console.warn(
        "[buildingsSupabaseClient] Buildings Supabase not configured - building data will use placeholders",
    );
}

export const buildingsSupabaseClient =
    buildingsSupabaseUrl && buildingsSupabaseKey
        ? createClient(buildingsSupabaseUrl, buildingsSupabaseKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        })
        : null;

export function getBuildingsClient() {
    if (!buildingsSupabaseClient) {
        throw new Error(
            "[buildingsSupabaseClient] Buildings Supabase client not initialized. Check environment variables.",
        );
    }
    return buildingsSupabaseClient;
}
