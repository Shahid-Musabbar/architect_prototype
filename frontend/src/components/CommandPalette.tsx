import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon, type IconName } from '../icons';
import { useApp, setUi, setWs, getState } from '../store';
import { navigate, toggleTheme, openProject, signOut } from '../actions';
import { templateById } from '../data/templates';
import { ago, cx } from '../lib/util';

interface Item { id: string; label: string; sub?: string; icon: IconName; group: string; run: () => void; keywords?: string }

export function CommandPalette() {
  const open = useApp(s => s.ui.palette);
  const projects = useApp(s => s.projects);
  const route = useApp(s => s.ui.route);
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (open) { setQ(''); setI(0); } }, [open]);

  const items = useMemo<Item[]>(() => {
    const inWs = route.name === 'workspace';
    const out: Item[] = [];
    projects.slice().sort((a, b) => b.viewedAt - a.viewedAt).forEach(p => out.push({ id: 'p' + p.id, label: p.name, sub: `${templateById(p.templateId).app} · ${p.status} · ${ago(p.updatedAt)}`, icon: 'diamond', group: 'Projects', run: () => openProject(p.id), keywords: p.agents.map(a => a.name).join(' ') }));
    if (inWs) {
      const tabs: [string, IconName, 'preview' | 'agents' | 'code' | 'database' | 'history'][] = [['Preview', 'eye', 'preview'], ['Agents', 'network', 'agents'], ['Code', 'code', 'code'], ['Database', 'database', 'database'], ['History', 'history', 'history']];
      tabs.forEach(([l, ic, t]) => out.push({ id: 'tab' + t, label: `Go to ${l}`, icon: ic, group: 'This project', run: () => setWs({ tab: t, editAgent: null }) }));
      const p = projects.find(x => x.id === route.pid);
      p?.agents.forEach(a => out.push({ id: 'ag' + a.id, label: `Edit ${a.name} agent`, sub: a.model, icon: 'bot', group: 'This project', run: () => setWs({ tab: 'agents', editAgent: a.id, agentSel: a.id, edTab: 'build' }) }));
      out.push({ id: 'pub', label: 'Publish…', icon: 'rocket', group: 'This project', run: () => setWs({ publishOpen: true, pubStep: 'config' }) });
    }
    out.push(
      { id: 'new', label: 'New project', icon: 'plus', group: 'Actions', run: () => { navigate({ name: 'home' }); setTimeout(() => document.getElementById('home-prompt')?.focus(), 60); } },
      { id: 'home', label: 'Home', icon: 'home', group: 'Navigate', run: () => navigate({ name: 'home' }) },
      { id: 'all', label: 'All projects', icon: 'grid', group: 'Navigate', run: () => navigate({ name: 'projects', filter: 'all' }) },
      { id: 'star', label: 'Starred projects', icon: 'star', group: 'Navigate', run: () => navigate({ name: 'projects', filter: 'starred' }) },
      { id: 'pricing', label: 'Pricing', icon: 'zap', group: 'Navigate', run: () => navigate({ name: 'pricing' }) },
      { id: 's-gen', label: 'Settings: General', icon: 'settings', group: 'Navigate', run: () => navigate({ name: 'settings', tab: 'general' }) },
      { id: 's-models', label: 'Settings: Models & keys', icon: 'key', group: 'Navigate', run: () => navigate({ name: 'settings', tab: 'models' }) },
      { id: 's-int', label: 'Settings: Integrations', icon: 'plug', group: 'Navigate', run: () => navigate({ name: 'settings', tab: 'integrations' }) },
      { id: 's-sec', label: 'Settings: Secrets', icon: 'lock', group: 'Navigate', run: () => navigate({ name: 'settings', tab: 'secrets' }) },
      { id: 's-use', label: 'Settings: Usage & billing', icon: 'chart', group: 'Navigate', run: () => navigate({ name: 'settings', tab: 'usage' }) },
      { id: 'theme', label: `Switch to ${getState().theme === 'dark' ? 'light' : 'dark'} theme`, icon: 'sun', group: 'Actions', run: toggleTheme },
      { id: 'help', label: 'Help Center', icon: 'book', group: 'Help', run: () => setUi({ info: 'help' }) },
      { id: 'rel', label: 'Release notes', icon: 'news', group: 'Help', run: () => setUi({ info: 'release' }) },
      { id: 'status', label: 'System status', icon: 'activity', group: 'Help', run: () => setUi({ info: 'status' }) },
      { id: 'out', label: 'Sign out', icon: 'logout', group: 'Actions', run: signOut },
    );
    return out;
  }, [projects, route]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return items;
    return items
      .map(it => {
        const hay = `${it.label} ${it.sub || ''} ${it.keywords || ''}`.toLowerCase();
        const idx = hay.indexOf(t);
        const fuzzy = t.split('').every((c => { let pos = 0; return (ch: string) => (pos = hay.indexOf(ch, pos) + 1) > 0; })());
        return { it, score: idx === 0 ? 0 : idx > 0 ? 1 : fuzzy ? 2 : 9 };
      })
      .filter(x => x.score < 9)
      .sort((a, b) => a.score - b.score)
      .map(x => x.it);
  }, [q, items]);

  useEffect(() => { setI(0); }, [q]);
  useEffect(() => { listRef.current?.querySelector<HTMLElement>(`[data-i="${i}"]`)?.scrollIntoView({ block: 'nearest' }); }, [i]);

  if (!open) return null;
  const close = () => setUi({ palette: false });
  const run = (it: Item) => { close(); it.run(); };
  let lastGroup = '';

  return (
    <div className="dialog-backdrop" style={{ placeItems: 'start center', paddingTop: '12vh' }} onMouseDown={e => { if (e.target === e.currentTarget) close(); }}>
      <div className="dialog" style={{ width: 'min(600px,100%)', padding: 0, gap: 0 }} role="dialog" aria-label="Command palette">
        <div className="row" style={{ gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--color-divider)' }}>
          <span style={{ opacity: 0.55, display: 'flex' }}><Icon name="search" size={17} /></span>
          <input
            autoFocus
            className="bare grow"
            style={{ fontSize: 15.5 }}
            placeholder="Search projects, agents, settings…"
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setI(x => Math.min(filtered.length - 1, x + 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setI(x => Math.max(0, x - 1)); }
              else if (e.key === 'Enter') { e.preventDefault(); const it = filtered[i]; if (it) run(it); }
              else if (e.key === 'Escape') { e.preventDefault(); close(); }
            }}
          />
          <span className="kbd">Esc</span>
        </div>
        <div ref={listRef} style={{ maxHeight: '52vh', overflowY: 'auto', padding: 6 }}>
          {filtered.length === 0 && <div style={{ padding: '28px 12px', textAlign: 'center', fontSize: 14, opacity: 0.6 }}>No results for “{q}”</div>}
          {filtered.map((it, k) => {
            const head = it.group !== lastGroup;
            lastGroup = it.group;
            return (
              <div key={it.id}>
                {head && <div className="menu-label">{it.group}</div>}
                <button data-i={k} className={cx('mi nohover', k === i && 'active')} onMouseMove={() => setI(k)} onClick={() => run(it)} style={{ padding: '9px 10px' }}>
                  <span style={{ opacity: 0.75, display: 'flex' }}><Icon name={it.icon} size={16} /></span>
                  <span className="ellipsis">{it.label}</span>
                  {it.sub && <span className="meta ellipsis" style={{ maxWidth: '50%' }}>{it.sub}</span>}
                </button>
              </div>
            );
          })}
        </div>
        <div className="row" style={{ gap: 14, padding: '9px 16px', borderTop: '1px solid var(--color-divider)', fontSize: 12, opacity: 0.6 }}>
          <span><span className="kbd">↑↓</span> navigate</span><span><span className="kbd">↵</span> open</span><span><span className="kbd">Esc</span> close</span>
        </div>
      </div>
    </div>
  );
}
