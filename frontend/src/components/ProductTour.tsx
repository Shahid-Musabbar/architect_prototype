import { useEffect, useRef, useState } from 'react';
import { Icon, type IconName } from '../icons';
import { useApp, getState, setWs, updateProject } from '../store';
import { navigate, openProject } from '../actions';

const SEEN_KEY = 'architect2:tourSeen';

type Audience = 'tech' | 'non-tech' | 'both';

type Step = {
  icon: IconName;
  title: string;
  body: string;
  audience: Audience;
  before?: () => void;
  find: () => HTMLElement | null;
};

const AUDIENCE_LABEL: Record<Audience, string> = { tech: 'Developers', 'non-tech': 'Vibe Coders', both: 'Both' };
const AUDIENCE_CLASS: Record<Audience, string> = { tech: 'tag-neutral', 'non-tech': 'tag-accent', both: 'tag-outline' };

const q = (sel: string) => document.querySelector(sel) as HTMLElement | null;

function pickProject(): string | null {
  const projects = getState().projects;
  return (projects.find(p => p.appReady) || projects[0])?.id ?? null;
}

// The PRD / App Mockup panel only exists while a project is still "planning" — every seeded
// demo project is already built, so the tour fakes a minimal ready plan just to show it off,
// then removes it again as soon as the tour moves past those two steps.
let previewedPid: string | null = null;
function showPlanPreview(view: 'plan' | 'mockup') {
  const pid = getState().ui.ws.pid;
  if (!pid) return;
  const p = getState().projects.find(x => x.id === pid);
  if (p && !p.planning) {
    updateProject(pid, { planning: { prompt: p.name, answers: ['Use default Lyzr agents', 'Managers and operators', 'Web app', 'Act on low-risk work'], ready: true, notes: [] } }, false);
  }
  previewedPid = pid;
  setWs({ planOpen: true, planView: view });
}
function hidePlanPreview() {
  if (previewedPid) {
    updateProject(previewedPid, { planning: null }, false);
    previewedPid = null;
  }
  setWs({ planOpen: false });
}

const STEPS: Step[] = [
  { icon: 'sparkles', title: 'Start by describing your app', body: 'Everything begins here — describe what you want in plain English and Architect scaffolds the agents, database and UI for you.', audience: 'both', before: () => navigate({ name: 'home' }), find: () => q('#home-prompt') },
  { icon: 'palette', title: 'Pick a design system', body: 'Choose the visual language your app is built with. Swap it any time — every screen repaints instantly.', audience: 'both', find: () => q('[title="Design system"]') },
  { icon: 'github', title: 'Lyzr agents, or your own repo', body: 'This becomes the first mandatory question Architect asks: build with default Lyzr agents (editable in Lyzr Studio), or the GitAgent protocol, which keeps each agent in its own GitHub repo, framework-agnostic.', audience: 'tech', find: () => q('[data-tour="home-gitagent"]') },
  { icon: 'bot', title: 'Choose which model builds it', body: 'Fast, cheap models for a simple app; frontier models like Opus or GPT-5 for a hard one. Switch any time, even mid-project.', audience: 'tech', find: () => q('[title="Coding model"]') },
  { icon: 'grid', title: 'Every app you build lives here', body: 'Jump back into any project — starred, recently viewed, or shared with you.', audience: 'both', find: () => q('[data-tour="sidebar-projects"]') },
  { icon: 'sun', title: 'Light or dark — your call', body: 'One click swaps eleven color variables. Every screen, including the apps you build, supports both.', audience: 'both', find: () => q('[title="Toggle theme"]') },
  { icon: 'code', title: 'Four views of the same app', body: 'Preview is what your users see, Agents is who does the work, Code is the real source, and Database is your live data.', audience: 'both', before: () => { const pid = pickProject(); if (pid) openProject(pid); }, find: () => q('header [role="tablist"]') },
  { icon: 'listTodo', title: 'A PRD, written for you', body: 'Before anything is built, Architect drafts a full requirements doc — overview, agents, screens, integrations, and what is deliberately left out of v1.', audience: 'both', before: () => showPlanPreview('plan'), find: () => q('[data-tour="plan-panel"]') },
  { icon: 'palette', title: 'The theme, chosen on real screens', body: 'This is the visual direction for the app you are building, not for Architect itself — five palettes, live on the actual mockup screens, before a line of code exists.', audience: 'non-tech', before: () => showPlanPreview('mockup'), find: () => q('[data-tour="mockup-palette"]') },
  { icon: 'branch', title: 'Branch without fear', body: 'Open a draft to try something risky — Main stays untouched. Run two drafts with two coding agents at once, in parallel, then merge whichever one wins.', audience: 'both', find: () => q('[data-tour="draft-dropdown"]') },
  { icon: 'swap', title: 'Chat on either side', body: 'Drag it, or click this, and the chat pane swaps from left to right — whichever side matches how you like to work.', audience: 'both', before: () => setWs({ tab: 'preview' }), find: () => q('[data-tour="chat-swap-side"]') },
  { icon: 'msgPlus', title: 'Chats that compact themselves', body: 'Long sessions balloon past 90k tokens of history. This starts a fresh chat carrying a ~1.4k-token summary instead — and always shows the trade before you take it.', audience: 'both', find: () => q('[title="Chats"]') },
  { icon: 'zap', title: "See exactly what you're spending", body: 'This ring shows how much of the context window is used and how many credits this chat has cost — no usage page required.', audience: 'both', find: () => q('[data-tour="composer-context-ring"]') },
  { icon: 'bot', title: 'Switch models mid-conversation', body: 'Use something fast and cheap for a copy tweak, and a frontier model for a hard refactor — the credit multiplier shows before you send.', audience: 'tech', find: () => q('[title="Coding model"]') },
  { icon: 'pointer', title: 'Select to edit, right on the page', body: 'Turn this on and the cursor becomes a crosshair — click any element in the live preview to restyle it, retype its text, or leave a comment. No code required.', audience: 'non-tech', find: () => q('[data-tour="composer-select"]') },
  { icon: 'code', title: 'Select lines, add them to chat', body: 'Highlight any range of code and an "Add to chat ⌘L" button appears right there — no copy-paste needed.', audience: 'tech', before: () => setWs({ tab: 'code', editAgent: null }), find: () => q('[data-tour="code-editor-area"]') },
  { icon: 'terminal', title: 'Real output, not simulated', body: 'This panel holds the actual build log, the live deploy output, and as many real terminal tabs as you want, side by side.', audience: 'tech', find: () => q('[title="New terminal"]') },
  { icon: 'history', title: 'Every version, one click away', body: 'Every build is saved automatically. Jump back to any version if a change did not work out.', audience: 'both', find: () => q('[title="Version history"]') },
  { icon: 'database', title: 'A real, live database', body: 'Every app gets a Postgres database you can browse, query with SQL, and manage the same way you would in Supabase.', audience: 'tech', before: () => setWs({ tab: 'database' }), find: () => q('[data-tour="db-panel"]') },
  { icon: 'rocket', title: 'Ship it', body: 'Publish to a subdomain or your own domain with SSL, and push the same code to GitHub.', audience: 'both', find: () => q('[data-tour="publish-btn"]') },
];

