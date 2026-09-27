import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Icon } from '../icons';
import { useApp, setWs } from '../store';
import { toast } from '../actions';
import { Spinner } from '../components/ui';
import { Site } from '../site/Site';
import { SEL_LABELS } from '../data/constants';
import { focusComposer } from './Workspace';
import type { Project, Rect } from '../types';

const Z: Rect = { top: 0, left: 0, w: 0, h: 0 };

export function PreviewTab({ p, isFocus }: { p: Project; isFocus: boolean }) {
  const device = useApp(s => s.ui.ws.device);
  const sitePath = useApp(s => s.ui.ws.sitePath);
  const reloadKey = useApp(s => s.ui.ws.reloadKey);
  const selectMode = useApp(s => s.ui.ws.selectMode);
  const selected = useApp(s => s.ui.ws.selected);
  const hover = useApp(s => s.ui.ws.hover);
  const notes = useApp(s => s.ui.ws.notes);
  const building = useApp(s => !!s.ui.building[p.id]);
  const side = useApp(s => s.paneSide);
  const [reloading, setReloading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [rects, setRects] = useState<{ hover: Rect | null; sel: Rect | null; notes: { id: string; target: string; r: Rect }[] }>({ hover: null, sel: null, notes: [] });
  const mobile = device === 'mobile';

  useEffect(() => {
    if (!reloadKey) return;
    setReloading(true);
    const t = setTimeout(() => setReloading(false), 650);
    return () => clearTimeout(t);
  }, [reloadKey]);

  const measure = () => {
    const root = contentRef.current;
    if (!root) return;
    const base = root.getBoundingClientRect();
    const rectOf = (id: string): Rect | null => {
      const el = root.querySelector(`[data-sel="${id}"]`);
      if (!el) return null;
      const a = el.getBoundingClientRect();
      return { top: a.top - base.top, left: a.left - base.left, w: a.width, h: a.height };
    };
    setRects({
      hover: hover ? rectOf(hover.id) : null,
      sel: selected ? rectOf(selected.id) : null,
      notes: notes.map(n => ({ id: n.id, target: n.target, r: rectOf(n.target) })).filter((x): x is { id: string; target: string; r: Rect } => !!x.r),
    });
  };

  const measureRef = useRef(measure);
  measureRef.current = measure;
  const showSite = p.appReady && !reloading;
  useLayoutEffect(measure, [hover?.id, selected?.id, notes, p.pv, device, sitePath, p.widget.length, showSite]);
  useEffect(() => {
    const root = contentRef.current;
    if (!root || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => measureRef.current());
    ro.observe(root);
    return () => ro.disconnect();
  }, [showSite]);

  const findSel = (t: EventTarget | null) => (t instanceof Element ? t.closest('[data-sel]') : null);

  const box = (r: Rect, solid: boolean): CSSProperties => ({ position: 'absolute', top: r.top - 2, left: r.left - 2, width: r.w + 4, height: r.h + 4, border: `${solid ? '2px solid' : '1.5px dashed'} #2f8bff`, background: solid ? 'rgba(47,139,255,.08)' : 'transparent', pointerEvents: 'none', borderRadius: 4, zIndex: 5, transition: 'all .08s' });

  const caption = building ? 'Architect is building your app…' : reloading ? 'Reloading preview…' : p.planning ? 'Answer a few questions in the chat and Architect will plan and build this app.' : 'Send a message to build this app.';

  return (
    <>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', justifyContent: 'center', alignItems: 'stretch', padding: mobile ? 24 : 0, background: mobile ? 'var(--color-panel)' : 'transparent' }}>
        <div style={{ position: 'relative', width: mobile ? 390 : '100%', maxWidth: '100%', height: '100%', border: mobile ? '1px solid var(--color-divider)' : 0, borderRadius: mobile ? 32 : 0, overflow: 'hidden', boxShadow: mobile ? 'var(--shadow-lg)' : 'none', transition: 'width .25s' }}>
          {!showSite && (
            <div data-paper="" className="col" style={{ position: 'absolute', inset: 0, background: 'var(--color-bg)', color: 'var(--color-text)', padding: 48, gap: 18 }}>
              <div className="skel" style={{ height: 14, width: '30%' }} />
              <div className="skel" style={{ height: 44, width: '70%', animationDelay: '.2s' }} />
              <div className="skel" style={{ height: 44, width: '52%', animationDelay: '.3s' }} />
              <div className="skel" style={{ height: 12, width: '60%', animationDelay: '.4s' }} />
              <div className="row" style={{ gap: 12, marginTop: 8 }}><div className="skel" style={{ height: 36, width: 130, animationDelay: '.5s' }} /><div className="skel" style={{ height: 36, width: 110, animationDelay: '.6s' }} /></div>
              <div className="row" style={{ marginTop: 'auto', gap: 10, fontSize: 14, color: 'var(--color-accent-700)' }}>{(building || reloading) && <Spinner />}{caption}</div>
            </div>
          )}
          {showSite && (
            <div
              style={{ position: 'absolute', inset: 0, overflow: 'auto', cursor: selectMode ? 'crosshair' : 'auto' }}
              onMouseMove={e => {
                if (!selectMode) return;
                const el = findSel(e.target);
                const id = el?.getAttribute('data-sel') || null;
                if ((hover?.id || null) !== id) setWs({ hover: id ? { id, r: Z } : null });
              }}
              onMouseLeave={() => { if (hover) setWs({ hover: null }); }}
              onScroll={() => { if (hover) setWs({ hover: null }); }}
              onClickCapture={e => {
                if (!selectMode) return;
                e.preventDefault();
                e.stopPropagation();
                const el = findSel(e.target);
                if (!el) return;
                setWs({ selected: { id: el.getAttribute('data-sel')!, r: Z }, hover: null, paneHidden: false });
                focusComposer();
              }}
              onSubmitCapture={e => { if (selectMode) { e.preventDefault(); e.stopPropagation(); } }}
            >
              <div ref={contentRef} data-paper="" data-dark={p.pv.dark ? '' : undefined} style={{ position: 'relative', minHeight: '100%', paddingBottom: 64, background: 'var(--color-bg)' }}>
                <Site p={p} path={sitePath} go={to => setWs({ sitePath: to })} compact={mobile} />
                {selectMode && rects.notes.map(n => (
                  <div key={n.id} style={{ ...box(n.r, false), borderColor: '#f59e0b', borderStyle: 'solid', borderWidth: 1.5, background: 'rgba(245,158,11,.06)' }}>
                    <span style={{ position: 'absolute', top: -9, right: -9, width: 18, height: 18, borderRadius: '50%', background: '#f59e0b', color: '#111', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{notes.findIndex(x => x.id === n.id) + 1}</span>
                  </div>
                ))}
                {selectMode && rects.hover && hover && hover.id !== selected?.id && <div style={box(rects.hover, false)}><span style={{ position: 'absolute', top: -19, left: -2, background: 'color-mix(in srgb,#2f8bff 80%,transparent)', color: '#fff', fontSize: 10.5, padding: '1px 6px', borderRadius: '3px 3px 0 0', whiteSpace: 'nowrap' }}>{SEL_LABELS[hover.id]}</span></div>}
                {rects.sel && selected && <div style={box(rects.sel, true)}><span style={{ position: 'absolute', top: -21, left: -2, background: '#2f8bff', color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: '3px 3px 0 0', whiteSpace: 'nowrap' }}>{SEL_LABELS[selected.id]}</span></div>}
              </div>
            </div>
          )}
        </div>
      </div>
      {p.appReady && (
        <div className="row" style={{ position: 'absolute', left: isFocus ? (side === 'left' ? 'calc(50% + 220px)' : 'calc(50% - 220px)') : '50%', bottom: 16, transform: 'translateX(-50%)', gap: 2, padding: 4, borderRadius: 12, background: 'var(--color-pop)', border: '1px solid var(--color-divider)', boxShadow: 'var(--shadow-lg)', zIndex: 8 }}>
          <button className={selectMode ? 'ib on' : 'ib'} style={{ width: 34, height: 34 }} title="Select an element (Esc to exit)" onClick={() => setWs(w => ({ selectMode: !w.selectMode, selected: null, hover: null }))}><Icon name="pointer" /></button>
          <button className="ib" style={{ width: 34, height: 34 }} title="Edit text" onClick={() => { setWs({ selectMode: true }); toast('Click any text, then type what it should say'); }}><Icon name="textT" /></button>
          <button className="ib" style={{ width: 34, height: 34 }} title="Comment" onClick={() => { setWs({ selectMode: true }); toast('Click an element to leave a note'); }}><Icon name="comment" /></button>
          <span className="vr" style={{ margin: '4px 2px' }} />
          <button className="ib" style={{ width: 34, height: 34 }} title={mobile ? 'Desktop view' : 'Phone view'} onClick={() => setWs({ device: mobile ? 'desktop' : 'mobile' })}><Icon name={mobile ? 'monitor' : 'phone'} /></button>
        </div>
      )}
    </>
  );
}
