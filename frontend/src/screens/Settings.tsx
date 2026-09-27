import { useState, type ReactNode } from 'react';
import { Icon, type IconName } from '../icons';
import { useApp, setState } from '../store';
import { addSecret, buyCredits, navigate, removeKey, removeSecret, resetDemo, saveKey, signOut, toast, toggleIntegration, requestNotifications } from '../actions';
import { Dialog, Ring, Seg, Switch } from '../components/ui';
import { AGENT_MODELS, CODE_MODELS, INTS, PLANS, planCredits } from '../data/constants';
import { ago, cx } from '../lib/util';
import type { SettingsTab } from '../types';

const NAV: [SettingsTab, string, IconName][] = [['general', 'General', 'user'], ['appearance', 'Appearance', 'palette'], ['models', 'Models & keys', 'key'], ['integrations', 'Integrations', 'network'], ['secrets', 'Secrets', 'lock'], ['usage', 'Usage & billing', 'chart']];

export function Settings({ tab }: { tab: SettingsTab }) {
  const wsPid = useApp(s => s.ui.ws.pid);
  const backProject = useApp(s => s.projects.find(p => p.id === wsPid));
  return (
    <div className="shell-main">
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 24px 64px', display: 'grid', gridTemplateColumns: 'minmax(160px,200px) minmax(0,1fr)', gap: 40 }}>
        <nav className="col" style={{ gap: 2 }} aria-label="Settings sections">
          {backProject && <button onClick={() => navigate({ name: 'workspace', pid: backProject.id })} className="row" style={{ gap: 8, background: 'none', border: 0, fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: '6px 10px 14px', marginBottom: 8, borderBottom: '1px solid var(--color-divider)', textAlign: 'left' }}><Icon name="arrowLeft" />Back to {backProject.name}</button>}
          <h3 style={{ margin: '0 0 12px', fontWeight: 500 }}>Settings</h3>
          {NAV.map(([id, label, ic]) => (
            <button key={id} className={cx('side-btn', tab === id && 'on')} style={tab === id ? { color: 'var(--color-accent)', background: 'color-mix(in srgb,var(--color-accent) 12%,transparent)' } : undefined} onClick={() => navigate({ name: 'settings', tab: id })}><Icon name={ic} />{label}</button>
          ))}
        </nav>
        <div className="col" style={{ gap: 24, minWidth: 0 }}>
          {tab === 'general' && <General />}
          {tab === 'appearance' && <Appearance />}
          {tab === 'models' && <Models />}
          {tab === 'integrations' && <Integrations />}
          {tab === 'secrets' && <Secrets />}
          {tab === 'usage' && <Usage />}
        </div>
      </div>
    </div>
  );
}

