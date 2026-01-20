/**
 * Similar Buildings Service - Direct Supabase + Client-side Gemini
 * NO MODAL NEEDED - calls Supabase RPC directly and Gemini from client
 *
 * STREAMING: Buildings are returned immediately, reasons are generated async
 */

import { log } from "@/lib/log";
import { getLandmarkContext } from "@/services/ai/ragService";
import { getGeminiModel } from "@/services/gateways";
import { buildingsSupabaseClient as supabase } from "@/services/gateways/buildingsSupabaseClient";

export type SimilarBuilding = {
    bin: string;
    name: string | null;
    address: string | null;
    architect: string | null;
    style: string | null;
    materials: string | null;
    year: number | null;
    latitude: number | null;
    longitude: number | null;
    visual_similarity: number;
    metadata_boost: number;
    combined_score: number;
    similarity_reason?: string | null;
    reasonLoading?: boolean;
};

export type FindSimilarParams = {
    bin: string;
    limit?: number;
    sourceName?: string;
    sourceStyle?: string;
    sourceYear?: number;
};

/**
 * Generate a similarity explanation for a SINGLE building using Gemini
 * This allows streaming updates to the UI as each reason is generated
 */
export async function generateSingleReason(
    sourceName: string,
    sourceStyle: string | null,
    sourceYear: number | null,
    targetBuilding: SimilarBuilding,
): Promise<string> {
    try {
        const model = getGeminiModel("gemini-2.0-flash-lite");
        const targetName = targetBuilding.name || "Unknown";

        // Fetch RAG context for both buildings
        const [sourceContext, targetContext] = await Promise.all([
            getLandmarkContext(sourceName, 1),
            getLandmarkContext(targetName, 1),
        ]);

        const hasContext = sourceContext.length > 0 || targetContext.length > 0;

        // Build context block
        let contextBlock = "";
        if (sourceContext.length > 0) {
            contextBlock += `\n${sourceName}: "${sourceContext[0].substring(0, 200)}..."`;
        }
        if (targetContext.length > 0) {
            contextBlock += `\n${targetName}: "${targetContext[0].substring(0, 200)}..."`;
        }

        // Build shared attributes to explicitly exclude from the response
        const sharedStyle = sourceStyle && targetBuilding.style &&
            sourceStyle.toLowerCase() === targetBuilding.style?.toLowerCase();
        const sameEra = sourceYear && targetBuilding.year &&
            Math.abs(sourceYear - targetBuilding.year) <= 5;

        const avoidList = [];
        if (sharedStyle) avoidList.push(`mentioning "${sourceStyle}" style (already obvious)`);
        if (sameEra) avoidList.push("generic era references");
        avoidList.push("generic phrases like 'both exemplify', 'both showcase', 'both feature'");

        const prompt = hasContext
            ? `What SPECIFIC detail connects these two buildings? One sentence, max 18 words.

${sourceName} (${sourceYear || "?"}, ${sourceStyle || "unknown"})
${targetName} (${targetBuilding.year || "?"}, ${targetBuilding.style || "unknown"})

Context:${contextBlock}

AVOID: ${avoidList.join("; ")}

Focus on ONE specific detail like:
- Same architect or architectural firm
- Shared materials (specific terra cotta supplier, limestone source)
- Same developer or commission
- Specific design element (crown, spire, lobby, setbacks from same zoning law)
- Historical connection (same exhibition, competition, client)

Good: "Both crowned by distinctive stainless steel spires by the same metalworker"
Good: "Commissioned by the same developer who shaped Midtown's skyline"
Bad: "Both are Art Deco buildings with ornamental facades"

Output ONLY the specific connection.`
            : `What SPECIFIC detail connects these two buildings? One sentence, max 18 words.

${sourceName} (${sourceYear || "?"}, ${sourceStyle || "unknown"})
${targetName} (${targetBuilding.year || "?"}, ${targetBuilding.style || "unknown"})

AVOID: ${avoidList.join("; ")}

Focus on ONE specific detail like:
- Shared architect, firm, or craftsman
- Specific material or construction technique
- Same zoning law influence (e.g., 1916 setback law)
- Crown/spire/lobby design similarity
- Same neighborhood development wave

Good: "Setbacks shaped by the 1916 zoning resolution that defined the ziggurat silhouette"
Good: "Lobbies feature murals by artists from the same WPA program"
Bad: "Both buildings exhibit Art Deco styling from the 1930s"

Output ONLY the specific connection.`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();

        // Clean up any numbering or extra formatting
        const cleaned = text.replace(/^\d+[\.\)\-\s]+/, "").trim();

        log.info("[SimilarBuildings] Generated reason", {
            target: targetName,
            withRAG: hasContext,
        });

        return cleaned || "Shares similar architectural characteristics.";
    } catch (error) {
        log.warn("[SimilarBuildings] Reason generation failed:", error);
        // Return a fallback based on available metadata
        if (targetBuilding.style) {
            return `Both feature ${targetBuilding.style} architectural elements.`;
        }
        if (targetBuilding.year && sourceYear && Math.abs(targetBuilding.year - sourceYear) <= 10) {
            return `Built in the same era with similar design sensibilities.`;
        }
        return "Shares similar architectural characteristics.";
    }
}

