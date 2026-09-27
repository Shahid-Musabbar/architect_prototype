import { useMemo, useState } from 'react';
import { Icon } from '../icons';
import { useApp } from '../store';
import { deleteProject, duplicateProject, navigate, openProject, renameProject, setProjectStatus, toggleStar } from '../actions';
import { Dialog, Empty, Popover, Seg } from '../components/ui';
import { ProjectThumb } from '../components/ProjectThumb';
import { templateById } from '../data/templates';
import { ago, cx } from '../lib/util';
import { siteUrl } from '../lib/router';
import type { ProjFilter, Project } from '../types';

const TITLES: Record<ProjFilter, [string, string]> = {
  all: ['Projects', ''],
  starred: ['Starred projects', 'Projects you star show up here'],
  recent: ['Recently viewed', 'Opened in the last 30 days'],
  shared: ['Shared with you', 'Projects with teammates invited'],
};

export function Projects({ filter }: { filter: ProjFilter }) {
  const projects = useApp(s => s.projects);
  const building = useApp(s => s.ui.building);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | Project['status']>('all');
  const [sort, setSort] = useState<'edited' | 'name' | 'created'>('edited');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [renaming, setRenaming] = useState<Project | null>(null);

  const list = useMemo(() => {
    let l = projects.slice();
    if (filter === 'starred') l = l.filter(p => p.starred);
    if (filter === 'recent') l = l.filter(p => Date.now() - p.viewedAt < 30 * 864e5).sort((a, b) => b.viewedAt - a.viewedAt);
    if (filter === 'shared') l = l.filter(p => p.shared);
    if (status !== 'all') l = l.filter(p => p.status === status);
    const t = q.trim().toLowerCase();
    if (t) l = l.filter(p => `${p.name} ${templateById(p.templateId).app} ${p.agents.map(a => a.name).join(' ')}`.toLowerCase().includes(t));
    if (filter !== 'recent') l.sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name) : sort === 'created' ? b.createdAt - a.createdAt : b.updatedAt - a.updatedAt));
    return l;
  }, [projects, filter, status, q, sort]);

  const [title, sub] = TITLES[filter];
  const agents = projects.reduce((n, p) => n + p.agents.length, 0);
  const live = projects.filter(p => p.status === 'Live').length;
  const subtitle = filter === 'all' ? `${projects.length} apps · ${agents} agents · ${live} live` : sub;
  const baseEmpty = filter !== 'all' && list.length === 0 && !q && status === 'all';

  return (
    <div className="shell-main">
      <div className="col" style={{ maxWidth: 1160, margin: '0 auto', padding: '40px 24px 64px', gap: 20 }}>
        <div className="row" style={{ alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', borderBottom: '1px solid var(--color-divider)', paddingBottom: 16 }}>
          <div style={{ flex: 1, minWidth: 240 }}><h1 style={{ margin: 0, fontSize: 32 }}>{title}</h1><div style={{ fontSize: 14, opacity: 0.65 }}>{subtitle}</div></div>
          <div style={{ position: 'relative', width: 260, maxWidth: '100%' }}>
            <span style={{ position: 'absolute', left: 11, top: 11, opacity: 0.6, display: 'flex' }}><Icon name="search" size={15} /></span>
            <input className="input" placeholder="Search projects or agents" aria-label="Search projects" style={{ paddingLeft: 34 }} value={q} onChange={e => setQ(e.target.value)} />
            {q && <button className="ib sm" style={{ position: 'absolute', right: 5, top: 6 }} onClick={() => setQ('')} aria-label="Clear search"><Icon name="x" size={14} /></button>}
          </div>
          <button className="btn btn-primary" onClick={() => { navigate({ name: 'home' }); setTimeout(() => document.getElementById('home-prompt')?.focus(), 60); }}><Icon name="plus" />New project</button>
        </div>

        {!baseEmpty && (
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {(['all', 'Live', 'Draft', 'Paused'] as const).map(s => (
              <button key={s} className={cx('chip', status === s && 'on')} onClick={() => setStatus(s)}>
                {s === 'all' ? 'All' : s}<span style={{ opacity: 0.55, fontWeight: 400 }}>{s === 'all' ? projects.length : projects.filter(p => p.status === s).length}</span>
              </button>
            ))}
            <div className="grow" />
            {filter !== 'recent' && (
              <label className="row" style={{ gap: 6, fontSize: 13 }}>
                <span style={{ opacity: 0.6 }}>Sort</span>
                <select className="bare" value={sort} onChange={e => setSort(e.target.value as typeof sort)} style={{ fontWeight: 500 }}>
                  <option value="edited">Last edited</option><option value="name">Name</option><option value="created">Created</option>
                </select>
              </label>
            )}
            <Seg value={view} onChange={setView} options={[{ v: 'grid', label: '', icon: 'grid' }, { v: 'list', label: '', icon: 'listTodo' }]} />
          </div>
        )}

        {baseEmpty && (
          <Empty
            icon={filter === 'starred' ? 'star' : filter === 'shared' ? 'folder' : 'clock'}
            title={filter === 'starred' ? 'No starred projects' : filter === 'shared' ? 'Nothing shared yet' : 'Nothing viewed recently'}
            sub={filter === 'starred' ? 'Star projects from your project list to see them here.' : filter === 'shared' ? 'Invite a teammate from a project’s Share menu and it appears here.' : 'Projects you open show up here for 30 days.'}
            action={<button className="btn btn-primary" onClick={() => navigate({ name: 'projects', filter: 'all' })}>Browse projects</button>}
          />
        )}
        {!baseEmpty && list.length === 0 && <Empty icon="search" title="No matching projects" sub="Try a different search or status filter." action={<button className="btn btn-secondary" onClick={() => { setQ(''); setStatus('all'); }}>Clear filters</button>} />}

        {view === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 18 }}>
            {list.map(p => (
              <div key={p.id} className="card hover" style={{ padding: 0, overflow: 'hidden', gap: 0, position: 'relative' }}>
                <button onClick={() => openProject(p.id)} style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', textAlign: 'left', display: 'block' }} aria-label={`Open ${p.name}`}>
                  <ProjectThumb p={p} />
                </button>
                <div className="col" style={{ padding: '12px 14px', gap: 6 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <button className="card-title ellipsis grow" onClick={() => openProject(p.id)} style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', textAlign: 'left' }}>{p.name}</button>
                    <StatusTag p={p} building={!!building[p.id]} />
                  </div>
                  <div className="row" style={{ gap: 4 }}>
                    <div className="card-meta grow ellipsis">{templateById(p.templateId).app} · {p.agents.length} agents · {ago(p.updatedAt)}</div>
                    <button className="ib sm" onClick={() => toggleStar(p.id)} title={p.starred ? 'Unstar' : 'Star'} aria-pressed={p.starred} style={{ color: p.starred ? '#f5b301' : undefined, opacity: p.starred ? 1 : 0.6 }}><Icon name="star" size={15} style={p.starred ? { fill: 'currentColor' } : undefined} /></button>
                    <ProjectMenu p={p} onRename={() => setRenaming(p)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : list.length > 0 && (
          <div style={{ border: '1px solid var(--color-divider)', borderRadius: 12, overflow: 'auto' }}>
            <table className="table" style={{ minWidth: 640 }}>
              <thead><tr><th style={{ paddingLeft: 16 }}>Name</th><th>Type</th><th>Agents</th><th>Status</th><th>Edited</th><th /></tr></thead>
              <tbody>
                {list.map(p => (
                  <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => openProject(p.id)}>
                    <td style={{ paddingLeft: 16, fontWeight: 600 }}><span className="row" style={{ gap: 8 }}>{p.starred && <Icon name="star" size={13} style={{ color: '#f5b301', fill: 'currentColor' }} />}{p.name}</span></td>
                    <td style={{ opacity: 0.75, fontSize: 13 }}>{templateById(p.templateId).app}</td>
                    <td style={{ fontSize: 13 }}>{p.agents.length}</td>
                    <td><StatusTag p={p} building={!!building[p.id]} /></td>
                    <td style={{ fontSize: 13, opacity: 0.7 }}>{ago(p.updatedAt)}</td>
                    <td onClick={e => e.stopPropagation()} style={{ width: 40 }}><ProjectMenu p={p} onRename={() => setRenaming(p)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <RenameDialog p={renaming} onClose={() => setRenaming(null)} />
    </div>
  );
}

export function StatusTag({ p, building }: { p: Project; building?: boolean }) {
  if (building) return <span className="tag tag-accent"><span className="dot" style={{ background: 'currentColor', animation: 'arch-pulse 1s infinite', width: 6, height: 6 }} />Building</span>;
  return <span className={cx('tag', p.status === 'Live' ? 'tag-accent' : p.status === 'Draft' ? 'tag-outline' : 'tag-neutral')}>{p.status}</span>;
}

function ProjectMenu({ p, onRename }: { p: Project; onRename: () => void }) {
  const [open, setOpen] = useState(false);
  const act = (fn: () => void) => () => { setOpen(false); fn(); };
  return (
    <Popover open={open} onClose={() => setOpen(false)} style={{ right: 0, bottom: 'calc(100% + 4px)', width: 200 }} anchor={<button className="ib sm" onClick={() => setOpen(!open)} aria-label="Project actions" title="More"><Icon name="more" size={16} /></button>}>
      <div className="menu-pad">
        <button className="mi" onClick={act(() => openProject(p.id))}><Icon name="arrowUpRight" size={15} />Open</button>
        {p.published && <button className="mi" onClick={act(() => window.open(siteUrl(p.id), '_blank', 'noopener'))}><Icon name="external" size={15} />Open live site</button>}
        <button className="mi" onClick={act(onRename)}><Icon name="pencil" size={15} />Rename</button>
        <button className="mi" onClick={act(() => duplicateProject(p.id))}><Icon name="copy" size={15} />Duplicate</button>
        <button className="mi" onClick={act(() => navigate({ name: 'projectSettings', pid: p.id, page: 'general' }))}><Icon name="gear" size={15} />Settings</button>
        {p.published && <button className="mi" onClick={act(() => setProjectStatus(p.id, p.status === 'Paused' ? 'Live' : 'Paused'))}><Icon name={p.status === 'Paused' ? 'play' : 'stop'} size={15} />{p.status === 'Paused' ? 'Resume' : 'Pause'} app</button>}
        <div className="menu-sep" />
        <button className="mi danger" onClick={act(() => deleteProject(p.id, () => undefined))}><Icon name="trash" size={15} />Delete</button>
      </div>
    </Popover>
  );
}

export function RenameDialog({ p, onClose }: { p: Project | null; onClose: () => void }) {
  const [name, setName] = useState('');
  const [last, setLast] = useState<string | null>(null);
  if (p && last !== p.id) { setLast(p.id); setName(p.name); }
  if (!p && last) setLast(null);
  if (!p) return null;
  const save = () => { if (name.trim()) { renameProject(p.id, name); onClose(); } };
  return (
    <Dialog open onClose={onClose} width={420} label="Rename project">
      <div className="dialog-title">Rename project</div>
      <div className="field"><label>Name</label><input className="input" autoFocus value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') save(); }} maxLength={60} /></div>
      <div className="dialog-actions"><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={!name.trim() || name.trim() === p.name} onClick={save}>Save</button></div>
    </Dialog>
  );
}
