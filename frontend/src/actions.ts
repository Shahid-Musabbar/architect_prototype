import type { Agent, Bubble, CodeCtx, Confirm, Msg, Note, PlanId, Project, Route, Step, Table, Theme } from './types';
import { getProject, getState, resetStore, setState, setUi, setWs, updateProject } from './store';
import { toHash, parseHash } from './lib/router';
import { createProject, mkVersion, msg, nameFromPrompt, snap, clone } from './lib/factory';
import { templateById, templateForPrompt } from './data/templates';
import { CODE_MODELS, EDIT_STEPS, FULL_STEPS, PALETTES, PLAN_QS, PLANS, SEL_LABELS, planCredits } from './data/constants';
import { applyNotes, defaultSql, parseIntent, recordRun, respond, runSql, runTerm, traceLabel, evalLines, type RouteResult } from './lib/sim';
import { generateFiles } from './lib/codegen';
import { chime } from './lib/sound';
import { supabase } from './lib/supabase';
import { fetchProfile, ApiError } from './lib/api';
import { uid, slug } from './lib/util';
import { wsDefaults } from './lib/seed';

/* ---------------- timers ---------------- */

const timers = new Map<string, number[]>();
function later(key: string, fn: () => void, ms: number) {
  const id = window.setTimeout(() => {
    timers.set(key, (timers.get(key) || []).filter(x => x !== id));
    fn();
  }, ms);
  timers.set(key, [...(timers.get(key) || []), id]);
  return id;
}
function clearTimers(key: string) {
  (timers.get(key) || []).forEach(clearTimeout);
  timers.delete(key);
}

/* ---------------- ui helpers ---------------- */

let toastSeq = 0;
export function toast(text: string, tone: 'ok' | 'warn' | 'err' = 'ok') {
  const id = ++toastSeq;
  setUi({ toast: { id, text, tone } });
  later('toast', () => { if (getState().ui.toast?.id === id) setUi({ toast: null }); }, tone === 'err' ? 3600 : 2400);
}

export function confirmAction(c: Confirm) { setUi({ confirm: c }); }
export function closeConfirm() { setUi({ confirm: null }); }

export function navigate(r: Route) {
  const h = toHash(r);
  applyRoute(r);
  if (location.hash !== h) location.hash = h;
}

export function applyRoute(r: Route) {
  const s = getState();
  if (r.name === 'workspace' || r.name === 'projectSettings') {
    const p = getProject(r.pid);
    if (!p) { setUi({ route: { name: 'projects', filter: 'all' } }); toast('That project no longer exists', 'warn'); history.replaceState(null, '', '#/projects/all'); return; }
    if (s.ui.ws.pid !== r.pid) {
      const tpl = templateById(p.templateId);
      setUi(u => ({ ws: { ...wsDefaults(), pid: p.id, agentSel: p.agents[0]?.id || '', dbTable: p.db[tpl.mainTable] ? tpl.mainTable : Object.keys(p.db)[0] || '', sql: defaultSql(p), planOpen: !!p.planning?.ready, paneHidden: false, termCwd: '', device: u.ws.device } }));
    }
    updateProject(r.pid, { viewedAt: Date.now() }, false);
  }
  setUi({ route: r, palette: false });
}

export function syncRouteFromHash() { applyRoute(parseHash(location.hash)); }

/* ---------------- account ---------------- */

export function signIn(name?: string, email?: string) {
  const s = getState();
  navigate({ name: 'onboard', step: 1 });
  setState({ signedIn: true, user: { ...s.user, ...(name ? { name } : {}), ...(email ? { email } : {}) } });
}
export function signOut() {
  supabase?.auth.signOut();
  navigate({ name: 'auth' });
  setState({ signedIn: false, supabaseUserId: null });
  toast('Signed out');
}

/**
 * Picks up a real Google session established via Supabase (either just completed
 * through the OAuth redirect, or already persisted from an earlier visit) and syncs
 * it into the app's own signed-in state. Guarded by `supabaseUserId` so it only runs
 * `signIn()` — which resets onboarding — once per distinct Supabase session, not on
 * every reload.
 */
export async function syncSupabaseSession() {
  if (!supabase) return;
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session || getState().supabaseUserId === session.user.id) return;
  try {
    const profile = await fetchProfile(session.access_token);
    setState({ supabaseUserId: session.user.id });
    signIn(profile.name || undefined, profile.email);
  } catch (e) {
    if (e instanceof ApiError && e.status === 0) toast(`Signed in with Google, but couldn’t reach the backend at ${e.message.replace('Could not reach ', '')}. Is it running?`, 'warn');
    else if (e instanceof ApiError && e.status === 401) toast('Signed in with Google, but the backend rejected the session — check the backend’s SUPABASE_JWT_SECRET (or JWKS setup).', 'warn');
    else toast('Signed in with Google, but the backend returned an error loading your profile.', 'warn');
  }
}
export const setTheme = (theme: Theme) => setState({ theme });
export const toggleTheme = () => setState(s => ({ theme: s.theme === 'dark' ? 'light' : 'dark' }));

export function choosePlan(id: PlanId) {
  const s = getState();
  if (s.plan === id) { toast(`You're already on ${PLANS.find(p => p.id === id)!.name}`); return; }
  const plan = PLANS.find(p => p.id === id)!;
  const down = planCredits(id) < planCredits(s.plan);
  confirmAction({
    title: down ? `Downgrade to ${plan.name}?` : `Switch to ${plan.name}?`,
    body: down
      ? `Your credits will be capped at ${plan.credits} and features outside ${plan.name} will stop at the end of this cycle.`
      : `You'll be charged $${s.billing === 'monthly' ? plan.m : plan.y * 12}${s.billing === 'monthly' ? ' per month' : ' per year'}${id === 'team' ? ' per seat' : ''} (demo — no card is charged). Credits top up to ${plan.credits} right away.`,
    confirmLabel: down ? 'Downgrade' : 'Upgrade',
    danger: down,
    onConfirm: () => {
      setState(st => ({ plan: id, credits: down ? Math.min(st.credits, plan.credits) : plan.credits }));
      toast(`You're now on ${plan.name}`);
    },
  });
}

export function buyCredits(n = 100) {
  setState(s => ({ credits: s.credits + n }));
  toast(`${n} credits added (demo)`);
}

