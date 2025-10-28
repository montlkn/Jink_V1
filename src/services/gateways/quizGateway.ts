import { log } from "@/lib/log";
import { supabaseGateway as supabase } from "./supabaseGateway";

export async function fetchQuizQuestions() {
  try {
    const { data, error } = await supabase
      .from("quiz_questions")
      .select(
        `
        id,
        question_text,
        image_url,
        question_order,
        question_options (
          id,
          option_text,
          image_url,
          aesthetic_scores
        )
      `
      )
      .order("question_order");

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    log.error("[quizGateway] Failed to fetch quiz questions", error);
    throw error;
  }
}

export async function submitQuizResponse(
  userId: string,
  questionId: string,
  selectedOptionId: string,
  responseTimeMs: number | null = null
) {
  try {
    const { data, error } = await supabase
      .from("quiz_responses")
      .upsert(
        {
          user_id: userId,
          question_id: questionId,
          selected_option_id: selectedOptionId,
          response_time_ms: responseTimeMs,
          response_timestamp: new Date().toISOString(),
        },
        {
          onConflict: "user_id,question_id",
        }
      );

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    log.error("[quizGateway] Failed to submit quiz response", error);
    throw error;
  }
}

export async function calculateAestheticProfile(userId: string) {
  try {
    const { error } = await supabase.rpc("calculate_aesthetic_profile", {
      p_user_id: userId,
    });

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    log.error("[quizGateway] Failed to calculate aesthetic profile", error);
    throw error;
  }
}

export async function getUserAestheticProfile(userId: string) {
  try {
    const { data, error } = await supabase.rpc("get_user_aesthetic_profile", {
      p_user_id: userId,
    });

    if (error) {
      throw error;
    }

    return data?.[0] ?? null;
  } catch (error) {
    log.error("[quizGateway] Failed to fetch user aesthetic profile", error);
    throw error;
  }
}

export async function userNeedsOnboarding(userId: string) {
  try {
    const { data, error } = await supabase.rpc("user_needs_onboarding", {
      p_user_id: userId,
    });

    if (error) {
      throw error;
    }

    return data === true;
  } catch (error) {
    log.error("[quizGateway] Failed to check onboarding status", error);
    return true;
  }
}

export async function getArchetypeMetadata() {
  try {
    const { data, error } = await supabase
      .from("aesthetic_archetypes")
      .select("*")
      .order("name");

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    log.error("[quizGateway] Failed to fetch archetype metadata", error);
    throw error;
  }
}
