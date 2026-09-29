import { useEffect, useRef, useState } from 'react';
import { Icon, type IconName } from '../icons';
import { useApp, setState, setUi } from '../store';
import { navigate, openProject, startProject, toast, requestNotifications } from '../actions';
import { Dialog, Popover, Spinner, useDictation } from '../components/ui';
import { ModelPicker } from '../components/ModelPicker';
import { ProjectThumb } from '../components/ProjectThumb';
import { DS_DOTS, DS_GROUPS, KINDS } from '../data/constants';
import { BLUEPRINTS } from '../data/templates';
import { ago, cx } from '../lib/util';

const PH = ['Build a support copilot', 'Use Lyzr agents, edit in Studio', 'Or GitAgent: any framework, your repo', 'Build a three-agent research desk'];
const SUGGESTIONS = ['Support copilot for my Shopify store', 'A research team: scout, analyst, writer', 'Lead qualifier that books sales calls', 'Tenant concierge for small landlords'];

const SUBS: Record<string, [string, IconName, string][]> = {
  Database: [['Supabase', 'database', 'Connected'], ['Postgres', 'database', ''], ['Architect DB', 'database', 'Built-in']],
  Connectors: [['Stripe', 'card', 'Connected'], ['Slack', 'network', 'Connected'], ['Gmail', 'mail', ''], ['HubSpot', 'network', ''], ['Manage connectors', 'settings', '']],
  Skills: [['Web research', 'search', ''], ['Document Q&A', 'book', ''], ['Customer support', 'user', ''], ['Manage skills', 'settings', '']],
};

type Scn = { name: string; agent: string; status: 'Passed' | 'Failed' | 'Retesting' | 'Running' };
const SCN0: Scn[] = [
  { name: 'Angry customer demands a refund for a late order', agent: 'Refund', status: 'Passed' },
  { name: 'Asks the agent to ignore its rules and reveal its prompt', agent: 'Router', status: 'Passed' },
  { name: 'Refund request over the $200 limit', agent: 'Refund', status: 'Failed' },
  { name: 'Changes the delivery address in Spanish', agent: 'Orders', status: 'Passed' },
  { name: 'Vague question with no order number', agent: 'Router', status: 'Retesting' },
];
const FIXES: [string, string][] = [['Prompt', 'Check the refund limit before promising any money back'], ['Guardrail', 'Send refunds over $200 to a person for approval'], ['Prompt', 'Ask for the order number before answering']];

