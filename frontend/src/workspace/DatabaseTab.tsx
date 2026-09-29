import { useMemo, useState } from 'react';
import { Icon } from '../icons';
import { useApp, setWs } from '../store';
import { addRow, confirmAction, deleteRows, execSql, updateCell } from '../actions';
import { Pills } from '../components/ui';
import { defaultSql } from '../lib/sim';
import { cx, modKey } from '../lib/util';
import { focusComposer } from './Workspace';
import type { Project } from '../types';

const cellClass = (v: string, ci: number) => {
  if (ci === 0) return 'mono';
  if (v === 'NULL') return 'cell-null';
  if (['open', 'emergency', 'failed', 'Failed', 'unpaid'].includes(v)) return 'cell-red';
  if (['scheduled', 'normal', 'draft', 'label sent', 'nurture', 'in progress'].includes(v)) return 'cell-amber';
  if (['done', 'paid', 'low', 'published', 'delivered', 'refunded', 'confirmed', 'booked', 'qualified', 'shipped', 'true', 'high'].includes(v)) return 'cell-green';
  return '';
};

const USERS: [string, string, string][] = [['maria.lopez@gmail.com', 'Google', '2 min ago'], ['j.okafor@outlook.com', 'Email link', '1 hour ago'], ['dev.patel@yahoo.com', 'Google', 'Yesterday'], ['sam.chen@icloud.com', 'Apple', 'Sep 24'], ['r.nguyen@gmail.com', 'Email link', 'Sep 21']];