export function resetDemo() {
  confirmAction({
    title: 'Reset demo data?',
    body: 'This restores the five sample projects, credits and settings. Anything you created will be removed.',
    confirmLabel: 'Reset everything',
    danger: true,
    onConfirm: () => {
      timers.forEach((_, k) => clearTimers(k));
      resetStore();
      history.replaceState(null, '', '#/home');
      toast('Demo data reset');
    },
  });
}

/* ---------------- building ---------------- */

const creditCost = (base: number) => {
  const m = CODE_MODELS.find(x => x.id === getState().codeModel) || CODE_MODELS[0];
  return Math.max(1, Math.round(base * m.mult));
};

const isBuilding = (pid: string) => !!getState().ui.building[pid];
const setBuilding = (pid: string, on: boolean) => setUi(u => ({ building: { ...u.building, [pid]: on } }));

const pushMsg = (pid: string, m: Msg) => updateProject(pid, p => ({ msgs: [...p.msgs, m] }));
const patchMsg = (pid: string, id: string, patch: Partial<Msg> | ((m: Msg) => Partial<Msg>)) =>
  updateProject(pid, p => ({ msgs: p.msgs.map(m => (m.id === id ? { ...m, ...(typeof patch === 'function' ? patch(m) : patch) } : m)) }), false);

interface BuildSummary { text: string | ((p: Project) => string); version: string; meta: string; cost: number }

function notifyDone(name: string) {
  const s = getState();
  if (s.sound) chime();
  try {
    if (document.hidden && 'Notification' in window && Notification.permission === 'granted') new Notification('Architect', { body: `${name} is ready` });
  } catch { /* notifications unavailable */ }
}

export function runBuild(pid: string, steps: [string, string][], summary: BuildSummary, apply?: (p: Project) => Partial<Project>) {
  const p = getProject(pid);
  if (!p || isBuilding(pid)) return false;
  const cost = creditCost(summary.cost);
  if (getState().credits < cost) {
    pushMsg(pid, msg({ role: 'ai', text: `This needs ${cost} build credit${cost > 1 ? 's' : ''} and you have ${getState().credits}. Upgrade your plan or add credits to keep building. Nothing was changed.`, cta: { label: 'See plans', to: 'pricing' } }));
    toast('Not enough build credits', 'warn');
    return false;
  }
  const id = uid('m');
  setBuilding(pid, true);
  pushMsg(pid, { id, role: 'ai', steps: steps.map((l, i) => ({ l, st: i === 0 ? 1 : 0 })), text: '' });
  let i = 0;
  const key = 'build:' + pid;
  const tick = () => {
    i++;
    if (i < steps.length) {
      patchMsg(pid, id, m => ({ steps: (m.steps || []).map((x, j) => ({ ...x, st: (j < i ? 2 : j === i ? 1 : 0) as Step['st'] })) }));
      later(key, tick, 650 + Math.random() * 300);
      return;
    }
    updateProject(pid, cur => {
      const applied = { ...cur, ...(apply ? apply(cur) : {}) };
      const v = mkVersion(applied, summary.version, summary.meta);
      const text = typeof summary.text === 'function' ? summary.text(applied) : summary.text;
      return {
        ...applied,
        versions: [...cur.versions, v],
        current: v.n,
        spent: cur.spent + cost,
        msgs: applied.msgs.map(m => (m.id === id ? { ...m, steps: (m.steps || []).map(x => ({ ...x, st: 2 as const })), text, version: v.n } : m)),
      };
    });
    setState(s => ({ credits: Math.max(0, s.credits - cost) }));
    setBuilding(pid, false);
    notifyDone(getProject(pid)?.name || 'Your app');
  };
  later(key, tick, 750);
  return true;
}

export function stopBuild(pid: string) {
  if (!isBuilding(pid)) return;
  clearTimers('build:' + pid);
  updateProject(pid, p => ({
    msgs: p.msgs.map(m => (m.role === 'ai' && m.steps && !m.text && m.steps.some(x => x.st !== 2)
      ? { ...m, steps: m.steps.filter(x => x.st === 2), text: 'Stopped. Nothing was changed and no credits were used.' }
      : m)),
    appReady: p.appReady || p.versions.length > 0,
  }));
  setBuilding(pid, false);
  toast('Build stopped');
}

/* ---------------- projects ---------------- */

export function openProject(pid: string) { navigate({ name: 'workspace', pid }); }

export function startProject(prompt: string, opts: { buildMode?: 'lyzr' | 'gitagent'; name?: string; skipPlan?: boolean } = {}) {
  const text = prompt.trim();
  if (!text) { toast('Describe what your agents should do first', 'warn'); return; }
  const tpl = templateForPrompt(text);
  const name = opts.name || nameFromPrompt(text);
  const p = createProject({ name, templateId: tpl.id, prompt: text });
  p.buildMode = opts.buildMode || 'lyzr';
  if (!opts.skipPlan) p.planning = { prompt: text, answers: [], ready: false, notes: [] };
  setState(s => ({ projects: [p, ...s.projects] }));
  navigate({ name: 'workspace', pid: p.id });
  if (opts.skipPlan) later('plan:' + p.id, () => startBuilding(p.id), 500);
  else later('plan:' + p.id, () => askPlanQ(p.id, 0, `${name} can coordinate the work, surface issues early and help people act faster. Before I write the plan, let's pin down the first version.`), 600);
}

function askPlanQ(pid: string, qi: number, lead: string) {
  const p = getProject(pid);
  if (!p?.planning) return;
  pushMsg(pid, msg({ role: 'ai', text: lead, q: { qi, picked: null, sel: qi === 0 && p.buildMode === 'gitagent' ? 1 : 0 } }));
}

export function selectPlanOption(pid: string, msgId: string, oi: number) {
  patchMsg(pid, msgId, m => ({ q: m.q ? { ...m.q, sel: oi } : m.q }));
}

function planReady(pid: string) {
  const p = getProject(pid);
  if (!p?.planning) return;
  updateProject(pid, cur => ({ planning: cur.planning ? { ...cur.planning, ready: true } : null, msgs: [...cur.msgs, msg({ role: 'ai', text: `Thanks. I've drafted a plan for ${cur.name} with an app mockup. Change the palette in the plan, reply here with anything to adjust, or press Start building when it looks right.` })] }));
  if (getState().ui.ws.pid === pid) setWs({ planOpen: true, planView: 'plan' });
}

