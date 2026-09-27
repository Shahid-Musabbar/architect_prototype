import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { Icon, type IconName } from '../icons';
import { useApp } from '../store';
import { closeConfirm } from '../actions';
import { cx } from '../lib/util';

export function Logo({ size = 24 }: { size?: number }) {
  return <img src="./logo.png" alt="Architect" width={size} height={size} style={{ width: size, height: size, borderRadius: size * 0.27, flex: 'none' }} />;
}

export function Spinner({ size = 14, style }: { size?: number; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="spin" style={{ flex: 'none', ...style }} aria-label="Loading">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity=".25" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function Switch({ on, onChange, disabled, label }: { on: boolean; onChange: () => void; disabled?: boolean; label?: string }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} className={cx('sw', on && 'on')} onClick={onChange} disabled={disabled} />;
}

export function Seg<T extends string>({ value, options, onChange, style }: { value: T; options: { v: T; label: ReactNode; icon?: IconName }[]; onChange: (v: T) => void; style?: CSSProperties }) {
  return (
    <div className="seg" role="radiogroup" style={style}>
      {options.map(o => (
        <button key={o.v} type="button" role="radio" aria-checked={value === o.v} className={cx('seg-opt', value === o.v && 'on')} onClick={() => onChange(o.v)}>
          {o.icon && <Icon name={o.icon} size={15} />}{o.label}
        </button>
      ))}
    </div>
  );
}

export function Pills<T extends string>({ value, options, onChange }: { value: T; options: { v: T; label: ReactNode; icon?: IconName }[]; onChange: (v: T) => void }) {
  return (
    <div className="pills">
      {options.map(o => (
        <button key={o.v} type="button" className={value === o.v ? 'on' : ''} onClick={() => onChange(o.v)}>
          {o.icon && <Icon name={o.icon} size={14} />}{o.label}
        </button>
      ))}
    </div>
  );
}

const AV = ['#6d5bd0', '#0f766e', '#7c3aed', '#b45309', '#2563eb', '#be185d', '#c2410c'];
export function Avatar({ text, size = 26, i = 0, radius }: { text: string; size?: number; i?: number; radius?: number }) {
  return (
    <span style={{ width: size, height: size, borderRadius: radius ?? size * 0.27, background: AV[i % AV.length], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.46, fontWeight: 600, flex: 'none' }}>
      {(text || '?').charAt(0).toUpperCase()}
    </span>
  );
}

/** Closes a popover on outside click or Escape. */
export function useDismiss(open: boolean, close: () => void, ref: RefObject<HTMLElement | null>) {
  const cb = useRef(close);
  cb.current = close;
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) cb.current(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); cb.current(); } };
    const t = setTimeout(() => document.addEventListener('mousedown', onDown), 0);
    document.addEventListener('keydown', onKey, true);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey, true); };
  }, [open, ref]);
}

export function Popover({ open, onClose, anchor, children, style, className, wrapStyle }: { open: boolean; onClose: () => void; anchor: ReactNode; children: ReactNode; style?: CSSProperties; className?: string; wrapStyle?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(open, onClose, ref);
  return (
    <div ref={ref} style={{ position: 'relative', display: 'flex', minWidth: 0, ...wrapStyle }}>
      {anchor}
      {open && <div className={cx('menu', className)} style={style}>{children}</div>}
    </div>
  );
}

export function Dialog({ open, onClose, children, width = 460, closeOnBackdrop = true, label }: { open: boolean; onClose: () => void; children: ReactNode; width?: number; closeOnBackdrop?: boolean; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const backdropRef = useRef(closeOnBackdrop);
  backdropRef.current = closeOnBackdrop;
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && backdropRef.current) { e.stopPropagation(); closeRef.current(); } };
    document.addEventListener('keydown', onKey, true);
    const prev = document.activeElement as HTMLElement | null;
    setTimeout(() => {
      const f = ref.current?.querySelector<HTMLElement>('[autofocus], input, textarea, button.btn-primary');
      f?.focus();
    }, 20);
    return () => { document.removeEventListener('keydown', onKey, true); prev?.focus?.(); };
  }, [open]);
  if (!open) return null;
  return (
    <div className="dialog-backdrop" onMouseDown={e => { if (e.target === e.currentTarget && closeOnBackdrop) onClose(); }}>
      <div ref={ref} className="dialog" role="dialog" aria-modal="true" aria-label={label} style={{ width: `min(${width}px, 100%)` }}>{children}</div>
    </div>
  );
}

