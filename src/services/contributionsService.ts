/**
 * Contributions Service - Direct Supabase
 * NO MODAL - calls Supabase directly for all contribution operations
 */

import { log } from "@/lib/log";
import { supabase } from "@/services/gateways/supabaseClient";

export interface BuildingContribution {
    id: number;
    bin: string;
    address?: string;
    architect?: string;
    year_built?: number;
    style?: string;
    notes?: string;
    mat_prim?: string;
    mat_secondary?: string;
    mat_tertiary?: string;
    source_url?: string;
    source_type?: string;
    source_description?: string;
    verified_count: number;
    disputed_count: number;
    reliability_score: number;
    user_id: string;
    created_at: string;
}

export interface EditSuggestion {
    id: number;
    contribution_id: number;
    field_name: string;
    suggested_value: string;
    reason: string;
    votes_for: number;
    votes_against: number;
    user_id: string;
    status: string;
}

/**
 * Fetch contributions for a building
 */
export async function fetchBuildingContributions(
    buildingBIN: string,
): Promise<{ success: boolean; contributions: BuildingContribution[] }> {
    try {
        if (!supabase) {
            log.warn("[Contributions] Supabase not configured");
            return { success: false, contributions: [] };
        }

        // Try both BIN formats
        const binWithSuffix = buildingBIN.includes(".")
            ? buildingBIN
            : `${buildingBIN}.0`;
        const binWithoutSuffix = buildingBIN.replace(".0", "");

        const { data, error } = await supabase
            .from("building_contributions")
            .select("*")
            .or(`bin.eq.${binWithSuffix},bin.eq.${binWithoutSuffix}`)
            .order("created_at", { ascending: false });

        if (error) {
            log.warn("[Contributions] Query error:", error);
            return { success: false, contributions: [] };
        }

        log.info("[Contributions] Fetched", { count: data?.length || 0 });
        return { success: true, contributions: data || [] };
    } catch (error) {
        log.error("[Contributions] Error:", error);
        return { success: false, contributions: [] };
    }
}

/**
 * Verify a contribution
 */
export async function verifyContribution(
    contributionId: number,
    userId: string,
    verificationType: "verified" | "disputed",
): Promise<{ success: boolean; xp_earned?: number; error?: string }> {
    try {
        if (!supabase) {
            return { success: false, error: "Supabase not configured" };
        }

        // Check if user already verified this contribution
        const { data: existing } = await supabase
            .from("contribution_verifications")
            .select("id")
            .eq("contribution_id", contributionId)
            .eq("user_id", userId)
            .maybeSingle();

        if (existing) {
            return {
                success: false,
                error: "You already verified this contribution",
            };
        }

        // Check if user is the contributor (can't verify own)
        const { data: contribution } = await supabase
            .from("building_contributions")
            .select("user_id")
            .eq("id", contributionId)
            .single();

        if (contribution?.user_id === userId) {
            return {
                success: false,
                error: "You cannot verify your own contribution",
            };
        }

        // Insert verification
        const { error: insertError } = await supabase
            .from("contribution_verifications")
            .insert({
                contribution_id: contributionId,
                user_id: userId,
                verification_type: verificationType,
            });

        if (insertError) {
            log.error(
                "[Contributions] Verification insert error:",
                insertError,
            );
            return { success: false, error: "Failed to record verification" };
        }

        // Update counts on the contribution
        const updateField = verificationType === "verified"
            ? "verified_count"
            : "disputed_count";
        const { error: updateError } = await supabase.rpc(
            "increment_contribution_count",
            {
                p_contribution_id: contributionId,
                p_field: updateField,
            },
        );

        if (updateError) {
            log.warn("[Contributions] Count update error:", updateError);
            // Non-fatal, continue
        }

        // Award XP
        const xpAmount = verificationType === "verified" ? 5 : 3;
        await supabase.rpc("award_xp", {
            p_user_id: userId,
            p_amount: xpAmount,
            p_reason: `${verificationType} contribution`,
        });

        log.info("[Contributions] Verified", {
            contributionId,
            verificationType,
            xpAmount,
        });
        return { success: true, xp_earned: xpAmount };
    } catch (error) {
        log.error("[Contributions] Verification error:", error);
        return { success: false, error: "Verification failed" };
    }
}