export function answerPlanQ(pid: string, msgId: string, oi: number | null, custom?: string) {
  const p = getProject(pid);
  if (!p?.planning || p.planning.ready) return;
  const m = p.msgs.find(x => x.id === msgId);
  if (!m?.q || m.q.picked !== null) return;
  const qi = m.q.qi;
  const label = custom ?? PLAN_QS[qi].o[oi ?? 0][0];
  updateProject(pid, cur => ({
    msgs: cur.msgs.map(x => (x.id === msgId && x.q ? { ...x, q: { ...x.q, picked: custom ? -1 : oi ?? 0, custom } } : x)),
    planning: cur.planning ? { ...cur.planning, answers: [...cur.planning.answers.slice(0, qi), label] } : null,
    buildMode: qi === 0 ? (/GitAgent/.test(label) ? 'gitagent' : 'lyzr') : cur.buildMode,
  }));
  if (qi + 1 < PLAN_QS.length) later('plan:' + pid, () => askPlanQ(pid, qi + 1, custom ? 'Got it.' : ''), 550);
  else later('plan:' + pid, () => planReady(pid), 700);
}

export function skipPlanning(pid: string) {
  const p = getProject(pid);
  if (!p?.planning) return;
  clearTimers('plan:' + pid);
  updateProject(pid, cur => ({
    msgs: cur.msgs.map(x => (x.q && x.q.picked === null ? { ...x, q: { ...x.q, picked: x.q.sel } } : x)),
    planning: cur.planning ? { ...cur.planning, answers: PLAN_QS.map((q, i) => cur.planning!.answers[i] || q.o[i === 0 ? 0 : 1][0]) } : null,
  }));
  startBuilding(pid);
}

export function startBuilding(pid: string) {
  const p = getProject(pid);
  if (!p) return;
  const router = p.agents[0];
  const started = runBuild(pid, FULL_STEPS.map(([a, b], i) => (i === 2 ? [`Writing ${p.agents.map(x => `agents/${x.id}.ts`).join(', ')}`, `Setting up the ${router.name} and its specialists`] : i === 1 ? [`Planning agents: ${router.name.toLowerCase()} + ${p.agents.length - 1} specialists`, b] : [a, b]) as [string, string]), {
    text: cur => `${cur.name} is ready${p.planning ? ', built from your plan' : ''}. ${router.name} hands each conversation to the right specialist (${cur.agents.slice(1).map(a => a.name).join(', ')}), and each specialist has its own tools. Sample content is in so you can test straight away: try the chat widget in the preview.`,
    version: 'Initial build',
    meta: `${Object.keys(generateFiles(p)).length} files · ${p.agents.length} agents`,
    cost: 18,
  }, cur => {
    const pal = cur.planning ? PALETTES.find(x => x.id === cur.palette) : undefined;
    const look = pal ? { accent: pal.accent, dark: pal.id === 'graphite', ctaSolid: true } : {};
    return { appReady: true, planning: null, agents: cur.agents.map(a => ({ ...a, runs: 0 })), widget: [{ r: 'a', t: cur.pv.greeting }], pv: { ...cur.pv, ...look } };
  });
  if (started) { setWs({ planOpen: false, tab: 'preview' }); updateProject(pid, { planning: p.planning ? { ...p.planning, ready: true } : null }, false); }
}

export function setPalette(pid: string, palette: string) { updateProject(pid, { palette }, false); }

