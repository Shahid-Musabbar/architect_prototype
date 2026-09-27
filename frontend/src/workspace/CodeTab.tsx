import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Icon } from '../icons';
import { useApp, setWs, getState } from '../store';
import { addCodeCtx, navigate, termRun, toast } from '../actions';
import { generateFiles, fileTree } from '../lib/codegen';
import { copyText, cx, downloadText, modKey, slug } from '../lib/util';
import { focusComposer } from './Workspace';
import type { Project } from '../types';

const KW = /("(?:[^"\\]|\\.)*"|`[^`]*`|'(?:[^'\\]|\\.)*'|\/\/.*$|--.*$|#.*$|\b(?:import|export|from|const|let|return|async|await|default|function|create|table|primary|key|true|false|null|select|where)\b|\b\d+(?:\.\d+)?\b)/;

function tokens(line: string, ext: string): ReactNode[] {
  return line.split(KW).filter(x => x !== '' && x !== undefined).map((t, i) => {
    if (/^["`']/.test(t)) return <span key={i} className="tok-str">{t}</span>;
    if (/^\/\//.test(t) || (/^--/.test(t) && ext === 'sql') || (/^#/.test(t) && (ext === 'yaml' || ext === 'md'))) return <span key={i} className="tok-com">{t}</span>;
    if (/^\d/.test(t)) return <span key={i} className="tok-num">{t}</span>;
    if (/^[a-z]+$/i.test(t) && KW.test(t) && !/^[-#]/.test(t)) return <span key={i} className="tok-kw">{t}</span>;
    return t;
  });
}

interface Sel { file: string; from: number; to: number; text: string; top: number; left: number }

export function CodeTab({ p, narrow }: { p: Project; narrow: boolean }) {
  const file = useApp(s => s.ui.ws.file);
  const fsTab = useApp(s => s.ui.ws.fsTab);
  const codeCtx = useApp(s => s.ui.ws.codeCtx);
  const termOpen = useApp(s => s.ui.ws.termOpen);
  const github = useApp(s => !!s.ints.GitHub);
  const files = useMemo(() => generateFiles(p), [p]);
  const tree = useMemo(() => fileTree(files), [files]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<Sel | null>(null);
  const [fsW, setFsW] = useState(narrow ? 200 : 250);
  const [termH, setTermH] = useState<number | null>(null);
  const codeRef = useRef<HTMLDivElement>(null);
  const cur = files[file] !== undefined ? file : 'architect.config.ts';
  const lines = files[cur].split('\n');
  const ext = cur.split('.').pop() || '';
  const hl = new Set<number>();
  codeCtx.filter(c => c.file === cur).forEach(c => { for (let i = c.from; i <= c.to; i++) hl.add(i); });

  const readSel = (): Sel | null => {
    const box = codeRef.current, s = window.getSelection();
    if (!box || !s || s.isCollapsed || !s.rangeCount) return null;
    const rg = s.getRangeAt(0);
    if (!box.contains(rg.commonAncestorContainer)) return null;
    const lnOf = (n: Node) => { const el = n.nodeType === 1 ? (n as Element) : n.parentElement; const d = el?.closest('[data-ln]'); return d ? +d.getAttribute('data-ln')! : null; };
    let a = lnOf(rg.startContainer), b = lnOf(rg.endContainer);
    if (b && rg.endOffset === 0 && rg.endContainer.nodeType === 1 && a && b > a) b -= 1;
    if (!a || !b) return null;
    if (a > b) [a, b] = [b, a];
    const r = rg.getBoundingClientRect(), br = box.getBoundingClientRect();
    return { file: cur, from: a, to: b, text: lines.slice(a - 1, b).join('\n'), top: r.top - br.top + box.scrollTop - 36, left: Math.min(Math.max(8, r.left - br.left), br.width - 170) };
  };

  const addSel = (s: Sel | null) => {
    if (!s) return;
    addCodeCtx({ file: s.file, from: s.from, to: s.to, text: s.text });
    setSel(null);
    window.getSelection()?.removeAllRanges();
    focusComposer();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'l') {
        const s = readSel() || sel;
        if (s) { e.preventDefault(); addSel(s); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const hits = useMemo(() => {
    const t = q.trim().toLowerCase();
    const out: { f: string; n: number; t: string }[] = [];
    if (t.length < 2) return out;
    Object.entries(files).forEach(([f, src]) => src.split('\n').forEach((l, i) => { if (out.length < 60 && l.toLowerCase().includes(t)) out.push({ f, n: i + 1, t: l.trim() }); }));
    return out;
  }, [q, files]);

  const hidden = (path: string) => Array.from(collapsed).some(c => path.startsWith(c + '/'));

  const drag = (e: React.PointerEvent, kind: 'fs' | 'term') => {
    e.preventDefault();
    const x0 = e.clientX, y0 = e.clientY;
    const wrap = (e.currentTarget as HTMLElement).parentElement;
    const h0 = termH ?? wrap?.getBoundingClientRect().height ?? 260;
    const w0 = fsW;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = kind === 'fs' ? 'col-resize' : 'row-resize';
    if (kind === 'term' && !termOpen) setWs({ termOpen: true });
    const move = (ev: PointerEvent) => {
      if (kind === 'fs') setFsW(Math.max(160, Math.min(480, w0 + ev.clientX - x0)));
      else setTermH(Math.max(80, Math.min(Math.round(window.innerHeight * 0.75), h0 - (ev.clientY - y0))));
    };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); document.body.style.userSelect = ''; document.body.style.cursor = ''; };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <div className="col" style={{ flex: 1, minHeight: 0 }}>
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <div className="col" style={{ width: fsW, flex: 'none', borderRight: '1px solid var(--color-divider)', minHeight: 0, fontSize: 13 }}>
          <div className="row" style={{ gap: 4, padding: 8, borderBottom: '1px solid var(--color-divider)' }}>
            {([['files', 'Files', 'folder'], ['search', 'Search', 'search']] as const).map(([k, l, ic]) => (
              <button key={k} onClick={() => setWs({ fsTab: k })} className="row" style={{ gap: 6, padding: '5px 10px', borderRadius: 7, border: 0, background: fsTab === k ? 'var(--color-neutral-100)' : 'none', fontSize: 13.5, fontWeight: fsTab === k ? 600 : 500, cursor: 'pointer', opacity: fsTab === k ? 1 : 0.7 }}><Icon name={ic} size={14} />{l}</button>
            ))}
          </div>
          {fsTab === 'files' ? (
            <div style={{ flex: 1, overflow: 'auto', padding: '8px 6px' }} role="tree">
              {tree.filter(t => !hidden(t.path)).map(t => {
                const name = t.path.split('/').pop();
                const on = t.kind === 'file' && cur === t.path;
                const open = !collapsed.has(t.path);
                return (
                  <button key={t.path} role="treeitem" aria-selected={on} onClick={() => { if (t.kind === 'file') { setWs({ file: t.path }); setSel(null); } else setCollapsed(c => { const n = new Set(c); if (n.has(t.path)) n.delete(t.path); else n.add(t.path); return n; }); }}
                    className="row" style={{ gap: 6, width: '100%', padding: '5px 10px', paddingLeft: 10 + t.depth * 16, background: on ? 'color-mix(in srgb,var(--color-accent) 12%,transparent)' : 'none', border: 0, borderRadius: 6, color: on ? 'var(--color-accent)' : 'inherit', fontSize: 13, cursor: 'pointer', textAlign: 'left', opacity: t.kind === 'folder' ? 0.8 : 1 }}>
                    {t.kind === 'folder' && <Icon name={open ? 'chevronDown' : 'chevronRight'} size={12} />}
                    <Icon name={t.kind === 'folder' ? 'folder' : 'file'} size={14} /><span className="ellipsis">{name}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <>
              <div style={{ padding: 10 }}><div className="row" style={{ gap: 8, borderRadius: 9, background: 'var(--color-surface)', padding: '8px 10px', border: '1px solid var(--color-divider)' }}><Icon name="search" size={14} style={{ opacity: 0.55 }} /><input autoFocus className="bare grow" style={{ fontSize: 13.5 }} placeholder="Search in files" value={q} onChange={e => setQ(e.target.value)} /></div></div>
              <div className="col" style={{ flex: 1, overflow: 'auto', padding: '0 6px 10px', gap: 2 }}>
                {hits.map((h, i) => (
                  <button key={i} className="mi" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2, whiteSpace: 'normal' }} onClick={() => { setWs({ file: h.f }); setTimeout(() => codeRef.current?.querySelector(`[data-ln="${h.n}"]`)?.scrollIntoView({ block: 'center' }), 30); }}>
                    <span style={{ fontSize: 12, opacity: 0.6 }}>{h.f}:{h.n}</span>
                    <span className="mono ellipsis" style={{ fontSize: 12, maxWidth: '100%' }}>{h.t}</span>
                  </button>
                ))}
                {hits.length === 0 && <div style={{ fontSize: 12.5, opacity: 0.55, padding: '8px 10px' }}>{q.trim().length > 1 ? 'No results' : 'Search across all files in the project'}</div>}
              </div>
            </>
          )}
        </div>
        <div onPointerDown={e => drag(e, 'fs')} title="Drag to resize" style={{ width: 6, margin: '0 -3px', cursor: 'col-resize', position: 'relative', zIndex: 3, flex: 'none' }} />
        <div className="col" style={{ flex: 1, minWidth: 0 }}>
          <div className="row" style={{ gap: 6, padding: '8px 10px 8px 14px', borderBottom: '1px solid var(--color-divider)', fontSize: 12, minWidth: 0 }}>
            <span className="mono ellipsis grow">{cur}</span>
            <span style={{ opacity: 0.5 }} className="nowrap">{lines.length} lines · generated from v{p.current || 0}</span>
            <button className="btn btn-ghost plain btn-sm" title="Copy file" onClick={() => copyText(files[cur]).then(() => toast('Copied to clipboard'))}><Icon name="copy" size={14} />{!narrow && 'Copy'}</button>
            <button className="btn btn-ghost plain btn-sm" title="Download file" onClick={() => downloadText(cur.split('/').pop()!, files[cur])}><Icon name="upload" size={14} style={{ transform: 'rotate(180deg)' }} /></button>
            <button className="btn btn-secondary btn-sm" title="Sync to GitHub" onClick={() => { if (github) toast(`Pushed v${p.current} to github.com/${slug(getState().user.name)}/${slug(p.name)}`); else { toast('Connect GitHub first', 'warn'); navigate({ name: 'settings', tab: 'integrations' }); } }}><Icon name="github" size={14} />{!narrow && (github ? 'Push to GitHub' : 'Sync to GitHub')}</button>
          </div>
          <div ref={codeRef} className="mono" onMouseUp={() => setTimeout(() => setSel(readSel()), 0)} onScroll={() => sel && setSel(null)} style={{ flex: 1, overflow: 'auto', padding: '14px 0', fontSize: 12.5, lineHeight: 1.7, position: 'relative' }}>
            {sel && (
              <button onMouseDown={e => e.preventDefault()} onClick={() => addSel(sel)} className="row" style={{ position: 'absolute', top: Math.max(4, sel.top), left: sel.left, zIndex: 6, gap: 6, padding: '5px 10px', borderRadius: 8, border: '1px solid var(--color-divider)', background: 'var(--color-pop)', fontFamily: 'var(--font-body)', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', boxShadow: 'var(--shadow-md)', whiteSpace: 'nowrap' }}>
                <Icon name="plus" size={13} />Add to chat<span style={{ opacity: 0.6, fontSize: 11, marginLeft: 4 }}>{modKey}L</span>
              </button>
            )}
            {lines.map((l, i) => (
              <div key={i} data-ln={i + 1} className={cx('code-line', hl.has(i + 1) && 'hl')}><span className="ln">{i + 1}</span><span>{tokens(l, ext)}</span></div>
            ))}
          </div>
        </div>
      </div>
      <Terminal p={p} height={termH} onResize={e => drag(e, 'term')} narrow={narrow} />
    </div>
  );
}

function Terminal({ p, height, onResize, narrow }: { p: Project; height: number | null; onResize: (e: React.PointerEvent) => void; narrow: boolean }) {
  const tabs = useApp(s => s.ui.ws.termTabs);
  const cur = useApp(s => s.ui.ws.termTab);
  const open = useApp(s => s.ui.ws.termOpen);
  const hist = useApp(s => s.ui.ws.termHist);
  const cwd = useApp(s => s.ui.ws.termCwd);
  const termN = useApp(s => s.ui.ws.termN);
  const [input, setInput] = useState('');
  const [cmds, setCmds] = useState<string[]>([]);
  const [ci, setCi] = useState(-1);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inRef = useRef<HTMLInputElement>(null);
  useEffect(() => { const el = bodyRef.current; if (el) el.scrollTop = el.scrollHeight; }, [hist, cur, open]);

  const last = p.versions[p.versions.length - 1];
  const ns = slug(p.name);
  const seed = [{ t: `~/${ns}`, k: 'cwd' }, { t: '❯ ls', k: 'cmd' }, { t: 'README.md    architect.config.ts    package.json    agents/    app/    evals/    supabase/    tools/    node_modules/' }, { t: '', k: 'gap' }, { t: 'Type help for commands.', k: 'dim' }, { t: '', k: 'gap' }];
  const lines = cur === 'architect'
    ? (last ? [`Build v${last.n} · ${last.title}`, ...p.agents.map(a => `  ✓ agents/${a.id}.ts`), '  ✓ app/page.tsx', '  ✓ 12 of 12 evals passed', `Ready in ${(4 + p.agents.length * 0.6).toFixed(1)}s`] : ['No builds yet.']).map((t, i) => ({ t, k: i === 0 && last ? 'cmd' : t.includes('✓') ? 'ok' : 'dim' }))
    : cur === 'publish'
      ? (p.published ? [`▲ Deploying ${ns} to architect.app`, '  Building app…', `  Deploying ${p.agents.length} agents to edge (iad1)`, ...(p.chans.sms ? ['  Connecting SMS (415) 555-0142'] : []), `  ✓ Live at https://${p.domain || ns + '.architect.app'}`] : ['No deploys yet. Click Publish to ship this version.']).map(t => ({ t, k: t.includes('✓') ? 'ok' : t.startsWith('▲') ? 'cmd' : 'dim' }))
      : hist.length || cmds.length ? hist : seed;
  const color = (k?: string) => (k === 'cwd' ? '#7aa2f7' : k === 'err' ? '#f87171' : k === 'ok' ? '#4ade80' : k === 'cmd' ? 'inherit' : k === 'dim' ? 'color-mix(in srgb,var(--color-text) 55%,transparent)' : 'inherit');
  const label = (id: string) => (id === 'architect' ? 'Architect' : id === 'publish' ? 'Publish output' : 'Terminal' + (id === 'term1' ? '' : ' ' + id.slice(4)));
  const icon = (id: string) => (id === 'architect' ? 'sparkles' : id === 'publish' ? 'rocket' : 'terminal') as 'sparkles' | 'rocket' | 'terminal';

  const run = () => {
    const c = input;
    setInput('');
    setCi(-1);
    if (c.trim()) setCmds(x => [...x, c]);
    termRun(p.id, c);
  };

  return (
    <div className="col" style={{ height: open ? height ?? '38%' : 41, maxHeight: open ? (height ? 'none' : 360) : 41, minHeight: open ? 80 : 41, flex: 'none', borderTop: '1px solid var(--color-divider)', background: 'var(--color-bg)' }}>
      <div onPointerDown={onResize} title="Drag to resize" style={{ height: 6, margin: '-3px 0', cursor: 'row-resize', position: 'relative', zIndex: 3, flex: 'none' }} />
      <div className="row" style={{ gap: 4, padding: '6px 10px', borderBottom: open ? '1px solid var(--color-divider)' : 0, flex: 'none', minWidth: 0 }}>
        <div className="row" style={{ gap: 4, minWidth: 0, overflowX: 'auto', flex: '0 1 auto' }} role="tablist">
          {tabs.map(id => {
            const a = cur === id;
            return (
              <div key={id} className="row" style={{ gap: 10, flex: 'none', padding: '6px 12px', borderRadius: 8, background: a ? 'var(--color-neutral-100)' : 'none', opacity: a ? 1 : 0.75 }}>
                <button role="tab" aria-selected={a} onClick={() => setWs({ termTab: id, termOpen: true })} className="row nowrap" style={{ gap: 8, background: 'none', border: 0, fontSize: 13.5, fontWeight: 500, cursor: 'pointer', padding: 0 }}><Icon name={icon(id)} size={15} />{(!narrow || a) && label(id)}</button>
                {id.startsWith('term') && <button onClick={() => { const nt = tabs.filter(t => t !== id); setWs({ termTabs: nt, termTab: a ? nt.find(t => t.startsWith('term')) || 'architect' : cur }); }} title="Close" aria-label={`Close ${label(id)}`} style={{ background: 'none', border: 0, cursor: 'pointer', opacity: 0.5, display: 'flex', padding: 0 }}><Icon name="x" size={13} /></button>}
              </div>
            );
          })}
        </div>
        <button className="ib sm" onClick={() => { const n = termN + 1; setWs({ termN: n, termTabs: [...tabs, 'term' + n], termTab: 'term' + n, termOpen: true, termHist: [], termCwd: '' }); setCmds([]); }} title="New terminal"><Icon name="plus" size={15} /></button>
        <div className="grow" />
        {cur.startsWith('term') && open && <button className="ib sm" onClick={() => setWs({ termHist: [] })} title="Clear"><Icon name="trash" size={14} /></button>}
        <button className="ib sm" onClick={() => setWs({ termOpen: !open })} title={open ? 'Collapse panel' : 'Expand panel'}><Icon name={open ? 'chevronDown' : 'chevronUp'} size={16} /></button>
      </div>
      {open && (
        <div ref={bodyRef} className="mono" onClick={() => { if (!window.getSelection()?.toString()) inRef.current?.focus(); }} style={{ flex: 1, overflow: 'auto', padding: '12px 18px', fontSize: 12.5, lineHeight: 1.6, minHeight: 0, cursor: 'text' }}>
          {lines.map((l, i) => <div key={i} style={{ whiteSpace: 'pre-wrap', minHeight: l.k === 'gap' ? 10 : undefined, color: color(l.k) }}>{l.t}</div>)}
          {cur.startsWith('term') && (
            <>
              <div style={{ color: '#7aa2f7' }}>~/{ns}{cwd ? '/' + cwd : ''}</div>
              <div className="row" style={{ gap: 8 }}>
                <span style={{ color: '#e0af68' }}>❯</span>
                <input ref={inRef} autoFocus spellCheck={false} aria-label="Terminal input" className="bare grow" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); run(); }
                  else if (e.key === 'ArrowUp') { e.preventDefault(); if (!cmds.length) return; const n = ci < 0 ? cmds.length - 1 : Math.max(0, ci - 1); setCi(n); setInput(cmds[n]); }
                  else if (e.key === 'ArrowDown') { e.preventDefault(); if (ci < 0) return; const n = ci + 1; if (n >= cmds.length) { setCi(-1); setInput(''); } else { setCi(n); setInput(cmds[n]); } }
                  else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); setWs({ termHist: [] }); }
                }} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
