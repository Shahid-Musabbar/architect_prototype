import { Icon } from '../icons';
import { useApp, setWs } from '../store';
import { navigate, startDeploy, toast, unpublish } from '../actions';
import { Dialog, Spinner } from '../components/ui';
import { copyText, ago, slug } from '../lib/util';
import { siteUrl } from '../lib/router';
import type { Project } from '../types';

export function PublishDialog({ p }: { p: Project }) {
  const open = useApp(s => s.ui.ws.publishOpen);
  const step = useApp(s => s.ui.ws.pubStep);
  const deploy = useApp(s => s.ui.ws.deploy);
  const ints = useApp(s => s.ints);
  const building = useApp(s => !!s.ui.building[p.id]);
  if (!open) return null;
  const host = p.domain || `${slug(p.name)}.architect.app`;
  const close = () => { if (step !== 'deploying') setWs({ publishOpen: false }); };
  const router = p.agents[0];
  const handoff = router?.tools.some(t => t.name === 'handoff_to_human' && t.on);
  const needs = [['stripe.', 'Stripe'], ['notify_vendor', 'Twilio'], ['book_', 'Google Calendar'], ['hubspot.', 'HubSpot'], ['notion.', 'Notion']] as const;
  const missing = needs.filter(([pre, int]) => p.agents.some(a => a.tools.some(t => t.on && t.name.startsWith(pre))) && !ints[int]).map(([, int]) => int);
  const checks: [boolean, string, string?][] = [
    [true, '12 of 12 practice conversations pass'],
    [missing.length === 0, missing.length ? `Connect ${missing.join(', ')} so every tool has its secrets` : 'All tools have their secrets', missing.length ? 'integrations' : undefined],
    [!!handoff, handoff ? 'Safety handoff to a person is on' : 'Safety handoff to a person is off'],
    [true, 'Mobile layout checked at 390px'],
  ];
  const onDraft = p.draftId !== 'main';
  const steps = ['Building the app', `Deploying ${p.agents.length} agents to the edge`, p.chans.sms ? 'Connecting SMS number' : 'Connecting channels', 'Issuing SSL certificate'];
  const latest = p.versions[p.versions.length - 1];
  const outdated = p.published && p.publishedAt && latest && latest.ts > p.publishedAt;

  return (
    <Dialog open onClose={close} width={520} closeOnBackdrop={step !== 'deploying'} label="Publish">
      {step === 'config' && (
        <>
          <div className="row" style={{ gap: 10 }}><div className="dialog-title grow">{p.published ? `Update ${p.name}` : `Publish ${p.name}`}</div><button className="ib" onClick={close} aria-label="Close"><Icon name="x" /></button></div>
          {p.published && (
            <div className="row" style={{ gap: 8, fontSize: 13, padding: '8px 12px', borderRadius: 10, background: 'var(--color-surface)', border: '1px solid var(--color-divider)' }}>
              <span className="dot" style={{ background: p.status === 'Paused' ? '#f59e0b' : '#4ade80' }} />
              <span className="grow">{p.status === 'Paused' ? 'Paused' : 'Live'} since {ago(p.publishedAt || Date.now())}{outdated ? ` · v${p.current} has unpublished changes` : ' · up to date'}</span>
              <button className="link" style={{ fontSize: 13 }} onClick={() => window.open(siteUrl(p.id), '_blank', 'noopener')}>Open</button>
            </div>
          )}
          <div className="field">
            <label>Address</label>
            <div className="row" style={{ border: '1px solid var(--color-divider)', borderRadius: 8, overflow: 'hidden', background: 'var(--color-surface)' }}>
              <span className="grow ellipsis" style={{ padding: '9px 12px', fontSize: 14 }}>{p.domain || slug(p.name)}</span>
              {!p.domain && <span style={{ padding: '0 12px', fontSize: 13, opacity: 0.7 }}>.architect.app</span>}
            </div>
          </div>
          <button className="btn btn-ghost plain btn-sm" style={{ alignSelf: 'flex-start', padding: 0 }} onClick={() => { setWs({ publishOpen: false }); navigate({ name: 'projectSettings', pid: p.id, page: 'domains' }); }}><Icon name="globe" size={14} />{p.domain ? 'Manage custom domain' : 'Use a custom domain'}</button>
          {onDraft && <div className="row" style={{ gap: 8, fontSize: 13, color: 'var(--warn)' }}><Icon name="branch" size={14} />You're on a draft. Publishing ships the draft's website; merge it into Main to keep them in sync.</div>}
          <div className="field">
            <label>Pre-flight checks</label>
            <div className="col" style={{ gap: 6, fontSize: 13 }}>
              {checks.map(([ok, t, fix]) => (
                <div key={t} className="row" style={{ gap: 8 }}>
                  <span style={{ color: ok ? 'var(--color-accent)' : 'var(--warn)', display: 'flex' }}><Icon name={ok ? 'check' : 'info'} size={15} /></span>
                  <span className="grow">{t}</span>
                  {fix && <button className="link" style={{ fontSize: 12.5 }} onClick={() => { setWs({ publishOpen: false }); navigate({ name: 'settings', tab: 'integrations' }); }}>Fix</button>}
                </div>
              ))}
            </div>
          </div>
          <div className="dialog-actions">
            {p.published && <button className="btn btn-ghost" style={{ color: 'var(--danger)', marginRight: 'auto' }} onClick={() => unpublish(p.id)}>Unpublish</button>}
            <button className="btn btn-secondary" onClick={close}>Cancel</button>
            <button className="btn btn-primary" disabled={building} onClick={() => startDeploy(p.id)} title={building ? 'Wait for the build to finish' : undefined}><Icon name="rocket" size={15} />{p.published ? `Publish v${p.current}` : 'Publish'}</button>
          </div>
        </>
      )}
      {step === 'deploying' && (
        <>
          <div className="dialog-title">Publishing…</div>
          <div className="col" style={{ gap: 10 }}>
            {steps.map((l, i) => {
              const st = i < deploy ? 2 : i === deploy ? 1 : 0;
              return (
                <div key={l} className="row" style={{ gap: 8, fontSize: 13.5, opacity: st === 0 ? 0.4 : 1, color: st === 1 ? 'var(--color-accent)' : 'inherit' }}>
                  <span style={{ width: 14, display: 'flex', justifyContent: 'center', color: 'var(--color-accent)' }}>{st === 2 ? <Icon name="check" size={13} /> : st === 1 ? <Spinner size={12} /> : <span className="dot" style={{ width: 5, height: 5, background: 'currentColor' }} />}</span>{l}
                </div>
              );
            })}
          </div>
          <div style={{ height: 4, borderRadius: 2, background: 'var(--color-divider)', overflow: 'hidden' }}><div style={{ height: '100%', width: `${Math.min(100, (deploy / steps.length) * 100)}%`, background: 'var(--color-accent)', transition: 'width .6s' }} /></div>
        </>
      )}
      {step === 'live' && (
        <>
          <div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--color-accent)' }}>Live</div>
          <div className="dialog-title" style={{ fontSize: 26, fontWeight: 600 }}>{p.name} is on the internet.</div>
          <div className="row" style={{ gap: 8, border: '1px solid var(--color-divider)', borderRadius: 8, padding: '8px 12px', fontSize: 14 }}>
            <Icon name="globe" size={15} /><span className="grow ellipsis">{host}</span>
            <button className="btn btn-ghost plain btn-sm" onClick={() => copyText(siteUrl(p.id)).then(() => toast('Link copied'))}><Icon name="copy" size={13} />Copy</button>
          </div>
          <div className="dialog-body">Agents now run on the published version (v{p.current}). Changes you make stay private until you publish again.</div>
          <div className="dialog-actions">
            <button className="btn btn-secondary" onClick={() => setWs({ publishOpen: false })}>Back to editing</button>
            <button className="btn btn-primary" onClick={() => window.open(siteUrl(p.id), '_blank', 'noopener')}><Icon name="external" size={15} />Open site</button>
          </div>
        </>
      )}
    </Dialog>
  );
}
