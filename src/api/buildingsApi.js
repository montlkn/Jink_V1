import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const testJson = {
  latitude: 40.7128,
  longitude: -74.006,
  radius: 1000,
};
export const getNearbyPlaces = async (latitude, longitude, radius) => {
  const response = await fetch(
    "https://gzzvhmmywaaxljpmoacm.supabase.co/functions/v1/nearby-buildings",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(testJson),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch nearby places");
  }

  return await response.json();
};
