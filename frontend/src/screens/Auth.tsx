import { useState } from 'react';
import { Icon } from '../icons';
import { signIn, validEmail, toast } from '../actions';
import { Logo, Spinner } from '../components/ui';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { cx, wait } from '../lib/util';

export function Auth() {
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const googleSignIn = async () => {
    if (!supabaseConfigured() || !supabase) {
      toast('Google sign-in isn’t configured yet — set SUPABASE_URL and SUPABASE_ANON_KEY (see README) and restart the dev server.', 'warn');
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
        <form className="col" style={{ width: '100%', maxWidth: 380, gap: 14 }} onSubmit={e => { e.preventDefault(); submitEmail(); }}>
            <h2 style={{ margin: '0 0 4px' }}>Sign in to Architect</h2>
            <p style={{ margin: '0 0 8px', fontSize: 14, opacity: 0.7 }}>New here? The same button creates your account.</p>
            <button type="button" className="btn btn-secondary btn-block" style={{ height: 42 }} disabled={!!busy} onClick={googleSignIn}>{busy === 'google' ? <Spinner /> : <Icon name="globe" />}Continue with Google</button>
            <button type="button" className="btn btn-secondary btn-block" style={{ height: 42 }} title="Not implemented" onClick={() => toast('GitHub sign-in is not implemented yet.', 'warn')}><Icon name="github" />Continue with GitHub</button>
            <div className="row" style={{ gap: 12, fontSize: 12, opacity: 0.6 }}><div className="grow" style={{ height: 1, background: 'var(--color-divider)' }} />or<div className="grow" style={{ height: 1, background: 'var(--color-divider)' }} /></div>
            <div className="field">
              <label htmlFor="auth-email">Work email</label>
              <input id="auth-email" className={cx('input', touched && !emailOk && 'invalid')} type="email" autoComplete="email" placeholder="you@company.com" style={{ height: 42 }} value={email} onChange={e => setEmail(e.target.value)} onBlur={() => email && setTouched(true)} />
              {touched && !emailOk && <span style={{ fontSize: 12, color: 'var(--danger)' }}>Enter a valid email address</span>}
            </div>
            <button type="submit" className="btn btn-primary btn-block" style={{ height: 42 }} disabled={!!busy}>{busy === 'email' && <Spinner />}Continue with email</button>
            <p style={{ margin: '6px 0 0', fontSize: 12, opacity: 0.6 }}>By continuing you agree to the Terms and Privacy Policy.</p>
        </form>
      </div>
    </div>
  );
}
