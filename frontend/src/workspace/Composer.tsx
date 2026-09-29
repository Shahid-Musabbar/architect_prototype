import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon, type IconName } from '../icons';
import { useApp, setWs, setUi } from '../store';
import { addNote, duplicateProject, navigate, newChat, sendChat, startBuilding, stopBuild, toast } from '../actions';
import { Popover, Ring, useDictation } from '../components/ui';
import { ModelPicker } from '../components/ModelPicker';
import { CODE_MODELS, QUICK, SEL_LABELS, planCredits } from '../data/constants';
import { generateFiles } from '../lib/codegen';
import { cx } from '../lib/util';
import type { Project } from '../types';

export function Composer({ p }: { p: Project }) {
  const input = useApp(s => s.ui.ws.input);
  const selectMode = useApp(s => s.ui.ws.selectMode);
  const selected = useApp(s => s.ui.ws.selected);
  const codeCtx = useApp(s => s.ui.ws.codeCtx);
  const attachments = useApp(s => s.ui.ws.attachments);
  const planMode = useApp(s => s.ui.ws.planMode);
  const building = useApp(s => !!s.ui.building[p.id]);
  const credits = useApp(s => s.credits);
  const plan = useApp(s => s.plan);
  const codeModel = useApp(s => s.codeModel);
  const [ctxOpen, setCtxOpen] = useState(false);
  const [ctxSub, setCtxSub] = useState<string | null>(null);
  const [ctxQ, setCtxQ] = useState('');
  const [ring, setRing] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dict = useDictation(t => setWs(w => ({ input: (w.input ? w.input.trimEnd() + ' ' : '') + t })));
  const onDraft = p.draftId !== 'main';
  const draftName = p.drafts.find(d => d.id === p.draftId)?.name;
  const planning = !!p.planning && !p.appReady;

  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(200, Math.max(48, el.scrollHeight)) + 'px';
  }, [input]);

  const boxRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setCompact(el.clientWidth < 405));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const turns = p.msgs.length;
  const used = Math.min(200, 14 + turns * 6.5);
  const ctxPct = Math.round((used / 200) * 100);
  const m = CODE_MODELS.find(x => x.id === codeModel) || CODE_MODELS[0];
  const chatCredits = Math.round(p.msgs.filter(x => x.version).length * 2 * m.mult * 10) / 10;

  const submit = () => {
    if (selectMode && selected) { addNote(input); return; }
    if (!p.appReady && !p.planning && !building && p.versions.length === 0) { startBuilding(p.id); setWs({ input: '' }); return; }
    sendChat(p.id);
  };

  const subItems = useMemo(() => {
    if (ctxSub === 'context') {
      const files = Object.keys(generateFiles(p)).filter(f => f.startsWith('agents/') || f.startsWith('app/page')).slice(0, 5);
      return [
        ...files.map(f => [f, 'file', 'File'] as [string, IconName, string]),
        ...p.agents.map(a => [`${a.name} agent`, 'bot', 'Agent'] as [string, IconName, string]),
        ...Object.keys(p.db).slice(0, 3).map(t => [t, 'table', 'Table'] as [string, IconName, string]),
      ].filter(([l]) => !ctxQ || l.toLowerCase().includes(ctxQ.toLowerCase()));
    }
    return [['Rename project', 'pencil', ''], ['Duplicate', 'copy', ''], ['Project settings', 'gear', ''], ['Visibility', 'globe', p.linkAccess === 'off' ? 'Private' : 'Link on']] as [string, IconName, string][];
  }, [ctxSub, p, ctxQ]);

  const top: [string, string, IconName, boolean, string?][] = [['project', 'Project', 'diamond', true], ['help', 'Help center', 'help', false, 'ext'], ['context', 'Add context', 'ctx', true, '@'], ['attach', 'Attach files', 'clip', false]];
  const topFiltered = top.filter(x => !ctxQ || x[1].toLowerCase().includes(ctxQ.toLowerCase()));

  const pickSub = (label: string) => {
    setCtxOpen(false);
    setCtxSub(null);
    if (ctxSub === 'context') { setWs(w => ({ input: w.input + (w.input && !w.input.endsWith(' ') ? ' ' : '') + '@' + label + ' ' })); taRef.current?.focus(); return; }
    if (label === 'Rename project' || label === 'Project settings') navigate({ name: 'projectSettings', pid: p.id, page: 'general' });
    else if (label === 'Duplicate') duplicateProject(p.id);
    else if (label === 'Visibility') toast('Use Share in the header to change who can see this project');
  };

  const placeholder = planning ? 'Reply to Architect…'
    : selected ? `What should change about the ${(SEL_LABELS[selected.id] || selected.id).toLowerCase()}?`
    : selectMode ? 'Click an element in the preview…'
    : !p.appReady && !p.planning ? 'Press send to build this app'
    : onDraft ? `Ask Architect… (changes stay in ${draftName})` : 'Ask Architect to change your app or its agents…';
  const canSend = !!input.trim() || codeCtx.length > 0 || attachments.length > 0 || (!p.appReady && !p.planning);

  return (
    <div ref={boxRef} className="col" style={{ border: '1px solid ' + (selectMode ? 'color-mix(in srgb,var(--color-accent) 55%,transparent)' : 'var(--color-divider)'), borderRadius: 16, background: 'var(--color-surface)', padding: 8, gap: 6, position: 'relative' }}>
      {selectMode && (
        <div className="row" style={{ gap: 10, fontSize: 13, padding: '10px 14px', margin: '-8px -8px 4px', borderBottom: '1px solid var(--color-divider)', background: 'var(--color-panel)', borderRadius: '14px 14px 0 0' }}>
          <span style={{ color: 'var(--color-accent)', display: 'flex' }}><Icon name="pointer" size={15} /></span>
          {selected ? (
            <><span style={{ fontWeight: 600 }}>{SEL_LABELS[selected.id]}</span><span style={{ opacity: 0.6 }}>selected</span><div className="grow" /><button className="link plain" style={{ fontSize: 12 }} onClick={() => setWs({ selected: null })}>Clear</button></>
          ) : (
            <><span style={{ fontWeight: 600 }}>Select an element on the preview</span><div className="grow" /><button className="ib sm" onClick={() => setWs({ selectMode: false, hover: null })} aria-label="Exit select mode" title="Exit (Esc)"><Icon name="x" size={14} /></button></>
          )}
        </div>
      )}
      {selected && (
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {(QUICK[selected.id] || ['Make it stand out']).map(q => <button key={q} className="chip" style={{ fontSize: 12, padding: '3px 10px', fontWeight: 400 }} onClick={() => addNote(q)}><Icon name="plus" size={12} />{q}</button>)}
        </div>
      )}
      {codeCtx.length > 0 && (
        <div className="col" style={{ gap: 6 }}>
          {codeCtx.map((c, i) => (
            <div key={i} className="row" style={{ gap: 8, border: '1px solid var(--color-divider)', borderRadius: 9, background: 'var(--color-panel)', padding: '6px 8px 6px 10px', fontSize: 13, minWidth: 0 }}>
              <Icon name="file" size={14} style={{ opacity: 0.7 }} />
              <button className="mono ellipsis grow" onClick={() => setWs({ tab: 'code', file: c.file })} title="Open in Code" style={{ background: 'none', border: 0, fontSize: 12.5, textAlign: 'left', cursor: 'pointer', padding: 0 }}>{c.file} {c.from === c.to ? 'L' + c.from : `L${c.from}–${c.to}`}</button>
              <button className="ib sm" style={{ width: 20, height: 20 }} onClick={() => setWs(w => ({ codeCtx: w.codeCtx.filter((_, j) => j !== i) }))} aria-label="Remove"><Icon name="x" size={12} /></button>
            </div>
          ))}
        </div>
      )}
      {(onDraft || attachments.length > 0) && (
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {onDraft && <span className="row" style={{ gap: 5, fontSize: 12, padding: '2px 9px', borderRadius: 999, background: 'color-mix(in srgb,var(--color-accent) 18%,transparent)', color: 'var(--color-accent-700)', border: '1px solid color-mix(in srgb,var(--color-accent) 40%,transparent)' }}><Icon name="branch" size={12} />{draftName}</span>}
          {attachments.map(a => <span key={a} className="row" style={{ gap: 5, fontSize: 12, padding: '2px 4px 2px 9px', borderRadius: 999, border: '1px solid var(--color-divider)' }}><Icon name="clip" size={12} />{a}<button className="ib sm" style={{ width: 18, height: 18 }} onClick={() => setWs(w => ({ attachments: w.attachments.filter(x => x !== a) }))} aria-label={`Remove ${a}`}><Icon name="x" size={11} /></button></span>)}
        </div>
      )}
      <textarea
        id="composer"
        ref={taRef}
        value={input}
        onChange={e => setWs({ input: e.target.value })}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); if (!building || selectMode) submit(); } }}
        rows={2}
        placeholder={placeholder}
        aria-label="Message Architect"
        style={{ resize: 'none', border: 0, background: 'transparent', fontSize: 14.5, lineHeight: 1.5, outline: 'none', padding: 4 }}
      />
      <div className="row" style={{ gap: 4 }}>
        <Popover
          open={ctxOpen}
          onClose={() => { setCtxOpen(false); setCtxSub(null); setCtxQ(''); }}
          style={{ left: 0, bottom: 'calc(100% + 10px)', overflow: 'visible', background: 'none', border: 0, boxShadow: 'none', display: 'flex', gap: 6, alignItems: 'flex-end' }}
          anchor={<button className="ib round" style={{ width: 32, height: 32, border: '1px solid var(--color-divider)', opacity: 1 }} onClick={() => { setCtxOpen(!ctxOpen); setCtxSub(null); setCtxQ(''); }} title="Add context or files" aria-label="Add context or files"><Icon name={ctxOpen ? 'x' : 'plus'} /></button>}
        >
          <div style={{ width: 290, background: 'var(--color-pop)', border: '1px solid var(--color-divider)', borderRadius: 14, boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
            <div className="row" style={{ gap: 10, padding: '11px 14px', borderBottom: '1px solid var(--color-divider)' }}><Icon name="search" size={15} style={{ opacity: 0.55 }} /><input autoFocus className="bare grow" style={{ fontSize: 14 }} placeholder="Search…" value={ctxQ} onChange={e => setCtxQ(e.target.value)} /></div>
            <div className="menu-pad">
              {topFiltered.map(([id, label, ic, sub, hint], k) => (
                <div key={id}>
                  {id === 'context' && k > 0 && <div className="menu-sep" />}
                  <button className={cx('mi', ctxSub === id && 'active')} onMouseEnter={() => setCtxSub(sub ? id : null)} onClick={() => {
                    if (sub) { setCtxSub(id); return; }
                    setCtxOpen(false);
                    if (id === 'help') setUi({ info: 'help' });
                    if (id === 'attach') fileRef.current?.click();
                  }}>
                    <Icon name={ic} size={15} /><span className="grow">{label}</span>{hint === '@' && <span className="meta">@</span>}{sub ? <Icon name="chevronRight" size={14} /> : hint === 'ext' ? <Icon name="arrowUpRight" size={14} /> : null}
                  </button>
                </div>
              ))}
            </div>
          </div>
          {ctxSub && (
            <div className="menu-pad" style={{ width: 250, background: 'var(--color-pop)', border: '1px solid var(--color-divider)', borderRadius: 14, boxShadow: 'var(--shadow-lg)', maxHeight: 320, overflowY: 'auto' }}>
              <div className="menu-label">{ctxSub === 'project' ? 'Project' : 'Add context'}</div>
              {subItems.map(([label, ic, meta]) => <button key={label} className="mi" style={{ fontSize: 13 }} onClick={() => pickSub(label)}><Icon name={ic} size={14} /><span className="ellipsis grow">{label}</span><span className="meta">{meta}</span></button>)}
              {subItems.length === 0 && <div style={{ fontSize: 12.5, opacity: 0.6, padding: '6px 10px' }}>No matches</div>}
            </div>
          )}
        </Popover>
        <input ref={fileRef} type="file" multiple hidden onChange={e => { const n = Array.from(e.target.files || []).map(f => f.name); e.target.value = ''; if (n.length) { setWs(w => ({ attachments: Array.from(new Set([...w.attachments, ...n])) })); toast(`${n.length} file${n.length > 1 ? 's' : ''} attached`); } }} />
        <ModelPicker compact={compact} />
        <div className="grow" />
        <Popover
          open={ring}
          onClose={() => setRing(false)}
          style={{ right: -120, bottom: 'calc(100% + 10px)', width: 280, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}
          anchor={<button data-tour="composer-context-ring" className="tog" style={{ gap: 5, padding: '0 7px', opacity: 0.9 }} onClick={() => setRing(!ring)} title={`${ctxPct}% of context used`}><Ring pct={ctxPct} size={18} />{!compact && <span style={{ fontSize: 11.5, opacity: 0.7 }}>{ctxPct}%</span>}</button>}
        >
          <div className="col" style={{ gap: 6 }}>
            <div className="row" style={{ justifyContent: 'space-between', fontSize: 13 }}><span style={{ fontWeight: 600 }}>Chat context</span><span style={{ opacity: 0.65 }}>{ctxPct}% used</span></div>
            <div style={{ height: 6, borderRadius: 3, background: 'var(--color-divider)' }}><div style={{ height: '100%', width: `${ctxPct}%`, borderRadius: 3, background: ctxPct >= 90 ? 'var(--danger)' : 'var(--color-accent)' }} /></div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>{Math.round(used)}k of 200k tokens · {m.name}</div>
          </div>
          <div className="col" style={{ gap: 6, borderTop: '1px solid var(--color-divider)', paddingTop: 12, fontSize: 13 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}><span>Spent in this chat</span><span style={{ fontWeight: 600 }}>{chatCredits} credits</span></div>
            <div className="row" style={{ justifyContent: 'space-between' }}><span>Current session</span><span style={{ opacity: 0.75 }}>21% · resets 3 hr 38 min</span></div>
            <div className="row" style={{ justifyContent: 'space-between' }}><span>Credits left</span><span style={{ opacity: 0.75 }}>{credits} / {planCredits(plan)}</span></div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => { setRing(false); newChat(p.id, true); }}><Icon name="sparkles" size={14} />New chat with summary</button>
          <button className="btn btn-secondary btn-sm" onClick={() => { setRing(false); navigate({ name: 'settings', tab: 'usage' }); }}>View usage by project and model</button>
        </Popover>
        <button data-tour="composer-select" className={cx('tog', selectMode && 'on')} disabled={!p.appReady} title={p.appReady ? 'Point at something in the preview to change it' : 'Available once the app is built'} onClick={() => setWs(w => ({ selectMode: !w.selectMode, selected: null, hover: null, tab: 'preview', editAgent: null }))}><Icon name="pointer" size={15} />{!compact && 'Select'}</button>
        <button className={cx('tog', planMode && 'on')} title={planMode ? 'Architect proposes a plan before each change' : 'Plan first before changing anything'} onClick={() => setWs({ planMode: !planMode })}><Icon name="bulb" size={15} />{!compact && 'Plan'}</button>
        <button className={cx('ib round', dict.on && 'on')} style={{ width: 32, height: 32 }} title={dict.on ? 'Stop dictation' : 'Dictate'} onClick={() => dict.toggle(msg => toast(msg, 'warn'))} aria-pressed={dict.on}>
          {dict.on ? <span className="dot" style={{ background: 'var(--danger)', width: 10, height: 10, animation: 'arch-pulse 1s infinite' }} /> : <Icon name="mic" />}
        </button>
        {building && !(selectMode && selected) ? (
          <button onClick={() => stopBuild(p.id)} title="Stop" aria-label="Stop build" style={{ width: 32, height: 32, borderRadius: '50%', border: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'var(--color-text)', color: 'var(--color-bg)' }}><span style={{ width: 10, height: 10, borderRadius: 2, background: 'currentColor' }} /></button>
        ) : (
          <button onClick={submit} title={selectMode && selected ? 'Add note' : 'Send'} aria-label="Send" disabled={!canSend && !(selectMode && selected && input.trim())} style={{ width: 32, height: 32, borderRadius: '50%', border: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: canSend ? 'pointer' : 'default', background: canSend ? 'var(--color-accent)' : 'color-mix(in srgb,var(--color-accent) 40%,var(--color-surface))', color: '#fff', transition: 'background .15s' }}><Icon name={selectMode && selected ? 'plus' : 'arrowUp'} /></button>
        )}
      </div>
      {credits < 3 && p.appReady && <div className="row" style={{ gap: 6, fontSize: 12, color: 'var(--warn)', padding: '0 4px' }}><Icon name="info" size={13} />{credits} credits left. <button className="link" style={{ fontSize: 12 }} onClick={() => navigate({ name: 'pricing' })}>Get more</button></div>}
    </div>
  );
}