export function DatabaseTab({ p }: { p: Project }) {
  const view = useApp(s => s.ui.ws.dbView);
  const table = useApp(s => s.ui.ws.dbTable);
  const name = p.db[table] ? table : Object.keys(p.db)[0];
  const tables = Object.entries(p.db);
  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
      <div className="col" style={{ width: 230, flex: 'none', borderRight: '1px solid var(--color-divider)', minHeight: 0 }}>
        <div data-tour="db-panel" className="row" style={{ gap: 8, padding: '12px 14px', borderBottom: '1px solid var(--color-divider)' }}><span style={{ color: '#22c55e', display: 'flex' }}><Icon name="database" /></span><span className="grow" style={{ fontWeight: 600, fontSize: 14 }}>Database</span><span className="tag tag-ok">Live</span></div>
        <div style={{ padding: '8px 8px 4px' }}><Pills value={view} onChange={v => setWs({ dbView: v })} options={[{ v: 'tables', label: 'Tables' }, { v: 'sql', label: 'SQL' }, { v: 'auth', label: 'Users' }]} /></div>
        <div className="menu-label" style={{ padding: '10px 14px 4px' }}>Tables</div>
        <div className="col" style={{ flex: 1, overflow: 'auto', padding: '0 6px 10px', gap: 1 }}>
          {tables.map(([k, t]) => (
            <button key={k} className={cx('mi', name === k && view === 'tables' && 'active')} onClick={() => setWs({ dbTable: k, dbView: 'tables' })}>
              <Icon name="table" size={14} /><span className="mono grow ellipsis" style={{ fontSize: 12.5 }}>{k}</span><span style={{ fontSize: 11, opacity: 0.5 }}>{t.count.toLocaleString()}</span>
            </button>
          ))}
        </div>
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--color-divider)', fontSize: 12, opacity: 0.6, lineHeight: 1.6 }}>Postgres · us-east-1<br />{(12 + tables.reduce((n, [, t]) => n + t.count, 0) / 180).toFixed(0)} MB of 500 MB</div>
      </div>
      <div className="col" style={{ flex: 1, minWidth: 0 }}>
        {view === 'tables' && name && <TableView p={p} name={name} />}
        {view === 'sql' && <SqlView p={p} />}
        {view === 'auth' && (
          <>
            <div className="row" style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-divider)', gap: 10 }}><span style={{ fontWeight: 600, fontSize: 14 }}>Users</span><span style={{ fontSize: 12, opacity: 0.55 }}>People who signed in to your app</span></div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <table className="grid-table"><thead><tr><th>Email</th><th>Provider</th><th>Last sign-in</th></tr></thead>
                <tbody>{USERS.map(([e, pr, t]) => <tr key={e}><td>{e}</td><td style={{ opacity: 0.75 }}>{pr}</td><td style={{ opacity: 0.75 }}>{t}</td></tr>)}</tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TableView({ p, name }: { p: Project; name: string }) {
  const t = p.db[name];
  const [filter, setFilter] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [edit, setEdit] = useState<{ r: number; c: number; v: string } | null>(null);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const rows = useMemo(() => t.rows.map((r, i) => ({ r, i })).filter(({ r }) => !filter.trim() || r.join(' ').toLowerCase().includes(filter.toLowerCase())), [t.rows, filter]);
  const commit = () => { if (edit) { updateCell(p.id, name, edit.r, edit.c, edit.v.trim() === '' ? 'NULL' : edit.v); setEdit(null); } };
  const allPicked = rows.length > 0 && rows.every(x => picked.has(x.i));

  return (
    <>
      <div className="row" style={{ gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--color-divider)', flexWrap: 'wrap' }}>
        <span className="mono" style={{ fontSize: 14, fontWeight: 500 }}>{name}</span>
        <span style={{ fontSize: 12, opacity: 0.55 }}>{t.count.toLocaleString()} rows · {t.desc}</span>
        <div className="grow" />
        {picked.size > 0 && <button className="btn btn-danger btn-sm" onClick={() => confirmAction({ title: `Delete ${picked.size} row${picked.size > 1 ? 's' : ''}?`, body: `Rows are removed from ${name} in the preview database.`, confirmLabel: 'Delete', danger: true, onConfirm: () => { deleteRows(p.id, name, Array.from(picked)); setPicked(new Set()); } })}><Icon name="trash" size={13} />Delete {picked.size}</button>}
        {showFilter ? (
          <div className="row" style={{ gap: 6, border: '1px solid var(--color-divider)', borderRadius: 8, padding: '3px 8px' }}><Icon name="filter" size={13} style={{ opacity: 0.6 }} /><input autoFocus className="bare" style={{ fontSize: 12.5, width: 150 }} placeholder="Filter rows" value={filter} onChange={e => setFilter(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') { setFilter(''); setShowFilter(false); } }} /><button className="ib sm" style={{ width: 18, height: 18 }} onClick={() => { setFilter(''); setShowFilter(false); }} aria-label="Clear filter"><Icon name="x" size={11} /></button></div>
        ) : <button className="btn btn-ghost plain btn-sm" onClick={() => setShowFilter(true)}><Icon name="filter" size={13} />Filter</button>}
        <button className="btn btn-ghost plain btn-sm" onClick={() => { setWs({ input: `@${name} `, paneHidden: false }); focusComposer(); }}><Icon name="sparkles" size={13} />Ask about this table</button>
        <button className="btn btn-secondary btn-sm" onClick={() => addRow(p.id, name)}><Icon name="plus" size={13} />Insert row</button>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table className="grid-table" style={{ minWidth: 720 }}>
          <thead>
            <tr>
              <th style={{ width: 36, padding: '9px 10px' }}><input type="checkbox" aria-label="Select all" checked={allPicked} onChange={() => setPicked(allPicked ? new Set() : new Set(rows.map(x => x.i)))} /></th>
              {t.cols.map(([c, ty]) => <th key={c}><span className="row" style={{ gap: 8, alignItems: 'baseline' }}>{c}<span className="mono" style={{ fontSize: 11, opacity: 0.45 }}>{ty}</span></span></th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ r, i }) => (
              <tr key={i} className={picked.has(i) ? 'sel' : ''}>
                <td style={{ padding: '8px 10px' }}><input type="checkbox" aria-label={`Select row ${i + 1}`} checked={picked.has(i)} onChange={() => setPicked(s => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; })} /></td>
                {r.map((v, ci) => (
                  <td key={ci} className={cellClass(v, ci)} onDoubleClick={() => ci > 0 && setEdit({ r: i, c: ci, v: v === 'NULL' ? '' : v })} title={ci > 0 ? 'Double-click to edit' : undefined} style={ci === 0 ? { fontSize: 12, opacity: 0.6 } : undefined}>
                    {edit && edit.r === i && edit.c === ci ? (
                      <input autoFocus className="bare" style={{ width: '100%', minWidth: 80, borderBottom: '1px solid var(--color-accent)' }} value={edit.v} onChange={e => setEdit({ ...edit, v: e.target.value })} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEdit(null); }} />
                    ) : v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div style={{ padding: 28, textAlign: 'center', fontSize: 13.5, opacity: 0.6 }}>{filter ? `No rows match “${filter}”` : 'No rows yet. Agents add rows as people use the app.'}</div>}
        {rows.length > 0 && t.count > t.rows.length && !filter && <div style={{ padding: '10px 14px', fontSize: 12, opacity: 0.55 }}>Showing the {t.rows.length} most recent of {t.count.toLocaleString()} rows. Use SQL to query the rest.</div>}
      </div>
    </>
  );
}

function SqlView({ p }: { p: Project }) {
  const sql = useApp(s => s.ui.ws.sql);
  const result = useApp(s => s.ui.ws.sqlResult);
  const main = Object.keys(p.db)[0];
  const examples = [defaultSql(p), `select *\nfrom ${main}\nlimit 5;`, 'select routed_to, count(*)\nfrom conversations\ngroup by 1\norder by 2 desc;'].filter(x => p.db.conversations || !x.includes('conversations'));
  return (
    <>
      <div className="row" style={{ gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--color-divider)', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>SQL editor</span>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>{examples.map((e, i) => <button key={i} className="chip" style={{ fontSize: 11.5, padding: '2px 9px', fontWeight: 400 }} onClick={() => setWs({ sql: e, sqlResult: null })}>Example {i + 1}</button>)}</div>
        <div className="grow" />
        <span style={{ fontSize: 11.5, opacity: 0.5 }}>{modKey} Enter</span>
        <button className="btn btn-primary btn-sm" onClick={() => execSql(p.id)}><Icon name="play" size={13} />Run</button>
      </div>
      <textarea className="mono" spellCheck={false} aria-label="SQL" value={sql} onChange={e => setWs({ sql: e.target.value })} onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); execSql(p.id); } }} style={{ height: 160, flex: 'none', resize: 'vertical', border: 0, borderBottom: '1px solid var(--color-divider)', background: 'var(--color-surface)', fontSize: 13, lineHeight: 1.7, padding: 14, outline: 'none' }} />
      <div style={{ padding: '8px 14px', fontSize: 12, opacity: result && 'error' in result ? 1 : 0.6, color: result && 'error' in result ? 'var(--danger)' : undefined }}>
        {!result ? 'Press Run to execute against the live database' : 'error' in result ? `ERROR: ${result.error}` : `${result.rows.length} row${result.rows.length === 1 ? '' : 's'} · ${result.ms} ms`}
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {result && !('error' in result) && (
          <table className="grid-table">
            <thead><tr>{result.cols.map(c => <th key={c}>{c}</th>)}</tr></thead>
            <tbody>{result.rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j} className={cellClass(v, j === 0 && result.cols[0] === 'id' ? 0 : 1)} style={/^\d+(\.\d+)?$/.test(v) ? { textAlign: 'right', fontVariantNumeric: 'tabular-nums' } : undefined}>{v}</td>)}</tr>)}</tbody>
          </table>
        )}
      </div>
    </>
  );
}
