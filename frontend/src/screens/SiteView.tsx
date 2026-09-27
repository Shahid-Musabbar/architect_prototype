import { useApp } from '../store';
import { navigate } from '../actions';
import { Site } from '../site/Site';
import { slug } from '../lib/util';
import { Icon } from '../icons';

export function SiteView({ pid, path }: { pid: string; path: string }) {
  const p = useApp(s => s.projects.find(x => x.id === pid));
  const signedIn = useApp(s => s.signedIn);
  if (!p) {
    return (
      <div data-paper="" className="col" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, background: 'var(--color-bg)', color: 'var(--color-text)' }}>
        <div style={{ fontSize: 48, fontWeight: 700 }}>404</div>
        <div>This app doesn’t exist or was deleted.</div>
      </div>
    );
  }
  return (
    <div style={{ flex: 1, overflow: 'auto', background: '#fff' }}>
      {(!p.published || !p.appReady) && (
        <div className="row" style={{ gap: 10, padding: '8px 16px', fontSize: 13, background: '#111113', color: '#ededef', justifyContent: 'center', position: 'sticky', top: 0, zIndex: 5, flexWrap: 'wrap' }}>
          <Icon name="eye" size={14} />Preview of {p.name}, not published yet · preview-{slug(p.name)}.architect.app
          {signedIn && <button className="link" style={{ color: '#9cc7ff', fontSize: 13 }} onClick={() => navigate({ name: 'workspace', pid: p.id })}>Open in Architect</button>}
        </div>
      )}
      {p.appReady ? <Site p={p} path={path} go={to => navigate({ name: 'site', pid, path: to })} /> : (
        <div data-paper="" className="col" style={{ minHeight: '80vh', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--color-bg)', color: 'var(--color-text)' }}>
          <div style={{ fontSize: 22, fontWeight: 650 }}>{p.name} is still being built</div>
          <div style={{ opacity: 0.65 }}>Come back once the first build finishes.</div>
        </div>
      )}
    </div>
  );
}
