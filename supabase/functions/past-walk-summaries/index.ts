import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleOptionsResponse } from "../_shared/cors.ts";

type WalkSummaryRow = {
  id: string;
  started_at: string;
  ended_at: string;
  distance_km: number;
  borough: string | null;
};

type RequestPayload = {
  userId?: string;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.warn("[past-walk-summaries] Missing Supabase env vars");
}

Deno.serve(async (req) => {
  const optionsResponse = handleOptionsResponse(req);
  if (optionsResponse) return optionsResponse;

  try {
    const { userId }: RequestPayload = await req.json();
    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing userId" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL!, SERVICE_KEY!, {
      global: { fetch: fetch as typeof globalThis.fetch },
      auth: { persistSession: false },
    });

    console.log("[past-walk-summaries] Using Supabase URL:", SUPABASE_URL);

    // Query the modern walk_summaries table
    const { data, error } = await supabaseAdmin
      .from("walk_summaries")
      .select("id, started_at, ended_at, distance_km, borough")
      .eq("user_id", userId)
      .order("started_at", { ascending: false });

    if (error) throw error;

    const rows = (data ?? []) as WalkSummaryRow[];

    const summaries = rows.map((walk) => ({
      id: walk.id,
      startedAt: walk.started_at,
      endedAt: walk.ended_at,
      distanceKm: Number(walk.distance_km ?? 0),
      borough: walk.borough ?? undefined,
    }));

    return new Response(JSON.stringify(summaries), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    // Log the full error object for debugging
    console.error("[past-walk-summaries] error details:", JSON.stringify(error, null, 2));
  
    // Return more informative error JSON to the client
    return new Response(
      JSON.stringify({
        message: "Edge function failed",
        error: typeof error === "object" ? error : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }  
});
