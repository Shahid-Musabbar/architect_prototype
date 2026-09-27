import { useState } from 'react';
import { Icon } from '../icons';
import { useApp, setState } from '../store';
import { navigate, signIn, startProject, validEmail, toast } from '../actions';
import { Logo, Spinner } from '../components/ui';
import { BLUEPRINTS } from '../data/templates';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { cx, wait } from '../lib/util';

export function Auth() {
  const route = useApp(s => s.ui.route);
  const exp = useApp(s => s.exp);
  const signedIn = useApp(s => s.signedIn);
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const step = route.name === 'onboard' ? route.step : 0;

  const googleSignIn = async () => {
    if (!supabaseConfigured() || !supabase) {
      toast('Google sign-in isn’t configured yet — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see README) and restart the dev server.', 'warn');
      return;
    }
    setBusy('google');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
    // On success the browser navigates away to Google, so this line only runs on failure.
    if (error) { setBusy(null); toast('Google sign-in failed. Please try again.', 'warn'); }
  };
  const provider = async (p: string, mail?: string) => {
    setBusy(p);
    await wait(700);
    setBusy(null);
    signIn(undefined, mail);
  };
  const emailOk = validEmail(email);
  const submitEmail = () => {
    setTouched(true);
    if (!emailOk) return;
    const name = email.split('@')[0].split(/[._-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    setBusy('email');
    wait(800).then(() => { setBusy(null); signIn(name, email.trim().toLowerCase()); toast(`Signed in as ${email.trim().toLowerCase()}`); });
  };

  return (
    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(360px,1fr))', overflow: 'auto' }}>
      <div style={{ padding: '56px 64px', borderRight: '1px solid var(--color-divider)', display: 'flex', flexDirection: 'column', gap: 32, minHeight: 420 }}>
        <div className="row" style={{ gap: 10 }}><Logo size={30} /><span style={{ fontSize: 24, fontWeight: 600 }}>Architect</span><span style={{ fontSize: 11, color: 'var(--color-accent)', letterSpacing: '.08em' }}>2.0</span></div>
        <div className="col" style={{ marginTop: 'auto', gap: 20, maxWidth: 520 }}>
          <h1 style={{ fontSize: 56, fontWeight: 650, lineHeight: 1.02, margin: 0, textWrap: 'balance' }}>Describe the team. <em>We'll build the agents.</em></h1>
          <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6, opacity: 0.72 }}>Architect turns a plain-English brief into a working app with AI agents inside it: a router, specialists and their tools, wired together, tested and ready to publish.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', borderTop: '1px solid var(--color-divider)', paddingTop: 16, gap: 16, fontSize: 13, opacity: 0.7 }}>
          <div>Describe it in words</div>
          <div style={{ borderLeft: '1px solid var(--color-divider)', paddingLeft: 16 }}>Point at what to change</div>
          <div style={{ borderLeft: '1px solid var(--color-divider)', paddingLeft: 16 }}>Publish with one click</div>
        </div>
      </div>
      <div className="row" style={{ justifyContent: 'center', padding: '48px 32px' }}>
        {step === 0 && (
          <form className="col" style={{ width: '100%', maxWidth: 380, gap: 14 }} onSubmit={e => { e.preventDefault(); submitEmail(); }}>
            <h2 style={{ margin: '0 0 4px' }}>Sign in to Architect</h2>
            <p style={{ margin: '0 0 8px', fontSize: 14, opacity: 0.7 }}>New here? The same button creates your account.</p>
            <button type="button" className="btn btn-secondary btn-block" style={{ height: 42 }} disabled={!!busy} onClick={googleSignIn}>{busy === 'google' ? <Spinner /> : <Icon name="globe" />}Continue with Google</button>
            <button type="button" className="btn btn-secondary btn-block" style={{ height: 42 }} disabled={!!busy} onClick={() => provider('github')}>{busy === 'github' ? <Spinner /> : <Icon name="github" />}Continue with GitHub</button>
            <div className="row" style={{ gap: 12, fontSize: 12, opacity: 0.6 }}><div className="grow" style={{ height: 1, background: 'var(--color-divider)' }} />or<div className="grow" style={{ height: 1, background: 'var(--color-divider)' }} /></div>
            <div className="field">
              <label htmlFor="auth-email">Work email</label>
              <input id="auth-email" className={cx('input', touched && !emailOk && 'invalid')} type="email" autoComplete="email" placeholder="you@company.com" style={{ height: 42 }} value={email} onChange={e => setEmail(e.target.value)} onBlur={() => email && setTouched(true)} />
              {touched && !emailOk && <span style={{ fontSize: 12, color: 'var(--danger)' }}>Enter a valid email address</span>}
            </div>
            <button type="submit" className="btn btn-primary btn-block" style={{ height: 42 }} disabled={!!busy}>{busy === 'email' && <Spinner />}Continue with email</button>
            <p style={{ margin: '6px 0 0', fontSize: 12, opacity: 0.6 }}>By continuing you agree to the Terms and Privacy Policy.</p>
          </form>
        )}
        {step === 1 && (
          <div className="col" style={{ width: '100%', maxWidth: 520, gap: 16 }}>
            <div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--color-accent)' }}>Step 1 of 2</div>
            <h2 style={{ margin: 0 }}>How do you like to work?</h2>
            <p style={{ margin: 0, fontSize: 14, opacity: 0.7 }}>This only changes how much detail you see. Switch any time in Settings.</p>
            {([['guided', 'Guided', 'Recommended', 'Plain-language progress, sensible defaults, no code unless you ask for it.'], ['pro', 'Pro', 'For developers', 'File-level steps, tool traces on every reply, and the code editor always a click away.']] as const).map(([id, title, tag, body]) => (
              <button key={id} onClick={() => setState({ exp: id })} aria-pressed={exp === id} className="col" style={{ gap: 6, textAlign: 'left', padding: '16px 18px', borderRadius: 12, border: '1px solid ' + (exp === id ? 'var(--color-accent)' : 'var(--color-divider)'), background: exp === id ? 'color-mix(in srgb,var(--color-accent) 8%,transparent)' : 'var(--color-surface)', cursor: 'pointer' }}>
                <div className="row" style={{ justifyContent: 'space-between' }}><span style={{ fontSize: 19, fontWeight: 600 }}>{title}</span><span className="tag tag-outline">{tag}</span></div>
                <div style={{ fontSize: 14, lineHeight: 1.5, opacity: 0.75 }}>{body}</div>
              </button>
            ))}
            <div className="row" style={{ justifyContent: signedIn ? 'flex-end' : 'space-between' }}>
              {!signedIn && <button className="btn btn-ghost" onClick={() => navigate({ name: 'auth' })}>Back</button>}
              <button className="btn btn-primary" onClick={() => { if (!signedIn) setState({ signedIn: true }); navigate({ name: 'onboard', step: 2 }); }}>Continue<Icon name="arrowRight" /></button>
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="col" style={{ width: '100%', maxWidth: 520, gap: 16 }}>
            <div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--color-accent)' }}>Step 2 of 2</div>
            <h2 style={{ margin: 0 }}>What should your first agent do?</h2>
            <p style={{ margin: 0, fontSize: 14, opacity: 0.7 }}>Pick a blueprint and Architect will ask a few questions, then build it.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10 }}>
              {BLUEPRINTS.map(b => (
                <button key={b.t} className="card" onClick={() => { if (!signedIn) setState({ signedIn: true }); startProject(b.p); }}>
                  <div className="card-kicker">{b.k}</div><div className="card-title">{b.t}</div><p className="card-body">{b.b}</p>
                </button>
              ))}
            </div>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <button className="btn btn-ghost" onClick={() => navigate({ name: 'onboard', step: 1 })}>Back</button>
              <button className="btn btn-secondary" onClick={() => { if (!signedIn) setState({ signedIn: true }); navigate({ name: 'home' }); }}>Skip — I'll describe my own</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
