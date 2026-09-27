import type { ProjFilter, Route, SettingsTab } from '../types';

const TABS: SettingsTab[] = ['general', 'appearance', 'models', 'integrations', 'secrets', 'usage'];
const FILTERS: ProjFilter[] = ['all', 'starred', 'recent', 'shared'];

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const [a, b, c, ...rest] = parts;
  switch (a) {
    case 'auth': return { name: 'auth' };
    case 'onboard': return { name: 'onboard', step: b === '2' ? 2 : 1 };
    case 'projects': return { name: 'projects', filter: FILTERS.includes(b as ProjFilter) ? (b as ProjFilter) : 'all' };
    case 'settings': return { name: 'settings', tab: TABS.includes(b as SettingsTab) ? (b as SettingsTab) : 'general' };
    case 'pricing': return { name: 'pricing' };
    case 'p':
      if (!b) return { name: 'home' };
      if (c === 'settings') return { name: 'projectSettings', pid: b, page: rest[0] || 'general' };
      return { name: 'workspace', pid: b };
    case 'site': return { name: 'site', pid: b || '', path: '/' + [c, ...rest].filter(Boolean).join('/') };
    default: return { name: 'home' };
  }
}

export function toHash(r: Route): string {
  switch (r.name) {
    case 'auth': return '#/auth';
    case 'onboard': return `#/onboard/${r.step}`;
    case 'home': return '#/home';
    case 'projects': return `#/projects/${r.filter}`;
    case 'settings': return `#/settings/${r.tab}`;
    case 'pricing': return '#/pricing';
    case 'workspace': return `#/p/${r.pid}`;
    case 'projectSettings': return `#/p/${r.pid}/settings/${r.page}`;
    case 'site': return `#/site/${r.pid}${r.path === '/' ? '' : r.path}`;
  }
}

export const siteUrl = (pid: string, path = '/') => {
  const base = location.href.split('#')[0];
  return base + toHash({ name: 'site', pid, path });
};