const Head = ({ title, sub, action }: { title: string; sub: string; action?: ReactNode }) => (
  <div className="row" style={{ alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}><div className="grow"><h2 style={{ margin: 0 }}>{title}</h2><div style={{ fontSize: 14, opacity: 0.65 }}>{sub}</div></div>{action}</div>
);

function General() {
  const user = useApp(s => s.user);
  const exp = useApp(s => s.exp);
  const sound = useApp(s => s.sound);
  const [form, setForm] = useState(user);
  const dirty = JSON.stringify(form) !== JSON.stringify(user);
  const notif = typeof Notification !== 'undefined' ? Notification.permission : 'denied';
  return (
    <>
      <Head title="General" sub="Your account and workspace." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16, maxWidth: 620 }}>
        <div className="field"><label htmlFor="s-name">Name</label><input id="s-name" className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
        <div className="field"><label htmlFor="s-email">Email</label><input id="s-email" className="input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
        <div className="field"><label htmlFor="s-ws">Workspace</label><input id="s-ws" className="input" value={form.workspace} onChange={e => setForm({ ...form, workspace: e.target.value })} /></div>
        <div className="field"><label htmlFor="s-region">Default region</label><select id="s-region" className="input" value={form.region} onChange={e => setForm({ ...form, region: e.target.value })}><option>US East (Virginia)</option><option>US West (Oregon)</option><option>EU West (Dublin)</option><option>Asia Pacific (Singapore)</option></select></div>
      </div>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn btn-primary" disabled={!dirty || !form.name.trim() || !/^\S+@\S+\.\S+$/.test(form.email)} onClick={() => { setState({ user: { ...form, name: form.name.trim(), email: form.email.trim() } }); toast('Profile saved'); }}>Save changes</button>
        {dirty && <button className="btn btn-ghost plain" onClick={() => setForm(user)}>Discard</button>}
      </div>
      <div className="hr" style={{ margin: 0 }} />
      <div className="col" style={{ gap: 10, maxWidth: 620 }}>
        <h4 style={{ margin: 0 }}>Experience</h4>
        <div style={{ fontSize: 14, opacity: 0.7 }}>Guided shows plain-language progress. Pro shows the files, tools and traces behind every step.</div>
        <Seg value={exp} onChange={v => { setState({ exp: v }); toast(v === 'pro' ? 'Pro mode: file-level steps and traces' : 'Guided mode'); }} options={[{ v: 'guided', label: 'Guided' }, { v: 'pro', label: 'Pro' }]} style={{ alignSelf: 'flex-start' }} />
      </div>
      <div className="hr" style={{ margin: 0 }} />
      <div className="col" style={{ gap: 14, maxWidth: 620 }}>
        <h4 style={{ margin: 0 }}>Notifications</h4>
        <div className="row" style={{ gap: 12 }}><div className="grow"><div style={{ fontSize: 14 }}>Chime when a build finishes</div><div style={{ fontSize: 12.5, opacity: 0.6 }}>A short sound so you can look away while Architect works.</div></div><Switch on={sound} onChange={() => setState({ sound: !sound })} label="Build chime" /></div>
        <div className="row" style={{ gap: 12 }}><div className="grow"><div style={{ fontSize: 14 }}>Desktop notifications</div><div style={{ fontSize: 12.5, opacity: 0.6 }}>{notif === 'granted' ? 'On. You get a notification when a build finishes in the background.' : notif === 'denied' ? 'Blocked in your browser settings.' : 'Get notified when a build finishes in another tab.'}</div></div>{notif === 'default' && <button className="btn btn-secondary btn-sm" onClick={requestNotifications}>Enable</button>}</div>
      </div>
      <div className="hr" style={{ margin: 0 }} />
      <div className="col" style={{ gap: 12, maxWidth: 620 }}>
        <h4 style={{ margin: 0 }}>Demo data</h4>
        <div className="row" style={{ gap: 12, border: '1px solid color-mix(in srgb,var(--danger) 35%,transparent)', borderRadius: 12, padding: '14px 16px', flexWrap: 'wrap' }}>
          <div className="grow" style={{ minWidth: 220 }}><div style={{ fontSize: 14, fontWeight: 600 }}>Reset everything</div><div style={{ fontSize: 13, opacity: 0.65 }}>Restore the sample projects, credits and settings. Useful before a demo.</div></div>
          <button className="btn btn-danger" onClick={resetDemo}>Reset demo data</button>
        </div>
        <button className="btn btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={signOut}><Icon name="logout" />Sign out</button>
      </div>
    </>
  );
}

