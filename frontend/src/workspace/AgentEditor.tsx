import { useMemo, useRef, useState } from 'react';
import { Icon, type IconName } from '../icons';
import { useApp, setWs } from '../store';
import { confirmAction, newDraft, saveAgent, toast, toggleChannel } from '../actions';
import { Dialog, Pills, Popover, Switch } from '../components/ui';
import { AGENT_MODELS, CHANNELS, FEATS, KNOWLEDGE_LIBRARY, OUTPUTS, ROUTER_TOOLS, SKILL_LIBRARY, TOOL_LIBRARY, toolInfo } from '../data/constants';
import { templateById } from '../data/templates';
import { copyText, cx, slug } from '../lib/util';
import { siteUrl } from '../lib/router';
import { TestRun } from './AgentsTab';
import type { Agent, Project } from '../types';

const inputStyle = { width: '100%', border: '1px solid var(--color-divider)', borderRadius: 10, background: 'var(--color-surface)', fontSize: 14, padding: '10px 12px', outline: 'none' } as const;

export function AgentEditor({ p, agentId }: { p: Project; agentId: string }) {
  const orig = p.agents.find(a => a.id === agentId)!;
  const tab = useApp(s => s.ui.ws.edTab);
  const [a, setA] = useState<Agent>(() => JSON.parse(JSON.stringify(orig)));
  const [savedAt, setSavedAt] = useState(0);
  const dirty = JSON.stringify(a) !== JSON.stringify(orig);
  const set = (patch: Partial<Agent>) => setA(x => ({ ...x, ...patch }));
  const tpl = templateById(p.templateId);

  const close = () => {
    if (!dirty) { setWs({ editAgent: null }); return; }
    confirmAction({ title: 'Discard unsaved changes?', body: `Your edits to ${orig.name} haven't been saved.`, confirmLabel: 'Discard', danger: true, onConfirm: () => setWs({ editAgent: null }) });
  };
  const save = () => {
    if (!dirty) return;
    if (!a.name.trim()) { toast('The agent needs a name', 'warn'); return; }
    if (p.agents.some(x => x.id !== a.id && x.name.toLowerCase() === a.name.trim().toLowerCase())) { toast('Another agent already has that name', 'warn'); return; }
    saveAgent(p.id, { ...a, name: a.name.trim() }, orig.name);
    setSavedAt(Date.now());
  };

  return (
    <div className="col" style={{ position: 'absolute', inset: 0, zIndex: 20, background: 'var(--color-panel)', minHeight: 0 }}>
      <div className="row" style={{ gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--color-divider)', flex: 'none', flexWrap: 'wrap' }}>
        <button className="ib sm" onClick={close} title="Back to graph"><Icon name="chevronLeft" /></button>
        <button className="link plain" style={{ fontSize: 14 }} onClick={close}>Agents</button>
        <span style={{ opacity: 0.4, display: 'flex' }}><Icon name="chevronRight" size={14} /></span>
        <span className="ellipsis" style={{ fontSize: 14, fontWeight: 600, maxWidth: 220 }}>{a.name || 'Untitled'}</span>
        <span className="tag tag-neutral">{a.kind === 'router' ? 'Router' : 'Specialist'}</span>
        <div className="grow" />
        <Pills value={tab} onChange={v => setWs({ edTab: v })} options={[{ v: 'build', label: 'Build', icon: 'wrench' }, { v: 'play', label: 'Playground', icon: 'play' }, { v: 'deploy', label: 'Deploy', icon: 'rocket' }]} />
        <div className="grow" />
        <span className="nowrap" style={{ fontSize: 12, opacity: 0.6 }}>{dirty ? 'Unsaved changes' : savedAt ? 'Saved' : 'No changes'}</span>
        {dirty && <button className="btn btn-ghost plain btn-sm" onClick={() => setA(JSON.parse(JSON.stringify(orig)))}>Discard</button>}
        <button className="ib sm" onClick={() => setWs({ tab: 'history', editAgent: null })} title="Version history"><Icon name="history" size={15} /></button>
        <button className="ib sm" onClick={() => newDraft(p.id)} title="Branch into a draft"><Icon name="branch" size={15} /></button>
        <button className={cx('btn btn-sm', dirty ? 'btn-primary' : 'btn-secondary')} disabled={!dirty} onClick={save}>Save agent</button>
      </div>
      {tab === 'build' && <BuildTab p={p} a={a} set={set} tplName={tpl.channel.title} />}
      {tab === 'play' && (
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', minHeight: 0 }}>
          <div className="col" style={{ minHeight: 0, borderRight: '1px solid var(--color-divider)' }}>
            {dirty && <div className="row" style={{ gap: 8, padding: '8px 16px', fontSize: 12.5, background: 'color-mix(in srgb,#f59e0b 12%,transparent)' }}><Icon name="info" size={13} />The playground runs the saved version. Save to test your edits.</div>}
            <TestRun p={p} agentId={a.kind === 'specialist' ? a.id : undefined} wide />
          </div>
          <Trace p={p} />
        </div>
      )}
      {tab === 'deploy' && <DeployTab p={p} a={a} />}
    </div>
  );
}

function Trace({ p }: { p: Project }) {
  const last = [...p.pg].reverse().find(m => m.r === 'a');
  const parts = last?.trace?.split(' · ')[0].split(' → ') || [];
  const tail = last?.trace?.split(' · ').slice(1).join(' · ') || '';
  const color = (i: number, name: string) => (i === 0 ? 'var(--color-accent)' : ROUTER_TOOLS.has(name) || name.includes('.') || name.includes('_') ? '#34d399' : '#a78bfa');
  return (
    <div className="col" style={{ overflow: 'auto', padding: 16, gap: 14 }}>
      <span style={{ fontSize: 15, fontWeight: 600 }}>Last run</span>
      {!last && <div style={{ fontSize: 13, opacity: 0.55, lineHeight: 1.5 }}>Send a message to see each agent, tool call, token count and cost.</div>}
      {last && (
        <>
          {parts.map((n, i) => {
            const tool = n.includes('_') || n.includes('.');
            const meta = i === 0 ? 'Routed · Haiku 4.5 · 212 tokens · 0.4s' : tool ? 'Tool call · 180 ms' : 'Answered · Sonnet 4.5 · 846 tokens · 1.1s';
            return <div key={i} className="row" style={{ gap: 10, fontSize: 13, alignItems: 'flex-start' }}><span className="dot" style={{ width: 8, height: 8, marginTop: 5, background: color(i, n) }} /><div className="grow"><div style={{ fontWeight: 500 }} className={tool ? 'mono' : ''}>{n}</div><div style={{ fontSize: 12, opacity: 0.55 }}>{meta}</div></div></div>;
          })}
          <div className="row" style={{ gap: 10, fontSize: 13, alignItems: 'flex-start' }}><span className="dot" style={{ width: 8, height: 8, marginTop: 5, background: 'var(--color-text)' }} /><div className="grow"><div style={{ fontWeight: 500 }}>Reply sent</div><div style={{ fontSize: 12, opacity: 0.55 }}>{tail}</div></div></div>
        </>
      )}
    </div>
  );
}

function BuildTab({ p, a, set, tplName }: { p: Project; a: Agent; set: (x: Partial<Agent>) => void; tplName: string }) {
  const [featOpen, setFeatOpen] = useState(false);
  const [featQ, setFeatQ] = useState('');
  const [autoOpen, setAutoOpen] = useState<null | 'Schedule' | 'Trigger'>(null);
  const [autoText, setAutoText] = useState('');
  const [mention, setMention] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const others = p.agents.filter(x => x.id !== a.id && !a.handoffs.includes(x.name));
  const tpl = templateById(p.templateId);
  const prov = /Claude/.test(a.model) ? '#d97757' : /GPT/.test(a.model) ? '#10a37f' : '#4285f4';
  const cost = /Opus/.test(a.model) ? '≈ $0.015 / reply' : /Sonnet|GPT-5$|Pro/.test(a.model) ? '≈ $0.003 / reply' : '≈ $0.0006 / reply';
  const mentionItems = useMemo(() => [...p.agents.filter(x => x.id !== a.id).map(x => x.name), ...a.tools.map(t => t.name)], [p.agents, a]);

  const sections: { title: string; items: string[]; icon: IconName; meta: (s: string) => string; lib: string[]; key: 'knowledge' | 'skills' }[] = [
    { title: 'Knowledge', items: a.knowledge, icon: 'book', meta: () => 'Indexed', lib: KNOWLEDGE_LIBRARY, key: 'knowledge' },
    { title: 'Skills', items: a.skills, icon: 'sparkles', meta: () => 'Skill', lib: SKILL_LIBRARY, key: 'skills' },
  ];

  const insertMention = (name: string) => {
    const ta = taRef.current;
    const text = a.instructions;
    const pos = ta?.selectionStart ?? text.length;
    const before = text.slice(0, pos).replace(/@\w*$/, '');
    set({ instructions: `${before}@${name} ${text.slice(pos)}`, handoffs: p.agents.some(x => x.name === name) && !a.handoffs.includes(name) ? [...a.handoffs, name] : a.handoffs });
    setMention(false);
    setTimeout(() => ta?.focus(), 10);
  };

  return (
    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(300px,440px)', minHeight: 0 }}>
      <div className="col" style={{ overflow: 'auto', padding: '18px 20px', gap: 16, borderRight: '1px solid var(--color-divider)', minHeight: 0 }}>
        <div className="row" style={{ gap: 8 }}>
          <span className="grow" style={{ fontSize: 14, fontWeight: 500, opacity: 0.8 }}>Tell your agent how to behave</span>
          <button className="btn btn-ghost plain btn-sm" onClick={() => { set({ instructions: `You are the ${a.name} agent for ${p.name}, ${tpl.app.toLowerCase()}.\n\nRole: ${a.role}.\nGoal: ${a.goal}.\n\n1. Greet the ${tplName.toLowerCase()} by name if you know it.\n2. Ask at most one clarifying question.\n3. Use your tools before answering; never guess amounts, dates or policies.\n4. Hand off to a person for emergencies or disputes.\n5. Keep replies under 80 words.` }); toast('Instructions generated'); }}><Icon name="sparkles" size={14} />Generate</button>
          <button className="btn btn-ghost plain btn-sm" onClick={() => { if (a.instructions.includes('Always confirm what you did')) { toast('Already improved. Try Generate for a fresh draft'); return; } set({ instructions: a.instructions + `\n\nAlways confirm what you did in one short sentence at the end, and never share another ${tplName.toLowerCase()}'s details.` }); toast('Instructions improved'); }}><Icon name="wand" size={14} />Improve</button>
        </div>
        <div className="field"><label style={{ fontSize: 14, fontWeight: 600, color: 'inherit' }}>Name</label><input style={inputStyle} value={a.name} onChange={e => set({ name: e.target.value })} maxLength={40} /></div>
        <div className="field"><label style={{ fontSize: 14, fontWeight: 600, color: 'inherit' }}>Role</label><input style={inputStyle} value={a.role} onChange={e => set({ role: e.target.value })} /></div>
        <div className="field"><label style={{ fontSize: 14, fontWeight: 600, color: 'inherit' }}>Goal</label><input style={inputStyle} value={a.goal} onChange={e => set({ goal: e.target.value })} /></div>
        <div className="col" style={{ gap: 8, flex: 1, minHeight: 260, position: 'relative' }}>
          <label style={{ fontSize: 14, fontWeight: 600 }}>Instructions</label>
          <textarea ref={taRef} className="mono" value={a.instructions} onChange={e => { set({ instructions: e.target.value }); const pos = e.target.selectionStart; setMention(/@\w*$/.test(e.target.value.slice(0, pos))); }} onKeyDown={e => { if (e.key === 'Escape' && mention) { e.stopPropagation(); setMention(false); } }} style={{ ...inputStyle, flex: 1, minHeight: 220, resize: 'none', lineHeight: 1.6, fontSize: 13 }} />
          {mention && (
            <div className="menu" style={{ left: 12, bottom: 44, width: 240 }}>
              <div className="menu-pad">
                <div className="menu-label">Mention an agent or tool</div>
                {mentionItems.map(n => <button key={n} className="mi" onMouseDown={e => { e.preventDefault(); insertMention(n); }}><Icon name={p.agents.some(x => x.name === n) ? 'bot' : 'wrench'} size={14} />{n}</button>)}
              </div>
            </div>
          )}
          <div className="row" style={{ gap: 8, fontSize: 12, opacity: 0.6 }}><span className="grow">Type @ to mention another agent or tool · {a.instructions.length} characters</span><button className="ib sm" onClick={() => copyText(a.instructions).then(() => toast('Instructions copied'))} title="Copy"><Icon name="copy" size={14} /></button></div>
        </div>
        <div className="col" style={{ border: '1px solid var(--color-divider)', borderRadius: 12, padding: '12px 16px', gap: 10 }}>
          <div className="row" style={{ gap: 10 }}>
            <span className="grow" style={{ fontSize: 15, fontWeight: 600 }}>Hands off to</span>
            <AddMenu label="Agent" items={others.map(x => x.name)} empty="Already hands off to every agent" onPick={n => set({ handoffs: [...a.handoffs, n] })} />
            <AddMenu label="Human" items={[tpl.urgent?.human || 'Owner', 'Support team', 'Manager'].filter(h => !a.handoffs.includes(h))} empty="All people added" onPick={n => set({ handoffs: [...a.handoffs, n], tools: a.tools.some(t => t.name === 'handoff_to_human') ? a.tools : [...a.tools, { name: 'handoff_to_human', on: true }] })} />
          </div>
          <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
            {a.handoffs.map(h => (
              <span key={h} className="row" style={{ gap: 6, fontSize: 13, padding: '4px 6px 4px 10px', borderRadius: 999, border: '1px solid var(--color-divider)', whiteSpace: 'nowrap' }}>
                <Icon name={p.agents.some(x => x.name === h) ? 'bot' : 'user'} size={13} />{h}
                <button className="ib sm" style={{ width: 18, height: 18 }} onClick={() => set({ handoffs: a.handoffs.filter(x => x !== h) })} aria-label={`Remove ${h}`}><Icon name="x" size={11} /></button>
              </span>
            ))}
            {a.handoffs.length === 0 && <span style={{ fontSize: 13, opacity: 0.6 }}>This agent answers everything itself.</span>}
          </div>
        </div>
      </div>

      <div style={{ overflow: 'auto', minHeight: 0, position: 'relative' }}>
        <div className="col" style={{ padding: 16, borderBottom: '1px solid var(--color-divider)', gap: 10 }}>
          <div className="row"><span className="grow" style={{ fontSize: 15, fontWeight: 600 }}>Model</span><span style={{ fontSize: 12, opacity: 0.55 }}>{cost}</span></div>
          <div className="row" style={{ gap: 10, border: '1px solid var(--color-divider)', borderRadius: 10, background: 'var(--color-surface)', padding: '0 10px' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: prov, flex: 'none' }} />
            <select className="bare grow" style={{ fontSize: 14, padding: '10px 0' }} value={a.model} onChange={e => set({ model: e.target.value })} aria-label="Model">{AGENT_MODELS.map(m => <option key={m}>{m}</option>)}</select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12 }}>
            <label className="col" style={{ gap: 6 }}><span style={{ opacity: 0.65 }}>Temperature · {a.temp.toFixed(1)}</span><input type="range" min={0} max={1} step={0.1} value={a.temp} onChange={e => set({ temp: +e.target.value })} /></label>
            <label className="col" style={{ gap: 6 }}><span style={{ opacity: 0.65 }}>Max reply · {a.maxTok} tokens</span><input type="range" min={256} max={4096} step={256} value={a.maxTok} onChange={e => set({ maxTok: +e.target.value })} /></label>
          </div>
        </div>
        <div className="col" style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-divider)', gap: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>Output format</span>
          {OUTPUTS.map(([k, label, desc]) => (
            <div key={k} className="row" style={{ gap: 12 }}><div className="grow"><div style={{ fontSize: 14 }}>{label}</div><div style={{ fontSize: 12, opacity: 0.55, lineHeight: 1.45 }}>{desc}</div></div><Switch on={!!a.out[k]} onChange={() => set({ out: { ...a.out, [k]: !a.out[k] } })} label={label} /></div>
          ))}
        </div>
        <Section title="Tools" count={a.tools.filter(t => t.on).length} add={<AddMenu icon items={TOOL_LIBRARY.filter(t => !a.tools.some(x => x.name === t))} empty="Every library tool is added" onPick={n => { set({ tools: [...a.tools, { name: n, on: true }] }); toast(`Added ${n}`); }} />}>
          {a.tools.map((t, i) => (
            <div key={t.name} className="row" style={{ gap: 10, padding: '8px 10px', border: '1px solid var(--color-divider)', borderRadius: 9, background: 'var(--color-surface)' }}>
              <Icon name={toolInfo(t.name).icon} size={14} style={{ opacity: 0.7 }} />
              <span className="mono ellipsis grow" style={{ fontSize: 13 }} title={toolInfo(t.name).desc}>{t.name}</span>
              <Switch on={t.on} onChange={() => set({ tools: a.tools.map((x, j) => (j === i ? { ...x, on: !x.on } : x)) })} label={`Enable ${t.name}`} />
              <button className="ib sm" onClick={() => set({ tools: a.tools.filter((_, j) => j !== i) })} aria-label={`Remove ${t.name}`}><Icon name="x" size={13} /></button>
            </div>
          ))}
        </Section>
        {sections.map(sec => (
          <Section key={sec.title} title={sec.title} count={sec.items.length} add={<AddMenu icon items={sec.lib.filter(x => !sec.items.includes(x))} empty="Everything in the library is added" onPick={n => { set({ [sec.key]: [...sec.items, n] } as Partial<Agent>); toast(`Added ${n}`); }} />}>
            {sec.items.map((k, i) => (
              <div key={k} className="row" style={{ gap: 10, padding: '8px 10px', border: '1px solid var(--color-divider)', borderRadius: 9, background: 'var(--color-surface)' }}>
                <Icon name={sec.icon} size={14} style={{ opacity: 0.7 }} /><span className="mono ellipsis grow" style={{ fontSize: 13 }}>{k}</span><span style={{ fontSize: 11, opacity: 0.55 }}>{sec.meta(k)}</span>
                <button className="ib sm" onClick={() => set({ [sec.key]: sec.items.filter((_, j) => j !== i) } as Partial<Agent>)} aria-label={`Remove ${k}`}><Icon name="x" size={13} /></button>
              </div>
            ))}
          </Section>
        ))}
        <div className="row" style={{ gap: 10, padding: '14px 16px', borderBottom: a.sched.length ? 0 : '1px solid var(--color-divider)' }}>
          <span className="grow" style={{ fontSize: 15, fontWeight: 600 }}>Automation</span>
          <button className="btn btn-ghost plain btn-sm" onClick={() => { setAutoOpen('Schedule'); setAutoText('Weekly Mon 9:00 · summary to owner'); }}><Icon name="plus" size={13} />Schedule</button>
          <button className="btn btn-ghost plain btn-sm" onClick={() => { setAutoOpen('Trigger'); setAutoText('When a request is overdue · follow up'); }}><Icon name="plus" size={13} />Trigger</button>
        </div>
        {a.sched.length > 0 && (
          <div className="col" style={{ gap: 6, padding: '0 16px 14px', borderBottom: '1px solid var(--color-divider)' }}>
            {a.sched.map((k, i) => <div key={k + i} className="row" style={{ gap: 10, padding: '8px 10px', border: '1px solid var(--color-divider)', borderRadius: 9, background: 'var(--color-surface)' }}><Icon name="clock" size={14} style={{ opacity: 0.7 }} /><span className="ellipsis grow" style={{ fontSize: 13 }}>{k}</span><button className="ib sm" onClick={() => set({ sched: a.sched.filter((_, j) => j !== i) })} aria-label="Remove"><Icon name="x" size={13} /></button></div>)}
          </div>
        )}
        <div className="col" style={{ padding: '14px 16px 20px', gap: 12 }}>
          <div className="row"><span className="grow" style={{ fontSize: 15, fontWeight: 600 }}>Features</span><button className="btn btn-ghost plain btn-sm" onClick={() => { setFeatOpen(!featOpen); setFeatQ(''); }}>View all<Icon name="chevronRight" size={13} /></button></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: 8 }}>
            {FEATS.filter((f, i) => i < 3 || a.feats[f[0]]).map(([k, name, desc, ic, col]) => {
              const on = !!a.feats[k];
              return (
                <div key={k} className="col" style={{ border: '1px solid ' + (on ? 'color-mix(in srgb,var(--color-accent) 45%,transparent)' : 'var(--color-divider)'), borderRadius: 10, padding: 10, gap: 6, background: on ? 'color-mix(in srgb,var(--color-accent) 8%,var(--color-surface))' : 'var(--color-surface)' }}>
                  <div className="row" style={{ gap: 8, fontSize: 13, fontWeight: 600 }}><span style={{ color: col, display: 'flex' }}><Icon name={ic} size={13} /></span>{name}</div>
                  <div style={{ fontSize: 11.5, opacity: 0.6, lineHeight: 1.4 }}>{desc}</div>
                  <button className="row link plain" style={{ gap: 4, fontSize: 12, alignSelf: 'flex-start', opacity: 0.85 }} onClick={() => set({ feats: { ...a.feats, [k]: !on } })}><Icon name={on ? 'check' : 'plus'} size={12} />{on ? 'Added' : 'Add'}</button>
                </div>
              );
            })}
          </div>
        </div>
        {featOpen && (
          <div className="menu" style={{ right: 12, top: 120, width: 300, zIndex: 5 }}>
            <div style={{ padding: 10 }}><div className="row" style={{ gap: 8, border: '1px solid var(--color-divider)', borderRadius: 9, padding: '7px 10px' }}><Icon name="search" size={14} style={{ opacity: 0.55 }} /><input autoFocus className="bare grow" style={{ fontSize: 13 }} placeholder="Search features…" value={featQ} onChange={e => setFeatQ(e.target.value)} /><button className="ib sm" style={{ width: 20, height: 20 }} onClick={() => setFeatOpen(false)} aria-label="Close"><Icon name="x" size={12} /></button></div></div>
            <div className="menu-label" style={{ padding: '2px 14px 6px' }}>CORE FEATURES</div>
            <div className="col" style={{ maxHeight: 320, overflow: 'auto', padding: '0 6px 8px' }}>
              {FEATS.filter(f => !featQ || f[1].toLowerCase().includes(featQ.toLowerCase())).map(([k, name, desc, ic]) => (
                <div key={k} className="row" style={{ gap: 10, padding: '9px 8px', borderRadius: 9, alignItems: 'flex-start' }}>
                  <Icon name={ic} size={14} style={{ opacity: 0.7, marginTop: 2 }} /><div className="grow"><div style={{ fontSize: 13, fontWeight: 500 }}>{name}</div><div style={{ fontSize: 11.5, opacity: 0.55, lineHeight: 1.4 }}>{desc}</div></div>
                  <Switch on={!!a.feats[k]} onChange={() => set({ feats: { ...a.feats, [k]: !a.feats[k] } })} label={name} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <Dialog open={!!autoOpen} onClose={() => setAutoOpen(null)} width={440} label={`Add ${autoOpen}`}>
        <div className="dialog-title">Add {autoOpen?.toLowerCase()}</div>
        <div className="dialog-body">{autoOpen === 'Schedule' ? 'Runs this agent on a timetable, for example a weekly summary.' : 'Runs this agent when something happens in your data.'}</div>
        <div className="field"><label>Describe it</label><input className="input" autoFocus value={autoText} onChange={e => setAutoText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && autoText.trim()) { set({ sched: [...a.sched, autoText.trim()] }); setAutoOpen(null); } }} /></div>
        <div className="dialog-actions"><button className="btn btn-secondary" onClick={() => setAutoOpen(null)}>Cancel</button><button className="btn btn-primary" disabled={!autoText.trim()} onClick={() => { set({ sched: [...a.sched, autoText.trim()] }); setAutoOpen(null); }}>Add</button></div>
      </Dialog>
    </div>
  );
}

function Section({ title, count, add, children }: { title: string; count: number; add: React.ReactNode; children: React.ReactNode }) {
  const has = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <div style={{ borderBottom: '1px solid var(--color-divider)' }}>
      <div className="row" style={{ gap: 10, padding: '14px 16px' }}><span className="grow" style={{ fontSize: 15, fontWeight: 600 }}>{title}</span><span style={{ fontSize: 12, opacity: 0.55 }}>{count || ''}</span>{add}</div>
      {has && <div className="col" style={{ gap: 6, padding: '0 16px 14px' }}>{children}</div>}
    </div>
  );
}

