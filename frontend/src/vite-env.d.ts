/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL — Project Settings -> API -> Project URL. Safe to expose. */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase anon/public key — Project Settings -> API -> anon key. Safe to expose (RLS protects data). */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Base URL of the Python backend (see ../architect-2-backend). Defaults to http://localhost:8000. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
