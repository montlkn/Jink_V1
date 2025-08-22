import { supabase } from "./supabaseClient";

export async function getNearbyPlaces(latitude, longitude, radius) {
  const { data, error } = await supabase.functions.invoke("nearby-buildings", {
    body: { latitude, longitude, radius },
  });
  if (error) throw new Error(error.message || "Failed to fetch nearby places");
  return data;
}
