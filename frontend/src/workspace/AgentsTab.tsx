import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon, type IconName } from '../icons';
import { useApp, setWs } from '../store';
import { clearPg, deleteAgent, navigate, sendPg, toggleChannel, updateAgentLive } from '../actions';
import { Seg, Spinner, Switch, useStickToBottom } from '../components/ui';
import { AGENT_MODELS, CHANNELS, ROUTER_TOOLS, toolInfo } from '../data/constants';
import { templateById } from '../data/templates';
import { focusComposer } from './Workspace';
import type { Agent, Project } from '../types';

export const NW = 200, NH = 60, ROW = 72;

interface GNode { id: string; x: number; y: number; title: string; sub: string; icon: IconName; kind: 'channel' | 'router' | 'agent' | 'tool' | 'knowledge' | 'human'; agent?: Agent; tool?: string }

export function buildGraph(p: Project) {
  const tpl = templateById(p.templateId);
  const router = p.agents.find(a => a.kind === 'router') || p.agents[0];
  const specs = p.agents.filter(a => a.id !== router.id);
  const nodes: GNode[] = [];
  const edges: [string, string, boolean][] = [];
  let row = 0;
  const top = 24;
  specs.forEach(a => {
    const tools = a.tools.filter(t => !ROUTER_TOOLS.has(t.name)).slice(0, 3);
    const know = a.knowledge.slice(0, Math.max(0, 3 - tools.length)).slice(0, 1);
    const items: GNode[] = [
      ...tools.map(t => ({ id: `${a.id}:${t.name}`, x: 690, y: 0, title: t.name, sub: toolInfo(t.name).sub + (t.on ? '' : ' · off'), icon: toolInfo(t.name).icon, kind: 'tool' as const, agent: a, tool: t.name })),
      ...know.map(k => ({ id: `${a.id}:k:${k}`, x: 690, y: 0, title: k, sub: 'Knowledge', icon: 'book' as IconName, kind: 'knowledge' as const, agent: a })),
    ];
    const start = row;
    if (!items.length) row++;
    items.forEach(it => { it.y = top + row * ROW; row++; nodes.push(it); edges.push([a.id, it.id, true]); });
    const ys = items.length ? items.map(i => i.y) : [top + start * ROW];
    nodes.push({ id: a.id, x: 430, y: ys.reduce((s, v) => s + v, 0) / ys.length, title: a.name, sub: `${a.model.replace('Claude ', '')} · ${a.runs} runs`, icon: 'bot', kind: 'agent', agent: a });
    edges.push([router.id, a.id, false]);
  });
  const human = router.tools.some(t => t.name === 'handoff_to_human' && t.on) ? tpl.urgent?.human || router.handoffs.find(h => !p.agents.some(a => a.name === h)) : undefined;
  if (human) {
    nodes.push({ id: 'human', x: 430, y: top + row * ROW + 8, title: human, sub: 'Person · paged for urgent issues', icon: 'user', kind: 'human' });
    edges.push([router.id, 'human', false]);
    row++;
  }
  const specYs = nodes.filter(n => n.kind === 'agent').map(n => n.y);
  const ry = specYs.length ? specYs.reduce((s, v) => s + v, 0) / specYs.length : top;
  nodes.push({ id: router.id, x: 200, y: ry, title: router.name, sub: `Router · ${router.model.replace('Claude ', '')}`, icon: 'network', kind: 'router', agent: router });
  const chans = Object.entries(p.chans).filter(([, v]) => v).map(([k]) => CHANNELS.find(c => c[0] === k)?.[1]).filter(Boolean);
  nodes.push({ id: 'channel', x: 0, y: ry, title: tpl.channel.title, sub: chans.join(' · ') || 'No channels on', icon: 'user', kind: 'channel' });
  edges.unshift(['channel', router.id, false]);
  const height = Math.max(480, top + row * ROW + 40);
  return { nodes, edges, height, router };
}