export function ConfirmHost() {
  const c = useApp(s => s.ui.confirm);
  const [typed, setTyped] = useState('');
  useEffect(() => setTyped(''), [c]);
  if (!c) return null;
  const ok = !c.input || typed.trim() === c.input.expect;
  const go = () => { if (!ok) return; closeConfirm(); c.onConfirm(); };
  return (
    <Dialog open onClose={closeConfirm} width={440} label={c.title}>
      <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
        {c.danger && <span style={{ color: 'var(--danger)', marginTop: 2 }}><Icon name="info" size={18} /></span>}
        <div className="col" style={{ gap: 8 }}>
          <div className="dialog-title">{c.title}</div>
          <div className="dialog-body">{c.body}</div>
        </div>
      </div>
      {c.input && (
        <div className="field">
          <label>{c.input.label}</label>
          <input className="input" value={typed} onChange={e => setTyped(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') go(); }} autoFocus />
        </div>
      )}
      <div className="dialog-actions">
        <button className="btn btn-secondary" onClick={closeConfirm}>Cancel</button>
        <button className={c.danger ? 'btn btn-danger solid' : 'btn btn-primary'} disabled={!ok} onClick={go} autoFocus={!c.input}>{c.confirmLabel}</button>
      </div>
    </Dialog>
  );
}

export function Toast() {
  const t = useApp(s => s.ui.toast);
  if (!t) return null;
  const color = t.tone === 'err' ? 'var(--danger)' : t.tone === 'warn' ? 'var(--warn)' : 'var(--color-accent)';
  return (
    <div className="toast" role="status" key={t.id}>
      <span style={{ color, display: 'flex' }}><Icon name={t.tone === 'ok' ? 'check' : 'info'} size={16} /></span>
      {t.text}
    </div>
  );
}

export function Empty({ icon, title, sub, action }: { icon: IconName; title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <span className="ico"><Icon name={icon} size={18} /></span>
      <div style={{ fontSize: 16, fontWeight: 600 }}>{title}</div>
      {sub && <div style={{ fontSize: 14, opacity: 0.65, maxWidth: 380 }}>{sub}</div>}
      {action && <div style={{ marginTop: 10 }}>{action}</div>}
    </div>
  );
}

/** Keeps a scroll container pinned to the bottom when content changes, unless the user scrolled up. */
export function useStickToBottom<T extends HTMLElement>(deps: unknown[]) {
  const ref = useRef<T>(null);
  const pinned = useRef(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => { pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60; };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && pinned.current) el.scrollTop = el.scrollHeight;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

export function Ring({ pct, size = 20, stroke = 2.5 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const col = pct >= 90 ? 'var(--danger)' : 'var(--color-accent)';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-divider)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${(C * Math.min(pct, 100)) / 100} ${C}`} style={{ transition: 'stroke-dasharray .4s' }} />
    </svg>
  );
}

export function Kbd({ children }: { children: ReactNode }) { return <span className="kbd">{children}</span>; }

/** Web Speech API dictation; returns null support when unavailable. */
type SR = { start: () => void; stop: () => void; onresult: ((e: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null; onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null; continuous: boolean; interimResults: boolean; lang: string };
export function useDictation(onText: (t: string) => void) {
  const [on, setOn] = useState(false);
  const rec = useRef<SR | null>(null);
  const cb = useRef(onText);
  cb.current = onText;
  const Ctor = (typeof window !== 'undefined' && ((window as unknown as { SpeechRecognition?: new () => SR }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: new () => SR }).webkitSpeechRecognition)) || null;
  const toggle = (onErr?: (m: string) => void) => {
    if (!Ctor) { onErr?.('Dictation is not supported in this browser'); return; }
    if (on) { rec.current?.stop(); return; }
    const r = new Ctor();
    r.continuous = true; r.interimResults = false; r.lang = navigator.language || 'en-US';
    r.onresult = e => {
      let t = '';
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) t += e.results[i][0].transcript;
      if (t) cb.current(t.trim());
    };
    r.onend = () => setOn(false);
    r.onerror = e => { setOn(false); if (e.error !== 'aborted' && e.error !== 'no-speech') onErr?.(e.error === 'not-allowed' ? 'Microphone access was blocked' : 'Dictation stopped'); };
    rec.current = r;
    try { r.start(); setOn(true); } catch { setOn(false); }
  };
  useEffect(() => () => rec.current?.stop(), []);
  return { on, supported: !!Ctor, toggle };
}
