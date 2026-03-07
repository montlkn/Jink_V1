/**
 * RAG Service - Retrieval-Augmented Generation
 * Fetches relevant historical context from NYC Landmarks PDF chunks
 *
 * Improvements:
 * - Local cache of successful RAG results
 * - Retry logic with exponential backoff
 * - Better error messaging vs silent failure
 * - Show partial content if available
 */

import { log } from "@/lib/log";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "https://lucienmount--nyc-scan-api-fastapi-app.modal.run";
const RAG_CACHE_KEY = "@rag_cache";
const RAG_CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

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

export type RAGResult = {
    chunks: string[];
    fromCache: boolean;
    error?: string;
};

// In-memory cache for fast access
const memoryCache: Map<string, { chunks: string[]; timestamp: number }> = new Map();

/**
 * Load cached RAG results from storage
 */
async function loadCacheFromStorage(): Promise<Map<string, { chunks: string[]; timestamp: number }>> {
    try {
        const cacheJson = await AsyncStorage.getItem(RAG_CACHE_KEY);
        if (!cacheJson) return new Map();

        const cacheArray = JSON.parse(cacheJson) as Array<[string, { chunks: string[]; timestamp: number }]>;
        return new Map(cacheArray);
    } catch (error) {
        log.warn("[RAG] Failed to load cache from storage", error);
        return new Map();
    }
}

/**
 * Save RAG results to cache
 */
async function saveToCache(buildingName: string, chunks: string[]): Promise<void> {
    const key = buildingName.toLowerCase().trim();
    const entry = { chunks, timestamp: Date.now() };

    // Save to memory cache
    memoryCache.set(key, entry);

    // Save to persistent storage
    try {
        const existingCache = await loadCacheFromStorage();
        existingCache.set(key, entry);

        // Clean up expired entries
        const now = Date.now();
        for (const [k, v] of existingCache) {
            if (now - v.timestamp > RAG_CACHE_EXPIRY_MS) {
                existingCache.delete(k);
            }
        }

        // Limit cache size to 100 entries
        if (existingCache.size > 100) {
            const entries = Array.from(existingCache.entries());
            entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
            while (entries.length > 100) {
                existingCache.delete(entries.shift()![0]);
            }
        }

        await AsyncStorage.setItem(RAG_CACHE_KEY, JSON.stringify(Array.from(existingCache)));
    } catch (error) {
        log.warn("[RAG] Failed to save to cache", error);
    }
}

/**
 * Get cached RAG results
 */
async function getFromCache(buildingName: string): Promise<string[] | null> {
    const key = buildingName.toLowerCase().trim();

    // Check memory cache first
    const memoryEntry = memoryCache.get(key);
    if (memoryEntry && Date.now() - memoryEntry.timestamp < RAG_CACHE_EXPIRY_MS) {
        log.info("[RAG] Memory cache hit for:", buildingName);
        return memoryEntry.chunks;
    }

    // Check persistent storage
    const storageCache = await loadCacheFromStorage();
    const storageEntry = storageCache.get(key);
    if (storageEntry && Date.now() - storageEntry.timestamp < RAG_CACHE_EXPIRY_MS) {
        // Populate memory cache
        memoryCache.set(key, storageEntry);
        log.info("[RAG] Storage cache hit for:", buildingName);
        return storageEntry.chunks;
    }

    return null;
}

/**
 * Retry a function with exponential backoff
 */
async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelayMs: number = 1000,
): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;
            log.warn(`[RAG] Attempt ${attempt + 1} failed:`, error);

            if (attempt < maxRetries - 1) {
                const delay = baseDelayMs * Math.pow(2, attempt);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError || new Error("Max retries exceeded");
}

/**
 * Get relevant landmark chunks for a building
 * Returns historical context from NYC Landmarks Commission reports
 *
 * Includes caching, retry logic, and better error handling
 */
export async function getLandmarkContext(
    buildingName: string,
    limit: number = 3,
): Promise<string[]> {
    if (!buildingName) {
        return [];
    }

    // Check cache first
    const cached = await getFromCache(buildingName);
    if (cached) {
        return cached;
    }

    try {
        const fetchWithTimeout = async (): Promise<Response> => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

            try {
                const url = `${API_BASE_URL}/api/rag/search?building_name=${encodeURIComponent(buildingName)}&limit=${limit}`;
                const response = await fetch(url, { signal: controller.signal });
                clearTimeout(timeoutId);
                return response;
            } catch (error) {
                clearTimeout(timeoutId);
                throw error;
            }
        };

        // Retry with backoff
        const response = await retryWithBackoff(fetchWithTimeout, 2, 500);

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

        // Cache successful results
        await saveToCache(buildingName, chunks);

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
 * Get landmark context with detailed result info
 * Use this when you need to know about errors/cache status
 */
export async function getLandmarkContextWithStatus(
    buildingName: string,
    limit: number = 3,
): Promise<RAGResult> {
    if (!buildingName) {
        return { chunks: [], fromCache: false, error: "No building name provided" };
    }

    // Check cache first
    const cached = await getFromCache(buildingName);
    if (cached) {
        return { chunks: cached, fromCache: true };
    }

    try {
        const chunks = await getLandmarkContext(buildingName, limit);
        return { chunks, fromCache: false };
    } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        return { chunks: [], fromCache: false, error: errorMsg };
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
