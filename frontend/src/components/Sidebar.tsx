import { useState } from 'react';
import { Icon, type IconName } from '../icons';
import { useApp, setUi } from '../store';
import { navigate, signOut, toggleTheme } from '../actions';
import { startProductTour } from './ProductTour';
import { Avatar, Logo, Popover } from './ui';
import { PLANS, planCredits } from '../data/constants';
import { cx, modKey } from '../lib/util';
import type { ProjFilter } from '../types';

export function scrollToEngine(id: string) {
  navigate({ name: 'home' });
  setTimeout(() => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
  }, 90);
}

export function Sidebar() {
  const route = useApp(s => s.ui.route);
  const user = useApp(s => s.user);
  const plan = useApp(s => s.plan);
  const credits = useApp(s => s.credits);
  const theme = useApp(s => s.theme);
  const projects = useApp(s => s.projects);
  const [menu, setMenu] = useState(false);
  const [mobile, setMobile] = useState(false);
  const cap = planCredits(plan);
  const planName = PLANS.find(p => p.id === plan)!.name;
  const filter = route.name === 'projects' ? route.filter : null;
  const counts: Record<ProjFilter, number> = {
    all: projects.length,
    starred: projects.filter(p => p.starred).length,
    recent: projects.filter(p => Date.now() - p.viewedAt < 30 * 864e5).length,
    shared: projects.filter(p => p.shared).length,
  };
  const go = (fn: () => void) => () => { setMobile(false); fn(); };
  const nav: [string, IconName, () => void, boolean, number?][] = [
    ['Home', 'home', () => navigate({ name: 'home' }), route.name === 'home'],
    ['Projects', 'grid', () => navigate({ name: 'projects', filter: 'all' }), filter === 'all', counts.all],
    ['Starred', 'star', () => navigate({ name: 'projects', filter: 'starred' }), filter === 'starred', counts.starred],
    ['Recently viewed', 'clock', () => navigate({ name: 'projects', filter: 'recent' }), filter === 'recent'],
    ['Shared with you', 'folder', () => navigate({ name: 'projects', filter: 'shared' }), filter === 'shared', counts.shared],
  ];
  const nav2: [string, IconName, () => void, boolean][] = [
    ['Settings', 'settings', () => navigate({ name: 'settings', tab: 'general' }), route.name === 'settings'],
    ['Pricing', 'zap', () => navigate({ name: 'pricing' }), route.name === 'pricing'],
    ['Help Center', 'book', () => setUi({ info: 'help' }), false],
    ['Release notes', 'news', () => setUi({ info: 'release' }), false],
    ['Status', 'activity', () => setUi({ info: 'status' }), false],
    ['Product tour', 'sparkles', startProductTour, false],
  ];

  return (
    <>
      <button className="ib mobile-only" style={{ position: 'absolute', top: 14, left: 14, zIndex: 6, background: 'var(--color-panel)', border: '1px solid var(--color-divider)' }} onClick={() => setMobile(true)} aria-label="Open menu"><Icon name="columns" /></button>
      {mobile && <div onClick={() => setMobile(false)} style={{ position: 'fixed', inset: 0, zIndex: 9, background: 'rgba(0,0,0,.4)' }} />}
      <aside className={cx('sidebar', mobile && 'open')} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 256, display: 'flex', flexDirection: 'column', gap: 2, padding: '14px 10px 12px', zIndex: 10, overflowY: 'auto' }}>
        <div className="row" style={{ gap: 8, padding: '2px 6px 12px' }}>
          <button onClick={go(() => navigate({ name: 'home' }))} className="row" style={{ gap: 8, background: 'none', border: 0, cursor: 'pointer', padding: 0 }}>
            <Logo size={24} />
            <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-.03em' }}>Architect</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-accent)', border: '1px solid color-mix(in srgb,var(--color-accent) 45%,transparent)', borderRadius: 4, padding: '0 4px' }}>2.0</span>
          </button>
          <div className="grow" />
          <button onClick={() => setUi({ palette: true })} className="row" title="Search (⌘K)" style={{ gap: 6, background: 'none', border: 0, opacity: 0.6, cursor: 'pointer', fontSize: 12 }}>{modKey === 'Ctrl' ? 'Ctrl K' : '⌘K'}<Icon name="search" size={15} /></button>
        </div>
        <Popover
          open={menu}
          onClose={() => setMenu(false)}
          style={{ top: 'calc(100% + 6px)', left: 0, right: 0 }}
          anchor={
            <button onClick={() => setMenu(!menu)} className="row" style={{ gap: 10, padding: '7px 8px', border: '1px solid var(--color-divider)', borderRadius: 10, background: 'var(--color-panel)', cursor: 'pointer', textAlign: 'left', marginBottom: 8, width: '100%' }}>
              <Avatar text={user.name} size={26} />
              <span className="ellipsis grow" style={{ fontSize: 13, fontWeight: 500 }}>{user.email}</span>
              <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 999, background: 'var(--color-neutral-100)' }}>{planName}</span>
              <span style={{ opacity: 0.6, display: 'flex' }}><Icon name="chevronDown" size={14} /></span>
            </button>
          }
        >
          <div className="menu-pad">
            <div style={{ padding: '6px 10px 8px' }}>
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{user.name}</div>
              <div style={{ fontSize: 12, opacity: 0.6 }}>{user.workspace}</div>
            </div>
            <div className="menu-sep" />
            <button className="mi" onClick={() => { setMenu(false); navigate({ name: 'settings', tab: 'general' }); }}><Icon name="user" size={15} />Account settings</button>
            <button className="mi" onClick={() => { setMenu(false); navigate({ name: 'settings', tab: 'usage' }); }}><Icon name="chart" size={15} />Usage & billing</button>
            <button className="mi" onClick={() => { setMenu(false); toggleTheme(); }}><Icon name={theme === 'dark' ? 'sun' : 'moon'} size={15} />{theme === 'dark' ? 'Light' : 'Dark'} theme</button>
            <div className="menu-sep" />
            <button className="mi" onClick={() => { setMenu(false); signOut(); }}><Icon name="logout" size={15} />Sign out</button>
          </div>
        </Popover>
        {nav.map(([label, ic, fn, on, count]) => (
          <button key={label} data-tour={label === 'Projects' ? 'sidebar-projects' : undefined} className={cx('side-btn', on && 'on')} onClick={go(fn)}><Icon name={ic} />{label}{count !== undefined && count > 0 && <span className="count">{count}</span>}</button>
        ))}
        <div className="hr" style={{ margin: '10px 4px' }} />
        <div style={{ padding: '2px 10px 4px', fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', opacity: 0.55 }}>Agent quality</div>
        {([['Simulation Engine', 'network', 'eng-sim'], ['Improvement Engine', 'sparkles', 'eng-imp']] as [string, IconName, string][]).map(([label, ic, id]) => (
          <button key={id} className="side-btn" onClick={go(() => scrollToEngine(id))}><Icon name={ic} /><span className="ellipsis grow">{label}</span><span className="badge-beta">BETA</span></button>
        ))}
        <div className="hr" style={{ margin: '10px 4px' }} />
        {nav2.map(([label, ic, fn, on]) => (
          <button key={label} className={cx('side-btn', on && 'on')} onClick={go(fn)}><Icon name={ic} />{label}</button>
        ))}
        <div className="grow" style={{ minHeight: 12 }} />
        <div style={{ border: '1px solid var(--color-divider)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--color-panel)' }}>
          <div className="row" style={{ justifyContent: 'space-between', fontSize: 12 }}><span style={{ fontWeight: 500 }}>Build credits</span><span style={{ opacity: 0.65 }}>{credits} / {cap}</span></div>
          <div style={{ height: 4, background: 'var(--color-neutral-100)', borderRadius: 2 }}><div style={{ height: '100%', width: `${Math.min(100, (credits / cap) * 100)}%`, background: credits / cap < 0.1 ? 'var(--danger)' : 'var(--color-accent)', borderRadius: 2, transition: 'width .4s' }} /></div>
          <button className="btn btn-primary btn-sm" onClick={go(() => navigate({ name: 'pricing' }))}><Icon name="zap" size={14} />{plan === 'team' ? 'Manage plan' : 'Upgrade'}</button>
        </div>
        <div className="row" style={{ gap: 8, padding: '8px 4px 0' }}>
          <img src="./lyzr.png" alt="by Lyzr" title="Architect by Lyzr" style={{ height: 18, width: 'auto', borderRadius: 4, opacity: 0.8 }} />
          <div className="grow" />
          <button className="ib" onClick={toggleTheme} title="Toggle theme"><Icon name={theme === 'dark' ? 'sun' : 'moon'} /></button>
        </div>
      </aside>
    </>
  );
}
