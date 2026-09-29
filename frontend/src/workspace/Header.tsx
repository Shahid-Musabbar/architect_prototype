import { useState, type ReactNode } from 'react';
import { Icon, type IconName } from '../icons';
import { useApp, setState, setWs, updateProject } from '../store';
import { discardDraft, invite, mergeDraft, navigate, newDraft, openPublish, setInviteRole, switchDraft, toast, toggleTheme, validEmail } from '../actions';
import { Avatar, Logo, Popover } from '../components/ui';
import { copyText, cx, slug } from '../lib/util';
import { siteUrl } from '../lib/router';
import type { Project, WsTab, Layout } from '../types';

const TABS: [WsTab, string, IconName][] = [['preview', 'Preview', 'eye'], ['agents', 'Agents', 'network'], ['code', 'Code', 'code'], ['database', 'Database', 'database']];
const ROUTES = ['/', '/pricing', '/login', '/dashboard'];

export function Header({ p, narrow }: { p: Project; narrow: boolean }) {
  const tab = useApp(s => s.ui.ws.tab);
  const paneHidden = useApp(s => s.ui.ws.paneHidden);
  const sitePath = useApp(s => s.ui.ws.sitePath);
  const device = useApp(s => s.ui.ws.device);
  const layout = useApp(s => s.layout);
  const side = useApp(s => s.paneSide);
  const theme = useApp(s => s.theme);
  const user = useApp(s => s.user);
  const plan = useApp(s => s.plan);
  const building = useApp(s => !!s.ui.building[p.id]);
  const [drafts, setDrafts] = useState(false);
  const onDraft = p.draftId !== 'main';
  const draft = p.drafts.find(d => d.id === p.draftId);
  const host = `${onDraft ? 'preview-' + slug(p.name) + '--' + slug(draft?.name || '') : p.published ? slug(p.name) : 'preview-' + slug(p.name)}.architect.app`;

  return (
    <header className="row" style={{ gap: 8, padding: '8px 12px', flex: 'none', position: 'relative', zIndex: 30, minWidth: 0 }}>
      <button onClick={() => navigate({ name: 'home' })} title="Home" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', display: 'flex', flex: 'none' }}><Logo size={26} /></button>
      {!narrow && (
        <>
          <span style={{ opacity: 0.3, fontSize: 18 }}>/</span>
          <button onClick={() => navigate({ name: 'projects', filter: 'all' })} title={`${user.workspace} · all projects`} className="row" style={{ gap: 4, background: 'none', border: 0, cursor: 'pointer', padding: 0 }}><Avatar text={user.name} size={24} radius={12} /><span style={{ opacity: 0.5, display: 'flex' }}><Icon name="updown" size={14} /></span></button>
        </>
      )}
      <span style={{ opacity: 0.3, fontSize: 18 }}>/</span>
      <Popover
        open={drafts}
        onClose={() => setDrafts(false)}
        wrapStyle={{ flexShrink: 0 }}
        style={{ top: 'calc(100% + 8px)', left: 0, width: 340 }}
        anchor={
          <button data-tour="draft-dropdown" onClick={() => setDrafts(!drafts)} className="row" style={{ gap: 8, padding: '5px 10px', borderRadius: 10, border: 0, background: drafts ? 'var(--color-neutral-100)' : 'none', cursor: 'pointer', minWidth: 0 }} aria-haspopup="menu" aria-expanded={drafts}>
            <span className="ellipsis" style={{ fontSize: 14, fontWeight: 600, maxWidth: narrow ? 110 : 180 }}>{p.name}</span>
            <span className="nowrap" style={{ fontSize: 13, opacity: 0.6 }}>{onDraft ? draft?.name : 'Main'}</span>
            <span style={{ opacity: 0.6, display: 'flex' }}><Icon name={drafts ? 'chevronDown' : 'updown'} size={14} /></span>
          </button>
        }
      >
        <div style={{ padding: 8 }}>
          <button className={cx('mi', !onDraft && 'active')} onClick={() => { switchDraft(p.id, 'main'); setDrafts(false); }}>
            <span className="dot" style={{ background: !onDraft ? '#22c55e' : 'color-mix(in srgb,var(--color-text) 35%,transparent)' }} />
            <span className="grow ellipsis" style={{ fontWeight: 600 }}>{p.name}</span><span style={{ fontSize: 11, opacity: 0.55 }}>Main</span>
            <span role="button" tabIndex={0} title="Project settings" onClick={e => { e.stopPropagation(); setDrafts(false); navigate({ name: 'projectSettings', pid: p.id, page: 'general' }); }} style={{ opacity: 0.6, display: 'flex' }}><Icon name="gear" size={15} /></span>
          </button>
          <div style={{ fontSize: 12, opacity: 0.55, padding: '10px 12px 6px' }}>Drafts</div>
          {p.drafts.filter(d => d.id !== 'main').map(d => (
            <div key={d.id} className={cx('mi', d.id === p.draftId && 'active')} style={{ cursor: 'pointer' }} onClick={() => { switchDraft(p.id, d.id); setDrafts(false); }} role="button" tabIndex={0}>
              <span className="dot" style={{ background: d.id === p.draftId ? '#ef4444' : 'color-mix(in srgb,var(--color-text) 35%,transparent)' }} />
              <span className="grow">{d.name}</span><span style={{ fontSize: 11, opacity: 0.55 }}>{d.id === p.draftId ? 'Viewing' : ''}</span>
              <button className="ib sm" title={`Discard ${d.name}`} onClick={e => { e.stopPropagation(); setDrafts(false); discardDraft(p.id, d.id); }}><Icon name="trash" size={13} /></button>
            </div>
          ))}
          {p.drafts.length === 1 && <div style={{ fontSize: 13, opacity: 0.6, padding: '4px 12px 8px', lineHeight: 1.5 }}>Try an idea without touching Main. Each draft has its own preview.</div>}
        </div>
        <div className="row" style={{ gap: 8, padding: '10px 12px', borderTop: '1px solid var(--color-divider)' }}>
          <span style={{ opacity: 0.55, display: 'flex' }} title="Drafts are branches of your project"><Icon name="help" size={15} /></span>
          <div className="grow" />
          <button className="chip" disabled={!onDraft} style={{ opacity: onDraft ? 1 : 0.45, cursor: onDraft ? 'pointer' : 'default' }} onClick={() => { setDrafts(false); mergeDraft(p.id); }}>{onDraft ? 'Merge into Main' : 'Update'}</button>
          <button className="chip" onClick={() => { setDrafts(false); newDraft(p.id); }}><Icon name="plus" size={14} />New draft</button>
        </div>
      </Popover>
      <button className={cx('ib', tab === 'history' && 'on')} onClick={() => setWs({ tab: 'history', editAgent: null })} title="Version history"><Icon name="history" /></button>
      <button className="ib" onClick={() => setWs({ paneHidden: !paneHidden })} title={paneHidden ? 'Show chat' : 'Hide chat'}><Icon name={side === 'left' ? 'panelLeft' : 'panelRight'} /></button>
      <div className="row" style={{ gap: 2, padding: 3, border: '1px solid var(--color-divider)', borderRadius: 999, marginLeft: 4 }} role="tablist">
        {TABS.map(([id, label, ic]) => {
          const a = tab === id;
          return (
            <button key={id} role="tab" aria-selected={a} title={label} onClick={() => setWs(id === 'agents' ? { tab: id } : { tab: id, editAgent: null })}
              className="row" style={{ gap: 6, height: 28, padding: a ? '0 12px' : '0 9px', borderRadius: 999, border: 0, background: a ? 'color-mix(in srgb,var(--color-accent) 22%,transparent)' : 'none', color: a ? 'var(--color-accent-700)' : 'inherit', fontSize: 13.5, fontWeight: 500, cursor: 'pointer', position: 'relative', opacity: a ? 1 : 0.75, whiteSpace: 'nowrap' }}>
              <Icon name={ic} size={15} />{a && !narrow && <span>{label}</span>}
              {id === 'database' && <span style={{ position: 'absolute', top: 4, right: 6, width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />}
            </button>
          );
        })}
      </div>
      <button className="ib" onClick={() => navigate({ name: 'projectSettings', pid: p.id, page: 'general' })} title="Project settings"><Icon name="gear" /></button>
      <div style={{ flex: '0 1 24px', minWidth: 4 }} />
      {tab === 'preview' && (
        <div className="row" style={{ gap: 2, flex: '1 1 auto', minWidth: 0, maxWidth: 440, height: 34, padding: '0 6px 0 12px', border: '1px solid var(--color-divider)', borderRadius: 999 }}>
          {!narrow && <span className="ellipsis" style={{ fontSize: 12.5, opacity: 0.5, maxWidth: 190 }} title={host}>{host}</span>}
          <select className="bare" value={sitePath} onChange={e => setWs({ sitePath: e.target.value })} style={{ flex: '1 1 60px', minWidth: 56, fontSize: 13 }} aria-label="Page">
            {ROUTES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <button className="ib" onClick={() => setWs(w => ({ reloadKey: w.reloadKey + 1 }))} title="Reload"><Icon name="refresh" size={15} /></button>
          {!narrow && <button className="ib" disabled={!p.appReady} onClick={() => window.open(siteUrl(p.id, sitePath), '_blank', 'noopener')} title="Open in new tab"><Icon name="external" size={15} /></button>}
          <button className="ib" onClick={() => setWs({ device: device === 'mobile' ? 'desktop' : 'mobile' })} title={device === 'mobile' ? 'Phone view · switch to desktop' : 'Desktop view · switch to phone'}><Icon name={device === 'mobile' ? 'phone' : 'monitor'} size={15} /></button>
          {!narrow && <button className={cx('ib', paneHidden && 'on')} onClick={() => setWs({ paneHidden: !paneHidden })} title={paneHidden ? 'Exit full width' : 'Full width preview'}><Icon name="expand" size={15} /></button>}
        </div>
      )}
      <div className="grow" style={{ minWidth: 8 }} />
      {!narrow && (
        <>
          <div className="row" style={{ border: '1px solid var(--color-divider)', borderRadius: 8, overflow: 'hidden', flex: 'none' }} title="Workspace layout" role="radiogroup">
            {([['Split', side === 'left' ? 'panelLeft' : 'panelRight', 'Chat beside preview'], ['Focus', 'panelBottom', 'Floating chat over preview'], ['Studio', 'columns', 'Chat, preview and inspector']] as [Layout, IconName, string][]).map(([id, ic, title], k) => {
              const a = layout === id;
              return <button key={id} role="radio" aria-checked={a} title={title} onClick={() => { setState({ layout: id }); setWs({ paneHidden: false }); }} style={{ width: 34, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 0, borderLeft: k ? '1px solid var(--color-divider)' : 0, background: a ? 'color-mix(in srgb,var(--color-accent) 18%,transparent)' : 'none', color: a ? 'var(--color-accent)' : 'inherit', boxShadow: a ? 'inset 0 0 0 1.5px var(--color-accent)' : 'none', cursor: 'pointer', opacity: a ? 1 : 0.75 }}><Icon name={ic} size={15} /></button>;
            })}
          </div>
          <button className="ib" onClick={() => navigate({ name: 'settings', tab: 'integrations' })} title="GitHub sync"><Icon name="github" /></button>
          <button className="ib" onClick={toggleTheme} title="Toggle theme"><Icon name={theme === 'dark' ? 'sun' : 'moon'} /></button>
        </>
      )}
      {tab === 'agents' && !narrow && <button className="btn btn-secondary btn-sm" onClick={() => { window.open('https://studio.lyzr.ai', '_blank', 'noopener'); }} title="Open in Agent Studio"><Icon name="external" size={14} />Agent Studio</button>}
      {plan !== 'team' && <button className="btn btn-invert btn-sm" onClick={() => navigate({ name: 'pricing' })}>Upgrade</button>}
      <SharePopover p={p} />
      <button data-tour="publish-btn" className="btn btn-primary btn-sm" onClick={openPublish} disabled={building && !p.appReady}>
        {p.published ? <><span className="dot" style={{ background: p.status === 'Paused' ? '#f59e0b' : '#4ade80' }} />Published</> : 'Publish'}
      </button>
    </header>
  );
}

function SharePopover({ p }: { p: Project }) {
  const user = useApp(s => s.user);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'edit' | 'view'>('edit');
  const ok = validEmail(email);
  const send = () => { if (ok && invite(p.id, email, role)) setEmail(''); };
  const link = `${location.href.split('#')[0]}#/p/${p.id}?invite=${p.linkAccess}`;
  return (
    <Popover
      open={open}
      onClose={() => setOpen(false)}
      style={{ right: 0, top: 44, width: 420, maxWidth: 'calc(100vw - 24px)', borderRadius: 16 }}
      anchor={<button className="btn btn-secondary btn-sm" style={{ background: 'var(--color-surface)' }} onClick={() => setOpen(!open)} aria-haspopup="dialog" aria-expanded={open}>Share</button>}
    >
      <div className="col" style={{ padding: '18px 18px 14px', gap: 14 }}>
        <div className="row" style={{ gap: 10 }}>
          <span style={{ fontSize: 17, fontWeight: 600 }} className="grow">Share project</span>
          <button className="row link plain" style={{ gap: 6, fontSize: 13.5, opacity: p.linkAccess === 'off' ? 0.45 : 0.85, cursor: p.linkAccess === 'off' ? 'default' : 'pointer' }} onClick={() => { if (p.linkAccess === 'off') { toast('Turn on the invite link first', 'warn'); return; } copyText(link).then(() => toast('Invite link copied')); }}><Icon name="link" size={15} />Copy invite link</button>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <div className="row grow" style={{ border: '1px solid ' + (email && !ok ? 'var(--danger)' : 'var(--color-divider)'), borderRadius: 10, background: 'var(--color-surface)', padding: '0 4px 0 12px' }}>
            <input className="bare grow" style={{ height: 40, fontSize: 14 }} placeholder="Invite by email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send(); }} aria-label="Email to invite" />
            <select className="bare" style={{ fontSize: 13, opacity: 0.75 }} value={role} onChange={e => setRole(e.target.value as 'edit' | 'view')} aria-label="Role"><option value="edit">Can edit</option><option value="view">Can view</option></select>
          </div>
          <button className="btn btn-primary" style={{ height: 42 }} disabled={!ok} onClick={send}>Invite</button>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <span style={{ display: 'flex', opacity: 0.8 }}><Icon name={p.linkAccess === 'off' ? 'x' : 'link'} size={17} /></span>
          <select className="bare" style={{ fontSize: 14, fontWeight: 600 }} value={p.linkAccess} onChange={e => { const v = e.target.value as Project['linkAccess']; updateProject(p.id, { linkAccess: v }, false); toast(v === 'off' ? 'Invite link disabled' : 'Invite link enabled'); }} aria-label="Link access">
            <option value="off">Invite link disabled</option><option value="view">Anyone with the link can view</option><option value="edit">Anyone with the link can edit</option>
          </select>
        </div>
        <div className="col" style={{ gap: 6, maxHeight: 230, overflowY: 'auto' }}>
          <Member email={user.email} you i={0} right={<span style={{ fontSize: 13.5, opacity: 0.65 }}>Owner</span>} />
          {p.invites.map((x, i) => (
            <Member key={x.email} email={x.email} i={i + 1} pending right={
              <select className="bare" style={{ fontSize: 13.5, opacity: 0.75 }} value={x.role} onChange={e => setInviteRole(p.id, x.email, e.target.value as 'edit' | 'view' | 'remove')} aria-label={`Role for ${x.email}`}>
                <option value="edit">Can edit</option><option value="view">Can view</option><option value="remove">Remove</option>
              </select>
            } />
          ))}
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 600, opacity: 0.6, marginTop: 2 }}>General project access</div>
        <div className="row" style={{ gap: 12, padding: '10px 12px', border: '1px solid var(--color-divider)', borderRadius: 12, background: 'var(--color-surface)' }}>
          <Avatar text={user.workspace} size={38} i={6} radius={9} />
          <div className="col grow" style={{ gap: 1 }}><span className="ellipsis" style={{ fontSize: 14, fontWeight: 600 }}>{user.workspace}</span><span style={{ fontSize: 12, opacity: 0.6 }}>{p.wsAccess === 'none' ? 'Only people invited above' : 'People in this workspace'}</span></div>
          <select className="bare" style={{ fontSize: 13.5, opacity: 0.75 }} value={p.wsAccess} onChange={e => updateProject(p.id, { wsAccess: e.target.value as Project['wsAccess'] }, false)} aria-label="Workspace access"><option value="edit">Can edit</option><option value="view">Can view</option><option value="none">No access</option></select>
        </div>
      </div>
      <div style={{ borderTop: '1px solid var(--color-divider)', padding: '14px 18px 16px' }}>
        <button className="btn btn-secondary btn-block" style={{ height: 42 }} disabled={!p.appReady} onClick={() => { setOpen(false); copyText(siteUrl(p.id)).then(() => toast('Preview link copied')); }}><Icon name="copy" size={15} />Copy preview link</button>
      </div>
    </Popover>
  );
}

function Member({ email, you, pending, right, i }: { email: string; you?: boolean; pending?: boolean; right: ReactNode; i: number }) {
  return (
    <div className="row" style={{ gap: 12, padding: '10px 12px', border: '1px solid var(--color-divider)', borderRadius: 12, background: 'var(--color-surface)' }}>
      <Avatar text={email} size={38} i={i} radius={9} />
      <div className="col grow" style={{ gap: 1 }}>
        <span className="ellipsis" style={{ fontSize: 14, fontWeight: 600 }}>{email}{you && <span style={{ fontWeight: 400, opacity: 0.55 }}> (You)</span>}</span>
        {pending && <span style={{ fontSize: 12, opacity: 0.55 }}>Invite sent · pending</span>}
      </div>
      {right}
    </div>
  );
}
