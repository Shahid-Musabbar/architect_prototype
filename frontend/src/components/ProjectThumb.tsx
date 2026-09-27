import type { Project } from '../types';

export function ProjectThumb({ p, height = 136 }: { p: Project; height?: number }) {
  const accent = p.pv.accent || '#0f766e';
  return (
    <div data-paper="" data-dark={p.pv.dark ? '' : undefined} style={{ height, background: 'var(--color-bg)', color: 'var(--color-text)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10, borderBottom: '1px solid var(--color-divider)', overflow: 'hidden' }}>
      <div className="row" style={{ justifyContent: 'space-between', fontSize: 9 }}><span style={{ fontSize: 11, fontWeight: 600 }}>{p.name}</span><span style={{ opacity: 0.6 }}>Sign in</span></div>
      {p.appReady ? (
        <div style={{ fontSize: 19, fontWeight: 650, letterSpacing: '-.02em', lineHeight: 1.08, maxWidth: '85%', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.pv.title}</div>
      ) : (
        <div className="col" style={{ gap: 6 }}><div className="skel" style={{ height: 12, width: '70%' }} /><div className="skel" style={{ height: 12, width: '50%' }} /></div>
      )}
      <div className="row" style={{ gap: 6, marginTop: 'auto' }}>
        <span style={{ background: p.pv.ctaSolid ? accent : 'none', border: `1px solid ${accent}`, width: 52, height: 12, borderRadius: 3 }} />
        <span style={{ border: '1px solid var(--color-divider)', width: 40, height: 12, borderRadius: 3 }} />
      </div>
    </div>
  );
}
