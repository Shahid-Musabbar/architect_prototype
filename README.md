# Architect 2.0

A frontend for **Architect**, an AI agent-app builder — plus a small backend that gives it real Google sign-in.

```
Architect 2.0/
  frontend/   React + Vite app. The whole product UI. Runs entirely in the
              browser against a simulated backend, so it works standalone.
  backend/    FastAPI service, auth only. Backs real Google sign-in via
              Supabase Auth. Everything else the frontend does (building
              apps, agents, chat, the simulated database) doesn't touch this.
```

## How they work together

The frontend is a complete, self-contained demo on its own — open it and everything works, including "sign in" via GitHub or email, which are simulated (no server involved, state just lives in `localStorage`). **Only the Google sign-in button is backed by something real**, and that's the one place these two folders talk to each other:

```
1. Browser clicks "Continue with Google"
2. frontend  --signInWithOAuth({provider:'google'})-->  Supabase Auth
3. Supabase redirects to Google's real consent screen, user approves
4. Google --> Supabase (Supabase exchanges the code, verifies with Google)
5. Supabase --> browser, holding a real Supabase session (JWT access token)
6. frontend  --GET /me, Authorization: Bearer <token>-->  backend
7. backend verifies the token against Supabase's public JWKS endpoint,
   then reads/creates a `profiles` row for that user in Supabase's Postgres
8. backend --> frontend: {id, email, name, workspace, region}
9. frontend uses that to fill in the signed-in user, same as any other
   sign-in method
```

So: **Supabase does the actual OAuth handshake with Google** (this backend never talks to Google directly), and **this backend's only job is verifying that Supabase-issued session and keeping one small `profiles` table**. Nothing about projects, agents, chat, or the simulated database in the frontend goes through the backend — that's all still local to the browser, unchanged.

If the backend isn't running, or its `.env` isn't set up, clicking "Continue with Google" just shows a toast explaining that and the rest of the app works normally — GitHub and email sign-in never depended on any of this.

## Running both together

You need two terminals.

**Terminal 1 — backend** (see [`backend/README.md`](backend/README.md) for the one-time Supabase setup this needs first):
```
cd backend
venv\Scripts\uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — frontend** (see [`frontend/README.md`](frontend/README.md) for its full demo script):
```
cd frontend
npm install   # first time only
npm run dev   # http://localhost:5173
```

Each folder has its own `.env` (copy from that folder's `.env.example`) — the frontend's is safe to expose in a browser (a Supabase project URL and its public anon key), the backend's holds the one real secret (Supabase's service role / secret key) and must never end up in frontend code or a browser.

You only need the backend running at all if you want to test real Google sign-in. For everything else the frontend does — building apps, editing agents, the whole workspace — it's not involved.

## History

This started as two separate repos: the frontend demo, and a small Python auth backend built afterward to give it real Google sign-in. They were merged into this single layout (`frontend/` and `backend/` folders) so the two live together as one project. While merging, the backend's docs and `.env.example` were also brought in line with the JWKS-based token verification it actually uses (Supabase's newer per-project signing keys) — they had drifted out of sync with an earlier legacy-secret approach that doesn't work with this Supabase project.