function Appearance() {
  const theme = useApp(s => s.theme);
  const layout = useApp(s => s.layout);
  const side = useApp(s => s.paneSide);
  return (
    <>
      <Head title="Appearance" sub="The builder defaults to dark. Previews of your app always render in the app's own theme." />
      <div className="col" style={{ gap: 10 }}><div className="label">Theme</div><Seg value={theme} onChange={v => setState({ theme: v })} options={[{ v: 'dark', label: 'Dark', icon: 'moon' }, { v: 'light', label: 'Light', icon: 'sun' }]} style={{ alignSelf: 'flex-start' }} /></div>
      <div className="col" style={{ gap: 10 }}><div className="label">Workspace layout</div><Seg value={layout} onChange={v => setState({ layout: v })} options={[{ v: 'Split', label: 'Split', icon: 'panelLeft' }, { v: 'Focus', label: 'Focus', icon: 'panelBottom' }, { v: 'Studio', label: 'Studio', icon: 'columns' }]} style={{ alignSelf: 'flex-start' }} /><div style={{ fontSize: 13, opacity: 0.6 }}>Split puts chat beside the preview, Focus floats it over the preview, Studio adds an inspector.</div></div>
      <div className="col" style={{ gap: 10 }}><div className="label">Chat position</div><Seg value={side} onChange={v => setState({ paneSide: v })} options={[{ v: 'left', label: 'Left', icon: 'panelLeft' }, { v: 'right', label: 'Right', icon: 'panelRight' }]} style={{ alignSelf: 'flex-start' }} /></div>
    </>
  );
}

