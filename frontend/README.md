# Architect 2.0 — frontend

A fully interactive frontend for Architect, an AI agent-app builder. Everything runs in the browser against a simulated backend, so it works offline and is safe to demo.

## Run

```
npm install
npm run dev        # http://localhost:5173
npm run build      # type-checks, then builds to dist/
npm run preview    # serves the production build
```

Sign in with any button. **Continue with Google** does a real Google sign-in (via Supabase Auth + a small Python backend) if configured — see below; otherwise it shows a message and you can still use **Continue with GitHub** or email, which stay simulated. Your data is saved in `localStorage`. To start the demo fresh, go to **Settings → General → Reset demo data**.

### Google sign-in setup

"Continue with Google" is real OAuth: **Supabase Auth** does the Google token exchange (redirect flow), and a separate small Python backend — [`backend`](../backend) — verifies the resulting session and stores a `profiles` row per user. This app only reads name/email as sign-in identity; it does **not** grant access to Gmail messages (that would need broader Gmail API scopes).

1. Set up the backend first: see [`backend`'s README](../backend/README.md). That walks you through creating the Supabase project, configuring the Google provider there, and creating the `profiles` table. You'll end up with a `SUPABASE_URL` and an **anon** key (as opposed to the backend's secret service-role key).
2. In this repo:
   ```
   cp .env.example .env
   ```
   and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to those same values, plus `VITE_API_URL` pointing at wherever the backend runs (`http://localhost:8000` by default). Restart `npm run dev`.
3. Run the backend (`uvicorn app.main:app --reload --port 8000` from `../backend`, in its own terminal) alongside this frontend.

Without this configured, the Google button shows a toast telling you it's not set up, so the rest of the demo (GitHub/email sign-in) still works unmodified.

## Demo script

1. **Home**: type a prompt (or pick a suggestion) and press Enter. With **Plan** on, Architect asks four questions, then writes a plan document and a four-screen mockup. You can change the palette there. Press **Start building**.
2. **Keystone** (the seeded, published project):
   - Chat in the preview widget: "My sink is leaking" creates a real row in `work_orders` (see the Database tab). "I smell gas" hands off to the landlord.
   - Ask Architect for changes: `Change the headline to "…"`, `Add an agent that handles noise complaints`, `Switch the site to dark mode`, `Use Opus for Billing`, `Remove the Leasing agent`.
   - **Select** mode: click elements in the preview, add notes, then apply them all for one credit.
   - **Agents**: live graph; **Test run** highlights the path a message takes. Double-click an agent to open the full editor.
   - **Code**: files are generated from the current agents and site. Select lines, then press ⌘/Ctrl+L to add them to chat. The terminal supports `ls`, `cd`, `cat`, `grep`, `tree`, `npm test`, `git log`, `help`.
   - **Database**: browse and edit rows (double-click a cell), or run SQL (`select … from … where … group by … order by … limit`).
   - **History**: see what changed in each version, and restore any version.
   - Drafts, chats with summaries, Share, Publish (opens the live site in a new tab), layouts (Split / Focus / Studio), and drag the chat to either side.
3. ⌘/Ctrl+K opens the command palette from anywhere.

## Structure

```
src/
  types.ts            domain model (Project, Agent, Msg, Version, …)
  store.ts            state store, localStorage persistence, useApp() selector hook
  actions.ts          every user-facing operation (build, chat, publish, drafts, …)
  data/               constants and project templates (agents, site copy, seed data)
  lib/
    sim.ts            simulated backend: agent routing, intent parsing, SQL, terminal
    codegen.ts        generates the project's source files from its agents and site
    supabase.ts       real Supabase client, used only for Google sign-in
    api.ts            client for the Python backend (auth/profile only)
    factory.ts, seed.ts, router.ts, util.ts, sound.ts
  components/         shared UI (dialogs, popovers, sidebar, command palette)
  screens/            auth, home, projects, settings, pricing, project settings, live site
  site/Site.tsx       the generated website (used in the preview and the live site route)
  workspace/          the builder: header, chat, preview, agents, code, database, history
```

## Adding a backend

The UI only talks to `src/actions.ts` and reads state through `useApp()`. To connect a real API, replace the simulated parts inside the action functions:

| Action | Simulated today by |
| --- | --- |
| `runBuild`, `doEdit`, `saveNotes` | timed steps + `parseIntent` / `applyNotes` in `lib/sim.ts` |
| `sendWidget`, `sendPg` | `respond` + `recordRun` in `lib/sim.ts` |
| `execSql`, `termRun` | `runSql`, `runTerm` in `lib/sim.ts` |
| `startDeploy`, `invite`, … | local state updates |

`signIn`/`signOut` are the one place this is already real, for the Google path specifically — see "Google sign-in setup" above and [`backend`](../backend). GitHub and email sign-in are still simulated.

Code files come from `lib/codegen.ts`. A backend can return real files instead.