export function renameProject(pid: string, name: string) {
  const n = name.trim();
  if (!n) { toast('Name cannot be empty', 'warn'); return; }
  updateProject(pid, p => {
    const re = new RegExp(`\\b${p.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
    const safe = n.replace(/["\\]/g, '');
    return { name: n, pv: JSON.parse(JSON.stringify(p.pv).replace(re, safe)) };
  });
  toast('Project renamed');
}

export function duplicateProject(pid: string) {
  const p = getProject(pid);
  if (!p) return;
  const copy: Project = { ...clone(p), id: uid('p'), name: `${p.name} copy`, status: 'Draft', published: false, publishedAt: null, starred: false, shared: false, invites: [], createdAt: Date.now(), updatedAt: Date.now(), viewedAt: Date.now() };
  setState(s => ({ projects: [copy, ...s.projects] }));
  toast(`Duplicated as ${copy.name}`);
  return copy.id;
}

export function deleteProject(pid: string, after?: () => void) {
  const p = getProject(pid);
  if (!p) return;
  confirmAction({
    title: `Delete ${p.name}?`,
    body: 'This permanently deletes the app, its agents, versions and database. Published sites go offline.',
    confirmLabel: 'Delete project',
    danger: true,
    input: { label: `Type ${p.name} to confirm`, expect: p.name },
    onConfirm: () => {
      clearTimers('build:' + pid); clearTimers('plan:' + pid);
      setState(s => ({ projects: s.projects.filter(x => x.id !== pid), ui: { ...s.ui, building: { ...s.ui.building, [pid]: false } } }));
      toast(`${p.name} deleted`);
      if (after) after(); else navigate({ name: 'projects', filter: 'all' });
    },
  });
}

export function toggleStar(pid: string) {
  const p = getProject(pid);
  if (!p) return;
  updateProject(pid, { starred: !p.starred }, false);
  toast(p.starred ? 'Removed from starred' : 'Starred');
}

export function setProjectStatus(pid: string, status: Project['status']) {
  updateProject(pid, { status });
  toast(status === 'Paused' ? 'App paused. Agents stop replying until you resume.' : status === 'Live' ? 'App resumed' : 'Status updated');
}

export function clearContext(pid: string) {
  confirmAction({
    title: 'Clear chat context?',
    body: 'The chat history in this project is cleared. Files, agents, versions and data are untouched.',
    confirmLabel: 'Clear context',
    onConfirm: () => { updateProject(pid, { msgs: [] }); toast('Context cleared. Files and data are untouched'); },
  });
}

/* ---------------- chat ---------------- */

const EDIT_VERBS = /\b(add|change|make|remove|delete|set|use|switch|rename|update|turn|enable|disable|create|build|replace|move|put|give)\b/i;

function answerQuestion(p: Project, text: string) {
  const t = text.toLowerCase();
  const router = p.agents[0];
  const specs = p.agents.filter(a => a.kind === 'specialist');
  if (/\bagent|route|routing|handoff|hand off/.test(t)) return `${p.name} has ${p.agents.length} agents. ${router.name} (${router.model}) reads every message and routes it: ${specs.map(a => `${a.keywords.slice(0, 3).join(', ') || a.role.toLowerCase()} → ${a.name}`).join('; ')}. Open the Agents tab to see the graph and run a test conversation.`;
  if (/\bdata|database|table|stored|store\b/.test(t)) return `Data lives in the project database: ${Object.entries(p.db).map(([k, v]) => `${k} (${v.count} rows)`).join(', ')}. Agents write to it through their tools. The Database tab lets you browse rows or run SQL.`;
  if (/\bpublish|deploy|live|domain\b/.test(t)) return p.published ? `${p.name} is live at ${slug(p.name)}.architect.app. Publishing again ships your latest version; drafts stay private.` : `${p.name} isn't published yet. Press Publish in the header to ship the current version to ${slug(p.name)}.architect.app with SSL.`;
  if (/\bcost|price|credit/.test(t)) return `You have ${getState().credits} build credits. Edits cost about 2 credits, a batch of visual notes costs 1, and a full build about 18 (scaled by the coding model you pick).`;
  if (/\btest|eval/.test(t)) return `There are ${Math.max(12, templateById(p.templateId).samples.length)} practice conversations in evals/routing.yaml, re-run after every change. Try one yourself in Agents → Test run, or run \`npm test\` in the Code tab terminal.`;
  return `Good question. In ${p.name}, ${router.name} handles the first touch and hands off to ${specs.map(a => a.name).join(', ')}. If you'd like me to change something, describe it and I'll update the agents and the site.`;
}

function explainCode(ctx: CodeCtx[]) {
  return ctx.map(c => {
    const t = c.text;
    const where = `${c.file} (${c.from === c.to ? 'line ' + c.from : `lines ${c.from}–${c.to}`})`;
    if (/agent\(\{/.test(t)) return `${where} defines an agent: its name, the model it runs on, and the instructions it follows. Tools listed there are the only actions it can take, and handoffs say who it can pass the conversation to.`;
    if (/tool\(\{/.test(t)) return `${where} declares a tool. The zod schema validates the input the model sends, and run() performs the side effect with the caller's context.`;
    if (/defineApp/.test(t)) return `${where} is the app entry: it sets the router as the entry agent, registers specialists, and enables channels and memory.`;
    if (/<\w+/.test(t)) return `${where} is page markup. The props on Hero and Chat map directly to what you see in the preview, so edits here show up there.`;
    if (/expect:/.test(t)) return `${where} are eval cases: each input is sent to the router and the expected routing or tool call is checked after every build.`;
    if (/create table/i.test(t)) return `${where} is the database schema that agents read and write through their tools.`;
    return `${where}: ${t.split('\n').length} line${t.split('\n').length > 1 ? 's' : ''} of ${c.file.split('.').pop()} code. Ask me to change it and I'll update it and re-run the evals.`;
  }).join('\n\n');
}

export function sendChat(pid: string) {
  const s = getState();
  const ws = s.ui.ws;
  const p = getProject(pid);
  if (!p) return;
  const text = ws.input.trim();
  const ctx = ws.codeCtx;
  const attachments = ws.attachments;

  if (p.planning && !p.appReady) {
    if (!text) return;
    const openQ = [...p.msgs].reverse().find(m => m.q && m.q.picked === null);
    setWs({ input: '' });
    pushMsg(pid, msg({ role: 'user', text }));
    if (openQ && !p.planning.ready) { answerPlanQ(pid, openQ.id, null, text); return; }
    if (/^(start|go|build( it)?|looks good|ship it|yes|let'?s go)\b/i.test(text)) { later('plan:' + pid, () => startBuilding(pid), 400); return; }
    later('plan:' + pid, () => {
      updateProject(pid, cur => ({ planning: cur.planning ? { ...cur.planning, notes: [...cur.planning.notes, text] } : null, msgs: [...cur.msgs, msg({ role: 'ai', text: 'Added to the plan under "Your notes". Anything else, or shall I start building?' })] }));
      setWs({ planOpen: true, planView: 'plan' });
    }, 600);
    return;
  }

  const t = text || (ctx.length ? 'Explain this code' : attachments.length ? 'Use these files' : '');
  if (!t) return;
  if (isBuilding(pid)) { toast('Architect is still building. Stop it or wait a moment.', 'warn'); return; }
  setWs({ input: '', codeCtx: [], attachments: [] });
  pushMsg(pid, msg({ role: 'user', text: t, ctx: ctx.length ? ctx : undefined, attachments: attachments.length ? attachments : undefined }));

  if (ctx.length && /^(explain|what does|what is|walk me through|why)\b/i.test(t) && !EDIT_VERBS.test(t.replace(/^explain/i, ''))) {
    later('chat:' + pid, () => pushMsg(pid, msg({ role: 'ai', text: explainCode(ctx) })), 700);
    return;
  }
  if (/\?\s*$/.test(t) && /^(how|what|why|which|who|where|when|can|does|do|is|are|should)\b/i.test(t) && !EDIT_VERBS.test(t)) {
    later('chat:' + pid, () => { const cur = getProject(pid); if (cur) pushMsg(pid, msg({ role: 'ai', text: answerQuestion(cur, t) })); }, 700);
    return;
  }

  const go = () => doEdit(pid, t, attachments);
  if (ws.planMode) {
    const preview = parseIntent(p, t);
    const id = uid('m');
    later('chat:' + pid, () => pushMsg(pid, { id, role: 'ai', text: "Here's what I'd change. Approve it, or tell me what to change first.", plan: [...preview.changes, `Update ${preview.files.filter(f => !f.startsWith('evals')).join(', ') || 'the app'}`, 'Re-run the practice conversations before saving a version'], planPending: true }), 500);
  } else later('chat:' + pid, go, 300);
}

function doEdit(pid: string, t: string, attachments: string[] = []) {
  const p = getProject(pid);
  if (!p) return;
  const preview = parseIntent(p, t);
  const agentFiles = preview.files.filter(f => f.startsWith('agents/'));
  const steps: [string, string][] = [
    EDIT_STEPS[0],
    ...(attachments.length ? [[`Indexing ${attachments.join(', ')}`, 'Reading your files'] as [string, string]] : []),
    ...(agentFiles.length ? [[`Updating ${agentFiles.join(', ')}`, 'Updating the agents'] as [string, string]] : []),
    ...(preview.files.includes('app/page.tsx') ? [['Editing app/page.tsx', 'Updating the website'] as [string, string]] : []),
    ...(preview.files.includes('architect.config.ts') ? [['Updating architect.config.ts', 'Wiring it into the app'] as [string, string]] : []),
    EDIT_STEPS[3],
  ];
  let result = preview;
  runBuild(pid, steps, {
    text: () => `Done. ${result.changes.join('. ')}.${attachments.length ? ` I added ${attachments.join(', ')} to the knowledge base.` : ''} Practice conversations all pass.${result.newAgent ? ' Open Agents to see it in the graph.' : ''}`,
    version: t.length > 48 ? t.slice(0, 46) + '…' : t,
    meta: `${preview.files.length} file${preview.files.length === 1 ? '' : 's'}`,
    cost: 2,
  }, cur => {
    result = parseIntent(cur, t);
    const agents = attachments.length ? result.agents.map((a, i) => (i === 0 ? { ...a, knowledge: Array.from(new Set([...a.knowledge, ...attachments])) } : a)) : result.agents;
    return { pv: result.pv, agents, chans: result.chans, name: result.name };
  });
}

export function approvePlan(pid: string, msgId: string) {
  const p = getProject(pid);
  const m = p?.msgs.find(x => x.id === msgId);
  if (!p || !m?.planPending) return;
  patchMsg(pid, msgId, { planPending: false });
  const userText = [...p.msgs.slice(0, p.msgs.indexOf(m))].reverse().find(x => x.role === 'user')?.text || '';
  doEdit(pid, userText);
}
export function dismissPlan(pid: string, msgId: string) { patchMsg(pid, msgId, { planPending: false, text: 'Okay, tell me what to change and I will revise the plan.' }); }

export function setFeedback(pid: string, msgId: string, fb: 'up' | 'down') {
  patchMsg(pid, msgId, m => ({ feedback: m.feedback === fb ? undefined : fb }));
  toast(fb === 'up' ? 'Thanks for the feedback' : "Thanks, we'll use this to improve");
}

export function retryMsg(pid: string, msgId: string) {
  const p = getProject(pid);
  if (!p) return;
  const idx = p.msgs.findIndex(m => m.id === msgId);
  const prev = [...p.msgs.slice(0, idx)].reverse().find(m => m.role === 'user');
  if (!prev?.text) return;
  setWs({ input: prev.text });
  sendChat(pid);
}

/* ---------------- chats ---------------- */

const chatTitleOf = (msgs: Msg[]) => {
  const u = msgs.find(m => m.role === 'user');
  const t = u?.text || 'New chat';
  return t.length > 42 ? t.slice(0, 40).trim() + '…' : t;
};

export function newChat(pid: string, withSummary: boolean) {
  const p = getProject(pid);
  if (!p) return;
  if (isBuilding(pid)) { toast('Wait for the build to finish first', 'warn'); return; }
  const from = p.chatTitle || chatTitleOf(p.msgs);
  const asks = p.msgs.filter(m => m.role === 'user' && m.text).map(m => m.text!).slice(-3);
  const points = [
    `${p.name}: ${p.versions.length} versions, currently on ${p.current ? 'v' + p.current : 'the draft'}`,
    ...(asks.length ? [`Recent asks: ${asks.map(a => (a.length > 60 ? a.slice(0, 58) + '…' : a)).join(' · ')}`] : []),
    `${p.agents[0]?.name} plus ${p.agents.length - 1} specialists (${p.agents.slice(1).map(a => a.name).join(', ')}); practice conversations passing`,
    'Open items: none blocking',
  ];
  const cur = p.msgs.length ? [{ id: p.chatId, title: from, msgs: p.msgs, ts: Date.now() }] : [];
  updateProject(pid, {
    chats: [...cur, ...p.chats.filter(c => c.id !== p.chatId)],
    chatId: uid('c'),
    chatTitle: null,
    msgs: withSummary ? [msg({ role: 'ai', summary: { from, tokens: `~${(0.6 + points.length * 0.2).toFixed(1)}k tokens`, points }, text: 'Picked up where we left off. What next?' })] : [],
  });
  toast(withSummary ? 'New chat started with a summary' : 'New chat started');
}

export function openChat(pid: string, chatId: string) {
  const p = getProject(pid);
  if (!p || chatId === p.chatId) return;
  if (isBuilding(pid)) { toast('Wait for the build to finish first', 'warn'); return; }
  const tgt = p.chats.find(c => c.id === chatId);
  if (!tgt) return;
  const cur = p.msgs.length ? [{ id: p.chatId, title: p.chatTitle || chatTitleOf(p.msgs), msgs: p.msgs, ts: Date.now() }] : [];
  updateProject(pid, { chats: [...cur, ...p.chats.filter(c => c.id !== chatId && c.id !== p.chatId)], chatId: tgt.id, chatTitle: tgt.title, msgs: tgt.msgs }, false);
}

export function deleteChat(pid: string, chatId: string) {
  updateProject(pid, p => ({ chats: p.chats.filter(c => c.id !== chatId) }), false);
  toast('Chat deleted');
}

export function currentChatTitle(p: Project) { return p.chatTitle || chatTitleOf(p.msgs); }

/* ---------------- visual notes ---------------- */

export function addNote(text: string) {
  const ws = getState().ui.ws;
  const t = text.trim();
  if (!ws.selected || !t) return;
  const n: Note = { id: uid('n'), target: ws.selected.id, text: t };
  setWs(w => ({ notes: [...w.notes, n], input: '', selected: null, batchOpen: true }));
}

export function saveNotes(pid: string) {
  const ws = getState().ui.ws;
  const notes = ws.notes;
  if (!notes.length) return;
  if (isBuilding(pid)) { toast('Wait for the current build to finish', 'warn'); return; }
  const k = notes.length, pl = k > 1 ? 's' : '';
  setWs({ notes: [], selectMode: false, selected: null, hover: null });
  pushMsg(pid, msg({ role: 'user', text: `${k} design change${pl}`, notes }));
  runBuild(pid, [[`Reading ${k} note${pl}`, `Reading your ${k} note${pl}`], ['Editing app/page.tsx', 'Updating the website'], ['Checking layout at 390px and 1440px', 'Checking it on phone and desktop']], {
    text: () => `Applied ${k} change${pl}. A batch of notes costs one credit, however many are in it.`,
    version: notes.map(n => n.text).join('; ').slice(0, 60),
    meta: `${k} visual edit${pl}`,
    cost: 1,
  }, cur => ({ pv: applyNotes(cur.pv, notes).pv }));
}

export const noteLabel = (n: Note) => SEL_LABELS[n.target] || n.target;

/* ---------------- widget & playground ---------------- */

function runAgents(pid: string, text: string): { r: RouteResult; reply: string } {
  const p = getProject(pid)!;
  const r = respond(p, text);
  const rec = recordRun(p.db, r, text);
  updateProject(pid, cur => ({
    db: rec.db,
    agents: cur.agents.map(a => (a.id === r.router.id || a.id === r.agent?.id ? { ...a, runs: a.runs + 1 } : a)),
  }), false);
  if (rec.wrote) toast(`New row in ${rec.wrote}`);
  return { r, reply: rec.reply };
}

export function sendWidget(pid: string, text: string) {
  const t = text.trim();
  const p = getProject(pid);
  if (!t || !p) return;
  const key = 'w:' + pid;
  if (getState().ui.typing[key]) return;
  updateProject(pid, cur => ({ widget: [...cur.widget, { r: 'u', t }] }), false);
  if (p.status === 'Paused') {
    later('widget:' + pid, () => updateProject(pid, cur => ({ widget: [...cur.widget, { r: 'a', t: 'This assistant is paused right now. Please try again later.' }] }), false), 500);
    return;
  }
  setUi(u => ({ typing: { ...u.typing, [key]: 'typing' } }));
  later('widget:' + pid, () => {
    if (!getProject(pid)) return;
    const { r, reply } = runAgents(pid, t);
    const pro = getState().exp === 'pro';
    const trace = pro ? 'via ' + traceLabel(r).slice(1).join(' · ') || r.router.name : r.agent ? `Handled by ${r.agent.name}` : r.urgent ? `Escalated to ${r.human}` : '';
    updateProject(pid, cur => ({ widget: [...cur.widget, { r: 'a', t: reply, trace: trace || undefined }] }), false);
    setUi(u => ({ typing: { ...u.typing, [key]: '' } }));
  }, 1100 + Math.random() * 400);
}

export function resetWidget(pid: string) {
  const p = getProject(pid);
  if (!p) return;
  clearTimers('widget:' + pid);
  setUi(u => ({ typing: { ...u.typing, ['w:' + pid]: '' } }));
  updateProject(pid, { widget: [{ r: 'a', t: p.pv.greeting }] }, false);
}

export function sendPg(pid: string, text: string, agentId?: string) {
  const t = text.trim();
  const p = getProject(pid);
  const key = 'pg:' + pid;
  if (!t || !p || getState().ui.typing[key]) return;
  const r0 = respond(p, t);
  const router = r0.router;
  const specialist = agentId ? p.agents.find(a => a.id === agentId && a.kind === 'specialist') : undefined;
  updateProject(pid, cur => ({ pg: [...cur.pg, { r: 'u', t }] }), false);
  const setStatus = (st: string, active: string[]) => setUi(u => ({ typing: { ...u.typing, [key]: st }, active }));
  setStatus(`${router.name} is reading…`, ['channel', router.id]);
  const target = specialist || r0.agent;
  if (target) later('pg:' + pid, () => setStatus(`Handed to ${target.name}`, ['channel', router.id, target.id]), 700);
  if (r0.urgent) later('pg:' + pid, () => setStatus(`Paging ${r0.human}`, ['channel', router.id, 'human']), 700);
  const tool = specialist ? specialist.tools.find(x => x.on && x.name !== 'route_to' && x.name !== 'handoff_to_human')?.name : r0.tool;
  if (tool && target) later('pg:' + pid, () => setStatus(`Calling ${tool}`, ['channel', router.id, target.id, `${target.id}:${tool}`]), 1400);
  const done = tool ? 2100 : 900;
  later('pg:' + pid, () => {
    if (!getProject(pid)) return;
    let reply: string, r: RouteResult;
    if (specialist) {
      r = { router, agent: specialist, tool: tool || null, reply: specialist.reply, urgent: false };
      const cur = getProject(pid)!;
      const rec = recordRun(cur.db, r, t);
      updateProject(pid, c => ({ db: rec.db, agents: c.agents.map(a => (a.id === specialist.id ? { ...a, runs: a.runs + 1 } : a)) }), false);
      reply = rec.reply;
    } else ({ r, reply } = runAgents(pid, t));
    const secs = tool ? (1.6 + Math.random() * 0.6).toFixed(1) : (0.5 + Math.random() * 0.3).toFixed(1);
    const b: Bubble = { r: 'a', t: reply, trace: `${traceLabel(r).join(' → ')} · ${secs}s · $0.00${tool ? 3 : 1}` };
    updateProject(pid, cur => ({ pg: [...cur.pg, b] }), false);
    setUi(u => ({ typing: { ...u.typing, [key]: '' } }));
  }, done);
  later('pg:' + pid, () => setUi({ active: [] }), done + 2000);
}

export function clearPg(pid: string) {
  clearTimers('pg:' + pid);
  setUi(u => ({ typing: { ...u.typing, ['pg:' + pid]: '' }, active: [] }));
  updateProject(pid, { pg: [] }, false);
}

/* ---------------- drafts ---------------- */

export function newDraft(pid: string) {
  const p = getProject(pid);
  if (!p) return;
  const n = p.draftN + 1, id = 'd' + n;
  const from = p.drafts.find(d => d.id === p.draftId)?.name || 'Main';
  updateProject(pid, {
    draftN: n,
    drafts: [...p.drafts.map(d => (d.id === p.draftId ? { ...d, pv: clone(p.pv) } : d)), { id, name: `Draft ${n}`, pv: clone(p.pv) }],
    draftId: id,
  });
  toast(`Draft ${n} created from ${from}`);
}

export function switchDraft(pid: string, id: string) {
  const p = getProject(pid);
  if (!p || id === p.draftId) return;
  const ds = p.drafts.map(d => (d.id === p.draftId ? { ...d, pv: clone(p.pv) } : d));
  const t = ds.find(d => d.id === id);
  if (!t) return;
  updateProject(pid, { drafts: ds, draftId: id, pv: t.pv ? clone(t.pv) : p.pv }, false);
  setWs({ selected: null, hover: null, notes: [] });
}

export function mergeDraft(pid: string) {
  const p = getProject(pid);
  if (!p || p.draftId === 'main') return;
  const d = p.drafts.find(x => x.id === p.draftId)!;
  confirmAction({
    title: `Merge ${d.name} into Main?`,
    body: 'Main takes the website changes from this draft and a new version is saved. The draft is removed.',
    confirmLabel: 'Merge',
    onConfirm: () => {
      updateProject(pid, cur => {
        const merged = { ...cur, drafts: cur.drafts.filter(x => x.id !== d.id).map(x => (x.id === 'main' ? { ...x, pv: null } : x)), draftId: 'main' };
        const v = mkVersion(merged, `Merged ${d.name} into Main`, 'Merge');
        return { ...merged, versions: [...cur.versions, v], current: v.n };
      });
      toast(`${d.name} merged into Main`);
    },
  });
}

export function discardDraft(pid: string, id: string) {
  const p = getProject(pid);
  const d = p?.drafts.find(x => x.id === id);
  if (!p || !d || id === 'main') return;
  confirmAction({
    title: `Discard ${d.name}?`,
    body: 'Changes made only in this draft are lost. Main is not affected.',
    confirmLabel: 'Discard draft',
    danger: true,
    onConfirm: () => {
      updateProject(pid, cur => {
        const main = cur.drafts.find(x => x.id === 'main');
        const leaving = cur.draftId === id;
        return { drafts: cur.drafts.filter(x => x.id !== id), draftId: leaving ? 'main' : cur.draftId, pv: leaving && main?.pv ? clone(main.pv) : cur.pv };
      });
      toast(`${d.name} discarded`);
    },
  });
}

/* ---------------- versions ---------------- */

export function restoreVersion(pid: string, n: number) {
  const p = getProject(pid);
  const v = p?.versions.find(x => x.n === n);
  if (!p || !v) return;
  if (isBuilding(pid)) { toast('Wait for the build to finish first', 'warn'); return; }
  confirmAction({
    title: `Restore version ${n}?`,
    body: `The agents and website go back to “${v.title}”. Nothing is lost: the restore is saved as a new version you can undo.`,
    confirmLabel: 'Restore',
    onConfirm: () => {
      updateProject(pid, cur => {
        const restored = { ...cur, pv: clone(v.snap.pv), agents: clone(v.snap.agents) };
        const nv = mkVersion(restored, `Restored v${n}: ${v.title}`, 'Restore');
        return { ...restored, versions: [...cur.versions, nv], current: nv.n, msgs: [...cur.msgs, msg({ role: 'ai', text: `Restored version ${n} (“${v.title}”) as v${nv.n}.`, version: nv.n })] };
      });
      toast(`Restored version ${n}`);
    },
  });
}

/* ---------------- agents ---------------- */

export function updateAgentLive(pid: string, agentId: string, patch: Partial<Agent>) {
  updateProject(pid, p => ({ agents: p.agents.map(a => (a.id === agentId ? { ...a, ...patch } : a)) }));
}

export function saveAgent(pid: string, agent: Agent, prevName: string) {
  updateProject(pid, p => {
    const agents = p.agents.map(a => (a.id === agent.id ? agent : prevName !== agent.name ? { ...a, handoffs: a.handoffs.map(h => (h === prevName ? agent.name : h)) } : a));
    const next = { ...p, agents };
    const v = mkVersion(next, `Edited ${agent.name} agent`, '1 agent');
    return { ...next, versions: [...p.versions, v], current: v.n };
  });
  toast(`${agent.name} saved as a new version`);
}

export function deleteAgent(pid: string, agentId: string) {
  const p = getProject(pid);
  const a = p?.agents.find(x => x.id === agentId);
  if (!p || !a) return;
  if (a.kind === 'router') { toast('The router cannot be removed', 'warn'); return; }
  confirmAction({
    title: `Remove ${a.name}?`,
    body: `${a.name} and its tools are removed, and other agents stop handing off to it. You can restore it from History.`,
    confirmLabel: 'Remove agent',
    danger: true,
    onConfirm: () => {
      updateProject(pid, cur => {
        const next = { ...cur, agents: cur.agents.filter(x => x.id !== agentId).map(x => ({ ...x, handoffs: x.handoffs.filter(h => h !== a.name) })) };
        const v = mkVersion(next, `Removed ${a.name} agent`, '1 agent');
        return { ...next, versions: [...cur.versions, v], current: v.n };
      });
      setWs({ editAgent: null, agentSel: p.agents[0].id });
      toast(`${a.name} removed`);
    },
  });
}

export function toggleChannel(pid: string, k: string) {
  const p = getProject(pid);
  if (!p) return;
  updateProject(pid, { chans: { ...p.chans, [k]: !p.chans[k] } });
}

/* ---------------- database ---------------- */

export function addRow(pid: string, table: string) {
  updateProject(pid, p => {
    const t = p.db[table];
    if (!t) return {};
    const id = /^(.*?)(\d+)$/.exec(t.rows[0]?.[0] || '');
    const newId = id ? id[1] + String(Math.max(+id[2], t.count) + 1).padStart(id[2].length, '0') : uid('r').slice(0, 8);
    const row = t.cols.map(([, ty], i) => (i === 0 ? newId : ty === 'timestamptz' ? new Date().toISOString().slice(0, 16).replace('T', ' ') : ty === 'bool' ? 'false' : ty === 'int' || ty === 'numeric' ? '0' : 'NULL'));
    return { db: { ...p.db, [table]: { ...t, rows: [row, ...t.rows], count: t.count + 1 } } };
  });
  toast('Row inserted');
}

export function updateCell(pid: string, table: string, ri: number, ci: number, v: string) {
  updateProject(pid, p => {
    const t = p.db[table];
    if (!t) return {};
    return { db: { ...p.db, [table]: { ...t, rows: t.rows.map((r, i) => (i === ri ? r.map((c, j) => (j === ci ? v : c)) : r)) } } };
  });
}

export function deleteRows(pid: string, table: string, idx: number[]) {
  const set = new Set(idx);
  updateProject(pid, p => {
    const t: Table | undefined = p.db[table];
    if (!t) return {};
    return { db: { ...p.db, [table]: { ...t, rows: t.rows.filter((_, i) => !set.has(i)), count: Math.max(0, t.count - set.size) } } };
  });
  toast(`Deleted ${idx.length} row${idx.length > 1 ? 's' : ''}`);
}

export function execSql(pid: string) {
  const p = getProject(pid);
  if (!p) return;
  setWs({ sqlResult: runSql(p.db, getState().ui.ws.sql) });
}

/* ---------------- terminal ---------------- */

export function termRun(pid: string, cmd: string) {
  const p = getProject(pid);
  if (!p) return;
  const ws = getState().ui.ws;
  const files = generateFiles(p);
  const res = runTerm(files, ws.termCwd, cmd, {
    name: p.name,
    branch: p.draftId === 'main' ? 'main' : 'draft-' + p.draftId.slice(1),
    versions: p.versions.map(v => ({ n: v.n, title: v.title })),
    evals: evalLines(p),
  });
  if (res.clear) { setWs({ termHist: [] }); return; }
  const prompt = `~/${slug(p.name)}${ws.termCwd ? '/' + ws.termCwd : ''}`;
  setWs(w => ({ termCwd: res.cwd, termHist: [...w.termHist, { t: prompt, k: 'cwd' }, { t: '❯ ' + cmd, k: 'cmd' }, ...res.out, { t: '', k: 'gap' }].slice(-400) }));
}

/* ---------------- publish & share ---------------- */

export function openPublish() {
  const p = getProject(getState().ui.ws.pid);
  if (!p) return;
  if (!p.appReady) { toast('Build the app before publishing', 'warn'); return; }
  setWs({ publishOpen: true, pubStep: 'config', deploy: 0, shareOpen: false });
}

export function startDeploy(pid: string) {
  setWs({ pubStep: 'deploying', deploy: 0 });
  let i = 0;
  const tick = () => {
    i++;
    setWs({ deploy: i });
    if (i < 4) { later('deploy:' + pid, tick, 800); return; }
    later('deploy:' + pid, () => {
      updateProject(pid, p => ({ published: true, publishedAt: Date.now(), status: 'Live', msgs: [...p.msgs, msg({ role: 'ai', text: `v${p.current} is live at ${p.domain || slug(p.name) + '.architect.app'}.` })] }));
      setWs({ pubStep: 'live' });
      if (getState().sound) chime();
    }, 500);
  };
  later('deploy:' + pid, tick, 800);
}

export function unpublish(pid: string) {
  const p = getProject(pid);
  if (!p) return;
  confirmAction({
    title: 'Unpublish this app?',
    body: `${slug(p.name)}.architect.app goes offline and agents stop answering on every channel. You can publish again any time.`,
    confirmLabel: 'Unpublish',
    danger: true,
    onConfirm: () => { updateProject(pid, { published: false, publishedAt: null, status: 'Draft' }); setWs({ publishOpen: false }); toast('App unpublished'); },
  });
}

export function setDomain(pid: string, domain: string) {
  const d = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d)) { toast('Enter a domain like example.com', 'warn'); return false; }
  updateProject(pid, { domain: d });
  toast(`${d} connected. DNS can take a few minutes`);
  return true;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const validEmail = (e: string) => EMAIL.test(e.trim());

export function invite(pid: string, email: string, role: 'edit' | 'view') {
  const p = getProject(pid);
  const e = email.trim().toLowerCase();
  if (!p || !validEmail(e)) return false;
  if (e === getState().user.email.toLowerCase() || p.invites.some(x => x.email === e)) { toast('Already has access', 'warn'); return false; }
  updateProject(pid, { invites: [...p.invites, { email: e, role }], shared: true }, false);
  toast(`Invite sent to ${e}`);
  return true;
}
export function setInviteRole(pid: string, email: string, role: 'edit' | 'view' | 'remove') {
  updateProject(pid, p => ({ invites: role === 'remove' ? p.invites.filter(x => x.email !== email) : p.invites.map(x => (x.email === email ? { ...x, role } : x)) }), false);
  if (role === 'remove') toast(`Removed ${email}`);
}

/* ---------------- settings ---------------- */

export function toggleIntegration(name: string) {
  const on = !!getState().ints[name];
  setState(s => ({ ints: { ...s.ints, [name]: !on } }));
  toast(on ? `${name} disconnected` : `${name} connected`);
}

export function saveKey(provider: string, key: string) {
  const k = key.trim();
  if (k.length < 8) { toast('That key looks too short', 'warn'); return false; }
  setState(s => ({ keys: { ...s.keys, [provider]: k.slice(0, 6) + '••••••••' + k.slice(-4) } }));
  toast(`${provider} key saved`);
  return true;
}
export function removeKey(provider: string) {
  setState(s => { const keys = { ...s.keys }; delete keys[provider]; return { keys }; });
  toast(`${provider} key removed. Using Architect's key`);
}

export function addSecret(key: string, value: string) {
  const k = key.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  if (!k || value.trim().length < 4) { toast('Name and value are required', 'warn'); return false; }
  if (getState().secrets.some(s => s.key === k)) { toast(`${k} already exists`, 'warn'); return false; }
  setState(s => ({ secrets: [...s.secrets, { key: k, tail: value.trim().slice(-4), used: 'Not used yet', ts: Date.now() }] }));
  toast(`${k} added`);
  return true;
}
export function removeSecret(key: string) {
  confirmAction({
    title: `Delete ${key}?`,
    body: 'Agents and tools that use this secret stop working until you add it again.',
    confirmLabel: 'Delete secret',
    danger: true,
    onConfirm: () => { setState(s => ({ secrets: s.secrets.filter(x => x.key !== key) })); toast(`${key} deleted`); },
  });
}

/* ---------------- workspace misc ---------------- */

export function addCodeCtx(c: CodeCtx) {
  setWs(w => (w.codeCtx.some(x => x.file === c.file && x.from === c.from && x.to === c.to) ? {} : { codeCtx: [...w.codeCtx, c], paneHidden: false }));
}

export function requestNotifications() {
  try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); } catch { /* ignore */ }
}

export const buildingNow = (pid: string) => isBuilding(pid);
export { snap };
