import type { Agent, Note, PV, Project, Table } from '../types';
import { templateById } from '../data/templates';
import { mkAgent } from '../data/templates';
import { AGENT_MODELS, ROUTER_TOOLS, SEL_LABELS } from '../data/constants';
import { escRe, cap, slug } from './util';

/* ---------------- routing ---------------- */

export interface RouteResult {
  router: Agent;
  agent: Agent | null;
  tool: string | null;
  reply: string;
  urgent: boolean;
  human?: string;
}

export function respond(p: Pick<Project, 'agents' | 'templateId'>, text: string): RouteResult {
  const tpl = templateById(p.templateId);
  const router = p.agents.find(a => a.kind === 'router') || p.agents[0];
  const t = text.toLowerCase();
  const canHandoff = router.tools.some(x => x.name === 'handoff_to_human' && x.on);
  if (tpl.urgent && canHandoff && tpl.urgent.keywords.some(k => new RegExp('\\b' + escRe(k), 'i').test(t))) {
    return { router, agent: null, tool: 'handoff_to_human', reply: tpl.urgent.reply, urgent: true, human: tpl.urgent.human };
  }
  const canRoute = router.tools.some(x => x.name === 'route_to' && x.on);
  let best: Agent | null = null, bestScore = 0;
  if (canRoute) {
    for (const a of p.agents) {
      if (a.kind !== 'specialist') continue;
      const score = a.keywords.reduce((n, k) => n + (new RegExp('\\b' + escRe(k.toLowerCase()), 'i').test(t) ? 1 : 0), 0)
        + (new RegExp('\\b' + escRe(a.name.toLowerCase()) + '\\b').test(t) ? 1 : 0);
      if (score > bestScore) { best = a; bestScore = score; }
    }
  }
  if (!best) return { router, agent: null, tool: null, reply: router.reply || tpl.fallback, urgent: false };
  const tool = best.tools.find(x => x.on && !ROUTER_TOOLS.has(x.name))?.name || null;
  return { router, agent: best, tool, reply: best.reply, urgent: false };
}

const WRITE_TABLE: Record<string, string> = {
  create_work_order: 'work_orders',
  create_task: 'tasks',
  create_return: 'returns',
  book_appointment: 'appointments',
  draft_brief: 'briefs',
  'hubspot.upsert_contact': 'leads',
};

const pad = (n: number) => String(n).padStart(2, '0');
export const sqlNow = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
const sqlDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function nextId(t: Table) {
  let prefix = '', max = 0, width = 0;
  t.rows.forEach(r => {
    const m = /^(.*?)(\d+)$/.exec(r[0] || '');
    if (m) { const n = +m[2]; if (n >= max) { max = n; prefix = m[1]; width = m[2].length; } }
  });
  if (!t.rows.length) return '1';
  return prefix + String(Math.max(max, t.count) + 1).padStart(width, '0');
}

const STATUS_FOR: Record<string, string> = { appointments: 'confirmed', briefs: 'draft', leads: 'qualified', returns: 'label sent' };

function buildRow(table: string, t: Table, text: string, urgent: boolean): string[] {
  const now = new Date();
  const summary = cap(text.trim().replace(/[.!?]+$/, '')).slice(0, 60);
  return t.cols.map(([c], i) => {
    if (i === 0) return nextId(t);
    switch (c) {
      case 'issue': case 'title': case 'reason': return summary;
      case 'unit': return '3B';
      case 'tenant': case 'customer': case 'patient': case 'name': case 'user': return 'Preview visitor';
      case 'urgency': return urgent ? 'emergency' : 'normal';
      case 'status': case 'stage': return STATUS_FOR[table] || 'open';
      case 'vendor': return "Dana's Plumbing";
      case 'owner': return 'On-call';
      case 'practitioner': return 'Dr. Ahmed';
      case 'company': return '—';
      case 'score': return '78';
      case 'sources': return '0';
      case 'order': return '#1042';
      case 'total': case 'amount': return '0.00';
      case 'created_at': case 'placed_at': case 'paid_at': return sqlNow(now);
      case 'slot': return sqlNow(new Date(now.getTime() + 86400000));
      case 'due': return sqlDate(new Date(now.getTime() + 3 * 86400000));
      default: return 'NULL';
    }
  });
}

