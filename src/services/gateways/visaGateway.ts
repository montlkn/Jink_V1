import { log } from '@/lib/log';
import { supabase } from './supabaseClient';

export type VisaAwardResult = {
  visas_awarded: {
    visa_id: string;
    neighborhood: string;
    borough: string;
    building_count: number;
  }[];
  total_visas: number;
};

/**
 * Check and award visas for a user
 * Awards visa when user has scanned 10+ buildings in a neighborhood
 */
export async function checkAndAwardVisas(userId: string): Promise<VisaAwardResult | null> {
  try {
    const { data, error } = await supabase.rpc('check_and_award_visas', {
      p_user_id: userId,
    });

    if (error) {
      log.error('[visaGateway] Failed to check visas', error);
      return null;
    }

    return data as VisaAwardResult;
  } catch (err) {
    log.error('[visaGateway] Exception checking visas', err);
    return null;
  }
}

/**
 * Fetch all visas for a user
 */
export async function fetchUserVisas(userId: string) {
  try {
    const { data, error } = await supabase
      .from('user_visas')
      .select(`
        id,
        granted_at,
        visa:visas_def (
          slug,
          title,
          neighborhood,
          borough,
          requirement,
          description
        )
      `)
      .eq('user_id', userId)
      .order('granted_at', { ascending: false });

    if (error) {
      log.error('[visaGateway] Failed to fetch user visas', error);
      return [];
    }

    return data || [];
  } catch (err) {
    log.error('[visaGateway] Exception fetching user visas', err);
    return [];
  }
}

/**
 * Fetch all available visa definitions
 */
export async function fetchVisaDefinitions() {
  try {
    const { data, error } = await supabase
      .from('visas_def')
      .select('*')
      .order('neighborhood');

    if (error) {
      log.error('[visaGateway] Failed to fetch visa definitions', error);
      return [];
    }

    return data || [];
  } catch (err) {
    log.error('[visaGateway] Exception fetching visa definitions', err);
    return [];
  }
}
