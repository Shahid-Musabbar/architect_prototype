import { useRef, useState } from 'react';
import { Icon, type IconName } from '../icons';
import { useApp, setState, updateProject, getProject } from '../store';
import { buyCredits, clearContext, deleteProject, navigate, renameProject, restoreVersion, setDomain, toast, toggleIntegration } from '../actions';
import { Dialog, Empty } from '../components/ui';
import { PLANS, planCredits, SKILL_LIBRARY } from '../data/constants';
import { templateById } from '../data/templates';
import { mkVersion } from '../lib/factory';
import { ago, copyText, cx, dateLabel, slug } from '../lib/util';
import { siteUrl } from '../lib/router';
import type { Project } from '../types';

const GROUPS: [string, [string, string, IconName][]][] = [
  ['Project settings', [['general', 'General', 'gear'], ['domains', 'Domains & hosting', 'globe'], ['analytics', 'Analytics', 'chart'], ['knowledge', 'Knowledge', 'bulb'], ['skills', 'Skills', 'book'], ['backups', 'Backups', 'history']]],
  ['Account', [['acct', 'General', 'gear'], ['apps', 'Applications', 'grid'], ['mcp', 'Connectors (MCP)', 'plug'], ['addons', 'Add-on features', 'sparkles']]],
  ['Workspace', [['sub', 'Subscription & credits', 'zap'], ['cloud', 'Cloud', 'cloud'], ['skilllib', 'Skills library', 'book']]],
];
const TITLE: Record<string, string> = { general: 'Project general settings' };
GROUPS.forEach(([, items]) => items.forEach(([k, l]) => { if (!TITLE[k]) TITLE[k] = l; }));

interface Row { name: string; meta: string; icon: IconName; act: string; go: () => void; danger?: boolean; on?: boolean }