/**
 * Find similar buildings using direct Supabase RPC + client-side Gemini
 * NO MODAL NEEDED
 */
export async function findSimilarBuildings(
    params: FindSimilarParams,
): Promise<SimilarBuilding[]> {
    const { bin, limit = 7 } = params;
    // Note: sourceName, sourceStyle, sourceYear are part of params but not used in this function

    if (!bin) {
        log.warn("[SimilarBuildings] No bin provided");
        return [];
    }

    try {
        // Check if buildings database is configured
        if (!supabase) {
            log.warn("[SimilarBuildings] Buildings database not configured");
            return [];
        }

        // Step 1: Get source building metadata
        // Try both BIN formats (with and without .0 suffix)
        const binWithSuffix = bin.includes(".") ? bin : `${bin}.0`;
        const binWithoutSuffix = bin.replace(".0", "");

        log.info("[SimilarBuildings] Looking up BIN:", {
            original: bin,
            withSuffix: binWithSuffix,
            withoutSuffix: binWithoutSuffix,
        });

        const { data: buildingData, error: buildingError } = await supabase
            .from("buildings_full_merge_scanning")
            .select("id, building_name, style, architect, mat_prim, year_built")
            .or(`bin.eq.${binWithSuffix},bin.eq.${binWithoutSuffix}`)
            .limit(1)
            .single();

        if (buildingError) {
            log.warn("[SimilarBuildings] Query error:", buildingError);
        }

        if (buildingError || !buildingData) {
            log.warn("[SimilarBuildings] Source building not found:", bin);
            return [];
        }

        // Step 2: Get embedding for this building
        const { data: embeddingData, error: embeddingError } = await supabase
            .from("reference_embeddings")
            .select("embedding")
            .eq("building_id", buildingData.id)
            .limit(1)
            .single();

        if (embeddingError || !embeddingData?.embedding) {
            log.warn(
                "[SimilarBuildings] No embedding found for building:",
                bin,
            );
            return [];
        }

        // Step 3: Call find_similar_buildings RPC
        const { data: results, error: rpcError } = await supabase.rpc(
            "find_similar_buildings",
            {
                target_embedding: embeddingData.embedding,
                target_style: buildingData.style,
                target_architect: buildingData.architect,
                target_materials: buildingData.mat_prim,
                match_count: limit,
                exclude_bin: bin.includes(".0") ? bin : `${bin}.0`,
            },
        );

        if (rpcError) {
            log.error("[SimilarBuildings] RPC error:", rpcError);
            return [];
        }

        // Map results
        const buildings: SimilarBuilding[] = (results || []).map((r: any) => ({
            bin: r.building_bin || r.bin,
            name: r.name,
            address: r.address,
            architect: r.architect,
            style: r.style,
            materials: r.materials,
            year: r.year,
            latitude: r.latitude,
            longitude: r.longitude,
            visual_similarity: r.visual_similarity,
            metadata_boost: r.metadata_boost,
            combined_score: r.combined_score,
            similarity_reason: null,
        }));

        log.info("[SimilarBuildings] Found results", {
            count: buildings.length,
            topScore: buildings[0]?.combined_score,
        });

        // Return buildings immediately - reasons will be generated async by the UI
        // Mark all as loading so UI can show skeleton/spinner
        buildings.forEach((b) => {
            b.similarity_reason = null;
            b.reasonLoading = true;
        });

        return buildings;
    } catch (error) {
        log.error("[SimilarBuildings] Error:", error);
        return [];
    }
}

/**
 * Format similarity score as percentage
 */
export function formatSimilarityScore(score: number): string {
    return `${Math.round(score * 100)}%`;
}

/**
 * Get similarity badge color based on score
 */
export function getSimilarityColor(score: number): string {
    if (score >= 0.85) return "#22c55e";
    if (score >= 0.7) return "#3b82f6";
    if (score >= 0.55) return "#f59e0b";
    return "#94a3b8";
}
