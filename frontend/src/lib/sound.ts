let ctx: AudioContext | null = null;

export function chime() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = ctx || new AC();
    const now = ctx.currentTime;
    [660, 880].forEach((f, i) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0, now + i * 0.12);
      g.gain.linearRampToValueAtTime(0.08, now + i * 0.12 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.35);
      o.connect(g).connect(ctx!.destination);
      o.start(now + i * 0.12);
      o.stop(now + i * 0.12 + 0.4);
    });
  } catch { /* audio unavailable */ }
}