export function AgentsTab({ p, narrow, isFocus }: { p: Project; narrow: boolean; isFocus: boolean }) {
  const active = useApp(s => s.ui.active);
  const sel = useApp(s => s.ui.ws.agentSel);
  const insp = useApp(s => s.ui.ws.insp);
  const agentChat = useApp(s => s.ui.ws.agentChat);
  const g = useMemo(() => buildGraph(p), [p]);
  const paneRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = paneRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setScale(Math.min(1, Math.max(0.55, (el.clientWidth - 32) / 900))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const node = g.nodes.find(n => n.id === sel) || g.nodes.find(n => n.kind === 'router')!;
  const nodeMap = Object.fromEntries(g.nodes.map(n => [n.id, n]));
  const toolCount = p.agents.reduce((n, a) => n + a.tools.filter(t => !ROUTER_TOOLS.has(t.name)).length, 0);
  const knowCount = new Set(p.agents.flatMap(a => a.knowledge)).size;

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
      <div ref={paneRef} style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
        <div className="row" style={{ gap: 10, padding: '12px 18px', borderBottom: '1px solid var(--color-divider)', flexWrap: 'wrap' }}>
          <h4 style={{ margin: 0 }} className="nowrap">Agent graph</h4>
          <span style={{ fontSize: 12, opacity: 0.65 }}>{p.agents.length} agents · {toolCount} tools · {knowCount} knowledge source{knowCount === 1 ? '' : 's'}</span>
          <div className="grow" />
          {narrow && !isFocus && <button className="btn btn-ghost plain btn-sm" onClick={() => setWs({ agentChat: !agentChat })}><Icon name="sparkles" size={14} />{agentChat ? 'Hide chat' : 'Show chat'}</button>}
          <button className="btn btn-secondary btn-sm" onClick={() => { setWs({ input: 'Add an agent that ', paneHidden: false, agentChat: true }); focusComposer(); }}><Icon name="plus" size={14} />Add agent</button>
        </div>
        {!p.appReady ? (
          <div className="col" style={{ alignItems: 'center', gap: 10, padding: '80px 20px', opacity: 0.7, fontSize: 14 }}><Spinner />Agents appear here once the first build finishes.</div>
        ) : (
          <>
            <div style={{ width: 900 * scale, height: g.height * scale, margin: '24px auto', position: 'relative' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, width: 900, height: g.height, transform: `scale(${scale})`, transformOrigin: '0 0' }}>
                <svg width={900} height={g.height} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
                  {g.edges.map(([a, b, dashed], k) => {
                    const A = nodeMap[a], B = nodeMap[b];
                    if (!A || !B) return null;
                    const x1 = A.x + NW, y1 = A.y + NH / 2, x2 = B.x, y2 = B.y + NH / 2, mx = (x1 + x2) / 2;
                    const on = active.includes(a) && active.includes(b);
                    return <path key={k} d={`M${x1} ${y1}C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`} fill="none" stroke={on ? 'var(--color-accent)' : 'var(--color-divider)'} strokeWidth={on ? 2.2 : 1.3} strokeDasharray={dashed ? '4 4' : undefined} style={{ transition: 'stroke .3s' }} />;
                  })}
                </svg>
                {g.nodes.map(n => {
                  const on = active.includes(n.id), picked = node.id === n.id;
                  const solid = n.kind === 'agent' || n.kind === 'router' || n.kind === 'channel' || n.kind === 'human';
                  return (
                    <button key={n.id} onClick={() => setWs({ agentSel: n.id, insp: 'config' })} onDoubleClick={() => { if (n.agent && (n.kind === 'agent' || n.kind === 'router')) setWs({ editAgent: n.agent.id, edTab: 'build' }); }}
                      className="col" title={n.kind === 'agent' || n.kind === 'router' ? 'Click to inspect · double-click to edit' : n.title}
                      style={{ position: 'absolute', left: n.x, top: n.y, width: NW, height: NH, justifyContent: 'center', gap: 3, padding: '0 12px', textAlign: 'left', background: on ? 'color-mix(in srgb,var(--color-accent) 16%,var(--color-bg))' : 'var(--color-bg)', borderWidth: 1, borderColor: picked || on ? 'var(--color-accent)' : 'var(--color-divider)', borderStyle: solid ? 'solid' : 'dashed', borderRadius: solid ? 12 : 8, cursor: 'pointer', boxShadow: picked ? '0 0 0 3px color-mix(in srgb,var(--color-accent) 22%,transparent)' : 'none', transition: 'background .3s, border-color .3s', opacity: n.kind === 'tool' && n.sub.endsWith('off') ? 0.55 : 1 }}>
                      <div className="row" style={{ gap: 8, minWidth: 0 }}><span style={{ color: n.kind === 'human' ? '#f59e0b' : 'var(--color-accent)', display: 'flex' }}><Icon name={n.icon} size={15} /></span><span className="ellipsis" style={{ fontSize: n.kind === 'tool' || n.kind === 'knowledge' ? 13 : 15, fontWeight: 600, fontFamily: n.kind === 'tool' ? 'var(--font-mono)' : undefined }}>{n.title}</span></div>
                      <div className="ellipsis" style={{ fontSize: 11, opacity: 0.65 }}>{n.sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ textAlign: 'center', fontSize: 12, opacity: 0.6, paddingBottom: 20 }}>Send a test message and watch the run move through the graph. Double-click an agent to edit it.</div>
          </>
        )}
      </div>
      <div className="col" style={{ width: 320, flex: 'none', borderLeft: '1px solid var(--color-divider)', minHeight: 0 }}>
        <div className="row" style={{ gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--color-divider)' }}>
          <Seg value={insp} onChange={v => setWs({ insp: v })} options={[{ v: 'config', label: 'Configure' }, { v: 'test', label: 'Test run' }]} />
        </div>
        {insp === 'config' ? <Inspector p={p} node={node} /> : <TestRun p={p} />}
      </div>
    </div>
  );
}

function Inspector({ p, node }: { p: Project; node: GNode }) {
  const tpl = templateById(p.templateId);
  const a = node.agent && (node.kind === 'agent' || node.kind === 'router') ? node.agent : null;
  const kindLabel = { channel: 'Channel', router: 'Router', agent: 'Specialist', tool: 'Tool', knowledge: 'Knowledge', human: 'Human handoff' }[node.kind];
  return (
    <div className="col" style={{ flex: 1, overflow: 'auto', padding: 16, gap: 14 }}>
      <div><div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--color-accent)' }}>{kindLabel}</div><h3 style={{ margin: '2px 0 0', fontSize: 20 }} className="ellipsis">{node.title}</h3></div>
      {a && (
        <>
          <div className="field"><label>Model</label><select className="input" value={a.model} onChange={e => updateAgentLive(p.id, a.id, { model: e.target.value })}>{AGENT_MODELS.map(m => <option key={m}>{m}</option>)}</select></div>
          <div className="field"><label>Instructions</label><textarea className="input" value={a.instructions} onChange={e => updateAgentLive(p.id, a.id, { instructions: e.target.value })} style={{ minHeight: 150, fontSize: 13, lineHeight: 1.5 }} /></div>
          <div className="field"><label>Tools</label>
            <div className="col" style={{ gap: 6 }}>
              {a.tools.map((t, i) => (
                <button key={t.name} onClick={() => updateAgentLive(p.id, a.id, { tools: a.tools.map((x, j) => (j === i ? { ...x, on: !x.on } : x)) })} className="row" style={{ gap: 10, background: 'none', border: 0, padding: '2px 0', cursor: 'pointer', textAlign: 'left', opacity: t.on ? 1 : 0.6 }} role="checkbox" aria-checked={t.on}>
                  <span style={{ width: 16, height: 16, borderRadius: 4, border: '1px solid ' + (t.on ? 'var(--color-accent)' : 'var(--color-divider)'), background: t.on ? 'var(--color-accent)' : 'transparent', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{t.on && <Icon name="check" size={11} />}</span>
                  <span className="mono" style={{ fontSize: 12 }}>{t.name}</span>
                </button>
              ))}
              {a.tools.length === 0 && <span style={{ fontSize: 13, opacity: 0.6 }}>No tools. Add them in the editor.</span>}
            </div>
          </div>
          <div className="field"><label>Hands off to</label><div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>{a.handoffs.map(h => <span key={h} className="tag tag-outline">{h}</span>)}{a.handoffs.length === 0 && <span style={{ fontSize: 13, opacity: 0.6 }}>Nobody</span>}</div></div>
          <div className="row" style={{ gap: 10, fontSize: 13 }}><Switch on={a.memory} onChange={() => updateAgentLive(p.id, a.id, { memory: !a.memory })} label="Memory" />Remembers past conversations with each {tpl.channel.title.toLowerCase()}</div>
          <div style={{ fontSize: 12, opacity: 0.65, borderTop: '1px solid var(--color-divider)', paddingTop: 10 }}>Last 24h · {a.runs} runs · {a.kind === 'router' ? '0.6s' : '1.8s'} median · ${(a.runs * 0.0012).toFixed(2)}</div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-primary btn-sm grow" onClick={() => setWs({ editAgent: a.id, edTab: 'build' })}><Icon name="pencil" size={14} />Open editor</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setWs({ editAgent: a.id, edTab: 'play' })}><Icon name="play" size={14} />Try it</button>
            {a.kind === 'specialist' && <button className="ib" title={`Remove ${a.name}`} onClick={() => deleteAgent(p.id, a.id)}><Icon name="trash" size={15} /></button>}
          </div>
        </>
      )}
      {node.kind === 'tool' && node.agent && node.tool && (() => {
        const t = node.agent.tools.find(x => x.name === node.tool)!;
        return (
          <>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>{toolInfo(node.tool).desc}</p>
            <div className="row" style={{ gap: 10, fontSize: 13 }}><Switch on={t.on} onChange={() => updateAgentLive(p.id, node.agent!.id, { tools: node.agent!.tools.map(x => (x.name === t.name ? { ...x, on: !x.on } : x)) })} label="Enabled" />{t.on ? 'Enabled' : 'Disabled'} for {node.agent.name}</div>
            <div className="field"><label>Used by</label><div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>{p.agents.filter(x => x.tools.some(y => y.name === node.tool)).map(x => <span key={x.id} className="tag tag-outline">{x.name}</span>)}</div></div>
            <button className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => navigate({ name: 'settings', tab: 'integrations' })}><Icon name="settings" size={14} />Manage in Integrations</button>
          </>
        );
      })()}
      {node.kind === 'knowledge' && node.agent && (
        <>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>Indexed and searchable by {node.agent.name}. Agents cite the passage they used.</p>
          <button className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => navigate({ name: 'projectSettings', pid: p.id, page: 'knowledge' })}><Icon name="book" size={14} />Manage knowledge</button>
        </>
      )}
      {node.kind === 'channel' && (
        <>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>Where conversations come from. Every channel talks to the same agents, so history carries over.</p>
          {CHANNELS.map(([k, name, ic, desc]) => (
            <div key={k} className="row" style={{ gap: 10 }}>
              <Icon name={ic} size={15} style={{ opacity: 0.7 }} /><div className="grow"><div style={{ fontSize: 13.5, fontWeight: 500 }}>{name}</div><div style={{ fontSize: 12, opacity: 0.6 }}>{desc}</div></div>
              <Switch on={!!p.chans[k]} onChange={() => toggleChannel(p.id, k)} label={name} />
            </div>
          ))}
        </>
      )}
      {node.kind === 'human' && (
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>{node.title} gets paged with a summary when {p.agents[0].name} spots an emergency or an upset {tpl.channel.title.toLowerCase()}. Try “{tpl.urgent?.keywords[0] || 'emergency'}” in Test run.</p>
      )}
    </div>
  );
}

export function TestRun({ p, agentId, wide }: { p: Project; agentId?: string; wide?: boolean }) {
  const status = useApp(s => s.ui.typing['pg:' + p.id]);
  const [input, setInput] = useState('');
  const tpl = templateById(p.templateId);
  const ref = useStickToBottom<HTMLDivElement>([p.pg.length, status]);
  const send = (t: string) => { if (!t.trim() || status) return; sendPg(p.id, t, agentId); setInput(''); };
  const bubble = (u: boolean) => (u
    ? { alignSelf: 'flex-end', maxWidth: '85%', background: 'var(--color-text)', color: 'var(--color-bg)', padding: '7px 11px', borderRadius: 10, fontSize: 13, lineHeight: 1.45 }
    : { alignSelf: 'flex-start', maxWidth: '90%', background: 'var(--color-surface)', border: '1px solid var(--color-divider)', padding: '7px 11px', borderRadius: 10, fontSize: 13, lineHeight: 1.45 }) as React.CSSProperties;
  return (
    <>
      <div ref={ref} className="col" style={{ flex: 1, overflow: 'auto', padding: wide ? 20 : 16, gap: 12, ...(wide ? { maxWidth: 760, width: '100%', margin: '0 auto' } : {}) }}>
        <div className="row" style={{ gap: 8, fontSize: 13, opacity: 0.7, alignItems: 'flex-start' }}>
          <span className="grow">{agentId ? `Chat with ${p.agents.find(a => a.id === agentId)?.name} directly. Tool calls still run, so you can watch the whole path.` : `Talk to the whole system as a ${tpl.channel.title.toLowerCase()} would.`} Test runs are free.</span>
          {p.pg.length > 0 && <button className="link plain" style={{ fontSize: 12 }} onClick={() => clearPg(p.id)}>Clear</button>}
        </div>
        {p.pg.map((w, i) => <div key={i} style={bubble(w.r === 'u')}>{w.t}{w.trace && <div className="mono" style={{ fontSize: 10.5, marginTop: 6, color: 'var(--color-accent)' }}>{w.trace}</div>}</div>)}
        {status && <div className="row" style={{ gap: 8, fontSize: 12, color: 'var(--color-accent)' }}><Spinner size={12} />{status}</div>}
      </div>
      <div className="col" style={{ padding: 12, borderTop: wide ? 0 : '1px solid var(--color-divider)', gap: 8, ...(wide ? { maxWidth: 760, width: '100%', margin: '0 auto' } : {}) }}>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>{tpl.samples.map(s => <button key={s} className="chip" style={{ fontSize: 11.5, padding: '3px 9px', fontWeight: 400 }} disabled={!!status} onClick={() => send(s)}>{s}</button>)}</div>
        <form className="row" style={{ gap: 6 }} onSubmit={e => { e.preventDefault(); send(input); }}>
          <input className="input" value={input} onChange={e => setInput(e.target.value)} placeholder={`Message as a ${tpl.channel.title.toLowerCase()}…`} aria-label="Test message" style={{ fontSize: 13 }} />
          <button type="submit" className="btn btn-primary btn-icon" style={{ flex: 'none' }} disabled={!input.trim() || !!status} aria-label="Run"><Icon name="play" /></button>
        </form>
      </div>
    </>
  );
}
