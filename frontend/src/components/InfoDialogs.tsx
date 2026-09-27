import { useState } from 'react';
import { Icon } from '../icons';
import { useApp, setUi } from '../store';
import { Dialog, Kbd } from './ui';
import { HELP_FAQ, RELEASES } from '../data/constants';
import { modKey } from '../lib/util';

const SERVICES: [string, number][] = [['Builder & coding agent', 99.98], ['Agent runtime', 99.99], ['Published apps (edge)', 100], ['Database', 99.97], ['SMS & voice channels', 99.9], ['Model providers', 99.95]];

export function InfoDialogs() {
  const info = useApp(s => s.ui.info);
  const [open, setOpen] = useState<number | null>(0);
  const [q, setQ] = useState('');
  const close = () => setUi({ info: null });
  if (!info) return null;

  if (info === 'help') {
    const faq = HELP_FAQ.filter(([t, b]) => !q.trim() || (t + b).toLowerCase().includes(q.toLowerCase()));
    return (
      <Dialog open onClose={close} width={560} label="Help Center">
        <div className="row" style={{ gap: 10 }}><span style={{ color: 'var(--color-accent)', display: 'flex' }}><Icon name="book" size={20} /></span><div className="dialog-title grow">Help Center</div><button className="ib" onClick={close} aria-label="Close"><Icon name="x" /></button></div>
        <div className="row input" style={{ gap: 8 }}><Icon name="search" size={15} style={{ opacity: 0.55 }} /><input className="bare grow" placeholder="Search help articles" value={q} onChange={e => setQ(e.target.value)} /></div>
        <div className="col" style={{ border: '1px solid var(--color-divider)', borderRadius: 12, overflow: 'hidden' }}>
          {faq.length === 0 && <div style={{ padding: 18, fontSize: 14, opacity: 0.6 }}>No articles match “{q}”.</div>}
          {faq.map(([t, b], i) => (
            <div key={t} style={{ borderBottom: i < faq.length - 1 ? '1px solid var(--color-divider)' : 0 }}>
              <button className="mi" style={{ borderRadius: 0, padding: '12px 14px', fontWeight: 500, whiteSpace: 'normal' }} onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                <span className="grow">{t}</span><Icon name={open === i ? 'chevronUp' : 'chevronDown'} size={14} />
              </button>
              {open === i && <div style={{ padding: '0 14px 14px', fontSize: 14, lineHeight: 1.6, opacity: 0.8 }}>{b}</div>}
            </div>
          ))}
        </div>
        <div className="col" style={{ gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Keyboard shortcuts</div>
          {[[`${modKey} K`, 'Search and command palette'], ['Enter', 'Send a message'], ['Shift Enter', 'New line in the composer'], [`${modKey} L`, 'Add selected code to chat'], ['Esc', 'Close menus, dialogs and select mode']].map(([k, d]) => (
            <div key={k} className="row" style={{ fontSize: 13.5, gap: 10 }}><span className="grow" style={{ opacity: 0.8 }}>{d}</span><Kbd>{k}</Kbd></div>
          ))}
        </div>
      </Dialog>
    );
  }

  if (info === 'release') {
    return (
      <Dialog open onClose={close} width={540} label="Release notes">
        <div className="row" style={{ gap: 10 }}><span style={{ color: 'var(--color-accent)', display: 'flex' }}><Icon name="news" size={20} /></span><div className="dialog-title grow">Release notes</div><button className="ib" onClick={close} aria-label="Close"><Icon name="x" /></button></div>
        {RELEASES.map((r, i) => (
          <div key={r.v} className="col" style={{ gap: 8, paddingTop: i ? 14 : 0, borderTop: i ? '1px solid var(--color-divider)' : 0 }}>
            <div className="row" style={{ gap: 10 }}><span style={{ fontSize: 20, fontWeight: 650, color: 'var(--color-accent)' }}>v{r.v}</span><span style={{ fontSize: 13, opacity: 0.6 }}>{r.date}</span>{i === 0 && <span className="tag tag-accent">Latest</span>}</div>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.65 }}>{r.items.map(x => <li key={x}>{x}</li>)}</ul>
          </div>
        ))}
      </Dialog>
    );
  }

  return (
    <Dialog open onClose={close} width={520} label="System status">
      <div className="row" style={{ gap: 10 }}><span style={{ color: 'var(--ok)', display: 'flex' }}><Icon name="activity" size={20} /></span><div className="dialog-title grow">All systems operational</div><button className="ib" onClick={close} aria-label="Close"><Icon name="x" /></button></div>
      <div className="col" style={{ gap: 12 }}>
        {SERVICES.map(([name, up], k) => (
          <div key={name} className="col" style={{ gap: 6 }}>
            <div className="row" style={{ fontSize: 13.5 }}><span className="dot" style={{ background: 'var(--ok)', marginRight: 8 }} /><span className="grow">{name}</span><span style={{ opacity: 0.6, fontSize: 12.5 }}>{up}% · 90 days</span></div>
            <div className="row" style={{ gap: 2, height: 22 }}>
              {Array.from({ length: 45 }, (_, i) => {
                const bad = up < 100 && (i * 7 + k * 13) % 41 === 3;
                return <span key={i} title={bad ? 'Minor degradation' : 'Operational'} style={{ flex: 1, height: '100%', borderRadius: 2, background: bad ? 'var(--warn)' : 'color-mix(in srgb, var(--ok) 70%, transparent)' }} />;
              })}
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12.5, opacity: 0.6 }}>Updated {new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</div>
    </Dialog>
  );
}