const listeners = new Set<() => void>();
let running = false;
let curStep = 0;
const notify = () => listeners.forEach(l => l());

export function startProductTour() {
  running = true;
  curStep = 0;
  notify();
}

function useTourState() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force(n => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  return { running, step: curStep };
}

export function ProductTour() {
  const signedIn = useApp(s => s.signedIn);
  const route = useApp(s => s.ui.route);
  const { running: isRunning, step } = useTourState();
  const [rect, setRect] = useState<DOMRect | null>(null);
  const attemptsRef = useRef(0);

  useEffect(() => {
    if (!signedIn || route.name !== 'home') return;
    if (localStorage.getItem(SEEN_KEY)) return;
    const t = setTimeout(() => startProductTour(), 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, route.name === 'home']);

  const end = () => {
    running = false;
    hidePlanPreview();
    localStorage.setItem(SEEN_KEY, '1');
    notify();
  };

  const goStep = (n: number) => { curStep = n; notify(); };

  useEffect(() => {
    if (!isRunning) { setRect(null); return; }
    attemptsRef.current = 0;
    let cancelled = false;
    hidePlanPreview();
    STEPS[step]?.before?.();

    const locate = () => {
      if (cancelled) return;
      const el = STEPS[step]?.find();
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'auto' });
        setRect(el.getBoundingClientRect());
        return;
      }
      attemptsRef.current += 1;
      if (attemptsRef.current > 20) { end(); return; }
      requestAnimationFrame(locate);
    };
    requestAnimationFrame(locate);

    const reposition = () => {
      const el = STEPS[step]?.find();
      if (!el || !document.body.contains(el)) { end(); return; }
      setRect(el.getBoundingClientRect());
    };
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    const iv = window.setInterval(reposition, 500);
    return () => {
      cancelled = true;
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
      clearInterval(iv);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, step]);

  useEffect(() => {
    if (!isRunning) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') end(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isRunning]);

  if (!isRunning || !rect) return null;

  const s = STEPS[step];
  const last = step === STEPS.length - 1;
  const pad = 6;
  const spotStyle = {
    position: 'fixed' as const, zIndex: 200, pointerEvents: 'none' as const,
    top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2,
    borderRadius: 10, boxShadow: '0 0 0 3px var(--color-accent), 0 0 0 6000px rgba(0,0,0,.55)', transition: 'top .25s ease,left .25s ease,width .25s ease,height .25s ease',
  };

  const cardW = 300;
  let top = rect.bottom + 14, left = Math.min(Math.max(16, rect.left), window.innerWidth - cardW - 16);
  if (top + 210 > window.innerHeight) top = Math.max(16, rect.top - 210 - 14);

  return (
    <>
      <div style={spotStyle} />
      <div style={{ position: 'fixed', zIndex: 201, top, left, width: cardW, background: 'var(--color-pop)', border: '1px solid var(--color-divider)', borderRadius: 16, boxShadow: 'var(--shadow-lg)', padding: 16, transition: 'top .25s ease,left .25s ease' }}>
        <div className="row" style={{ gap: 10, marginBottom: 10 }}>
          <span style={{ width: 32, height: 32, borderRadius: 9, flex: 'none', background: 'linear-gradient(135deg,var(--color-accent),#7c5cff)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={s.icon} size={16} /></span>
          <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.5, paddingTop: 4 }}>Step {step + 1} of {STEPS.length}</span>
        </div>
        <div className={`tag ${AUDIENCE_CLASS[s.audience]}`} style={{ marginBottom: 8 }}>{AUDIENCE_LABEL[s.audience]}</div>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>{s.title}</div>
        <p style={{ fontSize: 13, opacity: 0.78, lineHeight: 1.5, margin: '0 0 12px' }}>{s.body}</p>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-primary btn-sm" onClick={() => (last ? end() : goStep(step + 1))}>{last ? 'Done' : 'Next'}</button>
          {step > 0 && <button className="btn btn-secondary btn-sm" onClick={() => goStep(step - 1)}>Back</button>}
          <div className="grow" />
          <button className="link plain" style={{ fontSize: 12.5 }} onClick={end}>Skip tour</button>
        </div>
      </div>
    </>
  );
}