function convoRow(t: Table, r: RouteResult): string[] {
  return t.cols.map(([c]) => {
    switch (c) {
      case 'id': return 'c_' + Math.random().toString(16).slice(2, 6);
      case 'user': case 'tenant': return 'Preview visitor';
      case 'channel': return 'web';
      case 'routed_to': return r.urgent ? r.human || 'Human' : (r.agent || r.router).name;
      case 'tools_used': return `{${r.tool || ''}}`;
      case 'turns': return '2';
      default: return 'NULL';
    }
  });
}

/** Applies database side-effects of a routed message; returns updated db and the final reply text. */
export function recordRun(db: Record<string, Table>, r: RouteResult, text: string): { db: Record<string, Table>; reply: string; wrote: string | null } {
  const next = { ...db };
  let reply = r.reply, wrote: string | null = null;
  const table = r.tool && WRITE_TABLE[r.tool];
  if (table && next[table]) {
    const t = next[table];
    const row = buildRow(table, t, text, r.urgent);
    next[table] = { ...t, rows: [row, ...t.rows], count: t.count + 1 };
    wrote = table;
    reply = reply.replace(/\{wo\}|\{id\}/g, row[0].replace(/^#/, ''));
  }
  reply = reply.replace(/\{wo\}|\{id\}/g, String(Math.floor(4000 + Math.random() * 900)));
  if (next.conversations) {
    const c = next.conversations;
    next.conversations = { ...c, rows: [convoRow(c, r), ...c.rows], count: c.count + 1 };
  }
  return { db: next, reply, wrote };
}

export function traceLabel(r: RouteResult) {
  const parts = [r.router.name];
  if (r.urgent) parts.push(r.human || 'Human');
  else if (r.agent) parts.push(r.agent.name);
  if (r.tool && !r.urgent) parts.push(r.tool);
  return parts;
}

/* ---------------- visual notes ---------------- */

const COLORS: Record<string, string> = {
  red: '#dc2626', orange: '#ea580c', amber: '#d97706', yellow: '#ca8a04', green: '#16a34a', emerald: '#059669', teal: '#0d9488',
  cyan: '#0891b2', blue: '#2563eb', navy: '#1e3a8a', indigo: '#4f46e5', purple: '#7c3aed', violet: '#7c3aed', pink: '#db2777',
  magenta: '#c026d3', maroon: '#7a1f3d', burgundy: '#7a1f3d', black: '#111111', gray: '#4b5563', grey: '#4b5563', brown: '#92400e', gold: '#b45309',
};
const colorIn = (t: string) => {
  const hex = /#([0-9a-f]{6}|[0-9a-f]{3})\b/i.exec(t);
  if (hex) return hex[0];
  const m = new RegExp('\\b(' + Object.keys(COLORS).join('|') + ')\\b', 'i').exec(t);
  return m ? COLORS[m[1].toLowerCase()] : null;
};
const quoted = (s: string) => /["“”']([^"“”']{1,160})["“”']/.exec(s)?.[1] ?? null;

function shorten(s: string, words = 7) {
  const first = s.split(/(?<=[.!?])\s+/)[0];
  if (first !== s && first.split(/\s+/).length <= words + 4) return first;
  const w = s.split(/\s+/);
  return w.length <= words ? s : w.slice(0, words).join(' ').replace(/[,;:]$/, '') + '.';
}
function friendlier(s: string) {
  const first = s.split(/(?<=[.!?])\s+/)[0].replace(/\.$/, '');
  return `Good news: ${first.charAt(0).toLowerCase() + first.slice(1)}. We’ve got the rest covered.`;
}

export function applyNotes(pv: PV, notes: Note[]): { pv: PV; applied: string[] } {
  const out: PV = { ...pv, features: pv.features.map(f => [...f] as [string, string, string]) };
  const applied: string[] = [];
  const key: Record<string, keyof PV> = { 'hero-title': 'title', 'hero-sub': 'sub', cta: 'cta', kicker: 'kicker' };
  for (const n of notes) {
    const t = n.text.toLowerCase();
    const label = SEL_LABELS[n.target] || n.target;
    const qv = quoted(n.text);
    const before = JSON.stringify(out);
    if (qv && key[n.target]) (out as unknown as Record<string, unknown>)[key[n.target]] = qv;
    if (qv && n.target === 'widget') out.greeting = qv;
    if (n.target === 'hero-title') {
      if (/bigger|larger|huge|increase/.test(t)) out.size = Math.min(76, out.size + 12);
      if (/smaller|decrease|reduce/.test(t)) out.size = Math.max(30, out.size - 8);
      if (/short/.test(t) && !qv) out.title = shorten(out.title, 6);
    }
    if (n.target === 'hero-sub') {
      if (/short|concise|trim/.test(t) && !qv) out.sub = shorten(out.sub, 16);
      if (/friendl|warm|casual/.test(t) && !qv) out.sub = friendlier(out.sub);
    }
    if (n.target === 'cta' || n.target === 'cta-2') {
      if (/solid|fill|stand out|bold|primary|prominent/.test(t)) out.ctaSolid = true;
      if (/outline|ghost|subtle|secondary/.test(t) && n.target === 'cta') out.ctaSolid = false;
    }
    if (n.target === 'cta-2' && /remove|hide|delete|drop/.test(t)) out.cta2Hidden = true;
    if (n.target === 'widget') {
      if (/wide|bigger|larger/.test(t)) out.widgetWide = true;
      if (/narrow|smaller/.test(t)) out.widgetWide = false;
      if (/photo|avatar|picture|face|image/.test(t)) out.widgetAvatar = true;
    }
    if (n.target === 'nav' && /log ?in|sign ?in/.test(t)) out.navLogin = !/remove|hide/.test(t);
    if (n.target === 'features') {
      if (/icon/.test(t)) out.featureIcons = !/remove|hide/.test(t);
      if (/short/.test(t)) out.features = out.features.map(([k, h, b]) => [k, h, shorten(b, 8)]);
    }
    if (n.target === 'footer' && /social/.test(t)) out.footerSocial = !/remove|hide/.test(t);
    if (/\bdark\b/.test(t) && /mode|theme|background|dark it/.test(t)) out.dark = true;
    if (/\blight\b/.test(t) && /mode|theme|background/.test(t)) out.dark = false;
    const col = colorIn(t);
    if (col && !qv) { out.accent = col; if (n.target === 'cta') out.ctaSolid = true; }
    if (JSON.stringify(out) !== before) applied.push(`${label}: ${n.text}`);
  }
  return { pv: out, applied };
}

/* ---------------- chat intent ---------------- */

export interface IntentResult {
  pv: PV;
  agents: Agent[];
  chans: Record<string, boolean>;
  name: string;
  changes: string[];
  files: string[];
  newAgent?: string;
}

const STOP = new Set('a an the that this those these and or for to of in on with who which will can should would could it its is are be by as at from into about our your my their them they we you i me please also just new agent agents specialist add create make build handles handle answers answer manages manage deals deal takes take care books book tracks track any all some every each when what how'.split(' '));

function modelFrom(t: string) {
  const m = t.toLowerCase();
  if (/gpt-?5 ?mini/.test(m)) return 'GPT-5 mini';
  if (/gpt-?5/.test(m)) return 'GPT-5';
  if (/gemini.*flash/.test(m)) return 'Gemini 2.5 Flash';
  if (/gemini/.test(m)) return 'Gemini 2.5 Pro';
  if (/opus/.test(m)) return 'Claude Opus 4.1';
  if (/sonnet/.test(m)) return 'Claude Sonnet 4.5';
  if (/haiku/.test(m)) return 'Claude Haiku 4.5';
  return null;
}

export function parseIntent(p: Project, raw: string): IntentResult {
  const text = raw.trim();
  const t = text.toLowerCase();
  let pv: PV = { ...p.pv, features: p.pv.features.map(f => [...f] as [string, string, string]) };
  let agents: Agent[] = p.agents.map(a => ({ ...a, tools: a.tools.map(x => ({ ...x })), handoffs: [...a.handoffs] }));
  const chans = { ...p.chans };
  let name = p.name;
  const changes: string[] = [];
  const files = new Set<string>();
  let newAgent: string | undefined;
  const router = agents.find(a => a.kind === 'router') || agents[0];
  const qv = quoted(text);

  // add agent
  const add = /\b(?:add|create|build|make)\s+(?:a|an|another|one more)?\s*(?:new\s+)?(?:agent|specialist)\b\s*(?:(?:called|named)\s+["“]?([\w\s-]+?)["”]?\s*(?:,|that|to|who|which|for|$))?\s*(?:that|to|who|which|for)?\s*(.*)$/i.exec(text);
  if (add) {
    const clause = (add[2] || '').replace(/[.!?]+$/, '').trim();
    const words = clause.split(/\s+/).map(w => w.replace(/[^\w-]/g, '')).filter(w => w.length > 2 && !STOP.has(w.toLowerCase()));
    const nm = (add[1] || qv || words.slice(0, 2).map(cap).join(' ') || 'Helper').trim();
    let id = slug(nm).replace(/-/g, '_') || 'helper';
    while (agents.some(a => a.id === id)) id += '_2';
    const kws = Array.from(new Set(words.map(w => w.toLowerCase().replace(/s$/, '')))).slice(0, 8);
    const a = mkAgent({
      id, name: nm, kind: 'specialist',
      role: cap(clause ? `Handles ${clause}` : `${nm} specialist`).slice(0, 80),
      goal: `Resolve ${clause || nm.toLowerCase()} requests end to end, and hand anything unusual back to ${router.name}.`,
      instructions: `You handle ${clause || nm.toLowerCase()} for ${p.name}.\n\nAsk at most one clarifying question, use your tools before answering, and confirm what you did in one short sentence. Hand anything outside your scope back to ${router.name}.`,
      tools: [{ name: 'create_task', on: true }, { name: 'notify_team', on: false }],
      handoffs: [router.name],
      keywords: kws.length ? kws : [nm.toLowerCase()],
      reply: `I can help with that. I've logged it as task #{id} and the team will follow up shortly.`,
      model: 'Claude Sonnet 4.5',
    });
    agents.push(a);
    router.handoffs = Array.from(new Set([...router.handoffs.filter(h => agents.some(x => x.name === h)), nm, ...router.handoffs.filter(h => !agents.some(x => x.name === h))]));
    router.instructions += `\n\nRoute ${clause || nm.toLowerCase()} to ${nm}.`;
    changes.push(`Added the ${nm} agent and taught ${router.name} when to route to it`);
    files.add(`agents/${id}.ts`); files.add(`agents/${router.id}.ts`); files.add('architect.config.ts');
    newAgent = id;
  }

  // remove agent
  const rem = /\b(?:remove|delete|drop|get rid of)\s+(?:the\s+)?([\w\s-]+?)\s+(?:agent|specialist)\b/i.exec(text);
  if (rem && !add) {
    const target = agents.find(a => a.name.toLowerCase() === rem[1].trim().toLowerCase() || a.id === rem[1].trim().toLowerCase());
    if (target && target.kind === 'specialist') {
      agents = agents.filter(a => a.id !== target.id).map(a => ({ ...a, handoffs: a.handoffs.filter(h => h !== target.name) }));
      changes.push(`Removed the ${target.name} agent and its handoffs`);
      files.add(`agents/${target.id}.ts`); files.add('architect.config.ts');
    } else if (target) changes.push(`Kept ${target.name}: every app needs a router`);
  }

  // model switch
  const model = modelFrom(t);
  if (model && /\b(use|switch|change|move|run|put)\b/.test(t)) {
    const hits = agents.filter(a => new RegExp('\\b' + escRe(a.name.toLowerCase()) + '\\b').test(t));
    const all = /\ball agents\b|\bevery agent\b|\beverything\b/.test(t);
    const targets = all ? agents : hits.length ? hits : [];
    const idx = agents.map(a => a.id);
    targets.forEach(a => { const i = idx.indexOf(a.id); agents[i] = { ...agents[i], model }; files.add(`agents/${a.id}.ts`); });
    if (targets.length) changes.push(`${targets.map(a => a.name).join(', ')} now use${targets.length === 1 ? 's' : ''} ${model}`);
  }

  // copy edits
  const setCopy = (re: RegExp, k: 'title' | 'sub' | 'cta' | 'kicker' | 'greeting', label: string) => {
    if (re.test(t) && qv) { (pv as unknown as Record<string, unknown>)[k] = qv; changes.push(`${label} now reads “${qv}”`); files.add('app/page.tsx'); return true; }
    return false;
  };
  const copyHit = setCopy(/\b(button|cta|call to action)\b/, 'cta', 'Primary button')
    || setCopy(/\b(subtitle|sub-title|subheading|tagline|description)\b/, 'sub', 'Subtitle')
    || setCopy(/\b(kicker|eyebrow|label above)\b/, 'kicker', 'Kicker')
    || setCopy(/\b(greeting|welcome message|first message)\b/, 'greeting', 'Widget greeting')
    || setCopy(/\b(title|headline|heading|hero)\b/, 'title', 'Headline');
  if (!copyHit && /\b(headline|title)\b/.test(t)) {
    if (/bigger|larger/.test(t)) { pv.size = Math.min(76, pv.size + 12); changes.push('Made the headline bigger'); files.add('app/page.tsx'); }
    if (/smaller/.test(t)) { pv.size = Math.max(30, pv.size - 8); changes.push('Made the headline smaller'); files.add('app/page.tsx'); }
    if (/shorter/.test(t)) { pv.title = shorten(pv.title, 6); changes.push('Shortened the headline'); files.add('app/page.tsx'); }
  }

  // rename
  const rn = /\brename\s+(?:the\s+)?(?:app|project)\s+to\s+["“]?([^"”]+?)["”]?\s*$/i.exec(text);
  if (rn) { name = rn[1].trim(); changes.push(`Renamed the app to ${name}`); files.add('architect.config.ts'); }

  // theme
  if (/\bdark\b/.test(t) && /\b(mode|theme|background|site|website|page)\b/.test(t) && !/\bno dark\b/.test(t)) { pv.dark = true; changes.push('Switched the website to a dark theme'); files.add('app/page.tsx'); }
  else if (/\blight\b/.test(t) && /\b(mode|theme|background)\b/.test(t)) { pv.dark = false; changes.push('Switched the website to a light theme'); files.add('app/page.tsx'); }
  const col = colorIn(t);
  if (col && /\b(color|colour|accent|brand|theme|button|make it|palette)\b/.test(t)) { pv.accent = col; changes.push(`Changed the accent color to ${col}`); files.add('app/page.tsx'); }

  // site toggles
  if (/\b(log ?in|sign ?in)\b/.test(t) && /\b(nav|link|button|add)\b/.test(t) && !add) { pv.navLogin = true; changes.push('Added a Log in link to the navigation'); files.add('app/page.tsx'); }
  if (/\bsocial\b/.test(t)) { pv.footerSocial = true; changes.push('Added social links to the footer'); files.add('app/page.tsx'); }
  if (/\bicons?\b/.test(t) && /\bfeature/.test(t)) { pv.featureIcons = true; changes.push('Added icons to the features'); files.add('app/page.tsx'); }

  // channels
  const chanMap: [RegExp, string, string][] = [[/\b(sms|text messag|texting|twilio)/, 'sms', 'SMS'], [/\bslack\b/, 'slack', 'Slack'], [/\bapi\b/, 'api', 'API']];
  if (/\b(add|enable|turn on|connect|support)\b/.test(t)) chanMap.forEach(([re, k, l]) => { if (re.test(t) && !chans[k]) { chans[k] = true; changes.push(`Turned on the ${l} channel`); files.add('architect.config.ts'); } });

  // memory / temperature per agent
  if (/\bmemory\b/.test(t)) {
    const hit = agents.filter(a => new RegExp('\\b' + escRe(a.name.toLowerCase()) + '\\b').test(t));
    const on = !/\b(off|disable|remove|without|no)\b/.test(t);
    (hit.length ? hit : agents).forEach(a => { a.memory = on; files.add(`agents/${a.id}.ts`); });
    changes.push(`${on ? 'Turned on' : 'Turned off'} memory for ${hit.length ? hit.map(a => a.name).join(', ') : 'all agents'}`);
  }

  // fallback: fold request into the most relevant agent's instructions
  if (!changes.length) {
    const named = agents.find(a => new RegExp('\\b' + escRe(a.name.toLowerCase()) + '\\b').test(t));
    const r = respond({ agents, templateId: p.templateId }, text);
    const target = named || r.agent || router;
    const line = text.replace(/\s+/g, ' ').replace(/[.!?]*$/, '.');
    agents = agents.map(a => a.id === target.id ? { ...a, instructions: `${a.instructions}\n\n${cap(line)}` } : a);
    changes.push(`Updated ${target.name}'s instructions: “${line.length > 90 ? line.slice(0, 88) + '…' : line}”`);
    files.add(`agents/${target.id}.ts`);
  }
  files.add('evals/routing.yaml');
  return { pv, agents, chans, name, changes, files: Array.from(files), newAgent };
}

export { AGENT_MODELS };

/* ---------------- SQL ---------------- */

export type SqlResult = { cols: string[]; rows: string[][]; ms: number } | { error: string };

function splitTop(s: string, sep: RegExp) {
  const out: string[] = []; let depth = 0, cur = '', inQ = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "'") inQ = !inQ;
    if (!inQ && ch === '(') depth++;
    if (!inQ && ch === ')') depth--;
    if (!inQ && depth === 0) {
      const rest = s.slice(i);
      const m = sep.exec(rest);
      if (m && m.index === 0) { out.push(cur); cur = ''; i += m[0].length - 1; continue; }
    }
    cur += ch;
  }
  out.push(cur);
  return out.map(x => x.trim()).filter(Boolean);
}

