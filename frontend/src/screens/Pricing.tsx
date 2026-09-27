import { useState } from 'react';
import { Icon } from '../icons';
import { useApp, setState } from '../store';
import { buyCredits, choosePlan } from '../actions';
import { Seg } from '../components/ui';
import { PLANS } from '../data/constants';
import { cx } from '../lib/util';

const FAQ: [string, string][] = [
  ["What's a credit?", 'One build step: writing a file, wiring a tool, running a batch of evals. A new agent app takes 15–25.'],
  ['Visual edits are cheap', 'A batch of notes from Select mode costs one credit, however many notes are in it.'],
  ['Your keys, your bill', 'Add your own model keys and agent runs bill straight to your provider account.'],
];

export function Pricing() {
  const billing = useApp(s => s.billing);
  const plan = useApp(s => s.plan);
  const [seats, setSeats] = useState(3);
  const rank = (id: string) => PLANS.findIndex(p => p.id === id);
  return (
    <div className="shell-main">
      <div className="col" style={{ maxWidth: 1080, margin: '0 auto', padding: '56px 24px 72px', gap: 32, alignItems: 'center' }}>
        <div className="col" style={{ textAlign: 'center', gap: 12, alignItems: 'center' }}>
          <h1 style={{ fontSize: 'clamp(34px,4.5vw,52px)', margin: 0, lineHeight: 1.04, textWrap: 'balance' }}>Pay for building. <em>Run agents at cost.</em></h1>
          <p style={{ margin: 0, fontSize: 16, maxWidth: 560, opacity: 0.72 }}>Credits cover building and editing. When your agents talk to customers you pay the model provider's price, with no markup.</p>
          <Seg value={billing} onChange={v => setState({ billing: v })} options={[{ v: 'monthly', label: 'Monthly' }, { v: 'yearly', label: 'Yearly · save 20%' }]} style={{ marginTop: 8 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16, width: '100%' }}>
          {PLANS.map(p => {
            const cur = p.id === plan;
            const price = billing === 'monthly' ? p.m : p.y;
            const up = rank(p.id) > rank(plan);
            return (
              <div key={p.id} className="card" style={{ gap: 12, padding: 20, borderColor: cur ? 'var(--color-accent)' : undefined, position: 'relative' }}>
                {p.id === 'builder' && !cur && <span className="tag tag-accent" style={{ position: 'absolute', top: -10, right: 16 }}>Most popular</span>}
                <div className="row" style={{ justifyContent: 'space-between' }}><span className="card-title" style={{ fontSize: 21 }}>{p.name}</span>{cur && <span className="tag tag-accent">Your plan</span>}</div>
                <div className="row" style={{ alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 46, lineHeight: 1, fontWeight: 650, letterSpacing: '-.03em' }}>${price}</span>
                  <span style={{ fontSize: 13, opacity: 0.65 }}>{p.m ? (p.id === 'team' ? '/ seat / month' : '/ month') : 'forever'}</span>
                </div>
                {billing === 'yearly' && p.m > 0 && <div style={{ fontSize: 12.5, color: 'var(--color-accent)', marginTop: -6 }}>${p.y * 12}{p.id === 'team' ? ' per seat' : ''} billed yearly · save ${(p.m - p.y) * 12}</div>}
                <div style={{ fontSize: 14, opacity: 0.75, minHeight: 42 }}>{p.blurb}</div>
                {p.id === 'team' && (
                  <div className="row" style={{ gap: 10, fontSize: 13 }}>
                    <span style={{ opacity: 0.7 }}>Seats</span>
                    <div className="row" style={{ border: '1px solid var(--color-divider)', borderRadius: 8 }}>
                      <button className="ib sm" onClick={() => setSeats(s => Math.max(2, s - 1))} aria-label="Fewer seats"><Icon name="minus" size={14} /></button>
                      <span style={{ minWidth: 26, textAlign: 'center', fontWeight: 600 }}>{seats}</span>
                      <button className="ib sm" onClick={() => setSeats(s => Math.min(50, s + 1))} aria-label="More seats"><Icon name="plus" size={14} /></button>
                    </div>
                    <span style={{ opacity: 0.7, marginLeft: 'auto' }}>${price * seats}/mo</span>
                  </div>
                )}
                <div className="hr" style={{ margin: '4px 0' }} />
                <div className="col" style={{ gap: 8, flex: 1 }}>
                  {p.features.map(f => <div key={f} className="row" style={{ gap: 8, fontSize: 14, alignItems: 'flex-start' }}><span style={{ color: 'var(--color-accent)', marginTop: 3, display: 'flex' }}><Icon name="check" size={15} /></span>{f}</div>)}
                </div>
                <button className={cx('btn btn-block', cur ? 'btn-secondary' : up ? 'btn-primary' : 'btn-ghost plain')} style={{ marginTop: 12 }} disabled={cur} onClick={() => choosePlan(p.id)}>
                  {cur ? 'Current plan' : up ? (p.id === 'team' ? 'Start a team' : `Upgrade to ${p.name}`) : `Downgrade to ${p.name}`}
                </button>
              </div>
            );
          })}
        </div>
        <div className="row" style={{ width: '100%', gap: 16, border: '1px solid var(--color-divider)', borderRadius: 14, padding: '16px 20px', flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--color-accent)', display: 'flex' }}><Icon name="zap" size={20} /></span>
          <div className="grow" style={{ minWidth: 220 }}><div style={{ fontWeight: 600, fontSize: 15 }}>Need more credits this month?</div><div style={{ fontSize: 13.5, opacity: 0.7 }}>Top up without changing plan. Credits never expire while your plan is active.</div></div>
          <button className="btn btn-secondary" onClick={() => buyCredits(100)}>100 credits · $10</button>
          <button className="btn btn-secondary" onClick={() => buyCredits(500)}>500 credits · $45</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', width: '100%', borderTop: '1px solid var(--color-divider)', paddingTop: 20, gap: 24 }}>
          {FAQ.map(([t, b]) => <div key={t}><h4 style={{ margin: '0 0 6px' }}>{t}</h4><p style={{ margin: 0, fontSize: 14, opacity: 0.8 }}>{b}</p></div>)}
        </div>
      </div>
    </div>
  );
}
