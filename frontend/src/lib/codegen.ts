import type { Agent, Project } from '../types';
import { templateById } from '../data/templates';
import { respond } from './sim';
import { widgetTitle } from './factory';
import { slug } from './util';

const modelId = (m: string) => m.toLowerCase().replace(/\./g, '-').replace(/\s+/g, '-');
const camel = (s: string) => s.replace(/[^a-zA-Z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : '')).replace(/^./, c => c.toLowerCase());
const q = (s: string) => JSON.stringify(s);
const indent = (s: string, n: number) => s.split('\n').map(l => (l ? ' '.repeat(n) + l : l)).join('\n');

export function fileTree(files: Record<string, string>) {
  const out: { path: string; depth: number; kind: 'file' | 'folder' }[] = [];
  const seen = new Set<string>();
  Object.keys(files).sort((a, b) => {
    const da = a.includes('/'), db = b.includes('/');
    if (da !== db) return da ? 1 : -1;
    return a.localeCompare(b);
  }).forEach(path => {
    const parts = path.split('/');
    for (let i = 1; i < parts.length; i++) {
      const dir = parts.slice(0, i).join('/');
      if (!seen.has(dir)) { seen.add(dir); out.push({ path: dir, depth: i - 1, kind: 'folder' }); }
    }
    out.push({ path, depth: parts.length - 1, kind: 'file' });
  });
  return out;
}