export function ProjectSettings({ pid, page }: { pid: string; page: string }) {
  const p = useApp(s => s.projects.find(x => x.id === pid));
  if (!p) return <Empty icon="folder" title="Project not found" action={<button className="btn btn-primary" onClick={() => navigate({ name: 'projects', filter: 'all' })}>Back to projects</button>} />;
  const pg = TITLE[page] ? page : 'general';
  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
      <aside style={{ width: 280, flex: 'none', overflow: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column' }}>
        <button onClick={() => navigate({ name: 'workspace', pid })} className="row" style={{ gap: 8, background: 'none', border: 0, fontSize: 15, fontWeight: 600, cursor: 'pointer', padding: '8px 10px 16px', borderBottom: '1px solid var(--color-divider)', marginBottom: 10 }}><Icon name="arrowLeft" />Back to {p.name}</button>
        {GROUPS.map(([t, items]) => (
          <div key={t} className="col" style={{ gap: 2, padding: '8px 0 12px', borderBottom: '1px solid var(--color-divider)', marginBottom: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.6, padding: '6px 10px' }}>{t}</div>
            {items.map(([k, label, ic]) => <button key={k} className={cx('side-btn', pg === k && 'on')} style={{ fontSize: 14.5, gap: 14 }} onClick={() => navigate({ name: 'projectSettings', pid, page: k })}><Icon name={ic} size={17} />{label}</button>)}
          </div>
        ))}
      </aside>
      <div style={{ flex: 1, minWidth: 0, overflow: 'auto', margin: '8px 8px 8px 0', border: '1px solid var(--color-divider)', borderRadius: 14, background: 'var(--color-panel)' }}>
        <div className="col" style={{ maxWidth: 1000, margin: '0 auto', padding: '56px 40px', gap: 28 }}>
          <h2 style={{ margin: 0, fontSize: 24 }}>{TITLE[pg]}</h2>
          {pg === 'general' ? <GeneralPage p={p} /> : <ListPage p={p} page={pg} />}
        </div>
      </div>
    </div>
  );
}

function GeneralPage({ p }: { p: Project }) {
  const plan = useApp(s => s.plan);
  const ds = useApp(s => s.ds);
  const [name, setName] = useState(p.name);
  const dirty = name.trim() !== p.name && !!name.trim();
  return (
    <>
      <div className="row" style={{ border: '1px solid var(--color-divider)', borderRadius: 14, padding: '22px 24px', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 15, fontWeight: 600 }} className="grow">Project name</span>
        <input className="input" style={{ width: 280, maxWidth: '100%' }} value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && dirty) renameProject(p.id, name); }} maxLength={60} aria-label="Project name" />
        <button className={cx('btn', dirty ? 'btn-primary' : 'btn-secondary')} disabled={!dirty} onClick={() => renameProject(p.id, name)}>Save</button>
      </div>
      <div className="col" style={{ gap: 12 }}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>Project agent</span>
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          {([['arch', 'Architect agent', 'Builds apps and agents', 'sparkles'], ['ds', 'Design System agent', 'Team plan', 'palette']] as const).map(([k, n, d, ic]) => {
            const a = p.psAgent === k;
            const locked = k === 'ds' && plan !== 'team';
            return (
              <button key={k} onClick={() => { if (locked) { toast('Design System agent needs the Team plan', 'warn'); return; } updateProject(p.id, { psAgent: k }); toast(`${n} selected`); }} className="row" style={{ gap: 12, padding: '12px 18px', borderRadius: 10, border: '1.5px solid ' + (a ? 'var(--color-accent)' : 'var(--color-divider)'), background: a ? 'color-mix(in srgb,var(--color-accent) 8%,transparent)' : 'none', cursor: 'pointer', opacity: locked ? 0.6 : 1 }}>
                <Icon name={ic} size={18} /><span className="col" style={{ alignItems: 'flex-start', gap: 2 }}><span style={{ fontSize: 15, fontWeight: 500 }}>{n}</span><span style={{ fontSize: 12, opacity: 0.55 }}>{d}</span></span>{locked && <Icon name="lock" size={14} />}
              </button>
            );
          })}
        </div>
      </div>
      <div className="row" style={{ border: '1px solid var(--color-divider)', borderRadius: 14, padding: '22px 24px', gap: 24, flexWrap: 'wrap' }}>
        <div className="col grow" style={{ minWidth: 260, gap: 6 }}><span style={{ fontSize: 15, fontWeight: 600 }}>Context</span><span style={{ fontSize: 14.5, lineHeight: 1.55, opacity: 0.8, maxWidth: 640 }}>Resets Architect's chat history and what it has learned about this project. Your files, agents and data stay as they are. Useful when earlier messages no longer apply.</span></div>
        <button className="btn btn-ghost" style={{ color: 'var(--danger)' }} disabled={!p.msgs.length} onClick={() => clearContext(p.id)}>Clear context</button>
      </div>
      <div className="col" style={{ gap: 12 }}>
        <div className="col" style={{ gap: 4 }}><span style={{ fontSize: 15, fontWeight: 600 }}>Design system</span><span style={{ fontSize: 14.5, opacity: 0.8 }}>Bring in a component library and its dependencies are installed for you.</span></div>
        {plan === 'team' ? (
          <select className="input" style={{ maxWidth: 320 }} value={ds} onChange={e => { setState({ ds: e.target.value }); toast(`${e.target.value} will be used for new screens`); }}>{['Shadcn', 'Material UI', 'Chakra', 'Radix', 'Your brand', 'Architect default'].map(x => <option key={x}>{x}</option>)}</select>
        ) : (
          <div className="row" style={{ maxWidth: 600, border: '1px solid color-mix(in srgb,var(--color-accent) 40%,transparent)', background: 'color-mix(in srgb,var(--color-accent) 10%,var(--color-panel))', borderRadius: 12, padding: '16px 18px', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--color-accent)', marginTop: 2, display: 'flex' }}><Icon name="info" /></span>
            <div className="col" style={{ gap: 6 }}><span style={{ fontSize: 15, fontWeight: 600 }}>Available on the Team plan</span><span style={{ fontSize: 14.5, lineHeight: 1.5, opacity: 0.85 }}>Upgrade to Team to let the Design System agent build with your own components.</span><button className="link" style={{ alignSelf: 'flex-start', fontSize: 14, fontWeight: 500 }} onClick={() => navigate({ name: 'pricing' })}>Upgrade</button></div>
          </div>
        )}
      </div>
      <div className="row" style={{ border: '1px solid color-mix(in srgb,var(--danger) 35%,transparent)', borderRadius: 14, padding: '22px 24px', gap: 24, flexWrap: 'wrap' }}>
        <div className="col grow" style={{ minWidth: 260, gap: 6 }}><span style={{ fontSize: 15, fontWeight: 600 }}>Delete project</span><span style={{ fontSize: 14, opacity: 0.7 }}>Removes the app, its agents, database and published site. This can't be undone.</span></div>
        <button className="btn btn-danger" onClick={() => deleteProject(p.id)}>Delete</button>
      </div>
    </>
  );
}

