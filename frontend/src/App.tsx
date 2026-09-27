import { useEffect } from 'react';
import { useApp, setUi, getState } from './store';
import { navigate, syncRouteFromHash, syncSupabaseSession } from './actions';
import { supabase } from './lib/supabase';
import { ConfirmHost, Toast } from './components/ui';
import { Sidebar } from './components/Sidebar';
import { CommandPalette } from './components/CommandPalette';
import { InfoDialogs } from './components/InfoDialogs';
import { Auth } from './screens/Auth';
import { Home } from './screens/Home';
import { Projects } from './screens/Projects';
import { Settings } from './screens/Settings';
import { Pricing } from './screens/Pricing';
import { ProjectSettings } from './screens/ProjectSettings';
import { SiteView } from './screens/SiteView';
import { Workspace } from './workspace/Workspace';

export default function App() {
  const route = useApp(s => s.ui.route);
  const theme = useApp(s => s.theme);
  const signedIn = useApp(s => s.signedIn);

  const isSite = route.name === 'site';
  useEffect(() => { document.documentElement.setAttribute('data-theme', isSite ? 'light' : theme); }, [theme, isSite]);

  useEffect(() => {
    const on = () => syncRouteFromHash();
    window.addEventListener('hashchange', on);
    syncRouteFromHash();
    return () => window.removeEventListener('hashchange', on);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    syncSupabaseSession();
    const { data } = supabase.auth.onAuthStateChange(event => { if (event === 'SIGNED_IN') syncSupabaseSession(); });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const open = route.name === 'site';
    if (!signedIn && !open && route.name !== 'auth' && route.name !== 'onboard') navigate({ name: 'auth' });
    if (signedIn && route.name === 'auth') navigate({ name: 'home' });
  }, [signedIn, route]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = getState();
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && s.signedIn && s.ui.route.name !== 'site') {
        e.preventDefault();
        setUi(u => ({ palette: !u.palette }));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const titles: Record<string, string> = { auth: 'Sign in', onboard: 'Welcome', home: 'Home', projects: 'Projects', settings: 'Settings', pricing: 'Pricing' };
    const s = getState();
    const p = 'pid' in route ? s.projects.find(x => x.id === route.pid) : undefined;
    document.title = route.name === 'site' ? (p?.name || 'Site') : `${p ? p.name + ' · ' : titles[route.name] ? titles[route.name] + ' · ' : ''}Architect`;
  }, [route]);

  let body;
  if (route.name === 'site') body = <SiteView pid={route.pid} path={route.path} />;
  else if (route.name === 'auth' || route.name === 'onboard') body = <Auth />;
  else if (route.name === 'workspace') body = <Workspace key={route.pid} pid={route.pid} />;
  else if (route.name === 'projectSettings') body = <ProjectSettings pid={route.pid} page={route.page} />;
  else body = (
    <>
      <Sidebar />
      {route.name === 'home' && <Home />}
      {route.name === 'projects' && <Projects filter={route.filter} />}
      {route.name === 'settings' && <Settings tab={route.tab} />}
      {route.name === 'pricing' && <Pricing />}
    </>
  );

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)', color: 'var(--color-text)', overflow: 'hidden', position: 'relative' }}>
      {body}
      {route.name !== 'site' && <CommandPalette />}
      <InfoDialogs />
      <ConfirmHost />
      <Toast />
    </div>
  );
}