const num = (v: string) => (v !== '' && v !== 'NULL' && !isNaN(+v) ? +v : null);
function cmp(a: string, b: string) {
  const x = num(a), y = num(b);
  if (x !== null && y !== null) return x - y;
  return a.localeCompare(b);
}

export function runSql(db: Record<string, Table>, sqlRaw: string): SqlResult {
  const t0 = performance.now();
  const sql = sqlRaw.replace(/--.*$/gm, '').replace(/\s+/g, ' ').trim().replace(/;$/, '').trim();
  if (!sql) return { error: 'Nothing to run. Write a select statement first.' };
  if (/^(insert|update|delete|drop|alter|create|truncate)\b/i.test(sql)) return { error: 'The preview database is read-only from SQL. Add rows from the Tables view, or ask Architect to change the schema.' };
  const m = /^select\s+(.+?)\s+from\s+(\w+)(?:\s+where\s+(.+?))?(?:\s+group\s+by\s+(.+?))?(?:\s+order\s+by\s+(.+?))?(?:\s+limit\s+(\d+))?$/i.exec(sql);
  if (!m) return { error: 'syntax error. Supported: select … from … [where …] [group by …] [order by …] [limit n]' };
  const [, colsRaw, tableName, whereRaw, groupRaw, orderRaw, limitRaw] = m;
  const T = db[tableName];
  if (!T) return { error: `relation "${tableName}" does not exist. Tables: ${Object.keys(db).join(', ')}` };
  const names = T.cols.map(c => c[0]);
  const colIdx = (c: string) => { const i = names.indexOf(c.trim().replace(/^"|"$/g, '')); return i; };

  let rows = T.rows.slice();
  if (whereRaw) {
    const conds = splitTop(whereRaw, /^\s+and\s+/i);
    for (const c of conds) {
      const cm = /^(\w+)\s*(=|!=|<>|>=|<=|>|<|\bilike\b|\blike\b|\bis not\b|\bis\b)\s*(.+)$/i.exec(c);
      if (!cm) continue;
      const i = colIdx(cm[1]);
      if (i < 0) return { error: `column "${cm[1]}" does not exist` };
      const op = cm[2].toLowerCase();
      let v = cm[3].trim();
      if (/now\(\)|interval|current_date/i.test(v)) continue;
      if (/^null$/i.test(v)) v = 'NULL';
      v = v.replace(/^'(.*)'$/, '$1');
      rows = rows.filter(r => {
        const x = r[i];
        switch (op) {
          case '=': case 'is': return x === v;
          case '!=': case '<>': case 'is not': return x !== v;
          case '>': return cmp(x, v) > 0;
          case '<': return cmp(x, v) < 0;
          case '>=': return cmp(x, v) >= 0;
          case '<=': return cmp(x, v) <= 0;
          case 'like': case 'ilike': {
            const re = new RegExp('^' + escRe(v).replace(/%/g, '.*').replace(/_/g, '.') + '$', op === 'ilike' ? 'i' : '');
            return re.test(x);
          }
        }
        return true;
      });
    }
  }

  const items = splitTop(colsRaw, /^,/).map(s => {
    const am = /^(.+?)\s+as\s+(\w+)$/i.exec(s);
    return { expr: (am ? am[1] : s).trim(), alias: am ? am[2] : null };
  });
  const isCount = (e: string) => /^count\s*\(\s*(\*|\w+)\s*\)$/i.test(e);
  let outCols: string[] = [], out: string[][] = [];

  if (items.length === 1 && items[0].expr === '*') {
    outCols = names; out = rows;
  } else {
    for (const it of items) if (!isCount(it.expr) && colIdx(it.expr) < 0) return { error: `column "${it.expr}" does not exist` };
    outCols = items.map(it => it.alias || (isCount(it.expr) ? 'count' : it.expr));
    const hasAgg = items.some(it => isCount(it.expr));
    if (hasAgg || groupRaw) {
      const keys = groupRaw ? splitTop(groupRaw, /^,/).map(g => /^\d+$/.test(g) ? items[+g - 1]?.expr : g) : [];
      for (const k of keys) if (!k || colIdx(k) < 0) return { error: `invalid group by "${k}"` };
      const groups = new Map<string, string[][]>();
      rows.forEach(r => { const k = keys.map(k2 => r[colIdx(k2)]).join('\u0000'); groups.set(k, [...(groups.get(k) || []), r]); });
      if (!keys.length && !groups.size) groups.set('', []);
      // sample rows stand in for the full table, so scale counts up to the table's real size
      const factor = T.count / Math.max(1, T.rows.length);
      out = Array.from(groups.values()).map(g => items.map(it => isCount(it.expr) ? String(g.length ? Math.max(g.length, Math.round(g.length * factor)) : 0) : (g[0]?.[colIdx(it.expr)] ?? 'NULL')));
    } else {
      out = rows.map(r => items.map(it => r[colIdx(it.expr)]));
    }
  }

  if (orderRaw) {
    const specs = splitTop(orderRaw, /^,/).map(o => {
      const om = /^(.+?)(?:\s+(asc|desc))?$/i.exec(o)!;
      const key = om[1].trim();
      let i = /^\d+$/.test(key) ? +key - 1 : outCols.indexOf(key);
      if (i < 0 && isCount(key)) i = outCols.indexOf('count');
      return { i, desc: (om[2] || '').toLowerCase() === 'desc', key };
    });
    for (const s of specs) if (s.i < 0 || s.i >= outCols.length) return { error: `column "${s.key}" does not exist in result` };
    out = out.slice().sort((a, b) => { for (const s of specs) { const c = cmp(a[s.i], b[s.i]); if (c) return s.desc ? -c : c; } return 0; });
  }
  if (limitRaw) out = out.slice(0, +limitRaw);
  return { cols: outCols, rows: out, ms: Math.max(3, Math.round(performance.now() - t0 + 6 + Math.random() * 8)) };
}

