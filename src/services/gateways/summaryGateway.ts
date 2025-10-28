import type { Session } from "@supabase/supabase-js";
import { log } from "@/lib/log";
import { getSession, supabaseGateway as supabase } from "./supabaseGateway";

const API_BASE = process.env.EXPO_PUBLIC_API_URL
  ? `${process.env.EXPO_PUBLIC_API_URL}/v1/profile`
  : "/v1/profile";

async function resolveSession(): Promise<Session | null> {
  try {
    return await getSession();
  } catch (error) {
    log.error("[summaryGateway] Failed to resolve session", error);
    return null;
  }
}

async function getAuthHeaders() {
  const session = await resolveSession();
  let token = session?.access_token;

  if (!token && session) {
    try {
      const { data } = await supabase.auth.refreshSession();
      token = data?.session?.access_token ?? token;
    } catch (error) {
      log.warn("[summaryGateway] Failed to refresh session", error);
    }
  }

  if (!token) {
    const err = new Error("No access token — user not authenticated");
    (err as Error & { code?: string }).code = "NO_TOKEN";
    throw err;
  }

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-Client": "mobile-app",
  };
}

function generateIdempotencyKey(providedKey?: string) {
  if (providedKey && typeof providedKey === "string") {
    return providedKey;
  }

  if (globalThis?.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const rand = (Math.random() * 16) | 0;
    const value = char === "x" ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}

export async function fetchSummary(autogen = false) {
  const endpoint = `${API_BASE}/summary${autogen ? "?autogen=true" : ""}`;
  log.debug("[summaryGateway] fetchSummary start", { autogen, endpoint });

  const response = await fetch(endpoint, {
    method: "GET",
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`HTTP ${response.status}: ${response.statusText} ${body}`.trim());
  }

  const json = await response.json();
  log.debug("[summaryGateway] fetchSummary success", { autogen });
  return json;
}

export async function regenerateSummary(idempotencyKey?: string) {
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
    const body = await response.text().catch(() => "");
    throw new Error(`HTTP ${response.status}: ${response.statusText} ${body}`.trim());
  }

  return response.json();
}

export async function fetchSummaryMeta() {
  const response = await fetch(`${API_BASE}/summary/meta`, {
    method: "GET",
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`HTTP ${response.status}: ${response.statusText} ${body}`.trim());
  }

  return response.json();
}
