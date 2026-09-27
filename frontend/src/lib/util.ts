let seq = 0;
export const uid = (p = '') => p + Date.now().toString(36) + (seq++).toString(36) + Math.random().toString(36).slice(2, 6);

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'app';

export function ago(ts: number, now = Date.now()) {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? 's' : ''} ago`;
  const d = Math.round(h / 24);
  if (d === 1) return 'yesterday';
  if (d < 30) return `${d} days ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const clock = (ts: number) => new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
export const dateLabel = (ts: number) => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
export const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ');
export const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

export function titleFromPrompt(p: string) {
  const words = p.replace(/["“”]/g, '').replace(/^(build|make|create|design)\s+(me\s+)?(an?|the)\s+/i, '').split(/\s+/).slice(0, 5).join(' ');
  return cap(words.replace(/[.,;:!?]+$/, '')) || 'Untitled app';
}

export function copyText(text: string) {
  try {
    if (navigator.clipboard) return navigator.clipboard.writeText(text).then(() => true, () => fallbackCopy(text));
  } catch { /* fall through */ }
  return Promise.resolve(fallbackCopy(text));
}
function fallbackCopy(text: string) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch { return false; }
}

export function downloadText(name: string, text: string, type = 'text/plain') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
export const modKey = isMac ? '⌘' : 'Ctrl';