export function defaultSql(p: Project) {
  const main = templateById(p.templateId).mainTable;
  const t = p.db[main] || Object.values(p.db)[0];
  const name = p.db[main] ? main : Object.keys(p.db)[0];
  if (!t) return 'select 1;';
  const status = t.cols.find(c => c[0] === 'status' || c[0] === 'stage');
  return status ? `select ${status[0]}, count(*)\nfrom ${name}\ngroup by 1\norder by 2 desc;` : `select *\nfrom ${name}\nlimit 10;`;
}

/* ---------------- terminal ---------------- */

export interface TermLine { t: string; k?: string }

export function runTerm(files: Record<string, string>, cwd: string, cmdRaw: string, ctx: { name: string; branch: string; versions: { n: number; title: string }[]; evals: string[] }): { out: TermLine[]; cwd: string; clear?: boolean } {
  const cmd = cmdRaw.trim();
  const out: TermLine[] = [];
  const s = slug(ctx.name);
  const dirs = new Set<string>(['']);
  Object.keys(files).forEach(f => { const parts = f.split('/'); for (let i = 1; i < parts.length; i++) dirs.add(parts.slice(0, i).join('/')); });
  const list = (dir: string) => {
    const pre = dir ? dir + '/' : '';
    const items = new Set<string>();
    Object.keys(files).forEach(f => { if (f.startsWith(pre)) { const rest = f.slice(pre.length); const head = rest.split('/')[0]; items.add(rest.includes('/') ? head + '/' : head); } });
    if (!dir) items.add('node_modules/');
    return Array.from(items).sort((a, b) => (a.endsWith('/') === b.endsWith('/') ? a.localeCompare(b) : a.endsWith('/') ? -1 : 1));
  };
  const resolve = (arg: string) => {
    let parts = arg.startsWith('/') || arg.startsWith('~') ? [] : cwd ? cwd.split('/') : [];
    arg.replace(/^~\/?|^\//, '').split('/').filter(Boolean).forEach(seg => {
      if (seg === '..') parts = parts.slice(0, -1);
      else if (seg !== '.') parts.push(seg);
    });
    return parts.join('/');
  };
  const [c, ...args] = cmd.split(/\s+/);
  const a0 = args.join(' ');
  if (!cmd) return { out, cwd };
  switch (c) {
    case 'clear': return { out: [], cwd, clear: true };
    case 'help':
      out.push({ t: 'Commands: ls [dir], cd <dir>, pwd, cat <file>, tree, grep <text>, npm run dev, npm test, npm install, architect eval, git status, git log, whoami, date, clear', k: 'dim' });
      break;
    case 'ls': {
      const d = args[0] ? resolve(args[0]) : cwd;
      if (!dirs.has(d)) { out.push({ t: `ls: ${args[0]}: No such file or directory`, k: 'err' }); break; }
      out.push({ t: list(d).join('    '), k: 'ls' });
      break;
    }
    case 'pwd': out.push({ t: `/home/architect/${s}${cwd ? '/' + cwd : ''}` }); break;
    case 'cd': {
      const d = !args[0] || args[0] === '~' || args[0] === '/' ? '' : resolve(args[0].replace(/\/$/, ''));
      if (dirs.has(d)) return { out, cwd: d };
      out.push({ t: `cd: no such directory: ${args[0]}`, k: 'err' });
      break;
    }
    case 'cat': case 'head': {
      if (!args[0]) { out.push({ t: `usage: ${c} <file>`, k: 'err' }); break; }
      const p = resolve(args[0]);
      const key = files[p] !== undefined ? p : Object.keys(files).find(f => f.endsWith('/' + args[0]) || f === args[0]);
      if (!key) { out.push({ t: `${c}: ${args[0]}: No such file`, k: 'err' }); break; }
      const lines = files[key].split('\n');
      (c === 'head' ? lines.slice(0, 10) : lines).forEach(l => out.push({ t: l }));
      break;
    }
    case 'tree': {
      const pre = cwd ? cwd + '/' : '';
      Object.keys(files).filter(f => f.startsWith(pre)).sort().forEach(f => {
        const rel = f.slice(pre.length).split('/');
        out.push({ t: '  '.repeat(rel.length - 1) + (rel.length > 1 ? '└ ' : '') + rel[rel.length - 1] });
      });
      break;
    }
    case 'grep': {
      const q = a0.replace(/^-\w+\s+/, '').replace(/^["']|["']$/g, '');
      if (!q) { out.push({ t: 'usage: grep <text>', k: 'err' }); break; }
      let n = 0;
      Object.entries(files).forEach(([f, src]) => src.split('\n').forEach((l, i) => { if (n < 30 && l.toLowerCase().includes(q.toLowerCase())) { n++; out.push({ t: `${f}:${i + 1}: ${l.trim()}` }); } }));
      if (!n) out.push({ t: 'no matches', k: 'dim' });
      break;
    }
    case 'npm':
      if (/^(run )?dev$/.test(a0)) out.push({ t: `> ${s}@0.${ctx.versions.length}.0 dev` }, { t: '  ▲ Ready on http://localhost:3000 in 812ms', k: 'ok' });
      else if (a0 === 'test' || a0 === 'run test') { runEvals(out, ctx.evals); }
      else if (/^(i|install)\b/.test(a0)) out.push({ t: `added ${args[1] ? 1 : 214} package${args[1] ? '' : 's'} in ${args[1] ? '1' : '3'}s`, k: 'ok' });
      else if (/^(run )?build$/.test(a0)) out.push({ t: `> ${s} build` }, { t: '  ✓ Compiled 42 modules', k: 'ok' }, { t: '  ✓ Agents bundled', k: 'ok' });
      else out.push({ t: `npm: unknown command "${a0}"`, k: 'err' });
      break;
    case 'architect':
      if (args[0] === 'eval') runEvals(out, ctx.evals);
      else if (args[0] === 'deploy') out.push({ t: 'Use the Publish button to deploy this version.', k: 'dim' });
      else out.push({ t: 'architect: try `architect eval`', k: 'dim' });
      break;
    case 'git':
      if (args[0] === 'status') out.push({ t: 'On branch ' + ctx.branch }, { t: 'nothing to commit, working tree clean', k: 'dim' });
      else if (args[0] === 'log') [...ctx.versions].reverse().slice(0, 10).forEach(v => out.push({ t: `${(v.n * 2654435761 >>> 0).toString(16).slice(0, 7)} v${v.n} ${v.title}`, k: v.n === ctx.versions.length ? 'ok' : undefined }));
      else if (args[0] === 'branch') out.push({ t: '* ' + ctx.branch });
      else out.push({ t: `git: '${args[0] || ''}' is not available in the preview shell`, k: 'err' });
      break;
    case 'whoami': out.push({ t: 'architect' }); break;
    case 'date': out.push({ t: new Date().toString() }); break;
    case 'echo': out.push({ t: a0.replace(/^["']|["']$/g, '') }); break;
    default: out.push({ t: `command not found: ${c}`, k: 'err' });
  }
  return { out, cwd };
}

function runEvals(out: TermLine[], evals: string[]) {
  const n = Math.max(12, evals.length);
  out.push({ t: `Running ${n} eval conversations…` });
  evals.forEach(x => out.push({ t: '  ✓ ' + x, k: 'ok' }));
  if (n > evals.length) out.push({ t: `  … ${n - evals.length} more`, k: 'dim' });
  out.push({ t: `${n} passed, 0 failed (${(n * 0.34).toFixed(1)}s)`, k: 'ok' });
}

export function evalLines(p: Project) {
  const tpl = templateById(p.templateId);
  return tpl.samples.map(s => {
    const r = respond(p, s);
    return `${s} → ${r.urgent ? r.human : (r.agent || r.router).name}`;
  });
}
