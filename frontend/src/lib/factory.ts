import type { Agent, Msg, PV, Project, Version } from '../types';
import { mkAgent, templateById, type Template } from '../data/templates';
import { uid } from './util';

export const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

export function defaultPV(tpl: Template): PV {
  return {
    kicker: tpl.site.kicker,
    title: tpl.site.title,
    sub: tpl.site.sub,
    cta: tpl.site.cta,
    size: 46,
    ctaSolid: false,
    cta2Hidden: false,
    widgetWide: false,
    widgetAvatar: false,
    navLogin: false,
    featureIcons: false,
    footerSocial: false,
    accent: null,
    dark: false,
    features: tpl.site.features.map(f => [...f] as [string, string, string]),
    greeting: tpl.site.greeting,
  };
}

export const defaultAgents = (tpl: Template): Agent[] => tpl.agents.map(a => mkAgent(clone(a)));

export const snap = (p: Pick<Project, 'pv' | 'agents'>) => ({ pv: clone(p.pv), agents: clone(p.agents) });

export function mkVersion(p: Project, title: string, meta: string, ts = Date.now()): Version {
  return { n: p.versions.length + 1, title, ts, meta, snap: snap(p) };
}

export const msg = (m: Omit<Msg, 'id'>): Msg => ({ id: uid('m'), ...m });

export function createProject(opts: { name: string; templateId: string; built?: boolean; prompt?: string; ts?: number }): Project {
  const tpl = templateById(opts.templateId);
  const ts = opts.ts ?? Date.now();
  const p: Project = {
    id: uid('p'),
    name: opts.name,
    templateId: tpl.id,
    status: 'Draft',
    starred: false,
    shared: false,
    createdAt: ts,
    updatedAt: ts,
    viewedAt: ts,
    msgs: opts.prompt ? [msg({ role: 'user', text: opts.prompt })] : [],
    chatId: uid('c'),
    chatTitle: null,
    chats: [],
    versions: [],
    current: 0,
    pv: defaultPV(tpl),
    agents: defaultAgents(tpl),
    chans: { web: true, sms: false, slack: false, api: true },
    drafts: [{ id: 'main', name: 'Main', pv: null }],
    draftId: 'main',
    draftN: 0,
    widget: [{ r: 'a', t: tpl.site.greeting }],
    pg: [],
    db: clone(tpl.db),
    planning: null,
    palette: 'harbor',
    buildMode: 'lyzr',
    appReady: !!opts.built,
    published: false,
    publishedAt: null,
    domain: null,
    invites: [],
    linkAccess: 'off',
    wsAccess: 'edit',
    psAgent: 'arch',
    spent: 0,
  };
  if (!opts.built) p.agents.forEach(a => (a.runs = 0));
  if (tpl.brand && tpl.brand !== opts.name) {
    const re = new RegExp(`\\b${tpl.brand}\\b`, 'g');
    const swap = <T,>(x: T): T => JSON.parse(JSON.stringify(x).replace(re, opts.name.replace(/["\\]/g, '')));
    p.pv = swap(p.pv);
    p.agents = swap(p.agents);
    p.widget = swap(p.widget);
  }
  return p;
}

export const widgetTitle = (tpl: Template, name: string) => (tpl.brand ? tpl.site.widgetTitle.replace(tpl.brand, name) : tpl.site.widgetTitle);

export function nameFromPrompt(prompt: string) {
  const w = prompt.replace(/[^\w\s]/g, '').split(/\s+/)
    .filter(x => x.length > 2 && !/^(the|and|for|that|build|with|my|a|an|want|need|like|make|create|app|ai|agent|agents|who|which|our|your|their|this|from|into)$/i.test(x))
    .slice(0, 2).map(x => x.charAt(0).toUpperCase() + x.slice(1).toLowerCase()).join(' ');
  return w ? w + ' AI' : 'Untitled app';
}