/**
 * Fetch edit suggestions for a contribution
 */
export async function fetchEditSuggestions(
    contributionId: number,
): Promise<{ success: boolean; suggestions: EditSuggestion[] }> {
    try {
        if (!supabase) {
            return { success: false, suggestions: [] };
        }

        const { data, error } = await supabase
            .from("contribution_edit_suggestions")
            .select("*")
            .eq("contribution_id", contributionId)
            .eq("status", "pending")
            .order("created_at", { ascending: false });

        if (error) {
            log.warn("[Contributions] Edit suggestions query error:", error);
            return { success: false, suggestions: [] };
        }

        return { success: true, suggestions: data || [] };
    } catch (error) {
        log.error("[Contributions] Edit suggestions error:", error);
        return { success: false, suggestions: [] };
    }
}

/**
 * Vote on an edit suggestion
 */
export async function voteOnEditSuggestion(
    suggestionId: number,
    userId: string,
    voteType: "for" | "against",
): Promise<{ success: boolean; xp_earned?: number; auto_accepted?: boolean }> {
    try {
        if (!supabase) {
            return { success: false };
        }

        // Insert vote
        const { error: insertError } = await supabase
            .from("edit_suggestion_votes")
            .insert({
                suggestion_id: suggestionId,
                user_id: userId,
                vote_type: voteType,
            });

        if (insertError) {
            log.warn("[Contributions] Vote insert error:", insertError);
            return { success: false };
        }

        // Update vote counts
        const updateField = voteType === "for" ? "votes_for" : "votes_against";
        const { data: updated, error: updateError } = await supabase
            .from("contribution_edit_suggestions")
            .update({ [updateField]: supabase.rpc("increment", { x: 1 }) })
            .eq("id", suggestionId)
            .select("votes_for, votes_against")
            .single();

        if (updateError) {
            log.warn("[Contributions] Vote update error:", updateError);
        }

        // Check if auto-accept threshold reached (e.g., 3+ votes for)
        let autoAccepted = false;
        if (
            updated && updated.votes_for >= 3 &&
            updated.votes_for > updated.votes_against
        ) {
            await supabase
                .from("contribution_edit_suggestions")
                .update({ status: "accepted" })
                .eq("id", suggestionId);
            autoAccepted = true;
        }

        // Award XP
        const xpAmount = 2;
        await supabase.rpc("award_xp", {
            p_user_id: userId,
            p_amount: xpAmount,
            p_reason: "voted on edit suggestion",
        });

        return {
            success: true,
            xp_earned: xpAmount,
            auto_accepted: autoAccepted,
        };
    } catch (error) {
        log.error("[Contributions] Vote error:", error);
        return { success: false };
    }
}

/**
 * Fetch contributions near a GPS location
 */
export async function fetchContributionsByLocation(
    lat: number,
    lng: number,
    radiusMeters: number = 50,
): Promise<BuildingContribution[]> {
    try {
        if (!supabase) {
            return [];
        }

        // Convert radius to degrees (approximate)
        const latDelta = radiusMeters / 111000;
        const lngDelta = radiusMeters /
            (111000 * Math.cos((lat * Math.PI) / 180));

        const { data, error } = await supabase
            .from("building_contributions")
            .select("*")
            .gte("gps_lat", lat - latDelta)
            .lte("gps_lat", lat + latDelta)
            .gte("gps_lng", lng - lngDelta)
            .lte("gps_lng", lng + lngDelta)
            .limit(10);

        if (error) {
            log.warn("[Contributions] Location query error:", error);
            return [];
        }

        return data || [];
    } catch (error) {
        log.error("[Contributions] Location query error:", error);
        return [];
    }
}