function Models() {
  const roleModels = useApp(s => s.roleModels);
  const keys = useApp(s => s.keys);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const set = (k: keyof typeof roleModels, v: string) => { setState({ roleModels: { ...roleModels, [k]: v } }); toast('Default saved. New agents will use it'); };
  return (
    <>
      <Head title="Models" sub="Defaults for new agents. Each agent can override its model in the Agents tab." />
      <div style={{ overflowX: 'auto' }}>
        <table className="table" style={{ minWidth: 520 }}>
          <thead><tr><th>Role</th><th>Default model</th><th>Why</th></tr></thead>
          <tbody>
            <tr><td>Router</td><td><select className="input" value={roleModels.router} onChange={e => set('router', e.target.value)}>{['Claude Haiku 4.5', 'GPT-5 mini', 'Gemini 2.5 Flash'].map(m => <option key={m}>{m}</option>)}</select></td><td style={{ fontSize: 13, opacity: 0.75 }}>Fast and cheap — it only picks who answers</td></tr>
            <tr><td>Specialists</td><td><select className="input" value={roleModels.specialist} onChange={e => set('specialist', e.target.value)}>{AGENT_MODELS.map(m => <option key={m}>{m}</option>)}</select></td><td style={{ fontSize: 13, opacity: 0.75 }}>Uses tools and writes the reply</td></tr>
            <tr><td>Builder</td><td><select className="input" value={roleModels.builder} onChange={e => { set('builder', e.target.value); setState({ codeModel: e.target.value }); }}>{CODE_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></td><td style={{ fontSize: 13, opacity: 0.75 }}>Writes your app's code</td></tr>
          </tbody>
        </table>
      </div>
      <h4 style={{ margin: '8px 0 0' }}>Bring your own keys</h4>
      <div style={{ fontSize: 13.5, opacity: 0.65, marginTop: -16 }}>Agent runs bill straight to your provider account. Keys are encrypted and never shown again.</div>
      <div className="col" style={{ maxWidth: 680 }}>
        {([['Anthropic', 'sk-ant-…'], ['OpenAI', 'sk-…'], ['Google', 'AIza…']] as const).map(([name, ph]) => (
          <div key={name} className="row" style={{ gap: 12, borderBottom: '1px solid var(--color-divider)', padding: '10px 0', flexWrap: 'wrap' }}>
            <span style={{ width: 110, fontSize: 16, fontWeight: 600 }}>{name}</span>
            {keys[name] ? (
              <>
                <span className="mono grow" style={{ fontSize: 12.5, opacity: 0.7 }}>{keys[name]}</span>
                <span className="tag tag-accent">Connected</span>
                <button className="btn btn-ghost plain btn-sm" onClick={() => removeKey(name)}>Remove</button>
              </>
            ) : (
              <>
                <input className="input mono grow" type="password" autoComplete="off" placeholder={ph} value={draft[name] || ''} onChange={e => setDraft({ ...draft, [name]: e.target.value })} onKeyDown={e => { if (e.key === 'Enter' && saveKey(name, draft[name] || '')) setDraft({ ...draft, [name]: '' }); }} style={{ fontSize: 12.5, minWidth: 180 }} />
                <span className="tag tag-neutral">Using Architect</span>
                <button className="btn btn-secondary btn-sm" disabled={!draft[name]} onClick={() => { if (saveKey(name, draft[name] || '')) setDraft({ ...draft, [name]: '' }); }}>Save</button>
              </>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function Integrations() {
  const ints = useApp(s => s.ints);
  const [q, setQ] = useState('');
  const list = INTS.filter(([n, d]) => !q.trim() || (n + d).toLowerCase().includes(q.toLowerCase()));
  const n = INTS.filter(([k]) => ints[k]).length;
  return (
    <>
      <Head title="Integrations" sub={`Connect a service once; any agent in the workspace can be given it as a tool. ${n} of ${INTS.length} connected.`} action={<input className="input" placeholder="Search integrations" style={{ width: 220 }} value={q} onChange={e => setQ(e.target.value)} />} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 12 }}>
        {list.map(([name, desc]) => {
          const on = !!ints[name];
          return (
            <div key={name} className="card">
              <div className="row" style={{ justifyContent: 'space-between' }}><span className="card-title">{name}</span><span className={cx('tag', on ? 'tag-accent' : 'tag-neutral')}>{on ? 'Connected' : 'Off'}</span></div>
              <p className="card-body">{desc}</p>
              <button className={cx('btn btn-sm', on ? 'btn-ghost plain' : 'btn-secondary')} style={{ alignSelf: 'flex-start' }} onClick={() => toggleIntegration(name)}>{on ? 'Disconnect' : 'Connect'}</button>
            </div>
          );
        })}
      </div>
      {list.length === 0 && <div style={{ fontSize: 14, opacity: 0.6 }}>No integrations match “{q}”.</div>}
    </>
  );
}

function Secrets() {
  const secrets = useApp(s => s.secrets);
  const [open, setOpen] = useState(false);
  const [k, setK] = useState('');
  const [v, setV] = useState('');
  const close = () => { setOpen(false); setK(''); setV(''); };
  return (
    <>
      <Head title="Secrets" sub="Encrypted, injected at runtime, never shown to agents or written into code." action={<button className="btn btn-secondary" onClick={() => setOpen(true)}><Icon name="plus" />Add secret</button>} />
      <div style={{ overflowX: 'auto' }}>
        <table className="table" style={{ minWidth: 560 }}>
          <thead><tr><th>Key</th><th>Value</th><th>Used by</th><th>Updated</th><th /></tr></thead>
          <tbody>
            {secrets.map(s => (
              <tr key={s.key}>
                <td className="mono" style={{ fontSize: 12.5 }}>{s.key}</td>
                <td className="mono" style={{ fontSize: 12.5, opacity: 0.6 }}>••••••••{s.tail}</td>
                <td style={{ fontSize: 13 }}>{s.used}</td>
                <td style={{ fontSize: 13, opacity: 0.7 }}>{ago(s.ts)}</td>
                <td style={{ width: 40 }}><button className="ib sm" title={`Delete ${s.key}`} onClick={() => removeSecret(s.key)}><Icon name="trash" size={14} /></button></td>
              </tr>
            ))}
            {secrets.length === 0 && <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', opacity: 0.6, fontSize: 14 }}>No secrets yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <Dialog open={open} onClose={close} width={440} label="Add secret">
        <div className="dialog-title">Add secret</div>
        <div className="field"><label>Name</label><input className="input mono" autoFocus placeholder="STRIPE_SECRET_KEY" value={k} onChange={e => setK(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))} /></div>
        <div className="field"><label>Value</label><input className="input mono" type="password" autoComplete="off" placeholder="sk_live_…" value={v} onChange={e => setV(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && addSecret(k, v)) close(); }} /></div>
        <div className="dialog-actions"><button className="btn btn-secondary" onClick={close}>Cancel</button><button className="btn btn-primary" disabled={!k || v.length < 4} onClick={() => { if (addSecret(k, v)) close(); }}>Add secret</button></div>
      </Dialog>
    </>
  );
}

function Usage() {
  const credits = useApp(s => s.credits);
  const plan = useApp(s => s.plan);
  const projects = useApp(s => s.projects);
  const codeModel = useApp(s => s.codeModel);
  const cap = planCredits(plan);
  const planName = PLANS.find(p => p.id === plan)!.name;
  const spent = Math.max(0, cap - credits);
  const recent = projects.slice().sort((a, b) => b.viewedAt - a.viewedAt)[0];
  const turns = recent?.msgs.length || 0;
  const used = Math.min(200, 14 + turns * 6.5);
  const ctxPct = Math.round((used / 200) * 100);
  const byProject = projects.filter(p => p.spent > 0).sort((a, b) => b.spent - a.spent);
  const totalSpent = byProject.reduce((n, p) => n + p.spent, 0) || 1;
  const m = CODE_MODELS.find(x => x.id === codeModel) || CODE_MODELS[0];
  const mods: [string, number, string][] = [[m.name, 0.58, `${m.mult}× · current`], ...CODE_MODELS.filter(x => x.id !== m.id).slice(0, 3).map((x, i) => [x.name, [0.21, 0.13, 0.08][i], `${x.mult}×`] as [string, number, string])];
  const convos = projects.map(p => ({ p, n: p.db.conversations?.count || 0 })).filter(x => x.n > 0).sort((a, b) => b.n - a.n);
  const bar = (pct: number) => ({ height: '100%', width: `${Math.max(pct, 1)}%`, background: pct >= 90 ? 'var(--danger)' : 'var(--color-accent)', borderRadius: 5, transition: 'width .4s' });
  return (
    <>
      <Head title="Usage" sub={`${planName} plan · renews October 14`} action={<div className="row" style={{ gap: 8 }}><button className="btn btn-secondary" onClick={() => buyCredits(100)}><Icon name="plus" />Buy 100 credits</button><button className="btn btn-primary" onClick={() => navigate({ name: 'pricing' })}>Change plan</button></div>} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
        {[
          { label: 'Build credits', kicker: 'left', value: String(credits), sub: `${spent} of ${cap} spent this cycle`, pct: Math.min(100, (credits / cap) * 100) },
          { label: 'Current session', kicker: 'used', value: '21%', sub: 'Resets in 3 hr 38 min', pct: 21 },
          { label: 'Latest chat', kicker: 'context', value: ctxPct + '%', sub: `${Math.round(used)}k / 200k tokens${recent ? ' · ' + recent.name : ''}`, pct: ctxPct },
        ].map(r => (
          <div key={r.label} className="col" style={{ border: '1px solid var(--color-divider)', borderRadius: 14, padding: '20px 16px', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative', width: 132, height: 132 }}>
              <Ring pct={r.pct} size={132} stroke={11} />
              <div className="col" style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', gap: 2 }}><span style={{ fontSize: 12, opacity: 0.65 }}>{r.kicker}</span><span style={{ fontSize: 30, lineHeight: 1, fontWeight: 600 }}>{r.value}</span></div>
            </div>
            <div className="col" style={{ alignItems: 'center', gap: 2, textAlign: 'center' }}><span style={{ fontSize: 14, fontWeight: 600 }}>{r.label}</span><span style={{ fontSize: 12.5, opacity: 0.6 }}>{r.sub}</span></div>
          </div>
        ))}
      </div>
      <div className="col" style={{ gap: 18, borderTop: '1px solid var(--color-divider)', paddingTop: 20 }}>
        <h3 style={{ margin: 0, fontSize: 17 }}>Plan usage limits</h3>
        {([['Current session', 'Resets in 3 hr 38 min', 21], ['Weekly · all models', 'Resets in 10 hr 38 min', 64], ['Weekly · premium models', 'Opus, GPT-5 · resets Fri 8:59 AM', 92]] as [string, string, number][]).map(([l, s, p]) => (
          <div key={l} style={{ display: 'grid', gridTemplateColumns: 'minmax(140px,1fr) minmax(0,1.4fr) 80px', alignItems: 'center', gap: 20 }}>
            <div className="col" style={{ gap: 3 }}><span style={{ fontSize: 14, fontWeight: 500 }}>{l}</span><span style={{ fontSize: 12.5, opacity: 0.6 }}>{s}</span></div>
            <div style={{ height: 10, borderRadius: 5, background: 'var(--color-divider)', overflow: 'hidden' }}><div style={bar(p)} /></div>
            <span style={{ fontSize: 13, opacity: 0.7, textAlign: 'right' }}>{p}% used</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 32, borderTop: '1px solid var(--color-divider)', paddingTop: 20 }}>
        <div className="col" style={{ gap: 14 }}>
          <div className="row" style={{ alignItems: 'baseline', justifyContent: 'space-between' }}><h3 style={{ margin: 0, fontSize: 17 }}>Credits by project</h3><span style={{ fontSize: 12.5, opacity: 0.6 }}>All time · {totalSpent} spent</span></div>
          {byProject.map(p => (
            <div key={p.id} className="col" style={{ gap: 6 }}>
              <div className="row" style={{ justifyContent: 'space-between', gap: 10, fontSize: 13.5 }}><button className="link plain" style={{ fontWeight: 500, opacity: 1 }} onClick={() => navigate({ name: 'workspace', pid: p.id })}>{p.name}</button><span style={{ opacity: 0.7 }}>{p.spent} cr · {Math.round((p.spent / totalSpent) * 100)}%</span></div>
              <div style={{ height: 6, borderRadius: 3, background: 'var(--color-divider)' }}><div style={{ height: '100%', width: `${(p.spent / byProject[0].spent) * 100}%`, background: 'var(--color-accent)', borderRadius: 3 }} /></div>
              <span style={{ fontSize: 12, opacity: 0.55 }}>{p.versions.length} versions · {p.msgs.filter(x => x.role === 'user').length} build messages</span>
            </div>
          ))}
        </div>
        <div className="col" style={{ gap: 14 }}>
          <div className="row" style={{ alignItems: 'baseline', justifyContent: 'space-between' }}><h3 style={{ margin: 0, fontSize: 17 }}>Credits by coding model</h3><span style={{ fontSize: 12.5, opacity: 0.6 }}>Coding agent only</span></div>
          {mods.map(([name, f, meta]) => (
            <div key={name} className="col" style={{ gap: 6 }}>
              <div className="row" style={{ justifyContent: 'space-between', gap: 10, fontSize: 13.5 }}><span style={{ fontWeight: 500 }}>{name}</span><span style={{ opacity: 0.7 }}>{Math.round(totalSpent * f)} cr · {Math.round(f * 100)}%</span></div>
              <div style={{ height: 6, borderRadius: 3, background: 'var(--color-divider)' }}><div style={{ height: '100%', width: `${(f / mods[0][1]) * 100}%`, background: 'var(--color-accent)', borderRadius: 3 }} /></div>
              <span style={{ fontSize: 12, opacity: 0.55 }}>{meta}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="row" style={{ alignItems: 'baseline', justifyContent: 'space-between', borderTop: '1px solid var(--color-divider)', paddingTop: 20, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 17 }}>Agent runs · billed at model cost</h3>
        <span style={{ fontSize: 12.5, opacity: 0.6 }}>${(convos.reduce((n, x) => n + x.n, 0) * 0.0012).toFixed(2)} this month · {convos.reduce((n, x) => n + x.n, 0).toLocaleString()} conversations</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="table" style={{ minWidth: 480 }}>
          <thead><tr><th>Project</th><th>Conversations</th><th>Tokens</th><th style={{ textAlign: 'right' }}>Cost</th></tr></thead>
          <tbody>{convos.map(({ p, n }) => <tr key={p.id}><td>{p.name}</td><td>{n.toLocaleString()}</td><td>{(n * 0.0021).toFixed(1)}M</td><td style={{ textAlign: 'right' }}>${(n * 0.0012).toFixed(2)}</td></tr>)}</tbody>
        </table>
      </div>
    </>
  );
}