function AddMenu({ label, items, onPick, empty, icon }: { label?: string; items: string[]; onPick: (s: string) => void; empty: string; icon?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onClose={() => setOpen(false)} style={{ right: 0, top: 'calc(100% + 4px)', width: 230 }}
      anchor={icon ? <button className="ib sm" onClick={() => setOpen(!open)} title="Add"><Icon name="plus" size={15} /></button> : <button className="btn btn-ghost plain btn-sm" onClick={() => setOpen(!open)}><Icon name="plus" size={13} />{label}</button>}>
      <div className="menu-pad" style={{ maxHeight: 260, overflowY: 'auto' }}>
        {items.length === 0 && <div style={{ fontSize: 12.5, opacity: 0.6, padding: '8px 10px' }}>{empty}</div>}
        {items.map(n => <button key={n} className="mi" onClick={() => { setOpen(false); onPick(n); }}>{n}</button>)}
      </div>
    </Popover>
  );
}

function DeployTab({ p, a }: { p: Project; a: Agent }) {
  const host = `${slug(p.name)}.architect.app`;
  const tpl = templateById(p.templateId);
  const api = `curl https://${host}/api/agents/${a.id} \\\n  -H "Authorization: Bearer $ARCHITECT_KEY" \\\n  -d '{ "message": "${tpl.samples[0]}", "user": "u_01" }'`;
  const embed = `<script src="https://${host}/widget.js"\n  data-agent="${p.agents[0].id}" async></script>`;
  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
      <div className="col" style={{ maxWidth: 760, margin: '0 auto', gap: 20 }}>
        <div><h2 style={{ margin: 0, fontSize: 22 }}>Use {a.name} anywhere</h2><div style={{ fontSize: 14, opacity: 0.65, marginTop: 4 }}>It already runs inside your app. You can also call it on its own.</div></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10 }}>
          {CHANNELS.map(([k, name, ic, desc]) => (
            <div key={k} className="col" style={{ border: '1px solid var(--color-divider)', borderRadius: 12, padding: 14, gap: 8, background: 'var(--color-surface)' }}>
              <div className="row" style={{ gap: 8, fontWeight: 600, fontSize: 14 }}><Icon name={ic} size={15} />{name}<div className="grow" /><Switch on={!!p.chans[k]} onChange={() => { toggleChannel(p.id, k); toast(`${name} ${p.chans[k] ? 'off' : 'on'}`); }} label={name} /></div>
              <div style={{ fontSize: 12.5, opacity: 0.6, lineHeight: 1.45 }}>{desc}</div>
            </div>
          ))}
        </div>
        {[['API', api], ['Embed the chat widget', embed]].map(([t, code]) => (
          <div key={t} className="col" style={{ gap: 8 }}>
            <div className="row"><span className="grow" style={{ fontSize: 15, fontWeight: 600 }}>{t}</span><button className="btn btn-ghost plain btn-sm" onClick={() => copyText(code).then(() => toast('Copied'))}><Icon name="copy" size={13} />Copy</button></div>
            <pre className="mono" style={{ margin: 0, padding: '14px 16px', border: '1px solid var(--color-divider)', borderRadius: 12, background: 'var(--color-surface)', fontSize: 12.5, lineHeight: 1.7, overflow: 'auto', whiteSpace: 'pre' }}>{code}</pre>
          </div>
        ))}
        {!p.published && <div className="row" style={{ gap: 8, fontSize: 13, opacity: 0.75 }}><Icon name="info" size={14} />Publish the app to make these endpoints live. <button className="link" style={{ fontSize: 13 }} onClick={() => setWs({ publishOpen: true, pubStep: 'config' })}>Publish now</button></div>}
        {p.published && <button className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => window.open(siteUrl(p.id), '_blank', 'noopener')}><Icon name="external" size={14} />Open live site</button>}
      </div>
    </div>
  );
}
