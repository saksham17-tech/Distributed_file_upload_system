import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase admin client (service role).
 * Never import this from client components — it has full DB + Storage access.
 */
let _client: SupabaseClient | null = null;

export function getSupabaseServer(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment',
    );
  }

  _client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return _client;
}

/** 1 GB free-tier hard cap */
export const MAX_STORAGE_LIMIT_BYTES = 1_073_741_824;

/** Storage bucket name (matches Supabase dashboard) */
export const STORAGE_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET || 'dfup';
