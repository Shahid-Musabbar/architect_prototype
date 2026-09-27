import { useEffect, useState, type CSSProperties } from 'react';
import { Icon } from '../icons';
import { useApp, useProject, setState, setWs, getState } from '../store';
import { navigate } from '../actions';
import { Empty, Spinner } from '../components/ui';
import { Header } from './Header';
import { ChatPane } from './ChatPane';
import { PreviewTab } from './PreviewTab';
import { AgentsTab } from './AgentsTab';
import { AgentEditor } from './AgentEditor';
import { CodeTab } from './CodeTab';
import { DatabaseTab } from './DatabaseTab';
import { HistoryTab } from './HistoryTab';
import { PlanPanel } from './PlanPanel';
import { PublishDialog } from './PublishDialog';
import { StudioAside } from './StudioAside';

export const focusComposer = () => setTimeout(() => (document.getElementById('composer') as HTMLTextAreaElement | null)?.focus(), 30);

export function useNarrow(bp = 1200) {
  const [n, setN] = useState(() => window.innerWidth < bp);
  useEffect(() => {
    const on = () => setN(window.innerWidth < bp);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, [bp]);
  return n;
}

export function Workspace({ pid }: { pid: string }) {
  const p = useProject(pid);
  const wsPid = useApp(s => s.ui.ws.pid);
  const tab = useApp(s => s.ui.ws.tab);
  const paneHidden = useApp(s => s.ui.ws.paneHidden);
  const agentChat = useApp(s => s.ui.ws.agentChat);
  const editAgent = useApp(s => s.ui.ws.editAgent);
  const planOpen = useApp(s => s.ui.ws.planOpen);
  const focusThread = useApp(s => s.ui.ws.focusThread);
  const layout = useApp(s => s.layout);
  const side = useApp(s => s.paneSide);
  const paneW = useApp(s => s.paneW);
  const building = useApp(s => !!s.ui.building[pid]);
  const narrow = useNarrow();
  const [drag, setDrag] = useState<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const w = getState().ui.ws;
      if (getState().ui.confirm || getState().ui.palette || w.publishOpen) return;
      if (w.selectMode) { setWs({ selectMode: false, selected: null, hover: null }); return; }
      if (w.editAgent) { setWs({ editAgent: null }); return; }
      if (w.planOpen) setWs({ planOpen: false });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!p) return <Empty icon="folder" title="Project not found" sub="It may have been deleted." action={<button className="btn btn-primary" onClick={() => navigate({ name: 'projects', filter: 'all' })}>Back to projects</button>} />;
  if (wsPid !== pid) return <div className="row" style={{ flex: 1, justifyContent: 'center' }}><Spinner size={20} /></div>;

  const isFocus = layout === 'Focus', isStudio = layout === 'Studio';
  const hideForAgents = tab === 'agents' && narrow && !agentChat && !isFocus;
  const showPane = (!paneHidden || isFocus) && !hideForAgents;
  const width = paneW || (isStudio ? 360 : 440);

  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    const x0 = e.clientX, w0 = width;
    const prev = document.body.style.cursor;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - x0;
      const w = w0 + (side === 'left' ? dx : -dx);
      setState({ paneW: Math.max(300, Math.min(Math.round(window.innerWidth * 0.6), w)) });
    };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); document.body.style.cursor = prev; document.body.style.userSelect = ''; };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const startDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    setDrag(e.clientX);
    const move = (ev: PointerEvent) => setDrag(ev.clientX);
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setDrag(null);
      const s2 = ev.clientX < window.innerWidth / 2 ? 'left' : 'right';
      if (s2 !== getState().paneSide) setState({ paneSide: s2 });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const chatStyle: CSSProperties = isFocus
    ? { position: 'absolute', [side]: 24, bottom: 24, width: 420, maxWidth: 'calc(100% - 48px)', height: focusThread ? '70%' : 'auto', zIndex: 24, background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 16, boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', paddingTop: 6 }
    : { width, maxWidth: '60vw', flex: 'none', display: 'flex', flexDirection: 'column', minHeight: 0 };

  const contentStyle: CSSProperties = {
    flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', position: 'relative',
    margin: isFocus || !showPane ? (paneHidden && !isFocus ? (side === 'left' ? '0 10px 10px 0' : '0 0 10px 10px') : '0 10px 10px') : side === 'left' ? '0 10px 10px 0' : '0 0 10px 10px',
    border: '1px solid var(--color-divider)', borderRadius: 14, overflow: 'hidden', background: 'var(--color-panel)',
  };

  const leftHot = drag !== null && drag < window.innerWidth / 2;
  const drop = (hot: boolean): CSSProperties => ({ border: '2px dashed ' + (hot ? 'var(--color-accent)' : 'var(--color-divider)'), borderRadius: 14, background: hot ? 'color-mix(in srgb,var(--color-accent) 14%,transparent)' : 'color-mix(in srgb,var(--color-bg) 50%,transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 500, color: hot ? 'var(--color-accent-700)' : 'inherit', opacity: hot ? 1 : 0.7, backdropFilter: 'blur(2px)', transition: 'all .15s' });

  return (
    <>
      <Header p={p} narrow={narrow} />
      <div style={{ flex: 1, display: 'flex', flexDirection: side === 'left' ? 'row' : 'row-reverse', minHeight: 0, position: 'relative' }}>
        {paneHidden && !isFocus && !hideForAgents && (
          <button onClick={() => setWs({ paneHidden: false })} title="Show chat" className="col" style={{ width: 30, flex: 'none', margin: side === 'left' ? '0 6px 10px 8px' : '0 8px 10px 6px', border: '1px solid var(--color-divider)', borderRadius: 12, background: 'var(--color-panel)', alignItems: 'center', gap: 10, padding: '12px 0', cursor: 'pointer' }}>
            <Icon name={side === 'left' ? 'chevronRight' : 'chevronLeft'} size={14} />
            <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: 12, fontWeight: 500 }}>Chat</span>
            {building && <Spinner size={12} style={{ color: 'var(--color-accent)' }} />}
          </button>
        )}
        {showPane && (
          <div style={chatStyle}>
            <ChatPane p={p} isFocus={isFocus} onGrip={startDrag} />
          </div>
        )}
        {showPane && !isFocus && (
          <div className="resizer-x" onPointerDown={startResize} onDoubleClick={() => setState({ paneW: null })} title="Drag to resize · double-click to reset" role="separator" aria-orientation="vertical"><span /></div>
        )}
        <div style={contentStyle}>
          {planOpen && p.planning?.ready && <PlanPanel p={p} />}
          {editAgent && tab === 'agents' && p.agents.some(a => a.id === editAgent) && <AgentEditor key={editAgent} p={p} agentId={editAgent} />}
          {tab === 'preview' && <PreviewTab p={p} isFocus={isFocus} />}
          {tab === 'agents' && <AgentsTab p={p} narrow={narrow} isFocus={isFocus} />}
          {tab === 'code' && <CodeTab p={p} narrow={narrow} />}
          {tab === 'database' && <DatabaseTab p={p} />}
          {tab === 'history' && <HistoryTab p={p} />}
        </div>
        {isStudio && !narrow && <StudioAside p={p} />}
      </div>
      {drag !== null && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 50, bottom: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: 12, zIndex: 45, pointerEvents: 'none' }}>
          <div style={drop(leftHot)}><span className="row" style={{ gap: 8 }}><Icon name="panelLeft" />Chat on the left</span></div>
          <div style={drop(!leftHot)}><span className="row" style={{ gap: 8 }}><Icon name="panelRight" />Chat on the right</span></div>
        </div>
      )}
      <PublishDialog p={p} />
    </>
  );
}
