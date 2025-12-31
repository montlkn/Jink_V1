/**
 * Architectural Commentary Service
 * Generates AI-powered insights about building similarities
 */

import { log } from "@/lib/log";
import { getGeminiModel } from "@/services/gateways";

export type SimilarityCommentary = {
    /** Short insight (~15 words) - always displayed */
    short: string;
    /** Expanded explanation (~50 words) - shown on tap */
    expanded: string;
};

type BuildingMetadata = {
    name: string;
    style?: string;
    architect?: string;
    year?: number;
};

/**
 * Generate AI commentary explaining architectural similarities
 * Returns both a short teaser and expanded explanation
 */
export async function generateSimilarityCommentary(params: {
    sourceBuilding: BuildingMetadata;
    similarBuildings: BuildingMetadata[];
}): Promise<SimilarityCommentary> {
    const { sourceBuilding, similarBuildings } = params;

    // Fallback responses if AI fails
    const fallback: SimilarityCommentary = {
        short: "Visually similar architectural forms.",
        expanded:
            "Explore buildings with similar visual characteristics and design elements.",
    };

    if (!similarBuildings.length) {
        return fallback;
    }

    try {
        const model = getGeminiModel("gemini-2.0-flash-lite");

        const topBuildings = similarBuildings
            .slice(0, 3)
            .map((b) => `${b.name}${b.style ? ` (${b.style})` : ""}`)
            .join(", ");

        const prompt = `You are an architectural historian. Given:
Source: "${sourceBuilding.name}"${
            sourceBuilding.style ? ` (${sourceBuilding.style})` : ""
        }${sourceBuilding.year ? `, ${sourceBuilding.year}` : ""}
Similar: ${topBuildings}

Respond in JSON format only:
{"short": "<15 word insight about what connects these buildings>", "expanded": "<50 word detailed explanation of their architectural relationship>"}`;

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                maxOutputTokens: 120,
                temperature: 0.7,
            },
        });

        const responseText = result.response?.text() || "";

        // Clean up markdown code blocks
        const cleanJson = responseText
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "")
            .trim();

        const parsed = JSON.parse(cleanJson);

        log.info("[Commentary] Generated successfully", {
            shortLength: parsed.short?.length,
            expandedLength: parsed.expanded?.length,
        });

        return {
            short: parsed.short || fallback.short,
            expanded: parsed.expanded || fallback.expanded,
        };
    } catch (error: unknown) {
        log.warn("[Commentary] Failed to generate", error);
        return fallback;
    }
}
