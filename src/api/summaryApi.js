/**
 * Client-side API for profile summary endpoints
 */

import { supabase } from './supabaseClient';

// Use environment variable API_URL if available, otherwise use relative path
const API_BASE = process.env.EXPO_PUBLIC_API_URL
  ? `${process.env.EXPO_PUBLIC_API_URL}/v1/profile`
  : '/v1/profile';

/**
 * Fetch current summary with optional auto-generation
 * ?autogen=true queues generation if needed
 */
export async function fetchSummary(autogen = false) {
  try {
    const url = `${API_BASE}/summary${autogen ? '?autogen=true' : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${(await supabase.auth.getSession())?.data?.session?.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[summary-api] Fetch error:', error.message);
    throw error;
  }
}

/**
 * Manually regenerate summary
 * Requires Idempotency-Key header for deduplication
 */
export async function regenerateSummary(idempotencyKey) {
  try {
    const response = await fetch(`${API_BASE}/summary/regenerate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${(await supabase.auth.getSession())?.data?.session?.access_token}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey || crypto.randomUUID(),
      },
      body: JSON.stringify({ reason: 'manual_refresh' }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[summary-api] Regenerate error:', error.message);
    throw error;
  }
}

/**
 * Fetch metadata without triggering generation
 */
export async function fetchSummaryMeta() {
  try {
    const response = await fetch(`${API_BASE}/summary/meta`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${(await supabase.auth.getSession())?.data?.session?.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[summary-api] Meta fetch error:', error.message);
    throw error;
  }
}