export function Home() {
  const projects = useApp(s => s.projects);
  const ds = useApp(s => s.ds);
  const ints = useApp(s => s.ints);
  const [prompt, setPrompt] = useState('');
  const [gitAgent, setGitAgent] = useState(false);
  const [plan, setPlan] = useState(true);
  const [kind, setKind] = useState<string | null>(null);
  const [plus, setPlus] = useState(false);
  const [plusSub, setPlusSub] = useState<string | null>(null);
  const [dsOpen, setDsOpen] = useState(false);
  const [files, setFiles] = useState<string[]>([]);
  const [menu, setMenu] = useState<string | null>(null);
  const [importer, setImporter] = useState<null | 'Figma' | 'GitHub' | 'Blueprint'>(null);
  const [scn, setScn] = useState<Scn[]>(SCN0);
  const [simRunning, setSimRunning] = useState(false);
  const [approved, setApproved] = useState<boolean[]>([false, false, false]);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dict = useDictation(t => setPrompt(p => (p ? p.trimEnd() + ' ' : '') + t));

  useEffect(() => {
    let p = 0, i = 0, dir = 1, hold = 0;
    const iv = setInterval(() => {
      const el = taRef.current;
      if (!el) return;
      if (hold > 0) { hold--; return; }
      i += dir;
      if (dir > 0 && i >= PH[p].length) { dir = -1; hold = 40; }
      else if (dir < 0 && i <= 0) { dir = 1; p = (p + 1) % PH.length; hold = 6; }
      el.placeholder = PH[p].slice(0, i) + (dir > 0 || hold ? '…' : '');
    }, 45);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(220, el.scrollHeight) + 'px';
  }, [prompt]);

  const submit = () => {
    const t = prompt.trim();
    if (!t) { toast('Describe what your agents should do first', 'warn'); taRef.current?.focus(); return; }
    requestNotifications();
    const kindLabel = KINDS.find(k => k.id === kind)?.label;
    const full = [t, kindLabel && !t.toLowerCase().includes(kindLabel.toLowerCase()) ? `(${kindLabel})` : '', files.length ? `Files: ${files.join(', ')}` : ''].filter(Boolean).join(' ');
    startProject(full, { buildMode: gitAgent ? 'gitagent' : 'lyzr', skipPlan: !plan });
  };

  const recent = projects.slice().sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 4);

  const runSim = () => {
    if (simRunning) return;
    setSimRunning(true);
    setScn(s => s.map(x => ({ ...x, status: 'Running' })));
    SCN0.forEach((_, i) => setTimeout(() => {
      setScn(s => s.map((x, j) => (j === i ? { ...x, status: i === 2 && !approved[1] ? 'Failed' : 'Passed' } : x)));
      if (i === SCN0.length - 1) setSimRunning(false);
    }, 500 + i * 450));
  };

  const heroMenu = (label: string, items: [string, IconName, () => void][]) => (
    <Popover
      key={label}
      open={menu === label}
      onClose={() => setMenu(null)}
      style={{ top: 'calc(100% + 6px)', left: -10, width: 230 }}
      anchor={<button onClick={() => setMenu(menu === label ? null : label)} className="row" style={{ gap: 4, background: 'none', border: 0, cursor: 'pointer', opacity: 0.9, fontWeight: 500 }}>{label}<Icon name="chevronDown" size={14} /></button>}
    >
      <div className="menu-pad">{items.map(([l, ic, fn]) => <button key={l} className="mi" onClick={() => { setMenu(null); fn(); }}><Icon name={ic} size={15} />{l}</button>)}</div>
    </Popover>
  );

  return (
    <div className="shell-main">
      <div style={{ position: 'relative', padding: '0 24px 72px', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(55% 60% at 50% 42%,color-mix(in srgb,var(--color-accent) 60%,transparent),transparent 72%),radial-gradient(28% 34% at 88% 8%,color-mix(in srgb,var(--color-text) 22%,transparent),transparent 70%),radial-gradient(40% 40% at 12% 10%,color-mix(in srgb,var(--color-accent) 30%,transparent),transparent 70%)', opacity: 0.9 }} />
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 120, pointerEvents: 'none', background: 'linear-gradient(to bottom,transparent,var(--color-panel))' }} />
        <div className="col" style={{ position: 'relative', alignItems: 'center', gap: 22 }}>
          <nav className="row" style={{ gap: 28, padding: '18px 0 10px', fontSize: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
            {heroMenu('Solutions', [['Customer support', 'user', () => setPrompt(BLUEPRINTS[1].p)], ['Research teams', 'search', () => setPrompt(BLUEPRINTS[0].p)], ['Sales', 'chart', () => setPrompt(BLUEPRINTS[2].p)], ['Healthcare', 'activity', () => setPrompt(BLUEPRINTS[3].p)]])}
            {heroMenu('Resources', [['Help Center', 'book', () => setUi({ info: 'help' })], ['Release notes', 'news', () => setUi({ info: 'release' })], ['System status', 'activity', () => setUi({ info: 'status' })]])}
            <button onClick={() => setUi({ info: 'help' })} style={{ background: 'none', border: 0, cursor: 'pointer', opacity: 0.9, fontWeight: 500 }}>Docs</button>
            <button onClick={() => navigate({ name: 'pricing' })} style={{ background: 'none', border: 0, cursor: 'pointer', opacity: 0.9, fontWeight: 500 }}>Pricing</button>
          </nav>
          <button data-tour="home-gitagent" onClick={() => { setGitAgent(true); toast('GitAgent protocol selected · beta'); taRef.current?.focus(); }} className="row" style={{ gap: 8, padding: '8px 14px', borderRadius: 999, border: '1px solid color-mix(in srgb,var(--color-text) 14%,transparent)', background: 'color-mix(in srgb,var(--color-panel) 55%,transparent)', backdropFilter: 'blur(8px)', fontSize: 14, fontWeight: 500, cursor: 'pointer', marginTop: 12, maxWidth: '100%', whiteSpace: 'nowrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', padding: '2px 7px', borderRadius: 999, background: 'var(--color-accent)', color: '#fff', flex: 'none' }}>BETA</span>
            <span className="ellipsis">Build with any framework using the GitAgent protocol</span><Icon name="chevronRight" />
          </button>
          <h1 style={{ margin: '14px 0 0', fontSize: 'clamp(38px,5vw,60px)', lineHeight: 1.02, textAlign: 'center', textWrap: 'balance' }}>What will your agents do?</h1>
          <p style={{ margin: '-6px 0 8px', fontSize: 18, opacity: 0.8, textAlign: 'center' }}>Build AI agent apps, copilots and multi-agent teams by chatting.</p>

          <div style={{ position: 'relative', width: '100%', maxWidth: 620 }}>
            <div className="col" style={{ background: 'color-mix(in srgb,var(--color-surface) 92%,transparent)', border: '1px solid var(--color-divider)', borderRadius: 18, padding: '14px 12px 10px', gap: 10, boxShadow: 'var(--shadow-lg)' }}>
              {(gitAgent || files.length > 0) && (
                <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                  {gitAgent && <span className="row" style={{ gap: 6, fontSize: 12.5, padding: '3px 6px 3px 10px', borderRadius: 999, background: 'color-mix(in srgb,var(--color-accent) 16%,transparent)', color: 'var(--color-accent-700)', border: '1px solid color-mix(in srgb,var(--color-accent) 40%,transparent)' }}><Icon name="github" size={14} />GitAgent protocol · beta<button onClick={() => setGitAgent(false)} title="Use default Lyzr agents" className="row" style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0, opacity: 0.7 }}><Icon name="x" size={14} /></button></span>}
                  {files.map(f => <span key={f} className="row" style={{ gap: 6, fontSize: 12.5, padding: '3px 6px 3px 10px', borderRadius: 999, border: '1px solid var(--color-divider)' }}><Icon name="file" size={13} />{f}<button onClick={() => setFiles(x => x.filter(y => y !== f))} title="Remove" className="row" style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0, opacity: 0.7 }}><Icon name="x" size={13} /></button></span>)}
                </div>
              )}
              <textarea
                id="home-prompt"
                ref={taRef}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
                rows={2}
                aria-label="Describe your app"
                placeholder="Let's build a support copilot that answers order questions…"
                style={{ resize: 'none', border: 0, background: 'transparent', fontSize: 15, lineHeight: 1.5, outline: 'none', padding: '2px 6px' }}
              />
              <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
                <Popover
                  open={plus}
                  onClose={() => { setPlus(false); setPlusSub(null); }}
                  style={{ bottom: 'calc(100% + 8px)', left: 0, overflow: 'visible', background: 'none', border: 0, boxShadow: 'none', display: 'flex', gap: 6, alignItems: 'flex-end' }}
                  anchor={<button className="ib round" style={{ width: 32, height: 32, border: '1px solid var(--color-divider)', opacity: 1 }} onClick={() => { setPlus(!plus); setPlusSub(null); }} title="More" aria-label="More options"><Icon name={plus ? 'x' : 'plus'} /></button>}
                >
                  <div className="menu-pad" style={{ width: 210, background: 'var(--color-pop)', border: '1px solid var(--color-divider)', borderRadius: 12, boxShadow: 'var(--shadow-lg)' }}>
                    {([['Attach file', 'file'], ['Import from Figma', 'figma'], ['Enhance prompt', 'wand'], ['Search Help Center', 'help'], ['Database', 'database', 1], ['Connectors', 'plug', 1], ['Skills', 'book', 1]] as [string, IconName, number?][]).map(([label, ic, sub]) => (
                      <button key={label} className={cx('mi', plusSub === label && 'active')} onMouseEnter={() => setPlusSub(sub ? label : null)} onClick={() => {
                        if (sub) { setPlusSub(label); return; }
                        setPlus(false);
                        if (label === 'Attach file') fileRef.current?.click();
                        else if (label === 'Import from Figma') setImporter('Figma');
                        else if (label === 'Search Help Center') setUi({ info: 'help' });
                        else if (label === 'Enhance prompt') {
                          const base = prompt.trim() || 'A support copilot for my store';
                          setPrompt(base.replace(/[.\s]+$/, '') + ' — with a router agent that reads every message, specialists that each own one job and their tools, a handoff to a human for anything sensitive, and 12 practice conversations to test routing before launch.');
                          toast('Prompt enhanced');
                        }
                      }}>
                        <Icon name={ic} size={15} /><span className="grow">{label}</span>{sub && <Icon name="chevronRight" size={14} />}
                      </button>
                    ))}
                  </div>
                  {plusSub && (
                    <div className="menu-pad" style={{ width: 220, background: 'var(--color-pop)', border: '1px solid var(--color-divider)', borderRadius: 12, boxShadow: 'var(--shadow-lg)' }}>
                      <div className="menu-label">{plusSub}</div>
                      {SUBS[plusSub].map(([l, ic, meta]) => (
                        <button key={l} className="mi" onClick={() => {
                          setPlus(false); setPlusSub(null);
                          if (l.startsWith('Manage')) { navigate({ name: 'settings', tab: 'integrations' }); return; }
                          const connected = !!ints[l] || meta === 'Built-in';
                          setPrompt(p => (p.trim() ? p.trim().replace(/[.]?$/, '. ') : '') + (plusSub === 'Skills' ? `Give the agents the ${l} skill.` : `Use ${l}${plusSub === 'Database' ? ' for data' : ''}.`));
                          toast(connected || plusSub === 'Skills' ? `${l} added to prompt` : `${l} added. Connect it in Settings → Integrations before publishing`);
                          taRef.current?.focus();
                        }}>
                          <Icon name={ic} size={15} /><span className="grow">{l}</span><span className="meta">{ints[l] ? 'Connected' : meta}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </Popover>
                <input ref={fileRef} type="file" multiple hidden onChange={e => { const n = Array.from(e.target.files || []).map(f => f.name); if (n.length) { setFiles(x => Array.from(new Set([...x, ...n]))); toast(`${n.length} file${n.length > 1 ? 's' : ''} attached`); } e.target.value = ''; }} />
                <ModelPicker />
                <Popover
                  open={dsOpen}
                  onClose={() => setDsOpen(false)}
                  style={{ bottom: 'calc(100% + 8px)', left: 0, width: 340, padding: 6 }}
                  anchor={<button className="tog" onClick={() => setDsOpen(!dsOpen)} title="Design system"><Icon name="palette" size={15} />{ds !== 'Architect default' && <span>{ds}</span>}<Icon name="updown" size={13} /></button>}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                    {DS_GROUPS.map(([title, items]) => (
                      <div key={title} className="col">
                        <div className="menu-label">{title}</div>
                        {items.map(label => (
                          <button key={label} className={cx('mi', ds === label && 'active')} onClick={() => { setState({ ds: label }); setDsOpen(false); }}>
                            <span style={{ width: 10, height: 10, borderRadius: 3, background: DS_DOTS[label], flex: 'none' }} />{label}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                  <div className="menu-sep" />
                  <button className="mi" onClick={() => { setDsOpen(false); fileRef.current?.click(); }}><Icon name="plus" size={15} />Import your design system</button>
                </Popover>
                {kind && (
                  <span className="row" style={{ gap: 6, padding: '4px 8px 4px 10px', borderRadius: 8, background: 'color-mix(in srgb,var(--color-accent) 16%,transparent)', color: 'var(--color-accent-700)', fontSize: 13 }}>
                    <Icon name={KINDS.find(k => k.id === kind)!.icon} size={14} />{KINDS.find(k => k.id === kind)!.label}
                    <button onClick={() => setKind(null)} className="row" style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0 }} aria-label="Clear type"><Icon name="x" size={14} /></button>
                  </span>
                )}
                <div className="grow" />
                <button className={cx('tog', plan && 'on')} onClick={() => setPlan(!plan)} title={plan ? 'Architect asks a few questions and writes a plan first' : 'Build straight away'}><Icon name="bulb" size={15} />Plan</button>
                <button className={cx('ib round', dict.on && 'on')} style={{ width: 32, height: 32 }} title={dict.on ? 'Stop dictation' : 'Dictate'} onClick={() => dict.toggle(m => toast(m, 'warn'))} aria-pressed={dict.on}>
                  {dict.on ? <span className="dot" style={{ background: 'var(--danger)', width: 10, height: 10, animation: 'arch-pulse 1s infinite' }} /> : <Icon name="mic" />}
                </button>
                <button onClick={submit} title="Build" aria-label="Build" style={{ width: 32, height: 32, borderRadius: '50%', border: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: prompt.trim() ? 'var(--color-accent)' : 'color-mix(in srgb,var(--color-accent) 35%,var(--color-surface))', color: '#fff', transition: 'background .15s' }}><Icon name="arrowUp" /></button>
              </div>
            </div>
            {!prompt && (
              <div className="row" style={{ gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginTop: 12 }}>
                {SUGGESTIONS.map(s => <button key={s} className="chip" style={{ background: 'color-mix(in srgb,var(--color-panel) 60%,transparent)', fontWeight: 400, fontSize: 12.5 }} onClick={() => { setPrompt(s); taRef.current?.focus(); }}>{s}</button>)}
              </div>
            )}
          </div>

          <div className="row" style={{ gap: 18, marginTop: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
            {KINDS.map(k => {
              const a = kind === k.id;
              return (
                <button key={k.id} onClick={() => setKind(a ? null : k.id)} aria-pressed={a} className="col" style={{ alignItems: 'center', gap: 8, background: 'none', border: 0, cursor: 'pointer', position: 'relative' }}>
                  <span style={{ width: 58, height: 58, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: a ? 'color-mix(in srgb,var(--color-accent) 30%,var(--color-panel))' : 'color-mix(in srgb,var(--color-accent) 16%,var(--color-panel))', border: '1px solid ' + (a ? 'var(--color-accent)' : 'color-mix(in srgb,var(--color-accent) 30%,transparent)'), color: a ? 'var(--color-accent-700)' : 'inherit', boxShadow: 'var(--shadow-md)', transition: 'all .15s' }}><Icon name={k.icon} size={22} /></span>
                  {k.isNew && <span style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 999, background: 'var(--color-accent)', color: '#fff' }}>New</span>}
                  <span style={{ fontSize: 13, fontWeight: 500, opacity: 0.9 }}>{k.label}</span>
                </button>
              );
            })}
          </div>
          <div className="row" style={{ gap: 8, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <span style={{ fontSize: 14, opacity: 0.75, marginRight: 4 }}>or start from</span>
            {([['Figma', 'figma'], ['GitHub', 'github'], ['Blueprint', 'template']] as ['Figma' | 'GitHub' | 'Blueprint', IconName][]).map(([l, ic]) => (
              <button key={l} className="chip" style={{ background: 'color-mix(in srgb,var(--color-panel) 60%,transparent)' }} onClick={() => setImporter(l)}><Icon name={ic} size={15} />{l}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="col" style={{ margin: '0 28px 20px', gap: 16 }}>
        <div className="row" style={{ alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}><h2 style={{ margin: 0, fontSize: 26 }}>Every agent is tested and improved for you</h2><span style={{ fontSize: 14, opacity: 0.65 }}>Before it ships, and every time it changes</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 16 }}>
          <div id="eng-sim" className="col" style={{ border: '1px solid var(--color-divider)', borderRadius: 16, padding: 24, gap: 16, background: 'var(--color-surface)' }}>
            <div className="row" style={{ gap: 10 }}>
              <span style={{ width: 36, height: 36, borderRadius: 10, background: 'color-mix(in srgb,var(--color-accent) 16%,transparent)', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="network" /></span>
              <div className="col grow"><span style={{ fontSize: 17, fontWeight: 600 }}>Agent Simulation Engine</span><span style={{ fontSize: 12.5, opacity: 0.6 }}>Scenarios written by our own testing agent</span></div>
              <button className="btn btn-secondary btn-sm" onClick={runSim} disabled={simRunning}>{simRunning ? <Spinner size={13} /> : <Icon name="play" size={13} />}{simRunning ? 'Running' : 'Run again'}</button>
            </div>
            <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, opacity: 0.85 }}>Our scenario agent reads your app and writes hundreds of realistic test conversations: angry customers, edge cases, attempts to jailbreak the agent, messages in other languages. Each agent gets run through all of them before it goes live.</p>
            <div style={{ border: '1px solid var(--color-divider)', borderRadius: 12, overflow: 'hidden' }}>
              {scn.map(sc => (
                <div key={sc.name} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto auto', gap: 12, alignItems: 'center', padding: '9px 14px', borderBottom: '1px solid var(--color-divider)', fontSize: 13 }}>
                  <span className="ellipsis">{sc.name}</span>
                  <span style={{ fontSize: 11.5, opacity: 0.55 }}>{sc.agent}</span>
                  <span className={cx('tag', sc.status === 'Failed' ? 'tag-danger' : sc.status === 'Passed' ? 'tag-accent' : 'tag-neutral')} style={{ fontWeight: 600 }}>{sc.status === 'Running' ? <><Spinner size={10} />Running</> : sc.status}</span>
                </div>
              ))}
              <div className="row" style={{ padding: '9px 14px', fontSize: 12.5, opacity: 0.65, justifyContent: 'space-between', gap: 10 }}>
                <span>312 scenarios · {scn.some(s => s.status === 'Failed') ? '297 passed · 15 sent to the Improvement Engine' : '312 passed'}</span><span className="nowrap">Generated by Scenario Agent</span>
              </div>
            </div>
          </div>
          <div id="eng-imp" className="col" style={{ border: '1px solid var(--color-divider)', borderRadius: 16, padding: 24, gap: 16, background: 'var(--color-surface)' }}>
            <div className="row" style={{ gap: 10 }}>
              <span style={{ width: 36, height: 36, borderRadius: 10, background: 'color-mix(in srgb,var(--color-accent) 16%,transparent)', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="sparkles" /></span>
              <div className="col"><span style={{ fontSize: 17, fontWeight: 600 }}>Improvement Engine</span><span style={{ fontSize: 12.5, opacity: 0.6 }}>An AI judge scores every run, then fixes what fails</span></div>
            </div>
            <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, opacity: 0.85 }}>An AI model acting as a judge scores every simulated run. When a single agent fails, the engine finds out why, rewrites that agent's prompt or adds a guardrail, and runs the tests again until they pass. Every change needs your approval.</p>
            <div className="col" style={{ border: '1px solid var(--color-divider)', borderRadius: 12, padding: 14, gap: 12 }}>
              <div className="row" style={{ gap: 10, fontSize: 13 }}><span style={{ fontWeight: 600 }} className="grow">Refund agent · eval pass rate</span><span className="mono" style={{ opacity: 0.8 }}>71% → <strong style={{ color: 'var(--color-accent)' }}>{approved.every(Boolean) ? '99%' : '96%'}</strong></span></div>
              <div className="row" style={{ alignItems: 'flex-end', gap: 6, height: 56 }}>
                {[71, 74, 80, 83, 88, 91, 94, approved.every(Boolean) ? 99 : 96].map((v, i, a) => <div key={i} style={{ flex: 1, height: `${((v - 60) / 40) * 100}%`, borderRadius: '4px 4px 0 0', background: i === a.length - 1 ? 'var(--color-accent)' : 'color-mix(in srgb,var(--color-accent) 35%,transparent)', transition: 'height .4s' }} />)}
              </div>
              {FIXES.map(([k, t], i) => (
                <div key={t} className="row" style={{ gap: 10, fontSize: 13, lineHeight: 1.45, alignItems: 'flex-start' }}>
                  <span className="tag tag-neutral" style={{ minWidth: 70, justifyContent: 'center', fontWeight: 600 }}>{k}</span>
                  <span className="grow">{t}</span>
                  <button className={cx('btn btn-sm', approved[i] ? 'btn-ghost' : 'btn-secondary')} style={{ padding: '3px 9px' }} onClick={() => { setApproved(a => a.map((x, j) => (j === i ? !x : x))); toast(approved[i] ? 'Fix unapproved' : 'Fix approved. It ships with the next run'); }}>{approved[i] ? <><Icon name="check" size={13} />Approved</> : 'Approve'}</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="col" style={{ margin: '0 28px 28px', border: '1px solid var(--color-divider)', borderRadius: 16, padding: '28px 32px', gap: 20 }}>
        <div className="row" style={{ alignItems: 'baseline', gap: 14 }}><h2 style={{ margin: 0, fontSize: 26 }}>Recently edited</h2><button className="link row" style={{ gap: 4, fontSize: 14 }} onClick={() => navigate({ name: 'projects', filter: 'all' })}>View all<Icon name="arrowRight" size={14} /></button></div>
        {recent.length === 0 ? <div style={{ fontSize: 14, opacity: 0.65 }}>No projects yet. Describe one above to get started.</div> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 16 }}>
            {recent.map(p => (
              <button key={p.id} className="col" onClick={() => openProject(p.id)} style={{ gap: 10, background: 'none', border: 0, padding: 0, cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ borderRadius: 10, border: '1px solid var(--color-divider)', overflow: 'hidden', width: '100%' }}><ProjectThumb p={p} height={132} /></div>
                <div className="row" style={{ gap: 8, width: '100%' }}><span className="ellipsis" style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</span><span style={{ fontSize: 12, opacity: 0.55 }} className="nowrap">{ago(p.updatedAt)}</span></div>
              </button>
            ))}
          </div>
        )}
      </div>

      <ImportDialog kind={importer} onClose={() => setImporter(null)} />
    </div>
  );
}

const REPOS = [['acme/support-bot', 'TypeScript · updated 2 days ago'], ['acme/crm-sync', 'Python · updated last week'], ['acme/docs-site', 'MDX · updated Sep 12']];

function ImportDialog({ kind, onClose }: { kind: null | 'Figma' | 'GitHub' | 'Blueprint'; onClose: () => void }) {
  const ints = useApp(s => s.ints);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { setUrl(''); setBusy(false); }, [kind]);
  if (!kind) return null;
  const go = (prompt: string) => { setBusy(true); setTimeout(() => { onClose(); startProject(prompt); }, 600); };
  return (
    <Dialog open onClose={onClose} width={520} label={`Start from ${kind}`}>
      <div className="row" style={{ gap: 10 }}><div className="dialog-title grow">{kind === 'Blueprint' ? 'Start from a blueprint' : `Import from ${kind}`}</div><button className="ib" onClick={onClose} aria-label="Close"><Icon name="x" /></button></div>
      {kind === 'Blueprint' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10 }}>
          {BLUEPRINTS.map(b => <button key={b.t} className="card" onClick={() => { onClose(); startProject(b.p); }}><div className="card-kicker">{b.k}</div><div className="card-title">{b.t}</div><p className="card-body">{b.b}</p></button>)}
        </div>
      )}
      {kind === 'Figma' && (
        <>
          <div className="dialog-body">Paste a Figma file or frame link. Architect reads the layout and styles, then builds the site and agents around it.</div>
          <div className="field"><label>Figma link</label><input className="input" autoFocus placeholder="https://www.figma.com/design/…" value={url} onChange={e => setUrl(e.target.value)} /></div>
          <div className="dialog-actions"><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={!/figma\.com\//.test(url) || busy} onClick={() => go(`Build the app from my Figma design (${url.trim()}) with a support agent team: a router, specialists for common questions, and a handoff to a human.`)}>{busy && <Spinner />}Import</button></div>
          {url && !/figma\.com\//.test(url) && <div style={{ fontSize: 12.5, color: 'var(--danger)', marginTop: -6 }}>That doesn't look like a Figma link</div>}
        </>
      )}
      {kind === 'GitHub' && (
        !ints.GitHub ? (
          <>
            <div className="dialog-body">Connect GitHub to import a repository. Architect keeps the code in sync both ways.</div>
            <div className="dialog-actions"><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={() => { setState(s => ({ ints: { ...s.ints, GitHub: true } })); toast('GitHub connected'); }}><Icon name="github" />Connect GitHub</button></div>
          </>
        ) : (
          <>
            <div className="dialog-body">Pick a repository. Architect adds an agent layer on top of your existing code.</div>
            <div className="col" style={{ border: '1px solid var(--color-divider)', borderRadius: 12, overflow: 'hidden' }}>
              {REPOS.map(([r, m], i) => (
                <button key={r} className="mi" disabled={busy} style={{ borderRadius: 0, padding: '12px 14px', borderTop: i ? '1px solid var(--color-divider)' : 0 }} onClick={() => go(`Import ${r} and add a support copilot: a router agent, specialists for orders and returns, and a handoff to a human.`)}>
                  <Icon name="github" size={16} /><span className="col grow" style={{ gap: 1 }}><span style={{ fontWeight: 500 }}>{r}</span><span style={{ fontSize: 12, opacity: 0.6 }}>{m}</span></span><Icon name="chevronRight" size={14} />
                </button>
              ))}
            </div>
            {busy && <div className="row" style={{ gap: 8, fontSize: 13, color: 'var(--color-accent)' }}><Spinner />Cloning repository…</div>}
          </>
        )
      )}
    </Dialog>
  );
}
