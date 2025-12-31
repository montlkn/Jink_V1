/**
 * RAG Service - Retrieval-Augmented Generation
 * Fetches relevant historical context from NYC Landmarks PDF chunks
 */

import { log } from "@/lib/log";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "https://lucienmount--nyc-scan-api-fastapi-app.modal.run";

export type LandmarkChunk = {
    id: number;
    building_name: string | null;
    bin: string | null;
    bbl: string | null;
    address: string | null;
    chunk_text: string;
    source_file: string | null;
    page_number: number | null;
};

/**
 * Get relevant landmark chunks for a building
 * Returns historical context from NYC Landmarks Commission reports
 */
export async function getLandmarkContext(
    buildingName: string,
    limit: number = 3,
): Promise<string[]> {
    if (!buildingName) {
        return [];
    }

    try {
        const url = `${API_BASE_URL}/api/rag/search?building_name=${encodeURIComponent(buildingName)}&limit=${limit}`;
        const response = await fetch(url);

        if (!response.ok) {
            log.warn("[RAG] API error:", response.status);
            return [];
        }

        const data = await response.json() as LandmarkChunk[];

        if (!data || data.length === 0) {
            log.info("[RAG] No chunks found for:", buildingName);
            return [];
        }

        // Extract chunk texts
        const chunks = data.map((chunk) => chunk.chunk_text);

        log.info("[RAG] Retrieved chunks", {
            building: buildingName,
            count: chunks.length,
        });

        return chunks;
    } catch (error: unknown) {
        log.error("[RAG] Error fetching landmark context:", error);
        return [];
    }
}

/**
 * Get landmark context for multiple buildings in parallel
 * Returns a map of building name -> chunks
 */
export async function getLandmarkContextBatch(
    buildingNames: string[],
    limit: number = 3,
): Promise<Record<string, string[]>> {
    const results: Record<string, string[]> = {};

    // Fetch all in parallel
    const promises = buildingNames.map(async (name) => {
        const chunks = await getLandmarkContext(name, limit);
        return { name, chunks };
    });

    const settled = await Promise.allSettled(promises);

    // Collect results
    settled.forEach((result) => {
        if (result.status === "fulfilled") {
            results[result.value.name] = result.value.chunks;
        }
    });

    log.info("[RAG] Batch fetch complete", {
        requested: buildingNames.length,
        retrieved: Object.keys(results).length,
    });

    return results;
}

/**
 * Format chunks into a context block for LLM prompts
 */
export function formatContextBlock(
    contextMap: Record<string, string[]>,
    maxCharsPerChunk: number = 200,
): string {
    if (Object.keys(contextMap).length === 0) {
        return "";
    }

    let block = "\n\nHistorical context from NYC Landmarks reports:\n";

    for (const [buildingName, chunks] of Object.entries(contextMap)) {
        if (chunks.length > 0) {
            // Use first chunk, truncated
            const excerpt = chunks[0].substring(0, maxCharsPerChunk);
            block += `- ${buildingName}: "${excerpt}..."\n`;
        }
    }

    return block;
}

/**
 * Check if RAG is available (API endpoint responds)
 */
export async function isRagAvailable(): Promise<boolean> {
    try {
        const url = `${API_BASE_URL}/api/rag/search?building_name=test&limit=1`;
        const response = await fetch(url);
        const available = response.ok;
        log.info("[RAG] availability:", available ? "yes" : "no");
        return available;
    } catch (error: unknown) {
        log.warn("[RAG] availability check error:", error);
        return false;
    }
}
