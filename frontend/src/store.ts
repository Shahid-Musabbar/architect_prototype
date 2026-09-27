import { useSyncExternalStore } from 'react';
import type { AppState, Project, UiState, WsUi } from './types';
import { SCHEMA_V, seedState, uiDefaults } from './lib/seed';
import { parseHash } from './lib/router';

const KEY = 'architect2:v1';

function sanitize(s: AppState): AppState {
  s.projects = s.projects.map(p => {
    let interrupted = false;
    const msgs = p.msgs.filter(m => {
      if (m.role === 'ai' && m.steps && m.steps.some(x => x.st !== 2) && !m.text) { interrupted = true; return false; }
      return true;
    });
    if (interrupted) msgs.push({ id: 'm_int_' + Date.now(), role: 'ai', text: 'The last build was interrupted when the page reloaded, so nothing was changed. Send your request again to retry.' });
    return { ...p, msgs, appReady: p.appReady || p.versions.length > 0 };
  });
  return s;
}

function load(): AppState {
  let s: AppState | null = null;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.v === SCHEMA_V && Array.isArray(parsed.projects)) s = sanitize({ ...seedState(), ...parsed, ui: uiDefaults() });
    }
  } catch { /* corrupted storage: fall back to seed */ }
  if (!s) s = seedState();
  s.ui.route = parseHash(location.hash);
  return s;
}

let state: AppState = load();
const listeners = new Set<() => void>();
let persistTimer: number | undefined;

function persist() {
  clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    try {
      const { ui: _ui, ...rest } = state;
      localStorage.setItem(KEY, JSON.stringify(rest));
    } catch { /* quota or private mode */ }
  }, 250);
}

export const getState = () => state;

export function setState(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) {
  const p = typeof patch === 'function' ? patch(state) : patch;
  if (!p || !Object.keys(p).length) return;
  const uiOnly = Object.keys(p).length === 1 && 'ui' in p;
  state = { ...state, ...p };
  if (!uiOnly) persist();
  listeners.forEach(l => l());
}

export function setUi(patch: Partial<UiState> | ((u: UiState) => Partial<UiState>)) {
  setState(s => ({ ui: { ...s.ui, ...(typeof patch === 'function' ? patch(s.ui) : patch) } }));
}

export function setWs(patch: Partial<WsUi> | ((w: WsUi) => Partial<WsUi>)) {
  setUi(u => ({ ws: { ...u.ws, ...(typeof patch === 'function' ? patch(u.ws) : patch) } }));
}

export function getProject(pid: string | null | undefined): Project | undefined {
  return pid ? state.projects.find(p => p.id === pid) : undefined;
}

export function updateProject(pid: string, patch: Partial<Project> | ((p: Project) => Partial<Project>), touch = true) {
  setState(s => ({
    projects: s.projects.map(p => {
      if (p.id !== pid) return p;
      const d = typeof patch === 'function' ? patch(p) : patch;
      return { ...p, ...d, ...(touch ? { updatedAt: Date.now() } : {}) };
    }),
  }));
}

export function resetStore() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  const fresh = seedState();
  fresh.signedIn = true;
  fresh.theme = state.theme;
  fresh.ui = { ...uiDefaults(), route: { name: 'home' } };
  state = fresh;
  persist();
  listeners.forEach(l => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

export function useApp<T>(sel: (s: AppState) => T): T {
  return useSyncExternalStore(subscribe, () => sel(state));
}

export const useWs = <T,>(sel: (w: WsUi) => T) => useApp(s => sel(s.ui.ws));
export const useProject = (pid: string | null | undefined) => useApp(s => (pid ? s.projects.find(p => p.id === pid) : undefined));
