import { useState } from 'react';
import { Icon } from '../icons';
import { restoreVersion } from '../actions';
import { Empty } from '../components/ui';
import { SEL_LABELS } from '../data/constants';
import { ago, clock, cx } from '../lib/util';
import type { PV, Project, Version } from '../types';

const PV_LABEL: Partial<Record<keyof PV, string>> = { title: SEL_LABELS['hero-title'], sub: SEL_LABELS['hero-sub'], cta: SEL_LABELS.cta, kicker: SEL_LABELS.kicker, size: 'Headline size', ctaSolid: 'Button style', cta2Hidden: SEL_LABELS['cta-2'], widgetWide: 'Widget width', widgetAvatar: 'Widget photo', navLogin: 'Log in link', featureIcons: 'Feature icons', footerSocial: 'Social links', accent: 'Accent color', dark: 'Theme', greeting: 'Widget greeting', features: SEL_LABELS.features };

function diff(v: Version, prev?: Version): string[] {
  if (!prev) return [`${v.snap.agents.length} agents: ${v.snap.agents.map(a => a.name).join(', ')}`];
  const out: string[] = [];
  (Object.keys(PV_LABEL) as (keyof PV)[]).forEach(k => { if (JSON.stringify(v.snap.pv[k]) !== JSON.stringify(prev.snap.pv[k])) out.push(`${PV_LABEL[k]} changed`); });
  const a0 = new Map(prev.snap.agents.map(a => [a.id, a]));
  const a1 = new Map(v.snap.agents.map(a => [a.id, a]));
  v.snap.agents.forEach(a => {
    const o = a0.get(a.id);
    if (!o) { out.push(`Added ${a.name} agent`); return; }
    const ch: string[] = [];
    if (o.name !== a.name) ch.push('name');
    if (o.model !== a.model) ch.push(`model → ${a.model}`);
    if (o.instructions !== a.instructions) ch.push('instructions');
    if (JSON.stringify(o.tools) !== JSON.stringify(a.tools)) ch.push('tools');
    if (JSON.stringify(o.handoffs) !== JSON.stringify(a.handoffs)) ch.push('handoffs');
    if (JSON.stringify(o.knowledge) !== JSON.stringify(a.knowledge) || JSON.stringify(o.skills) !== JSON.stringify(a.skills)) ch.push('knowledge & skills');
    if (o.memory !== a.memory || o.temp !== a.temp || o.maxTok !== a.maxTok || JSON.stringify(o.feats) !== JSON.stringify(a.feats) || JSON.stringify(o.out) !== JSON.stringify(a.out) || JSON.stringify(o.sched) !== JSON.stringify(a.sched)) ch.push('settings');
    if (ch.length) out.push(`${a.name}: ${ch.join(', ')}`);
  });
  prev.snap.agents.forEach(a => { if (!a1.has(a.id)) out.push(`Removed ${a.name} agent`); });
  return out.length ? out : ['No changes to agents or website (channels, data or code only)'];
}

export function HistoryTab({ p }: { p: Project }) {
  const [open, setOpen] = useState<number | null>(p.current || null);
  if (!p.versions.length) return <div style={{ flex: 1, overflow: 'auto' }}><Empty icon="history" title="No versions yet" sub="Every build and edit is saved as a version you can restore." /></div>;
  const list = [...p.versions].reverse();
  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      <div className="col" style={{ maxWidth: 780, margin: '0 auto', padding: '32px 24px' }}>
        <h2 style={{ margin: '0 0 4px', fontWeight: 600 }}>History</h2>
        <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 20 }}>Every change is a version. Restoring never deletes anything; it adds a new version on top.</div>
        {list.map(v => {
          const cur = v.n === p.current;
          const prev = p.versions.find(x => x.n === v.n - 1);
          const isOpen = open === v.n;
          return (
            <div key={v.n} style={{ borderTop: '1px solid var(--color-divider)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '56px minmax(0,1fr) auto', gap: 16, alignItems: 'start', padding: '16px 0' }}>
                <div style={{ fontSize: 26, lineHeight: 1, fontWeight: 600, color: cur ? 'var(--color-accent)' : 'color-mix(in srgb,var(--color-text) 55%,transparent)' }}>v{v.n}</div>
                <button className="col" style={{ gap: 4, background: 'none', border: 0, padding: 0, textAlign: 'left', cursor: 'pointer' }} onClick={() => setOpen(isOpen ? null : v.n)} aria-expanded={isOpen}>
                  <div className="row" style={{ gap: 6, fontSize: 16, fontWeight: 600 }}><span className="ellipsis">{v.title}</span><Icon name={isOpen ? 'chevronUp' : 'chevronDown'} size={14} style={{ opacity: 0.5, flex: 'none' }} /></div>
                  <div style={{ fontSize: 12, opacity: 0.65 }}>{ago(v.ts)} · {clock(v.ts)} · {v.meta}{p.published && p.publishedAt && v.ts <= p.publishedAt && (!p.versions.find(x => x.n === v.n + 1) || p.versions.find(x => x.n === v.n + 1)!.ts > p.publishedAt) ? ' · published' : ''}</div>
                </button>
                <div className="row" style={{ gap: 6 }}>
                  {cur ? <span className="tag tag-accent">Current</span> : <button className="btn btn-secondary btn-sm" onClick={() => restoreVersion(p.id, v.n)}><Icon name="rotate" size={13} />Restore</button>}
                </div>
              </div>
              {isOpen && (
                <ul className={cx()} style={{ margin: '-6px 0 16px 72px', padding: '10px 14px 10px 30px', fontSize: 13.5, lineHeight: 1.7, border: '1px solid var(--color-divider)', borderRadius: 10, background: 'var(--color-surface)' }}>
                  {diff(v, prev).map((d, i) => <li key={i}>{d}</li>)}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
