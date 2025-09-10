/**
 * API functions for the architectural aesthetic quiz
 */
import { supabase } from './supabaseClient';

/**
 * Fetch all quiz questions with their options
 */
export const fetchQuizQuestions = async () => {
  try {
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select(`
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
      `)
      .order('question_order');

    if (questionsError) throw questionsError;
    return questions;
  } catch (error) {
    console.error('Error fetching quiz questions:', error);
    throw error;
  }
};

/**
 * Submit a quiz response
 */
export const submitQuizResponse = async (userId, questionId, selectedOptionId, responseTimeMs = null) => {
  try {
    const { data, error } = await supabase
      .from('quiz_responses')
      .upsert({
        user_id: userId,
        question_id: questionId,
        selected_option_id: selectedOptionId,
        response_time_ms: responseTimeMs,
        response_timestamp: new Date().toISOString()
      }, {
        onConflict: 'user_id,question_id'
      });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error submitting quiz response:', error);
    throw error;
  }
};

/**
 * Calculate and update user's aesthetic profile
 */
export const calculateAestheticProfile = async (userId) => {
  try {
    const { error } = await supabase.rpc('calculate_aesthetic_profile', {
      p_user_id: userId
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error calculating aesthetic profile:', error);
    throw error;
  }
};

/**
 * Get user's aesthetic profile
 */
export const getUserAestheticProfile = async (userId) => {
  try {
    const { data, error } = await supabase.rpc('get_user_aesthetic_profile', {
      p_user_id: userId
    });

    if (error) throw error;
    return data?.[0] || null;
  } catch (error) {
    console.error('Error fetching user aesthetic profile:', error);
    throw error;
  }
};

/**
 * Check if user needs onboarding
 */
export const userNeedsOnboarding = async (userId) => {
  try {
    const { data, error } = await supabase.rpc('user_needs_onboarding', {
      p_user_id: userId
    });

    if (error) throw error;
    return data === true;
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    // Default to true if there's an error
    return true;
  }
};

/**
 * Get archetype metadata for UI
 */
export const getArchetypeMetadata = async () => {
  try {
    const { data, error } = await supabase
      .from('aesthetic_archetypes')
      .select('*')
      .order('name');

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching archetype metadata:', error);
    throw error;
  }
};