function ListPage({ p, page }: { p: Project; page: string }) {
  const s = useApp(x => x);
  const [domainOpen, setDomainOpen] = useState(false);
  const [domain, setDomainInput] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [upload, setUpload] = useState<'knowledge' | 'aknow' | null>(null);
  const [skillOpen, setSkillOpen] = useState(false);
  const host = `${slug(p.name)}.architect.app`;
  const router = p.agents[0];
  const conv = p.db.conversations?.count || 0;
  const setAgents = (fn: (a: Project['agents']) => Project['agents']) => updateProject(p.id, cur => ({ agents: fn(cur.agents) }));
  const addon = (k: string) => !!s.ints['addon:' + k];

  let desc = '', addLabel = '', add: () => void = () => undefined, rows: Row[] = [];
  switch (page) {
    case 'domains':
      desc = 'Where your app lives on the internet.';
      addLabel = 'Add custom domain'; add = () => setDomainOpen(true);
      rows = [
        { name: host, meta: p.published ? 'Default · SSL active · live' : 'Default · not published yet', icon: 'globe', act: p.published ? 'Open' : 'Copy', go: () => { if (p.published) window.open(siteUrl(p.id), '_blank', 'noopener'); else copyText(host).then(() => toast('Address copied')); } },
        ...(p.domain ? [{ name: p.domain, meta: 'Custom domain · DNS verified · SSL issued', icon: 'globe' as IconName, act: 'Remove', danger: true, go: () => { updateProject(p.id, { domain: null }); toast(`${p.domain} removed`); } }] : []),
      ];
      break;
    case 'analytics': {
      const ho = p.db.conversations?.rows.filter(r => /Landlord|Owner|staff|Human/i.test(r.join(' '))).length || 0;
      desc = 'Traffic and agent activity for the published app.';
      addLabel = 'Export CSV';
      add = () => {
        const csv = ['agent,runs', ...p.agents.map(a => `${a.name},${a.runs}`)].join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `${slug(p.name)}-analytics.csv`; a.click(); toast('CSV downloaded');
      };
      rows = [
        { name: `${conv.toLocaleString()} conversations`, meta: 'Last 30 days · +18%', icon: 'chart', act: 'View', go: () => navigate({ name: 'workspace', pid: p.id }) },
        ...p.agents.map(a => ({ name: `${a.name}: ${a.runs} runs`, meta: `${a.model} · ${a.kind}`, icon: 'bot' as IconName, act: 'Open', go: () => navigate({ name: 'workspace', pid: p.id }) })),
        { name: `${ho} hand-offs to a person`, meta: 'Emergencies and disputes', icon: 'user', act: 'Review', go: () => navigate({ name: 'workspace', pid: p.id }) },
      ];
      break;
    }
    case 'knowledge': {
      desc = 'Files every agent in this project can read.';
      addLabel = 'Upload files'; add = () => { setUpload('knowledge'); fileRef.current?.click(); };
      const all = new Map<string, string[]>();
      p.agents.forEach(a => a.knowledge.forEach(k => all.set(k, [...(all.get(k) || []), a.name])));
      rows = Array.from(all.entries()).map(([k, used]) => ({ name: k, meta: `Used by ${used.join(', ')}`, icon: 'file', act: 'Remove', danger: true, go: () => { setAgents(ag => ag.map(a => ({ ...a, knowledge: a.knowledge.filter(x => x !== k) }))); toast(`${k} removed`); } }));
      break;
    }
    case 'skills': {
      desc = 'Reusable abilities your agents can call.';
      addLabel = 'Add skill'; add = () => setSkillOpen(true);
      const all = new Map<string, string[]>();
      p.agents.forEach(a => a.skills.forEach(k => all.set(k, [...(all.get(k) || []), a.name])));
      rows = Array.from(all.entries()).map(([k, used]) => ({ name: k, meta: used.join(', '), icon: 'sparkles', act: 'Remove', danger: true, go: () => { setAgents(ag => ag.map(a => ({ ...a, skills: a.skills.filter(x => x !== k) }))); toast(`${k} removed`); } }));
      break;
    }
    case 'backups':
      desc = 'Snapshots of code, agents and database. Every version is kept; restoring adds a new version on top.';
      addLabel = 'Back up now';
      add = () => { updateProject(p.id, cur => { const v = mkVersion(cur, 'Manual backup', 'Backup'); return { versions: [...cur.versions, v], current: v.n }; }); toast('Backup created'); };
      rows = [...p.versions].reverse().map(v => ({ name: `v${v.n} · ${v.title}`, meta: `${dateLabel(v.ts)} · ${ago(v.ts)} · ${v.meta}`, icon: 'history', act: v.n === p.current ? 'Current' : 'Restore', go: () => { if (v.n !== p.current) { navigate({ name: 'workspace', pid: p.id }); setTimeout(() => restoreVersion(p.id, v.n), 50); } } }));
      break;
    case 'acct':
      desc = 'Your profile and sign-in.';
      addLabel = 'Edit profile'; add = () => navigate({ name: 'settings', tab: 'general' });
      rows = [{ name: s.user.name, meta: s.user.email, icon: 'user', act: 'Edit', go: () => navigate({ name: 'settings', tab: 'general' }) }, { name: 'Google sign-in', meta: 'Connected', icon: 'globe', act: 'Manage', go: () => toast('Google sign-in is managed by your Google account') }];
      break;
    case 'apps':
      desc = 'Apps you have allowed to use your account.';
      addLabel = 'Authorize app'; add = () => navigate({ name: 'settings', tab: 'integrations' });
      rows = (['GitHub', 'Slack', 'Notion'] as const).map(k => ({ name: k, meta: s.ints[k] ? 'Authorized' : 'Not authorized', icon: (k === 'GitHub' ? 'github' : k === 'Slack' ? 'network' : 'book') as IconName, act: s.ints[k] ? 'Revoke' : 'Authorize', danger: !!s.ints[k], go: () => toggleIntegration(k) }));
      break;
    case 'mcp':
      desc = 'Connect tools over the Model Context Protocol so agents can use them.';
      addLabel = 'Add connector'; add = () => navigate({ name: 'settings', tab: 'integrations' });
      rows = ([['Stripe', 6, 'card'], ['Supabase', 9, 'database'], ['Slack', 4, 'network'], ['HubSpot', 7, 'user']] as [string, number, IconName][]).map(([k, n, ic]) => ({ name: `${k} MCP`, meta: s.ints[k] ? `${n} tools · connected` : `${n} tools · not connected`, icon: ic, act: s.ints[k] ? 'Disconnect' : 'Connect', danger: !!s.ints[k], go: () => toggleIntegration(k) }));
      break;
    case 'addons':
      desc = 'Extra capabilities, billed per use.';
      addLabel = 'Browse add-ons'; add = () => toast('All available add-ons are listed here');
      rows = ([['Voice agents', '$0.04 / minute', 'mic'], ['Priority builds', 'Faster build queue · $10 / month', 'zap'], ['Extended trace retention', '1 year of run traces · $8 / month', 'history']] as [string, string, IconName][]).map(([k, m, ic]) => ({ name: k, meta: m, icon: ic, act: addon(k) ? 'Disable' : 'Enable', on: addon(k), go: () => { setState(st => ({ ints: { ...st.ints, ['addon:' + k]: !addon(k) } })); toast(`${k} ${addon(k) ? 'disabled' : 'enabled'}`); } }));
      break;
    case 'sub': {
      const cap = planCredits(s.plan);
      desc = `${PLANS.find(x => x.id === s.plan)!.name} plan · renews October 14.`;
      addLabel = 'Change plan'; add = () => navigate({ name: 'pricing' });
      rows = [{ name: `${s.credits} of ${cap} build credits left`, meta: 'Resets on the 14th', icon: 'zap', act: 'Buy more', go: () => buyCredits(100) }, { name: 'Agent runs at cost', meta: `$${((p.db.conversations?.count || 0) * 0.0012).toFixed(2)} this month for ${p.name}`, icon: 'chart', act: 'Details', go: () => navigate({ name: 'settings', tab: 'usage' }) }];
      break;
    }
    case 'cloud':
      desc = 'Where your apps and agents run.';
      addLabel = 'Add region'; add = () => toast('More regions are available on the Team plan');
      rows = ['US East (Virginia)', 'EU West (Dublin)', 'Asia Pacific (Singapore)'].map(r => ({ name: r, meta: s.user.region === r ? `Primary · ${s.projects.filter(x => x.published).length} apps` : 'Not in use', icon: 'cloud', act: s.user.region === r ? 'Default' : 'Use', go: () => { if (s.user.region !== r) { setState(st => ({ user: { ...st.user, region: r } })); toast(`New deploys go to ${r}`); } } }));
      break;
    case 'skilllib':
      desc = 'Skills published by the community and your team.';
      addLabel = 'Browse library'; add = () => setSkillOpen(true);
      rows = SKILL_LIBRARY.map((k, i) => { const has = router.skills.includes(k); return { name: k, meta: `by Architect · ${[12, 4, 9, 7, 3, 15][i]}k installs`, icon: 'book' as IconName, act: has ? 'Installed' : 'Install', go: () => { if (has) return; setAgents(ag => ag.map((a, j) => (j === 0 ? { ...a, skills: [...a.skills, k] } : a))); toast(`${k} installed for ${router.name}`); } }; });
      break;
  }

  return (
    <>
      <div style={{ fontSize: 15, opacity: 0.75, marginTop: -14 }}>{desc}</div>
      {rows.length ? (
        <div style={{ border: '1px solid var(--color-divider)', borderRadius: 14, overflow: 'hidden' }}>
          {rows.map((r, i) => (
            <div key={r.name + i} className="row" style={{ gap: 14, padding: '16px 20px', borderBottom: i < rows.length - 1 ? '1px solid var(--color-divider)' : 0 }}>
              <span style={{ opacity: 0.7, display: 'flex' }}><Icon name={r.icon} size={17} /></span>
              <div className="grow"><div className="ellipsis" style={{ fontSize: 15, fontWeight: 500 }}>{r.name}</div><div className="ellipsis" style={{ fontSize: 13, opacity: 0.6 }}>{r.meta}</div></div>
              <button className={cx('btn btn-sm', r.danger ? 'btn-danger' : r.on ? 'btn-ghost' : 'btn-secondary')} disabled={r.act === 'Current' || r.act === 'Installed' || r.act === 'Default'} onClick={r.go}>{r.act}</button>
            </div>
          ))}
        </div>
      ) : <div className="box" style={{ padding: 28, textAlign: 'center', fontSize: 14, opacity: 0.65 }}>Nothing here yet.</div>}
      <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={add}><Icon name="plus" />{addLabel}</button>
      <input ref={fileRef} type="file" multiple hidden onChange={e => {
        const names = Array.from(e.target.files || []).map(f => f.name);
        e.target.value = '';
        if (!names.length || !upload) return;
        const cur = getProject(p.id);
        if (!cur) return;
        setAgents(ag => ag.map((a, i) => (i === 0 ? { ...a, knowledge: Array.from(new Set([...a.knowledge, ...names])) } : a)));
        toast(`${names.length} file${names.length > 1 ? 's' : ''} indexed for ${templateById(p.templateId).app}`);
        setUpload(null);
      }} />
      <Dialog open={domainOpen} onClose={() => setDomainOpen(false)} width={460} label="Add custom domain">
        <div className="dialog-title">Add a custom domain</div>
        <div className="field"><label>Domain</label><input className="input" autoFocus placeholder="example.com" value={domain} onChange={e => setDomainInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && setDomain(p.id, domain)) setDomainOpen(false); }} /></div>
        <div className="col" style={{ gap: 6, fontSize: 13, border: '1px solid var(--color-divider)', borderRadius: 10, padding: 12 }}>
          <div style={{ fontWeight: 600 }}>DNS record to add</div>
          <div className="mono" style={{ fontSize: 12.5, opacity: 0.8 }}>CNAME  {domain.trim() || 'example.com'}  →  {host}</div>
        </div>
        <div className="dialog-actions"><button className="btn btn-secondary" onClick={() => setDomainOpen(false)}>Cancel</button><button className="btn btn-primary" disabled={!domain.trim()} onClick={() => { if (setDomain(p.id, domain)) setDomainOpen(false); }}>Connect domain</button></div>
      </Dialog>
      <Dialog open={skillOpen} onClose={() => setSkillOpen(false)} width={460} label="Add skill">
        <div className="dialog-title">Add a skill to {router.name}</div>
        <div className="col" style={{ border: '1px solid var(--color-divider)', borderRadius: 12, overflow: 'hidden' }}>
          {SKILL_LIBRARY.map((k, i) => {
            const has = router.skills.includes(k);
            return <button key={k} className="mi" disabled={has} style={{ borderRadius: 0, padding: '11px 14px', borderTop: i ? '1px solid var(--color-divider)' : 0 }} onClick={() => { setAgents(ag => ag.map((a, j) => (j === 0 ? { ...a, skills: [...a.skills, k] } : a))); toast(`${k} added`); setSkillOpen(false); }}><Icon name="sparkles" size={15} /><span className="grow">{k}</span>{has && <span className="meta">Added</span>}</button>;
          })}
        </div>
      </Dialog>
    </>
  );
}