function agentFile(a: Agent, all: Agent[]) {
  const others = all.filter(x => x.id !== a.id && x.kind === 'specialist' && a.handoffs.includes(x.name));
  const humans = a.handoffs.filter(h => !all.some(x => x.name === h));
  const tools = a.tools.filter(t => t.on && t.name !== 'route_to' && t.name !== 'handoff_to_human');
  const imports = ['agent'];
  if (a.kind === 'router' && (others.length || humans.length)) imports.push('handoff');
  if (a.knowledge.length) imports.push('knowledge');
  const lines = [
    `import { ${imports.join(', ')} } from "@architect/core";`,
    ...(a.kind === 'router' && others.length ? [`import { ${others.map(o => o.id).join(', ')} } from ".";`] : []),
    ...(tools.length ? [`import { ${tools.map(t => camel(t.name)).join(', ')} } from "../tools/${a.id}";`] : []),
    '',
    `export const ${a.id} = agent({`,
    `  name: ${q(a.name)},`,
    `  model: ${q(modelId(a.model))},`,
    ...(a.kind === 'router' ? ['  role: "router",'] : []),
    `  goal: ${q(a.goal)},`,
    '  instructions: `',
    indent(a.instructions.replace(/`/g, '\\`'), 4),
    '  `,',
    `  temperature: ${a.temp},`,
    `  maxTokens: ${a.maxTok},`,
  ];
  if (tools.length) lines.push(`  tools: [${tools.map(t => camel(t.name)).join(', ')}],`);
  if (a.kind === 'router' && (others.length || humans.length)) {
    lines.push('  handoffs: [');
    others.forEach(o => lines.push(`    handoff(${o.id}, { when: ${q(o.role.toLowerCase())} }),`));
    humans.forEach(h => lines.push(`    handoff.human(${q(h.toLowerCase())}, { when: "upset user or emergency" }),`));
    lines.push('  ],');
  }
  if (a.knowledge.length) lines.push(`  knowledge: [${a.knowledge.map(k => `knowledge.file(${q(k)})`).join(', ')}],`);
  if (a.skills.length) lines.push(`  skills: ${JSON.stringify(a.skills)},`);
  if (a.sched.length) lines.push(`  schedules: ${JSON.stringify(a.sched)},`);
  const feats = Object.entries(a.feats).filter(([, v]) => v).map(([k]) => k);
  lines.push(`  memory: ${a.memory},`);
  if (feats.length) lines.push(`  features: ${JSON.stringify(feats)},`);
  const outs = Object.entries(a.out).filter(([, v]) => v).map(([k]) => k);
  lines.push(`  output: ${JSON.stringify(outs)},`);
  lines.push('});');
  return lines.join('\n');
}

function toolsFile(a: Agent) {
  const tools = a.tools.filter(t => t.name !== 'route_to' && t.name !== 'handoff_to_human');
  return [
    'import { tool, z } from "@architect/core";',
    'import { db } from "../lib/db";',
    '',
    ...tools.map(t => [
      `// ${t.on ? 'enabled' : 'disabled'}`,
      `export const ${camel(t.name)} = tool({`,
      `  name: ${q(t.name)},`,
      '  input: z.object({ query: z.string() }),',
      '  run: async (input, ctx) => {',
      `    return ctx.call(${q(t.name)}, input);`,
      '  },',
      '});',
      '',
    ].join('\n')),
  ].join('\n').trimEnd();
}

function pageFile(p: Project) {
  const pv = p.pv;
  const attrs = [
    `kicker=${q(pv.kicker)}`,
    `title=${q(pv.title)}`,
    `subtitle=${q(pv.sub)}`,
    `cta=${q(pv.cta)}`,
    ...(pv.ctaSolid ? ['ctaVariant="solid"'] : []),
    ...(pv.size !== 46 ? [`titleSize={${pv.size}}`] : []),
  ];
  const tpl = templateById(p.templateId);
  return [
    'import { Chat, Nav, Footer } from "@architect/ui";',
    'import { Hero, Features } from "./sections";',
    '',
    ...(pv.accent || pv.dark ? [`export const theme = { ${[pv.accent ? `accent: ${q(pv.accent)}` : '', pv.dark ? 'mode: "dark"' : ''].filter(Boolean).join(', ')} };`, ''] : []),
    'export default function Page() {',
    '  return (',
    '    <main>',
    `      <Nav brand=${q(p.name)}${pv.navLogin ? ' showLogin' : ''} />`,
    '      <Hero',
    ...attrs.map(a => '        ' + a),
    ...(pv.cta2Hidden ? ['        hideSecondary'] : []),
    '      />',
    `      <Chat agent=${q(p.agents[0]?.id || 'router')} title=${q(widgetTitle(tpl, p.name))}${pv.widgetWide ? ' width="wide"' : ''}${pv.widgetAvatar ? ' avatar' : ''}`,
    `        greeting=${q(pv.greeting)} />`,
    `      <Features${pv.featureIcons ? ' icons' : ''} items={${JSON.stringify(pv.features.map(f => ({ label: f[0], title: f[1], body: f[2] })), null, 2).split('\n').map((l, i) => (i ? '        ' + l : l)).join('\n')}} />`,
    `      <Footer${pv.footerSocial ? ' social' : ''} />`,
    '    </main>',
    '  );',
    '}',
  ].join('\n');
}

function evalsFile(p: Project) {
  const tpl = templateById(p.templateId);
  const router = p.agents.find(a => a.kind === 'router');
  const lines: string[] = [];
  tpl.samples.forEach(s => {
    const r = respond(p, s);
    lines.push(`- input: ${q(s)}`);
    if (r.urgent) lines.push(`  expect: { handoff: ${r.human} }`);
    else lines.push(`  expect: { routed_to: ${r.agent ? r.agent.name : router?.name}${r.tool ? `, tool: ${r.tool}` : ''} }`);
  });
  p.agents.filter(a => a.kind === 'specialist' && !tpl.agents.some(t => t.id === a.id)).forEach(a => {
    if (a.keywords[0]) lines.push(`- input: ${q('Help with ' + a.keywords[0])}`, `  expect: { routed_to: ${a.name} }`);
  });
  return lines.join('\n');
}

function migration(p: Project) {
  const map: Record<string, string> = { uuid: 'uuid primary key default gen_random_uuid()', enum: 'text', 'text[]': 'text[]', timestamptz: 'timestamptz default now()' };
  return Object.entries(p.db).map(([name, t]) => [
    `-- ${t.desc}`,
    `create table ${name} (`,
    t.cols.map(([c, ty], i) => `  ${c} ${i === 0 && ty !== 'uuid' ? ty + ' primary key' : map[ty] || ty}`).join(',\n'),
    ');',
  ].join('\n')).join('\n\n');
}

export function generateFiles(p: Project): Record<string, string> {
  const s = slug(p.name);
  const router = p.agents.find(a => a.kind === 'router') || p.agents[0];
  const specs = p.agents.filter(a => a.id !== router?.id);
  const chans = Object.entries(p.chans).filter(([, v]) => v).map(([k]) => k);
  const files: Record<string, string> = {};
  files['architect.config.ts'] = [
    'import { defineApp } from "@architect/core";',
    `import { ${router?.id} } from "./agents/${router?.id}";`,
    ...(specs.length ? [`import { ${specs.map(a => a.id).join(', ')} } from "./agents";`] : []),
    '',
    'export default defineApp({',
    `  name: ${q(s)},`,
    `  entry: ${router?.id},`,
    `  agents: [${specs.map(a => a.id).join(', ')}],`,
    `  channels: ${JSON.stringify(chans)},`,
    '  memory: { scope: "per-user", retainDays: 180 },',
    '  evals: "./evals/*.yaml",',
    '});',
  ].join('\n');
  p.agents.forEach(a => { files[`agents/${a.id}.ts`] = agentFile(a, p.agents); });
  files['agents/index.ts'] = p.agents.map(a => `export { ${a.id} } from "./${a.id}";`).join('\n');
  specs.filter(a => a.tools.some(t => t.name !== 'route_to' && t.name !== 'handoff_to_human')).forEach(a => { files[`tools/${a.id}.ts`] = toolsFile(a); });
  files['app/page.tsx'] = pageFile(p);
  files['app/api/chat/route.ts'] = [
    'import { serve } from "@architect/core";',
    'import app from "../../../architect.config";',
    '',
    'export const POST = serve(app, { stream: true, trace: true });',
  ].join('\n');
  files['evals/routing.yaml'] = evalsFile(p);
  files['supabase/migrations/001_init.sql'] = migration(p);
  files['package.json'] = JSON.stringify({ name: s, version: `0.${p.versions.length}.0`, private: true, scripts: { dev: 'architect dev', build: 'architect build', test: 'architect eval' }, dependencies: { '@architect/core': '^2.0.0', '@architect/ui': '^2.0.0', next: '15.0.3', react: '19.0.0' } }, null, 2);
  files['README.md'] = [
    `# ${p.name}`,
    '',
    templateById(p.templateId).app + ' built with Architect.',
    '',
    '## Agents',
    ...p.agents.map(a => `- **${a.name}** (${a.kind}, ${a.model}): ${a.goal}`),
    '',
    '## Run locally',
    '```',
    'npm install',
    'npm run dev',
    'npm test   # runs evals/routing.yaml',
    '```',
  ].join('\n');
  return files;
}
