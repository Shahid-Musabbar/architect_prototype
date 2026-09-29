import { Icon } from '../icons';
import { useApp, setWs } from '../store';
import { setPalette, startBuilding } from '../actions';
import { CODE_MODELS, MOCK_SCREENS, PALETTES } from '../data/constants';
import { templateById } from '../data/templates';
import { generateFiles } from '../lib/codegen';
import { cx } from '../lib/util';
import { focusComposer } from './Workspace';
import type { CSSProperties } from 'react';
import type { Project } from '../types';

export function PlanPanel({ p }: { p: Project }) {
  const view = useApp(s => s.ui.ws.planView);
  const ms = useApp(s => s.ui.ws.mockScreen);
  const building = useApp(s => !!s.ui.building[p.id]);
  const codeModel = useApp(s => s.codeModel);
  const P = p.planning!;
  const pal = PALETTES.find(x => x.id === p.palette) || PALETTES[0];
  const tpl = templateById(p.templateId);
  const a = P.answers;
  const build = a[0] || 'Use default Lyzr agents', gitAgent = /GitAgent/.test(build);
  const who = (a[1] || 'Managers and operators').toLowerCase(), where = a[2] || 'Web app', auto = a[3] || 'Act on low-risk work';
  const autoTxt = ({ 'Suggest only': 'agents draft every action and a person approves it', 'Act on low-risk work': 'agents handle routine work on their own and escalate anything unusual', 'Fully autonomous': 'agents act end to end, with every step in an audit log' } as Record<string, string>)[auto] || `agents follow your rule: "${auto}"`;
  const mult = (CODE_MODELS.find(x => x.id === codeModel) || CODE_MODELS[0]).mult;
  const credits = Math.max(1, Math.round(18 * mult));
  const nFiles = Object.keys(generateFiles(p)).length;
  const mk = { '--mk-bg': pal.bg, '--mk-surface': pal.surface, '--mk-ink': pal.ink, '--mk-muted': pal.muted, '--mk-accent': pal.accent, '--mk-on': pal.on, '--mk-soft': pal.soft, '--mk-line': pal.line, '--mk-head': pal.head, background: pal.bg, color: pal.ink, borderRadius: 12, border: '1px solid ' + pal.line, overflow: 'hidden', fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif', transition: 'background .25s,color .25s', maxWidth: 1100, margin: '0 auto' } as CSSProperties;
  const pill = (s: string): CSSProperties => ({ fontSize: 11.5, fontWeight: 600, padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap', background: s === 'Urgent' ? 'var(--mk-accent)' : 'var(--mk-soft)', color: s === 'Urgent' ? 'var(--mk-on)' : 'var(--mk-ink)' });
  const tab = (on: boolean): CSSProperties => ({ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderStyle: 'solid', borderWidth: '1px 1px 0', borderColor: on ? 'var(--color-divider)' : 'transparent', borderRadius: '10px 10px 0 0', background: on ? 'var(--color-bg)' : 'none', fontSize: 13.5, fontWeight: on ? 600 : 400, cursor: 'pointer', marginBottom: -1, opacity: on ? 1 : 0.65, whiteSpace: 'nowrap', flex: 'none' });
  const agents = p.agents.map((x, i) => ({ name: x.name, role: x.goal, model: x.model.replace('Claude ', ''), today: ['312 routed today', '86 tasks today', '140 answers today', '41 handled today', '12 handled today'][i % 5] }));

  return (
    <div data-tour="plan-panel" className="col" style={{ position: 'absolute', inset: 0, zIndex: 22, background: 'var(--color-panel)', minHeight: 0, overflow: 'hidden' }}>
      <div className="row" style={{ alignItems: 'flex-end', gap: 4, padding: '8px 10px 0', borderBottom: '1px solid var(--color-divider)', flex: 'none' }}>
        <button style={tab(view === 'plan')} onClick={() => setWs({ planView: 'plan' })}><Icon name="pin" size={14} />Plan</button>
        <button style={tab(view === 'mockup')} onClick={() => setWs({ planView: 'mockup' })}><Icon name="palette" size={14} />App Mockup</button>
        <div className="grow" />
        <div className="row" style={{ gap: 2, paddingBottom: 6 }}>
          <button className="btn btn-ghost plain btn-sm" onClick={() => { setWs({ input: 'Change the plan: ' }); focusComposer(); }}><Icon name="pencil" size={13} />Edit</button>
          <button className="ib" onClick={() => setWs({ planOpen: false })} title="Close plan"><Icon name="x" /></button>
        </div>
      </div>
      {view === 'plan' ? (
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          <div className="col" style={{ maxWidth: 760, margin: '0 auto', padding: '36px 32px 64px', gap: 18, fontSize: 15.5, lineHeight: 1.7 }}>
            <p style={{ margin: 0, fontSize: 17, opacity: 0.8 }}>I'll turn those choices into a focused plan for {who}, reached first through {where.toLowerCase()}, with a mockup of the main screens.</p>
            <h1 style={{ margin: '8px 0 0', fontSize: 34, lineHeight: 1.15 }}>{p.name}</h1>
            <h2 style={{ margin: '10px 0 0', fontSize: 22 }}>1. Overview</h2>
            <p style={{ margin: 0 }}>{p.name} is a multi-agent {tpl.app.toLowerCase()} for {who}. It started from your request, “{P.prompt}”, and centralises requests, tasks and handoffs so people can see what matters and act from one place.</p>
            <p style={{ margin: 0 }}>The first version runs as a {where.toLowerCase()}, and {autoTxt}. It uses data your team enters plus your uploaded documents, so it works before any deep integrations.</p>
            <div style={{ fontWeight: 600 }}>Core outcomes</div>
            <ul style={{ margin: 0, paddingLeft: 22 }}>{['Give people an immediate picture of what needs attention right now.', 'Turn incoming requests into a prioritised, assigned queue.', 'Let agents resolve routine work and hand off anything sensitive with full context.', "Produce a short AI briefing each morning from yesterday's activity."].map(o => <li key={o}>{o}</li>)}</ul>
            <h2 style={{ margin: '10px 0 0', fontSize: 22 }}>2. Agents</h2>
            <p style={{ margin: 0, opacity: 0.8 }}>{gitAgent ? 'Built with GitAgent (beta): each agent lives in its own GitHub repo, and the app ships as an AgenticOS workbench with home, journeys, wiki, skills and observe.' : 'Built on Lyzr agents: each agent lives in Lyzr Studio, where role, goal, instructions and model stay editable.'}</p>
            <div className="col" style={{ borderTop: '1px solid var(--color-divider)' }}>
              {agents.map(x => <div key={x.name} style={{ display: 'grid', gridTemplateColumns: 'minmax(120px,.8fr) minmax(0,2fr) auto', gap: 16, alignItems: 'baseline', padding: '12px 0', borderBottom: '1px solid var(--color-divider)', fontSize: 14.5 }}><span style={{ fontWeight: 600 }}>{x.name}</span><span style={{ opacity: 0.75, lineHeight: 1.5 }}>{x.role}</span><span className="tag tag-neutral">{x.model}</span></div>)}
            </div>
            <h2 style={{ margin: '10px 0 0', fontSize: 22 }}>3. Screens</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10 }}>
              {MOCK_SCREENS.map(([n, d], i) => <button key={n} className="card" onClick={() => setWs({ planView: 'mockup', mockScreen: i })} style={{ gap: 4, background: 'var(--color-surface)' }}><span style={{ fontSize: 12, opacity: 0.55 }}>Screen {i + 1}</span><span style={{ fontSize: 15, fontWeight: 600 }}>{n}</span><span style={{ fontSize: 13, opacity: 0.7, lineHeight: 1.45 }}>{d}</span></button>)}
            </div>
            <h2 style={{ margin: '10px 0 0', fontSize: 22 }}>4. Visual direction</h2>
            <p style={{ margin: 0, opacity: 0.75 }}>Pick a palette. The app mockup updates to match.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 10 }}>
              {PALETTES.map(x => {
                const on = x.id === pal.id;
                return (
                  <button key={x.id} onClick={() => setPalette(p.id, x.id)} aria-pressed={on} className="col" style={{ gap: 8, padding: 10, borderRadius: 12, border: '1px solid ' + (on ? 'var(--color-accent)' : 'var(--color-divider)'), background: 'var(--color-surface)', cursor: 'pointer', textAlign: 'left' }}>
                    <div className="row" style={{ height: 40, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(128,128,128,.25)' }}>{[x.bg, x.surface, x.accent, x.soft, x.ink].map((c, i) => <span key={i} style={{ flex: 1, height: '100%', background: c }} />)}</div>
                    <span className="row" style={{ justifyContent: 'space-between', fontSize: 13, fontWeight: 500 }}>{x.name}{on && <span style={{ color: 'var(--color-accent)', display: 'flex' }}><Icon name="check" size={14} /></span>}</span>
                  </button>
                );
              })}
            </div>
            <button className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setWs({ planView: 'mockup' })}><Icon name="palette" size={14} />See it in the app mockup</button>
            <h2 style={{ margin: '10px 0 0', fontSize: 22 }}>5. Data and integrations</h2>
            <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>{['Sign-in and roles', `Database: ${Object.keys(p.db).join(', ')}`, 'Knowledge base from your files', 'Email notifications', 'Audit log'].map(d => <span key={d} className="chip" style={{ cursor: 'default', fontWeight: 400 }}>{d}</span>)}</div>
            <h2 style={{ margin: '10px 0 0', fontSize: 22 }}>6. Not in the first version</h2>
            <ul style={{ margin: 0, paddingLeft: 22, opacity: 0.8 }}>{['Integrations with existing systems (planned for v2)', 'Multiple locations or workspaces', 'Voice calls', 'Billing and payments'].map(o => <li key={o}>{o}</li>)}</ul>
            {P.notes.length > 0 && (<><h2 style={{ margin: '10px 0 0', fontSize: 22 }}>Your notes</h2><ul style={{ margin: 0, paddingLeft: 22 }}>{P.notes.map((o, i) => <li key={i}>{o}</li>)}</ul></>)}
            <div className="row" style={{ gap: 12, flexWrap: 'wrap', borderTop: '1px solid var(--color-divider)', paddingTop: 18, marginTop: 6 }}>
              <span className="grow" style={{ fontSize: 13.5, opacity: 0.7, minWidth: 200 }}>Estimated first build: about {credits} credits · {nFiles} files · {p.agents.length} agents</span>
              <button className="btn btn-primary btn-sm" disabled={building} onClick={() => startBuilding(p.id)}><Icon name="hammer" size={14} />Start building</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="col" style={{ flex: 1, minHeight: 0 }}>
          <div className="row" style={{ gap: 10, padding: '8px 12px', borderBottom: '1px solid var(--color-divider)', flexWrap: 'wrap', flex: 'none' }}>
            <div className="pills">{MOCK_SCREENS.map(([n], i) => <button key={n} className={cx(ms === i && 'on')} onClick={() => setWs({ mockScreen: i })}>{i + 1} · {n}</button>)}</div>
            <div className="grow" />
            <span style={{ fontSize: 12, opacity: 0.6 }}>Palette</span>
            <div data-tour="mockup-palette" className="row" style={{ gap: 6 }}>{PALETTES.map(x => <button key={x.id} title={x.name} onClick={() => setPalette(p.id, x.id)} style={{ width: 26, height: 26, borderRadius: '50%', padding: 0, border: x.id === pal.id ? '2px solid var(--color-accent)' : '1px solid var(--color-divider)', overflow: 'hidden', display: 'flex', cursor: 'pointer', background: 'none', transform: 'rotate(45deg)' }}><span style={{ flex: 1, background: x.bg }} /><span style={{ flex: 1, background: x.accent }} /></button>)}</div>
            <button className="btn btn-primary btn-sm" disabled={building} onClick={() => startBuilding(p.id)}><Icon name="hammer" size={14} />Start building</button>
          </div>
          <div style={{ flex: 1, overflow: 'auto', minHeight: 0, padding: 16, background: 'var(--color-surface)' }}>
            <div style={mk}>
              <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--mk-line)', fontSize: 13.5, fontWeight: 600, background: 'var(--mk-surface)' }}>Screen {ms + 1} of 4 · {MOCK_SCREENS[ms][0]} · <span style={{ fontWeight: 400, color: 'var(--mk-muted)' }}>{MOCK_SCREENS[ms][1]}</span></div>
              {ms === 0 && (
                <div className="row" style={{ minHeight: 560, justifyContent: 'center', padding: '48px 24px' }}>
                  <div className="col" style={{ width: '100%', maxWidth: 420, gap: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.18em', color: 'var(--mk-accent)' }}>TEAM PORTAL</div>
                    <div style={{ fontFamily: 'var(--mk-head)', fontSize: 38, fontWeight: 700, lineHeight: 1.1 }}>Welcome to {p.name}</div>
                    <div style={{ color: 'var(--mk-muted)', fontSize: 15 }}>Sign in to your live operations workspace.</div>
                    <div className="row" style={{ borderBottom: '1px solid var(--mk-line)', marginTop: 6 }}><span style={{ padding: '10px 24px', borderBottom: '2px solid var(--mk-accent)', color: 'var(--mk-accent)', fontWeight: 600 }}>Log in</span><span style={{ padding: '10px 24px', color: 'var(--mk-muted)', fontWeight: 600 }}>Sign up</span></div>
                    <div className="col" style={{ gap: 6 }}><span style={{ fontSize: 13, fontWeight: 600 }}>Work email</span><div style={{ padding: '12px 14px', border: '1px solid var(--mk-line)', borderRadius: 8, background: 'var(--mk-surface)', color: 'var(--mk-muted)', fontSize: 14 }}>alex.morgan@company.com</div></div>
                    <div className="col" style={{ gap: 6 }}><span style={{ fontSize: 13, fontWeight: 600 }}>Password</span><div style={{ padding: '12px 14px', border: '1px solid var(--mk-line)', borderRadius: 8, background: 'var(--mk-surface)', fontSize: 14, letterSpacing: '.2em' }}>••••••••••</div></div>
                    <div style={{ padding: 13, borderRadius: 8, background: 'var(--mk-accent)', color: 'var(--mk-on)', textAlign: 'center', fontWeight: 600, fontSize: 14 }}>Log in</div>
                    <div style={{ padding: 12, borderRadius: 8, border: '1px solid var(--mk-line)', textAlign: 'center', fontSize: 14, background: 'var(--mk-surface)' }}>Continue with Google</div>
                  </div>
                </div>
              )}
              {ms === 1 && (
                <div style={{ display: 'grid', gridTemplateColumns: '180px minmax(0,1fr)', minHeight: 560 }}>
                  <div className="col" style={{ borderRight: '1px solid var(--mk-line)', padding: '18px 12px', gap: 4, background: 'var(--mk-surface)' }}>
                    <div style={{ fontFamily: 'var(--mk-head)', fontWeight: 700, fontSize: 17, padding: '0 8px 14px' }}>{p.name}</div>
                    {['Overview', 'Queue', 'Conversations', 'Agents', 'Reports'].map((l, i) => <div key={l} style={{ padding: '8px 10px', borderRadius: 8, fontSize: 13.5, background: i === 0 ? 'var(--mk-soft)' : 'none', color: i === 0 ? 'var(--mk-accent)' : 'var(--mk-ink)', fontWeight: i === 0 ? 600 : 400 }}>{l}</div>)}
                  </div>
                  <div className="col" style={{ padding: 24, gap: 18, minWidth: 0 }}>
                    <div><div style={{ fontFamily: 'var(--mk-head)', fontSize: 26, fontWeight: 700 }}>Good morning, Alex</div><div style={{ color: 'var(--mk-muted)', fontSize: 14 }}>Tuesday · 3 items need you before 10:00</div></div>
                    <div className="col" style={{ padding: '16px 18px', borderRadius: 12, background: 'var(--mk-soft)', gap: 6 }}><span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.14em', color: 'var(--mk-accent)' }}>AI BRIEFING</span><span style={{ fontSize: 14.5, lineHeight: 1.55 }}>Overnight the agents closed 41 requests. Two escalations are waiting on you, and volume is 18% above a normal Tuesday — consider moving one person to the morning queue.</span></div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 12 }}>{[['Open requests', '27'], ['Resolved by agents', '41'], ['Avg. response', '38s']].map(([l, v]) => <div key={l} style={{ padding: '14px 16px', border: '1px solid var(--mk-line)', borderRadius: 12, background: 'var(--mk-surface)' }}><div style={{ fontSize: 12.5, color: 'var(--mk-muted)' }}>{l}</div><div style={{ fontFamily: 'var(--mk-head)', fontSize: 26, fontWeight: 700 }}>{v}</div></div>)}</div>
                    <div style={{ border: '1px solid var(--mk-line)', borderRadius: 12, background: 'var(--mk-surface)', overflow: 'hidden' }}>
                      <div style={{ padding: '12px 16px', fontWeight: 600, fontSize: 14, borderBottom: '1px solid var(--mk-line)' }}>Priority queue</div>
                      {[[tpl.samples[0], p.agents[1]?.name || 'Operations agent', 'Urgent'], ['Refund request over limit', 'Escalation', 'Needs you'], ['Supplier delivery delayed to 3pm', p.agents[1]?.name || 'Operations agent', 'In progress'], ['Weekly summary for leadership', p.agents[2]?.name || 'Knowledge agent', 'Drafted']].map(([t, w, s]) => <div key={t} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto auto', gap: 14, alignItems: 'center', padding: '11px 16px', borderBottom: '1px solid var(--mk-line)', fontSize: 13.5 }}><span className="ellipsis">{t}</span><span style={{ color: 'var(--mk-muted)', fontSize: 12.5 }}>{w}</span><span style={pill(s)}>{s}</span></div>)}
                    </div>
                  </div>
                </div>
              )}
              {ms === 2 && (
                <div style={{ display: 'grid', gridTemplateColumns: '240px minmax(0,1fr)', minHeight: 560 }}>
                  <div className="col" style={{ borderRight: '1px solid var(--mk-line)', background: 'var(--mk-surface)' }}>
                    <div style={{ padding: 16, fontWeight: 700, fontFamily: 'var(--mk-head)', fontSize: 17 }}>Conversations</div>
                    {[['Jordan Lee', 'Perfect, thank you.'], ['Priya Shah', 'Can I move my booking to Friday?'], ['Sam Ortiz', "What's the late fee?"], ['Mei Chen', "The wifi password isn't working"]].map(([w, l], i) => <div key={w} className="col" style={{ gap: 2, padding: '10px 16px', borderLeft: '3px solid ' + (i === 0 ? 'var(--mk-accent)' : 'transparent'), background: i === 0 ? 'var(--mk-soft)' : 'none', minWidth: 0 }}><span style={{ fontWeight: 600, fontSize: 13.5 }}>{w}</span><span className="ellipsis" style={{ fontSize: 12.5, color: 'var(--mk-muted)' }}>{l}</span></div>)}
                  </div>
                  <div className="col" style={{ padding: 22, gap: 12, minWidth: 0 }}>
                    <div style={{ alignSelf: 'flex-start', maxWidth: '75%', padding: '10px 14px', borderRadius: 12, background: 'var(--mk-surface)', border: '1px solid var(--mk-line)', fontSize: 14 }}>{tpl.samples[0]}</div>
                    <div className="mono" style={{ fontSize: 12, color: 'var(--mk-accent)' }}>{p.agents[0]?.name} → {p.agents[1]?.name} · {p.agents[1]?.tools.find(t => t.on)?.name || 'reply'}</div>
                    <div style={{ alignSelf: 'flex-end', maxWidth: '75%', padding: '10px 14px', borderRadius: 12, background: 'var(--mk-accent)', color: 'var(--mk-on)', fontSize: 14 }}>{(p.agents[1]?.reply || tpl.fallback).replace(/\{wo\}|\{id\}/g, '4821')}</div>
                    <div style={{ alignSelf: 'flex-start', maxWidth: '75%', padding: '10px 14px', borderRadius: 12, background: 'var(--mk-surface)', border: '1px solid var(--mk-line)', fontSize: 14 }}>Perfect, thank you.</div>
                    <div style={{ marginTop: 'auto', padding: '12px 14px', border: '1px solid var(--mk-line)', borderRadius: 10, background: 'var(--mk-surface)', color: 'var(--mk-muted)', fontSize: 14 }}>Reply or take over from the agent…</div>
                  </div>
                </div>
              )}
              {ms === 3 && (
                <div className="col" style={{ padding: 24, gap: 18, minHeight: 560 }}>
                  <div style={{ fontFamily: 'var(--mk-head)', fontSize: 26, fontWeight: 700 }}>Agents and approvals</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>{agents.map(x => <div key={x.name} className="col" style={{ padding: '14px 16px', border: '1px solid var(--mk-line)', borderRadius: 12, background: 'var(--mk-surface)', gap: 4 }}><span className="row" style={{ gap: 8, fontWeight: 600, fontSize: 14 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--mk-accent)' }} />{x.name}</span><span style={{ fontSize: 12.5, color: 'var(--mk-muted)' }}>{x.today}</span></div>)}</div>
                  <div style={{ border: '1px solid var(--mk-line)', borderRadius: 12, background: 'var(--mk-surface)', overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', fontWeight: 600, fontSize: 14, borderBottom: '1px solid var(--mk-line)' }}>Waiting for your approval</div>
                    {[['Issue a $180 refund for a double charge', 'Proposed by an agent · 4 min ago'], ['Send a service-recovery voucher to a VIP', 'Proposed by Escalation · 12 min ago']].map(([t, by]) => <div key={t} className="row" style={{ gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--mk-line)', fontSize: 13.5, flexWrap: 'wrap' }}><div className="col grow" style={{ minWidth: 200, gap: 2 }}><span>{t}</span><span style={{ fontSize: 12, color: 'var(--mk-muted)' }}>{by}</span></div><span style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid var(--mk-line)', fontSize: 12.5 }}>Decline</span><span style={{ padding: '6px 12px', borderRadius: 7, background: 'var(--mk-accent)', color: 'var(--mk-on)', fontSize: 12.5, fontWeight: 600 }}>Approve</span></div>)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
