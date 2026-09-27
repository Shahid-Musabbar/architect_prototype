import { createClient, type Session } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = () => !!url && !!anonKey;

/**
 * `flowType: 'pkce'` is important here: it keeps the OAuth redirect using a
 * `?code=` query param instead of a `#access_token=` hash fragment, which
 * would otherwise collide with this app's own hash-based router.
 */
export const supabase = supabaseConfigured()
  ? createClient(url!, anonKey!, { auth: { flowType: 'pkce', detectSessionInUrl: true } })
  : null;

export type { Session };
