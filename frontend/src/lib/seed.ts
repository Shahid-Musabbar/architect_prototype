import type { AppState, Project, UiState, WsUi } from '../types';
import { FULL_STEPS } from '../data/constants';
import { createProject, mkVersion, msg, clone } from './factory';
import { templateById } from '../data/templates';

export const SCHEMA_V = 3;

const H = 3600_000, D = 24 * H;

export function wsDefaults(): WsUi {
  return {
    pid: null, tab: 'preview', selectMode: false, hover: null, selected: null, notes: [], batchOpen: true,
    input: '', codeCtx: [], attachments: [], planMode: false, paneHidden: false, focusThread: true,
    device: 'desktop', sitePath: '/', reloadKey: 0, planOpen: false, planView: 'plan', mockScreen: 0,
    editAgent: null, edTab: 'build', agentSel: '', insp: 'config', file: 'architect.config.ts', fsTab: 'files',
    termTabs: ['architect', 'publish', 'term1'], termTab: 'term1', termOpen: true, termN: 1, termHist: [], termCwd: '',
    dbView: 'tables', dbTable: '', sql: '', sqlResult: null, publishOpen: false, pubStep: 'config', deploy: 0,
    shareOpen: false, agentChat: false,
  };
}

export function uiDefaults(): UiState {
  return { route: { name: 'home' }, toast: null, building: {}, typing: {}, active: [], palette: false, info: null, confirm: null, ws: wsDefaults() };
}

function builtProject(name: string, templateId: string, prompt: string, ageMs: number, versions: [string, string][]): Project {
  const now = Date.now();
  const t0 = now - ageMs;
  const p = createProject({ name, templateId, built: true, ts: t0 });
  const tpl = templateById(templateId);
  p.msgs = [
    msg({ role: 'user', text: prompt }),
    msg({ role: 'ai', steps: FULL_STEPS.map(l => ({ l, st: 2 })), text: `${name} is ready. A ${p.agents[0].name} agent routes each conversation to ${p.agents.length - 1} specialists (${p.agents.slice(1).map(a => a.name).join(', ')}), and each one has its own tools. Try the widget in the preview, or open Agents to see the graph.`, version: 1 }),
  ];
  versions.forEach(([title, meta], i) => {
    p.versions.push(mkVersion(p, title, meta, t0 + i * 17 * 60_000));
  });
  p.current = p.versions.length;
  p.updatedAt = t0 + (versions.length - 1) * 17 * 60_000;
  p.viewedAt = p.updatedAt;
  p.chatTitle = null;
  p.spent = 18 + versions.length * 2;
  p.widget = [{ r: 'a', t: tpl.site.greeting }];
  return p;
}

