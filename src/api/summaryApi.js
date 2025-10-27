/**
 * Client-side API for profile summary endpoints
 */

import { supabaseGateway as supabase } from "@/services/gateways";

// Use environment variable API_URL if available, otherwise use relative path
const API_BASE = process.env.EXPO_PUBLIC_API_URL
  ? `${process.env.EXPO_PUBLIC_API_URL}/v1/profile`
  : "/v1/profile";

async function getAuthHeaders() {
  // Ensure we have a fresh access token
  const { data } = await supabase.auth.getSession();
  let token = data?.session?.access_token;

  // If token missing, attempt a refresh once
  if (!token && data?.session) {
    try {
      const { data: refreshed } = await supabase.auth.refreshSession();
      token = refreshed?.session?.access_token || token;
    } catch (e) {
      // ignore and let the caller handle missing token
    }
  }

  if (!token) {
    // Provide a clear error for callers to handle gracefully
    const err = new Error("No access token — user not authenticated");
    err.code = "NO_TOKEN";
    throw err;
  }

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-Client": "mobile-app",
  };
}

/**
 * Fetch current summary with optional auto-generation
 * ?autogen=true queues generation if needed
 */
export async function fetchSummary(autogen = false) {
  try {
    const url = `${API_BASE}/summary${autogen ? "?autogen=true" : ""}`;
    console.log(`[summary-api] fetchSummary start autogen=${autogen} url=${url}`);
    const response = await fetch(url, {
      method: "GET",
      headers: await getAuthHeaders(),
    });

    if (!response.ok) {
      let bodyText = "";
      try { bodyText = await response.text(); } catch {}
      throw new Error(`HTTP ${response.status}: ${response.statusText} ${bodyText || ""}`.trim());
    }
    const json = await response.json();
    console.log(`[summary-api] fetchSummary success autogen=${autogen}`, JSON.stringify(json));
    return json;
  } catch (error) {
    console.error("[summary-api] Fetch error:", error.message);
    throw error;
  }
}

function generateIdempotencyKey(providedKey) {
  if (providedKey && typeof providedKey === "string") {
    return providedKey;
  }

  if (globalThis?.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  // Fallback UUID v4 generator for environments without crypto support (Expo bridge)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const rand = Math.random() * 16 | 0;
    const value = char === "x" ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}

/**
 * Manually regenerate summary
 * Requires Idempotency-Key header for deduplication
 */
export async function regenerateSummary(idempotencyKey) {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/summary/regenerate`, {
      method: "POST",
      headers: {
        ...headers,
        "Idempotency-Key": generateIdempotencyKey(idempotencyKey),
      },
      body: JSON.stringify({ reason: "manual_refresh" }),
    });

    if (!response.ok) {
      let bodyText = "";
      try { bodyText = await response.text(); } catch {}
      throw new Error(`HTTP ${response.status}: ${response.statusText} ${bodyText || ""}`.trim());
    }

    return await response.json();
  } catch (error) {
    console.error("[summary-api] Regenerate error:", error.message);
    throw error;
  }
}

/**
 * Fetch metadata without triggering generation
 */
export async function fetchSummaryMeta() {
  try {
    const response = await fetch(`${API_BASE}/summary/meta`, {
      method: "GET",
      headers: await getAuthHeaders(),
    });

    if (!response.ok) {
      let bodyText = "";
      try { bodyText = await response.text(); } catch {}
      throw new Error(`HTTP ${response.status}: ${response.statusText} ${bodyText || ""}`.trim());
    }

    return await response.json();
  } catch (error) {
    console.error("[summary-api] Meta fetch error:", error.message);
    throw error;
  }
}
