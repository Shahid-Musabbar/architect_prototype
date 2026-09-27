import { useRef, useState, type CSSProperties } from 'react';
import { Icon, type IconName } from '../icons';
import { useApp } from '../store';
import { resetWidget, sendWidget } from '../actions';
import { useStickToBottom } from '../components/ui';
import { templateById } from '../data/templates';
import { widgetTitle } from '../lib/factory';
import { validEmail } from '../actions';
import type { Project } from '../types';

const FEATURE_ICONS: IconName[] = ['wrench', 'card', 'book', 'bot', 'zap', 'shield'];

export function Site({ p, path, go, compact }: { p: Project; path: string; go: (path: string) => void; compact?: boolean }) {
  const pv = p.pv;
  const tpl = templateById(p.templateId);
  const rootRef = useRef<HTMLDivElement>(null);
  const style = {
    background: 'var(--color-bg)', color: 'var(--color-text)', minHeight: '100%', fontFamily: 'var(--font-body)',
    ...(pv.accent ? { '--color-accent': pv.accent, '--color-accent-700': pv.accent, '--color-accent-600': pv.accent, '--color-accent-100': `color-mix(in srgb, ${pv.accent} 12%, transparent)` } : {}),
  } as CSSProperties;
  const scrollTo = (sel: string) => {
    const el = rootRef.current?.querySelector(sel) as HTMLElement | null;
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return el;
  };
  const tryIt = () => {
    if (path !== '/') { go('/'); setTimeout(() => (scrollTo('[data-sel="widget"] input') as HTMLInputElement | null)?.focus(), 80); return; }
    const el = scrollTo('[data-sel="widget"] input') as HTMLInputElement | null;
    setTimeout(() => el?.focus({ preventScroll: true }), 300);
  };
  const pad = compact ? 20 : 40;

  return (
    <div ref={rootRef} data-paper="" data-dark={pv.dark ? '' : undefined} style={style}>
      <nav data-sel="nav" className="row" style={{ gap: compact ? 14 : 24, padding: `14px ${compact ? 20 : 32}px`, borderBottom: '1px solid var(--color-divider)', flexWrap: 'wrap' }}>
        <button onClick={() => go('/')} style={{ fontSize: 19, fontWeight: 650, letterSpacing: '-.02em', marginRight: 'auto', background: 'none', border: 0, padding: 0, cursor: 'pointer' }}>{p.name}</button>
        {!compact && <button className="link plain" style={{ fontSize: 13, opacity: 1 }} onClick={() => (path === '/' ? scrollTo('[data-sel="features"]') : go('/'))}>How it works</button>}
        <button className="link plain" style={{ fontSize: 13, opacity: path === '/pricing' ? 1 : 0.85, fontWeight: path === '/pricing' ? 600 : 400 }} onClick={() => go('/pricing')}>Pricing</button>
        {pv.navLogin && <button className="link plain" style={{ fontSize: 13, opacity: 1 }} onClick={() => go('/login')}>Log in</button>}
        <button className="btn btn-secondary" style={{ fontSize: 13, padding: '5px 12px' }} onClick={() => go(path === '/dashboard' ? '/' : '/login')}>{path === '/dashboard' ? 'Sign out' : 'Sign in'}</button>
      </nav>

      {p.status === 'Paused' && (
        <div className="row" style={{ gap: 8, padding: '8px 16px', fontSize: 13, background: 'color-mix(in srgb, #f59e0b 14%, transparent)', justifyContent: 'center' }}><Icon name="info" size={14} />This assistant is paused by its owner. Replies are turned off for now.</div>
      )}

      {path === '/' && (
        <>
          <section style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit,minmax(300px,1fr))', gap: compact ? 28 : 40, padding: `${compact ? 36 : 56}px ${pad}px 48px`, alignItems: 'center' }}>
            <div className="col" style={{ gap: 16 }}>
              <div data-sel="kicker" style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--color-accent-700)', fontWeight: 600 }}>{pv.kicker}</div>
              <h1 data-sel="hero-title" style={{ margin: 0, fontSize: compact ? Math.min(pv.size, 36) : pv.size, lineHeight: 1.04, fontWeight: 650, letterSpacing: '-.03em', textWrap: 'balance', transition: 'font-size .4s' }}>{pv.title}</h1>
              <p data-sel="hero-sub" style={{ margin: 0, fontSize: 16, lineHeight: 1.6, maxWidth: 460, opacity: 0.85 }}>{pv.sub}</p>
              <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
                <button data-sel="cta" className={pv.ctaSolid ? 'btn btn-primary' : 'btn btn-secondary'} onClick={tryIt}>{pv.cta}</button>
                {!pv.cta2Hidden && <button data-sel="cta-2" className="btn btn-ghost plain" onClick={() => scrollTo('[data-sel="features"]')}>See how it works<Icon name="arrowRight" size={14} /></button>}
              </div>
            </div>
            <Widget p={p} />
          </section>
          <div data-sel="features" style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit,minmax(200px,1fr))', borderTop: '1px solid var(--color-divider)', margin: `0 ${pad}px` }}>
            {pv.features.map(([k, h, b], i) => (
              <div key={i} style={{ padding: compact ? '20px 0' : i === 0 ? '24px 24px 32px 0' : '24px 24px 32px', borderLeft: !compact && i ? '1px solid var(--color-divider)' : 0, borderTop: compact && i ? '1px solid var(--color-divider)' : 0 }}>
                <div className="row" style={{ gap: 8, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--color-accent-700)', fontWeight: 600 }}>
                  {pv.featureIcons && <span style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--color-accent-100)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={FEATURE_ICONS[i % FEATURE_ICONS.length]} size={14} /></span>}{k}
                </div>
                <h3 style={{ margin: '10px 0 8px', fontSize: 20 }}>{h}</h3>
                <p style={{ margin: 0, fontSize: 14, opacity: 0.8 }}>{b}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {path === '/pricing' && <SitePricing p={p} onStart={tryIt} compact={compact} />}
      {path === '/login' && <SiteLogin p={p} go={go} />}
      {path === '/dashboard' && <SiteDashboard p={p} compact={compact} />}
      {!['/', '/pricing', '/login', '/dashboard'].includes(path) && (
        <div className="col" style={{ alignItems: 'center', gap: 10, padding: '96px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: '-.04em', color: 'var(--color-accent-700)' }}>404</div>
          <div style={{ fontSize: 16 }}>There’s no page at <span className="mono">{path}</span>.</div>
          <button className="btn btn-secondary" onClick={() => go('/')}>Back to {tpl.app.toLowerCase()}</button>
        </div>
      )}

      <footer data-sel="footer" className="row" style={{ justifyContent: 'space-between', padding: `18px ${pad}px`, borderTop: '1px solid var(--color-divider)', fontSize: 12, marginTop: 24, gap: 12, flexWrap: 'wrap' }}>
        <span style={{ opacity: 0.7 }}>© 2026 {p.name}</span>
        {pv.footerSocial && (
          <span className="row" style={{ gap: 12, opacity: 0.8 }}>
            {(['github', 'globe', 'mail'] as IconName[]).map(ic => <span key={ic} style={{ display: 'flex' }}><Icon name={ic} size={15} /></span>)}
          </span>
        )}
        <span style={{ opacity: 0.7 }}>Built with Architect</span>
      </footer>
    </div>
  );
}

function Widget({ p }: { p: Project }) {
  const typing = useApp(s => s.ui.typing['w:' + p.id]);
  const exp = useApp(s => s.exp);
  const [input, setInput] = useState('');
  const tpl = templateById(p.templateId);
  const scrollRef = useStickToBottom<HTMLDivElement>([p.widget.length, typing]);
  const send = () => { if (!input.trim() || typing) return; sendWidget(p.id, input); setInput(''); };
  const bubble = (u: boolean): CSSProperties => u
    ? { alignSelf: 'flex-end', maxWidth: '85%', background: 'var(--color-text)', color: 'var(--color-bg)', padding: '7px 11px', borderRadius: 10, fontSize: 13, lineHeight: 1.45 }
    : { alignSelf: 'flex-start', maxWidth: '88%', background: 'var(--color-surface)', border: '1px solid var(--color-divider)', padding: '7px 11px', borderRadius: 10, fontSize: 13, lineHeight: 1.45 };
  const avatar = <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--color-accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', fontSize: 11, fontWeight: 700 }}>{p.name.charAt(0)}</span>;
  return (
    <div data-sel="widget" className="card" style={{ background: 'var(--color-bg)', padding: 0, gap: 0, maxWidth: p.pv.widgetWide ? 540 : 420, width: '100%', justifySelf: 'center', boxShadow: 'var(--shadow-md)', transition: 'max-width .3s' }}>
      <div className="row" style={{ gap: 8, padding: '12px 14px', borderBottom: '1px solid var(--color-divider)' }}>
        {p.pv.widgetAvatar ? avatar : <span className="dot" style={{ background: p.status === 'Paused' ? '#f59e0b' : '#5f8a4e' }} />}
        <span style={{ fontSize: 15, fontWeight: 600 }}>{widgetTitle(tpl, p.name)}</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.6 }}>{p.status === 'Paused' ? 'Paused' : 'Replies in seconds'}</span>
        {p.widget.length > 1 && <button className="ib sm" title="Restart conversation" onClick={() => resetWidget(p.id)} style={{ opacity: 0.6 }}><Icon name="refresh" size={13} /></button>}
      </div>
      <div ref={scrollRef} className="col" style={{ height: 240, overflow: 'auto', padding: '12px 14px', gap: 10 }}>
        {p.widget.map((w, i) => (
          <div key={i} className="row" style={{ gap: 8, alignItems: 'flex-end', alignSelf: w.r === 'u' ? 'flex-end' : 'flex-start', maxWidth: '100%' }}>
            {p.pv.widgetAvatar && w.r === 'a' && avatar}
            <div style={bubble(w.r === 'u')}>
              {i === 0 && w.r === 'a' ? p.pv.greeting : w.t}
              {w.trace && <div style={{ fontSize: 10.5, marginTop: 4, color: 'var(--color-accent-700)' }}>{w.trace}</div>}
            </div>
          </div>
        ))}
        {typing && <div className="row" style={{ gap: 8, fontSize: 12, opacity: 0.6 }}><span className="typing-dots"><span /><span /><span /></span>{p.agents[0]?.name} is typing…</div>}
      </div>
      <div style={{ padding: '6px 10px 0', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {p.widget.length <= 1 && tpl.samples.slice(0, 3).map(s => <button key={s} className="chip" style={{ fontSize: 11.5, padding: '3px 9px', fontWeight: 400 }} onClick={() => sendWidget(p.id, s)}>{s}</button>)}
      </div>
      <form className="row" style={{ gap: 6, padding: 10 }} onSubmit={e => { e.preventDefault(); send(); }}>
        <input className="input" value={input} onChange={e => setInput(e.target.value)} placeholder={tpl.site.placeholder} aria-label="Message" style={{ fontSize: 13, background: 'var(--color-bg)' }} />
        <button type="submit" className="btn btn-primary btn-icon" style={{ flex: 'none' }} disabled={!input.trim() || !!typing} aria-label="Send"><Icon name="arrowUp" /></button>
      </form>
      {exp === 'pro' && <div style={{ fontSize: 10.5, opacity: 0.5, padding: '0 12px 8px' }}>Pro mode · traces shown under each reply</div>}
    </div>
  );
}

function SitePricing({ p, onStart, compact }: { p: Project; onStart: () => void; compact?: boolean }) {
  const tiers: [string, string, string, string[]][] = [
    ['Starter', '$0', 'For trying it out', ['100 conversations / month', 'Website chat', 'Email support']],
    ['Growth', '$49', 'For a growing business', ['2,000 conversations / month', 'Website chat and SMS', 'Handoff to your team', 'Analytics']],
    ['Scale', '$199', 'For multiple locations', ['Unlimited conversations', 'All channels', 'SSO and audit log', 'Priority support']],
  ];
  return (
    <section className="col" style={{ padding: `${compact ? 36 : 56}px ${compact ? 20 : 40}px 24px`, gap: 28, alignItems: 'center' }}>
      <div className="col" style={{ gap: 8, alignItems: 'center', textAlign: 'center' }}>
        <div style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--color-accent-700)', fontWeight: 600 }}>Pricing</div>
        <h1 style={{ margin: 0, fontSize: compact ? 30 : 40, letterSpacing: '-.03em' }}>Simple plans for {p.name}</h1>
        <p style={{ margin: 0, opacity: 0.75 }}>Start free. Upgrade when your customers love it.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit,minmax(220px,1fr))', gap: 14, width: '100%', maxWidth: 900 }}>
        {tiers.map(([n, price, d, f], i) => (
          <div key={n} className="card" style={{ padding: 20, gap: 10, borderColor: i === 1 ? 'var(--color-accent)' : undefined }}>
            <div className="card-title" style={{ fontSize: 18 }}>{n}</div>
            <div><span style={{ fontSize: 34, fontWeight: 700 }}>{price}</span><span style={{ opacity: 0.6, fontSize: 13 }}> / month</span></div>
            <div style={{ fontSize: 13.5, opacity: 0.7 }}>{d}</div>
            {f.map(x => <div key={x} className="row" style={{ gap: 8, fontSize: 13.5 }}><span style={{ color: 'var(--color-accent-700)', display: 'flex' }}><Icon name="check" size={14} /></span>{x}</div>)}
            <button className={i === 1 ? 'btn btn-primary' : 'btn btn-secondary'} style={{ marginTop: 8 }} onClick={onStart}>{p.pv.cta}</button>
          </div>
        ))}
      </div>
    </section>
  );
}

function SiteLogin({ p, go }: { p: Project; go: (path: string) => void }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const ok = validEmail(email);
  return (
    <section className="row" style={{ justifyContent: 'center', padding: '64px 20px' }}>
      <div className="col" style={{ width: '100%', maxWidth: 380, gap: 14 }}>
        <h1 style={{ margin: 0, fontSize: 30, letterSpacing: '-.03em' }}>Sign in to {p.name}</h1>
        {sent ? (
          <>
            <p style={{ margin: 0, opacity: 0.75 }}>We sent a sign-in link to <strong>{email}</strong>. For this preview you can continue straight away.</p>
            <button className="btn btn-primary" onClick={() => go('/dashboard')}>Open dashboard</button>
            <button className="link plain" style={{ alignSelf: 'flex-start', fontSize: 13 }} onClick={() => setSent(false)}>Use a different email</button>
          </>
        ) : (
          <form className="col" style={{ gap: 12 }} onSubmit={e => { e.preventDefault(); if (ok) setSent(true); }}>
            <p style={{ margin: 0, opacity: 0.75 }}>Use your email to get a secure sign-in link.</p>
            <div className="field"><label>Email</label><input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={{ background: 'var(--color-bg)' }} /></div>
            <button type="submit" className="btn btn-primary" disabled={!ok}>Email me a link</button>
            <button type="button" className="btn btn-secondary" onClick={() => go('/dashboard')}><Icon name="globe" />Continue with Google</button>
          </form>
        )}
      </div>
    </section>
  );
}

function SiteDashboard({ p, compact }: { p: Project; compact?: boolean }) {
  const tpl = templateById(p.templateId);
  const main = p.db[tpl.mainTable];
  const conv = p.db.conversations?.count ?? 0;
  const kpis: [string, string][] = [[conv.toLocaleString(), 'conversations'], [String(main?.count ?? 0), tpl.mainTable.replace(/_/g, ' ')], [String(p.agents.length), 'agents working']];
  return (
    <section className="col" style={{ padding: `${compact ? 28 : 40}px ${compact ? 20 : 40}px 8px`, gap: 20 }}>
      <div><h1 style={{ margin: 0, fontSize: 28, letterSpacing: '-.03em' }}>Dashboard</h1><div style={{ opacity: 0.65, fontSize: 14 }}>Live data from your agents</div></div>
      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(3,minmax(0,1fr))', gap: 12 }}>
        {kpis.map(([v, l]) => <div key={l} className="card" style={{ padding: 16 }}><div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-.02em' }}>{v}</div><div style={{ fontSize: 13, opacity: 0.65 }}>{l}</div></div>)}
      </div>
      {main && (
        <div className="card" style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', fontWeight: 600, fontSize: 14, borderBottom: '1px solid var(--color-divider)', textTransform: 'capitalize' }}>Recent {tpl.mainTable.replace(/_/g, ' ')}</div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ fontSize: 13 }}>
              <thead><tr>{main.cols.slice(0, compact ? 3 : 6).map(([c]) => <th key={c}>{c.replace(/_/g, ' ')}</th>)}</tr></thead>
              <tbody>{main.rows.slice(0, 6).map((r, i) => <tr key={i}>{r.slice(0, compact ? 3 : 6).map((c, j) => <td key={j} style={{ opacity: c === 'NULL' ? 0.4 : 1 }}>{c === 'NULL' ? '—' : c}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