export function seedProjects(): Project[] {
  const now = Date.now();
  const keystone = builtProject('Keystone', 'concierge',
    'Build a tenant concierge for small landlords. Tenants chat or text; route repairs, rent questions and lease questions to specialist agents, create work orders, and look up balances in Stripe.',
    5 * H, [['Initial build — Concierge and 3 specialists', '14 files · 4 agents'], ['Stripe balance lookup for Billing', '2 files'], ['Tenant website and chat widget', '5 files'], ['SMS channel via Twilio', '3 files']]);
  keystone.msgs[1].version = 3;
  keystone.msgs.push(
    msg({ role: 'user', text: 'Add an SMS channel so tenants can text the concierge.' }),
    msg({ role: 'ai', steps: [['Adding Twilio SMS channel', 'Adding text messaging'], ['Re-running 12 evals — 12 passed', 'Re-testing with practice conversations']].map(l => ({ l: l as [string, string], st: 2 as const })), text: 'Tenants can now text (415) 555‑0142. Replies come from the same agents, so history carries over between chat and SMS.', version: 4 }),
  );
  keystone.chans = { web: true, sms: true, slack: false, api: true };
  keystone.status = 'Live';
  keystone.published = true;
  keystone.publishedAt = now - 4 * H;
  keystone.starred = true;
  keystone.drafts = [{ id: 'main', name: 'Main', pv: null }];
  keystone.chats = [{ id: 'c_old1', title: 'Explore vendor notifications', ts: now - 2 * D, msgs: [msg({ role: 'user', text: 'How does the Maintenance agent pick a vendor?' }), msg({ role: 'ai', text: 'It reads Vendor list.csv from its knowledge and picks the preferred vendor for the issue type, then texts them with notify_vendor.' })] }];
  keystone.updatedAt = now - 2 * H;
  keystone.viewedAt = now - 2 * H;

  const brief = builtProject('Brief Room', 'research', 'A research team: a scout that finds sources, an analyst that fact-checks them and a writer that drafts a weekly brief.', 30 * H, [['Initial build — Editor and 3 specialists', '12 files · 4 agents'], ['Notion publishing for Writer', '2 files']]);
  brief.updatedAt = brief.viewedAt = now - 26 * H;

  const counter = builtProject('Counter', 'support', 'A support copilot for my Shopify store that answers order questions, processes returns and escalates angry customers to me.', 4 * D, [['Initial build — Front desk and 3 specialists', '13 files · 4 agents'], ['Return policy knowledge', '1 file'], ['Refund approval over $200', '2 files']]);
  counter.status = 'Live';
  counter.published = true;
  counter.publishedAt = now - 3 * D;
  counter.shared = true;
  counter.invites = [{ email: 'maya@counter.shop', role: 'edit' }];
  counter.updatedAt = counter.viewedAt = now - 3 * D;

  const warm = builtProject('Warm Lead', 'leads', 'A lead qualifier that chats with website visitors, scores them and books sales calls on my calendar.', 8 * D, [['Initial build — Greeter and 2 specialists', '9 files · 3 agents']]);
  warm.updatedAt = warm.viewedAt = now - 7 * D;

  const front = builtProject('Frontdesk', 'clinic', 'A clinic intake assistant that collects symptoms, checks insurance and books the right practitioner.', 26 * D, [['Initial build — Intake and 3 specialists', '12 files · 4 agents'], ['Emergency escalation to staff', '1 file']]);
  front.status = 'Paused';
  front.published = true;
  front.publishedAt = now - 25 * D;
  front.updatedAt = front.viewedAt = now - 25 * D;

  return [keystone, brief, counter, warm, front];
}

export function seedState(): AppState {
  return {
    v: SCHEMA_V,
    signedIn: false,
    user: { name: 'Shahid Musabbar', email: 'shahid@architect.new', workspace: "Shahid's workspace", region: 'US East (Virginia)' },
    supabaseUserId: null,
    theme: 'dark',
    exp: 'guided',
    plan: 'builder',
    billing: 'monthly',
    credits: 84,
    codeModel: 'architect',
    ds: 'Shadcn',
    ints: { Stripe: true, Supabase: true, Twilio: true, 'Google Calendar': true, Slack: true },
    keys: { Anthropic: 'sk-ant-••••••••4f2a' },
    secrets: [
      { key: 'STRIPE_SECRET_KEY', tail: 'x9Qa', used: 'Billing', ts: Date.now() - 8 * D },
      { key: 'TWILIO_AUTH_TOKEN', tail: '3f0c', used: 'Maintenance, SMS channel', ts: Date.now() - 3 * H },
      { key: 'SUPABASE_SERVICE_KEY', tail: 'k7Lm', used: 'All agents', ts: Date.now() - 8 * D },
      { key: 'GOOGLE_CALENDAR_TOKEN', tail: 'p2Rz', used: 'Leasing', ts: Date.now() - 5 * D },
    ],
    roleModels: { router: 'Claude Haiku 4.5', specialist: 'Claude Sonnet 4.5', builder: 'architect' },
    layout: 'Split',
    paneSide: 'left',
    paneW: null,
    sound: true,
    projects: seedProjects(),
    ui: uiDefaults(),
  };
}

export const freshClone = clone;
