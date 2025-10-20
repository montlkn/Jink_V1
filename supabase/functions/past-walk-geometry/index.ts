import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleOptionsResponse } from "../_shared/cors.ts";

type RequestPayload = {
  walkId?: string;
  tolerance?: number;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.warn("[past-walk-geometry] Missing Supabase env vars");
}

Deno.serve(async (req) => {
  const optionsResponse = handleOptionsResponse(req);
  if (optionsResponse) return optionsResponse;

  try {
    const { walkId }: RequestPayload = await req.json();
    if (!walkId) {
      return new Response(JSON.stringify({ error: "Missing walkId" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL!, SERVICE_KEY!, {
      global: { fetch: fetch as typeof globalThis.fetch },
      auth: { persistSession: false },
    });

    console.log("[past-walk-geometry] Using Supabase URL:", SUPABASE_URL);

    // Query walk_points for route geometry
    const { data: routeData, error: routeError } = await supabaseAdmin
      .from("walk_points")
      .select("lat, lng, seq")
      .eq("walk_id", walkId)
      .order("seq", { ascending: true });

    if (routeError) throw routeError;

    // Query walk_seen_points for discovered buildings
    const { data: buildingsData, error: buildingsError } = await supabaseAdmin
      .from("walk_seen_points")
      .select("lat, lng, building_id, confidence, stamp_awarded")
      .eq("walk_id", walkId);

    if (buildingsError) throw buildingsError;

    // Format the response
    const route = (routeData ?? []).map((point) => ({
      latitude: point.lat,
      longitude: point.lng,
    }));

    const buildings = (buildingsData ?? []).map((point) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [point.lng, point.lat],
      },
      properties: {
        building_id: point.building_id,
        confidence: point.confidence,
        stamp_awarded: point.stamp_awarded,
      },
    }));

    const data = {
      walkId,
      route,
      buildings,
    };

    if (!data || (!route.length && !buildings.length)) {
      return new Response(JSON.stringify({ error: "No data found for this walk" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("[past-walk-geometry] error details:", JSON.stringify(error, null, 2));
    
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
