# Architect 2.0 — backend

A small FastAPI service that backs Google sign-in for the [frontend](../frontend). Scope, deliberately: **auth only**. Sign-in, session and the current user's profile. Everything else in the frontend (projects, agents, chat, the simulated database) still runs entirely in the browser and is untouched by this.

Google OAuth itself is handled by **Supabase Auth** (not custom code here) — Supabase does the token exchange with Google and issues its own session JWT. This backend verifies that JWT and stores/serves a small `profiles` row per user.

## How the pieces fit together

```
Browser (frontend)
  -> supabase-js: signInWithOAuth({ provider: 'google' })
  -> Google consent screen
  -> Supabase (exchanges code, verifies with Google, issues a session JWT)
  -> Browser now holds a Supabase access token
  -> Browser calls this API with  Authorization: Bearer <supabase access token>
  -> This API verifies the JWT against Supabase's public JWKS endpoint,
     then reads/writes the profiles table in Supabase's Postgres using
     the service role / secret key
```

Nothing here talks to Google directly — that's entirely Supabase's job. Token verification uses Supabase's public JWKS endpoint (`{SUPABASE_URL}/auth/v1/.well-known/jwks.json`), not a shared secret — this is the correct approach for projects on Supabase's newer per-project JWT Signing Keys (asymmetric, e.g. ES256), which is what new Supabase projects use by default. There's an older "Legacy JWT secret" (a shared HS256 key) some projects still carry for backwards compatibility, but it doesn't apply here and isn't needed.

## Setup

### 1. Create a Supabase project

1. [supabase.com](https://supabase.com) → New project. Pick any name/region; the free tier is enough.
2. Wait for it to finish provisioning.

### 2. Configure the Google provider in Supabase

1. In Supabase: **Authentication → Providers → Google** → enable it.
2. You need a Google OAuth **Client ID and Client Secret** (Google Cloud Console → APIs & Services → Credentials → your OAuth client → both values are on that page).
3. Supabase will show you its callback URL, like:
   `https://<project-ref>.supabase.co/auth/v1/callback`
   Add that URL under **Authorized redirect URIs** on the Google OAuth client (in Google Cloud Console), alongside your app's own origin.
4. In Supabase: **Authentication → URL Configuration** → set **Site URL** to your frontend's URL (`http://localhost:5173` for local dev) and add it to **Redirect URLs** too.

### 3. Create the `profiles` table

In the Supabase dashboard: **SQL Editor → New query**, paste in `schema.sql` from this folder, and run it once.

### 4. Collect the two values this backend needs

Both from **Project Settings → API** in the Supabase dashboard:

| Env var | Where to find it |
| --- | --- |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Project API keys → the secret key (`service_role` on older projects, "secret key" on newer ones — never expose this to a browser) |

```
cp .env.example .env
# then fill in the two values above
```

### 5. Run it

```
python -m venv venv
venv\Scripts\pip install -r requirements.txt        # Windows
# source venv/bin/activate && pip install -r requirements.txt   # macOS/Linux

venv\Scripts\uvicorn app.main:app --reload --port 8000   # Windows
# venv/bin/uvicorn app.main:app --reload --port 8000     # macOS/Linux
```

- `GET /health` → `{"status": "ok"}`
- `GET /me` (needs `Authorization: Bearer <supabase access token>`) → creates the profile row on first call, returns it after
- `PUT /me` with a JSON body like `{"name": "...", "workspace": "...", "region": "..."}` → updates the caller's own profile

## The frontend side

The frontend needs `@supabase/supabase-js` and two public env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — both safe to expose, the anon key is protected by Row Level Security) plus `VITE_API_URL` pointing at wherever this backend runs. See [`../frontend/README.md`](../frontend/README.md) for its half of this setup, or the root [`README.md`](../README.md) for how the two run together.
