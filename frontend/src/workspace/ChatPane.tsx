import { useState } from 'react';
import { Icon } from '../icons';
import { useApp, setWs, setState } from '../store';
import { answerPlanQ, approvePlan, currentChatTitle, deleteChat, dismissPlan, navigate, newChat, noteLabel, openChat, retryMsg, saveNotes, selectPlanOption, setFeedback, skipPlanning, startBuilding, toast } from '../actions';
import { Popover, Spinner, useStickToBottom } from '../components/ui';
import { PLAN_QS } from '../data/constants';
import { templateById } from '../data/templates';
import { ago, copyText, cx } from '../lib/util';
import { Composer } from './Composer';
import { focusComposer } from './Workspace';
import type { Msg, Project } from '../types';

export function ChatPane({ p, isFocus, onGrip }: { p: Project; isFocus: boolean; onGrip: (e: React.PointerEvent) => void }) {
  const building = useApp(s => !!s.ui.building[p.id]);
  const focusThread = useApp(s => s.ui.ws.focusThread);
  const side = useApp(s => s.paneSide);
  const notes = useApp(s => s.ui.ws.notes);
  const batchOpen = useApp(s => s.ui.ws.batchOpen);
  const exp = useApp(s => s.exp);
  const lastSteps = p.msgs[p.msgs.length - 1]?.steps?.map(s => s.st).join('');
  const ref = useStickToBottom<HTMLDivElement>([p.msgs.length, lastSteps, p.msgs[p.msgs.length - 1]?.text]);
  const showThread = !isFocus || focusThread;
  const planning = !!p.planning && !p.appReady;

  return (
    <>
      <div className="row" style={{ gap: 6, padding: '2px 8px 6px 10px', flex: 'none' }}>
        <button onPointerDown={onGrip} title="Drag to move the chat to the other side" className="row" style={{ gap: 6, background: 'none', border: 0, cursor: 'grab', padding: '4px 6px 4px 0', opacity: 0.55, touchAction: 'none' }}><Icon name="grip" size={15} /><span style={{ fontSize: 12 }}>Chat</span></button>
        {building && <span className="row" style={{ gap: 6, fontSize: 12, color: 'var(--color-accent)' }}><Spinner size={12} />Working</span>}
        {planning && <span className="row" style={{ gap: 5, fontSize: 12, padding: '2px 9px', borderRadius: 999, background: 'color-mix(in srgb,var(--color-accent) 16%,transparent)', color: 'var(--color-accent-700)', whiteSpace: 'nowrap' }}><Icon name="bulb" size={13} />Planning mode</span>}
        <div className="grow" />
        {isFocus && <button className="btn btn-ghost plain btn-sm" onClick={() => setWs({ focusThread: !focusThread })}>{focusThread ? 'Collapse' : 'Show thread'}</button>}
        <ChatsMenu p={p} />
        {!isFocus && <button className="ib sm" onClick={() => setWs({ paneHidden: true })} title="Collapse chat"><Icon name={side === 'left' ? 'chevronLeft' : 'chevronRight'} size={15} /></button>}
        {!isFocus && <button data-tour="chat-swap-side" className="ib sm" onClick={() => { const s2 = side === 'left' ? 'right' : 'left'; setState({ paneSide: s2 }); toast(`Chat moved to the ${s2}`); }} title={side === 'left' ? 'Move chat to the right' : 'Move chat to the left'}><Icon name="swap" size={15} /></button>}
      </div>

      {showThread && (
        <div ref={ref} className="col" style={{ flex: 1, overflow: 'auto', padding: '4px 16px 16px', gap: 20, minHeight: 0 }} aria-live="polite">
          {p.msgs.length === 0 && <EmptyThread p={p} />}
          {p.msgs.map((m, i) => <MsgView key={m.id} p={p} m={m} pro={exp === 'pro'} last={i === p.msgs.length - 1} canRetry={(() => { const u = p.msgs.slice(0, i).reverse().find(x => x.role === 'user'); return !!u && !u.notes && !u.ctx; })()} />)}
        </div>
      )}

      <div className="col" style={{ padding: '8px 10px 10px', gap: 8, flex: 'none', position: 'relative' }}>
        {planning && p.planning!.ready && (
          <div className="row" style={{ gap: 10, border: '1px solid var(--color-divider)', borderRadius: 14, padding: 8, background: 'var(--color-surface)' }}>
            <button onClick={() => setWs({ planOpen: true })} title="Open plan" className="row grow" style={{ gap: 10, background: 'none', border: 0, cursor: 'pointer', padding: 0, textAlign: 'left' }}>
              <span style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--color-neutral-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Icon name="listTodo" /></span>
              <span className="ellipsis" style={{ fontSize: 14 }}><strong style={{ fontWeight: 600 }}>{p.name}</strong><span style={{ opacity: 0.6 }}> · Plan</span></span>
            </button>
            <button className="btn btn-primary btn-sm" disabled={building} onClick={() => startBuilding(p.id)}><Icon name="hammer" size={14} />Start building</button>
          </div>
        )}
        {notes.length > 0 && (
          <div style={{ border: '1px solid color-mix(in srgb,var(--color-accent) 50%,transparent)', borderRadius: 12, background: 'var(--color-surface)' }}>
            <div className="row" style={{ gap: 8, padding: '8px 10px' }}>
              <button onClick={() => setWs({ batchOpen: !batchOpen })} className="row" style={{ gap: 6, background: 'none', border: 0, fontSize: 13, cursor: 'pointer', padding: 0 }} aria-expanded={batchOpen}>{notes.length} note{notes.length > 1 ? 's' : ''} ready to apply<Icon name={batchOpen ? 'chevronDown' : 'chevronUp'} size={14} /></button>
              <div className="grow" />
              <button className="ib sm" onClick={() => setWs({ notes: [] })} title="Discard notes"><Icon name="trash" size={14} /></button>
              <button className="btn btn-primary btn-sm" disabled={building} onClick={() => saveNotes(p.id)}>Apply changes · 1 credit</button>
            </div>
            {batchOpen && (
              <div className="col" style={{ borderTop: '1px solid var(--color-divider)', padding: '8px 10px', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
                {notes.map(n => (
                  <div key={n.id} className="row" style={{ gap: 8, alignItems: 'baseline', fontSize: 13 }}>
                    <span className="tag tag-accent">{noteLabel(n)}</span><span className="grow">{n.text}</span>
                    <button className="ib sm" style={{ width: 20, height: 20 }} onClick={() => setWs(w => ({ notes: w.notes.filter(x => x.id !== n.id) }))} aria-label="Remove note"><Icon name="x" size={12} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <Composer p={p} />
      </div>
    </>
  );
}

function EmptyThread({ p }: { p: Project }) {
  const tpl = templateById(p.templateId);
  const ideas = p.appReady
    ? ['Make the headline shorter', `Add an agent that handles ${tpl.id === 'concierge' ? 'noise complaints' : 'refund disputes'}`, 'Switch the website to dark mode', 'How does routing work?']
    : [];
  return (
    <div className="col" style={{ gap: 12, padding: '24px 4px', opacity: 0.9 }}>
      <div style={{ fontSize: 15, fontWeight: 600 }}>{p.appReady ? `What should change in ${p.name}?` : 'Describe your app to get started'}</div>
      <div style={{ fontSize: 13.5, opacity: 0.65, lineHeight: 1.55 }}>Ask for changes in plain language, or turn on Select and click anything in the preview to leave a note.</div>
      <div className="col" style={{ gap: 6 }}>
        {ideas.map(t => <button key={t} className="chip" style={{ alignSelf: 'flex-start', fontWeight: 400 }} onClick={() => { setWs({ input: t }); focusComposer(); }}><Icon name="sparkles" size={13} />{t}</button>)}
      </div>
    </div>
  );
}

function ChatsMenu({ p }: { p: Project }) {
  const [open, setOpen] = useState(false);
  const turns = p.msgs.length;
  const list = [{ id: p.chatId, title: currentChatTitle(p), n: turns, ts: Date.now(), current: true }, ...p.chats.filter(c => c.id !== p.chatId).map(c => ({ id: c.id, title: c.title, n: c.msgs.length, ts: c.ts, current: false }))];
  return (
    <Popover open={open} onClose={() => setOpen(false)} style={{ right: 0, top: 34, width: 310 }} anchor={<button className="ib sm" onClick={() => setOpen(!open)} title="Chats"><Icon name="msgPlus" size={16} /></button>}>
      <div className="menu-pad" style={{ borderBottom: '1px solid var(--color-divider)' }}>
        <button className="mi" style={{ alignItems: 'flex-start', whiteSpace: 'normal' }} onClick={() => { setOpen(false); newChat(p.id, true); }}>
          <span style={{ display: 'flex', marginTop: 2, color: 'var(--color-accent)' }}><Icon name="sparkles" size={15} /></span>
          <span className="col" style={{ gap: 1 }}><span style={{ fontWeight: 500 }}>New chat with summary</span><span style={{ fontSize: 12, opacity: 0.6 }}>Carries ~1.4k tokens instead of ~{Math.round(14 + turns * 6.5)}k from this chat</span></span>
        </button>
        <button className="mi" style={{ alignItems: 'flex-start', whiteSpace: 'normal' }} onClick={() => { setOpen(false); newChat(p.id, false); }}>
          <span style={{ display: 'flex', marginTop: 2, opacity: 0.7 }}><Icon name="plus" size={15} /></span>
          <span className="col" style={{ gap: 1 }}><span style={{ fontWeight: 500 }}>Blank new chat</span><span style={{ fontSize: 12, opacity: 0.6 }}>Start fresh; the project and code stay as they are</span></span>
        </button>
      </div>
      <div className="menu-label" style={{ padding: '10px 16px 4px' }}>CONVERSATIONS</div>
      <div style={{ maxHeight: 260, overflowY: 'auto', padding: '0 6px 6px' }}>
        {list.map(c => (
          <div key={c.id} className={cx('mi', c.current && 'active')} style={{ cursor: 'pointer' }} role="button" tabIndex={0} onClick={() => { setOpen(false); if (!c.current) openChat(p.id, c.id); }}>
            <span className="col grow" style={{ gap: 1, minWidth: 0 }}><span className="ellipsis">{c.title}</span><span style={{ fontSize: 12, opacity: 0.55 }}>{c.n} turns · {c.current ? 'current' : ago(c.ts)}</span></span>
            {c.current ? <span style={{ display: 'flex', color: 'var(--color-accent)' }}><Icon name="check" size={14} /></span> : <button className="ib sm" title="Delete chat" onClick={e => { e.stopPropagation(); deleteChat(p.id, c.id); }}><Icon name="trash" size={13} /></button>}
          </div>
        ))}
      </div>
    </Popover>
  );
}

function StepIcon({ st }: { st: number }) {
  if (st === 2) return <Icon name="check" size={12} />;
  if (st === 1) return <Spinner size={12} />;
  return <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', opacity: 0.6 }} />;
}

function MsgView({ p, m, pro, last, canRetry }: { p: Project; m: Msg; pro: boolean; last: boolean; canRetry: boolean }) {
  if (m.role === 'user') {
    return (
      <div className="col" style={{ alignSelf: 'flex-end', maxWidth: '88%', borderRadius: 14, padding: '10px 14px', fontSize: 14, lineHeight: 1.55, background: 'var(--color-surface)', gap: 6 }}>
        <span style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{m.text}</span>
        {m.ctx?.map((c, i) => (
          <div key={i} className="col" style={{ border: '1px solid var(--color-divider)', borderRadius: 9, overflow: 'hidden', background: 'var(--color-panel)' }}>
            <button className="row" onClick={() => setWs({ tab: 'code', file: c.file })} style={{ gap: 6, padding: '5px 9px', fontSize: 12, opacity: 0.75, borderBottom: '1px solid var(--color-divider)', background: 'none', border: 0, cursor: 'pointer', textAlign: 'left' }}><Icon name="file" size={13} /><span className="mono">{c.file.split('/').pop()} ({c.from === c.to ? 'line ' + c.from : `lines ${c.from}–${c.to}`})</span></button>
            <pre className="mono" style={{ margin: 0, padding: '8px 10px', fontSize: 11.5, lineHeight: 1.55, maxHeight: 120, overflow: 'auto', whiteSpace: 'pre' }}>{c.text}</pre>
          </div>
        ))}
        {m.notes?.map(n => <div key={n.id} className="row" style={{ gap: 8, fontSize: 13, alignItems: 'baseline' }}><span className="tag tag-accent">{noteLabel(n)}</span><span>{n.text}</span></div>)}
        {m.attachments && <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>{m.attachments.map(a => <span key={a} className="tag tag-neutral"><Icon name="clip" size={11} />{a}</span>)}</div>}
      </div>
    );
  }
  const q = m.q ? PLAN_QS[m.q.qi] : null;
  const qOpen = !!m.q && m.q.picked === null && !!p.planning && !p.planning.ready;
  return (
    <div className="col" style={{ gap: 10, fontSize: 14.5, lineHeight: 1.65 }}>
      {m.steps && m.steps.length > 0 && (
        <div className="col" style={{ gap: 7, border: '1px solid var(--color-divider)', borderRadius: 12, padding: '10px 12px', background: 'var(--color-panel)' }}>
          {m.steps.map((s, i) => (
            <div key={i} className="row" style={{ gap: 8, fontSize: 13, opacity: s.st === 0 ? 0.4 : 1, color: s.st === 1 ? 'var(--color-accent)' : 'inherit' }}>
              <span style={{ width: 14, display: 'flex', justifyContent: 'center', color: 'var(--color-accent)' }}><StepIcon st={s.st} /></span>
              <span className={pro ? 'mono' : ''} style={pro ? { fontSize: 12 } : undefined}>{pro ? s.l[0] : s.l[1]}</span>
            </div>
          ))}
        </div>
      )}
      {m.summary && (
        <div className="col" style={{ border: '1px solid var(--color-divider)', borderRadius: 12, padding: '12px 14px', gap: 8, background: 'var(--color-panel)' }}>
          <div className="row" style={{ gap: 8, fontSize: 12.5 }}><span style={{ display: 'flex', color: 'var(--color-accent)' }}><Icon name="sparkles" size={14} /></span><span style={{ fontWeight: 600 }} className="ellipsis">Carried over from “{m.summary.from}”</span><span style={{ marginLeft: 'auto', opacity: 0.55 }} className="nowrap">{m.summary.tokens}</span></div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, lineHeight: 1.55 }}>{m.summary.points.map(x => <li key={x}>{x}</li>)}</ul>
        </div>
      )}
      {m.text && <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{m.text}</div>}
      {m.q && q && (
        <div className="col" style={{ gap: 8 }}>
          <div style={{ fontWeight: 500 }}>{q.t}{q.link && <> <button className="link plain" style={{ opacity: 1, fontWeight: 600, textDecoration: 'underline' }} onClick={() => toast('GitAgent keeps each agent in its own GitHub repo, framework-agnostic')}>{q.link}</button></>}</div>
          {q.o.map(([label, desc], oi) => {
            const on = qOpen && q.confirm ? m.q!.sel === oi : m.q!.picked === oi;
            return (
              <button key={label} disabled={!qOpen} onClick={() => { if (q.confirm) selectPlanOption(p.id, m.id, oi); else answerPlanQ(p.id, m.id, oi); }} className="row"
                style={{ alignItems: 'flex-start', gap: 12, padding: '12px 14px', borderRadius: 12, border: '1px solid ' + (on ? 'var(--color-text)' : 'var(--color-divider)'), background: on ? 'var(--color-surface)' : 'none', cursor: qOpen ? 'pointer' : 'default', opacity: !qOpen && !on ? 0.5 : 1, width: '100%', textAlign: 'left' }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', flex: 'none', marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', border: on ? 0 : '1.5px solid color-mix(in srgb,currentColor 40%,transparent)', background: on ? 'var(--color-accent)' : 'none', color: '#fff' }}>{on && <Icon name="check" size={12} />}</span>
                <span className="col" style={{ gap: 2, minWidth: 0 }}><span style={{ fontSize: 14, fontWeight: 500 }}>{label}</span><span style={{ fontSize: 12.5, opacity: 0.65, lineHeight: 1.4 }}>{desc}</span></span>
              </button>
            );
          })}
          {m.q.picked === -1 && m.q.custom && <div className="row" style={{ gap: 8, fontSize: 13, opacity: 0.75 }}><Icon name="pencil" size={13} />Your answer: {m.q.custom}</div>}
          {qOpen && q.confirm && <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start', marginTop: 4 }} onClick={() => answerPlanQ(p.id, m.id, m.q!.sel)}>Continue<Icon name="arrowRight" size={14} /></button>}
          {qOpen && (
            <div className="row" style={{ gap: 14 }}>
              {!q.confirm && <button className="link plain" style={{ fontSize: 12.5, textDecoration: 'underline' }} onClick={() => answerPlanQ(p.id, m.id, q.o.length > 2 ? 1 : 0)}>Skip, you decide</button>}
              <button className="link plain" style={{ fontSize: 12.5, textDecoration: 'underline' }} onClick={() => skipPlanning(p.id)}>Skip questions and build now</button>
            </div>
          )}
        </div>
      )}
      {m.plan && (
        <div className="col" style={{ border: '1px solid var(--color-divider)', borderRadius: 12, padding: 14, gap: 8, background: 'var(--color-panel)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.6 }}>Proposed plan</div>
          {m.plan.map((t, i) => <div key={i} className="row" style={{ gap: 10, fontSize: 13.5, alignItems: 'baseline' }}><span style={{ color: 'var(--color-accent)' }} className="mono">{String(i + 1).padStart(2, '0')}</span>{t}</div>)}
          {m.planPending && (
            <div className="row" style={{ gap: 8, marginTop: 4 }}>
              <button className="btn btn-primary btn-sm" onClick={() => approvePlan(p.id, m.id)}>Build this plan</button>
              <button className="btn btn-ghost plain btn-sm" onClick={() => { dismissPlan(p.id, m.id); focusComposer(); }}>Edit in chat</button>
            </div>
          )}
        </div>
      )}
      {m.cta && <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => navigate(m.cta!.to === 'pricing' ? { name: 'pricing' } : { name: 'settings', tab: 'usage' })}><Icon name="zap" size={14} />{m.cta.label}</button>}
      {m.text && !m.q && (m.version || m.feedback || last) && !(m.steps && m.steps.some(s => s.st !== 2)) && (
        <div className="row" style={{ gap: 2, marginLeft: -6 }}>
          <button className="ib" onClick={() => copyText(m.text || '').then(() => toast('Copied'))} title="Copy"><Icon name="copy" size={15} /></button>
          <button className={cx('ib', m.feedback === 'up' && 'on')} onClick={() => setFeedback(p.id, m.id, 'up')} title="Good response" aria-pressed={m.feedback === 'up'}><Icon name="thumbUp" size={15} /></button>
          <button className={cx('ib', m.feedback === 'down' && 'on')} onClick={() => setFeedback(p.id, m.id, 'down')} title="Bad response" aria-pressed={m.feedback === 'down'}><Icon name="thumbDown" size={15} /></button>
          {m.version && m.steps && canRetry && m.version > 1 && <button className="ib" onClick={() => retryMsg(p.id, m.id)} title="Run this request again"><Icon name="refresh" size={15} /></button>}
          {m.version && <button onClick={() => setWs({ tab: 'history', editAgent: null })} title="Open version history" className="row" style={{ gap: 6, background: 'none', border: 0, fontSize: 12, opacity: 0.55, cursor: 'pointer', marginLeft: 6 }}><Icon name="history" size={14} />v{m.version}{m.version === p.current ? ' · current' : ''}</button>}
        </div>
      )}
    </div>
  );
}
