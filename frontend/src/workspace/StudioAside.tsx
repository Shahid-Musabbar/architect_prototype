import { Icon } from '../icons';
import { useApp, setWs } from '../store';
import { addNote } from '../actions';
import { QUICK, SEL_LABELS } from '../data/constants';
import { templateById } from '../data/templates';
import type { Project } from '../types';

export function StudioAside({ p }: { p: Project }) {
  const selected = useApp(s => s.ui.ws.selected);
  const tpl = templateById(p.templateId);
  const conv = p.db.conversations?.count ?? 0;
  const main = p.db[tpl.mainTable];
  const handoffs = p.db.conversations?.rows.filter(r => r.some(c => c === tpl.urgent?.human)).length ?? 0;
  return (
    <aside className="col" style={{ width: 280, flex: 'none', borderLeft: '1px solid var(--color-divider)', overflow: 'auto', padding: 16, gap: 20, margin: '0 10px 10px 0' }}>
      <div className="col" style={{ gap: 8 }}>
        <h6 style={{ margin: 0, opacity: 0.7 }}>Selection</h6>
        {selected ? (
          <>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{SEL_LABELS[selected.id]}</div>
            <div style={{ fontSize: 12, opacity: 0.65 }}>Quick edits add a note to the batch.</div>
            <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>{(QUICK[selected.id] || ['Make it stand out']).map(q => <button key={q} className="chip" style={{ fontSize: 12, padding: '4px 10px', fontWeight: 400 }} onClick={() => addNote(q)}>{q}</button>)}</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 13, opacity: 0.7, lineHeight: 1.5 }}>Turn on Select and click something in the preview to edit it here.</div>
            <button className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }} disabled={!p.appReady} onClick={() => setWs({ selectMode: true, tab: 'preview', editAgent: null })}><Icon name="pointer" size={14} />Select an element</button>
          </>
        )}
      </div>
      <div className="hr" style={{ margin: 0 }} />
      <div className="col" style={{ gap: 4 }}>
        <h6 style={{ margin: '0 0 4px', opacity: 0.7 }}>Agents</h6>
        {p.agents.map(a => (
          <button key={a.id} onClick={() => setWs({ tab: 'agents', editAgent: a.id, edTab: 'build', agentSel: a.id })} className="row" style={{ gap: 10, background: 'none', border: 0, borderBottom: '1px solid var(--color-divider)', padding: '8px 0', cursor: 'pointer', textAlign: 'left' }}>
            <span className="dot" style={{ width: 6, height: 6, background: a.kind === 'router' ? 'var(--color-accent)' : '#6f9a5c' }} />
            <span className="grow ellipsis" style={{ fontSize: 14 }}>{a.name}</span>
            <span style={{ fontSize: 11, opacity: 0.6 }}>{a.model.replace('Claude ', '')}</span>
          </button>
        ))}
      </div>
      <div className="col" style={{ gap: 6 }}>
        <h6 style={{ margin: 0, opacity: 0.7 }}>Activity</h6>
        <div style={{ fontSize: 13, lineHeight: 1.8 }}>
          {conv.toLocaleString()} conversations<br />
          {main ? `${main.count.toLocaleString()} ${tpl.mainTable.replace(/_/g, ' ')}` : ''}<br />
          {handoffs} handed to a person
        </div>
      </div>
    </aside>
  );
}
