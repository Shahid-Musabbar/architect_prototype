import { useState, type CSSProperties } from 'react';
import { Icon } from '../icons';
import { useApp, setState } from '../store';
import { toast } from '../actions';
import { CODE_MODELS } from '../data/constants';
import { Popover } from './ui';
import { cx } from '../lib/util';

export function ModelPicker({ up = true, menuStyle, compact }: { up?: boolean; menuStyle?: CSSProperties; compact?: boolean }) {
  const codeModel = useApp(s => s.codeModel);
  const plan = useApp(s => s.plan);
  const [open, setOpen] = useState(false);
  const m = CODE_MODELS.find(x => x.id === codeModel) || CODE_MODELS[0];
  let prev = '';
  return (
    <Popover
      open={open}
      onClose={() => setOpen(false)}
      style={{ width: 300, left: 0, ...(up ? { bottom: 'calc(100% + 8px)' } : { top: 'calc(100% + 8px)' }), ...menuStyle }}
      anchor={
        <button className="tog" style={{ opacity: 0.85, paddingRight: 8 }} onClick={() => setOpen(!open)} title="Coding model" aria-haspopup="listbox" aria-expanded={open}>
          <span className="ellipsis" style={{ maxWidth: compact ? 78 : 140 }}>{m.name}</span><Icon name="updown" size={13} />
        </button>
      }
    >
      <div style={{ padding: '10px 14px 6px', fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', opacity: 0.55 }}>Coding agent model</div>
      <div role="listbox" style={{ maxHeight: 320, overflowY: 'auto', padding: '0 6px 6px' }}>
        {CODE_MODELS.map(x => {
          const head = x.group !== prev;
          prev = x.group;
          const locked = plan === 'free' && x.group === 'Frontier';
          return (
            <div key={x.id}>
              {head && <div className="menu-label">{x.group}{x.group === 'Frontier' && plan === 'free' ? ' · Builder plan' : ''}</div>}
              <button
                role="option"
                aria-selected={x.id === m.id}
                className={cx('mi', x.id === m.id && 'active')}
                disabled={locked}
                onClick={() => { setState({ codeModel: x.id }); setOpen(false); toast(`Coding agent now uses ${x.name}`); }}
              >
                <span className="col grow" style={{ gap: 1 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 500 }}>{x.name}</span>
                  <span className="ellipsis" style={{ fontSize: 12, opacity: 0.6 }}>{x.desc}</span>
                </span>
                <span className="mono" style={{ fontSize: 11.5, opacity: 0.6 }}>{x.mult}×</span>
                <span style={{ width: 14, display: 'flex', color: 'var(--color-accent)' }}>{x.id === m.id && <Icon name="check" size={14} />}</span>
              </button>
            </div>
          );
        })}
      </div>
      <div style={{ borderTop: '1px solid var(--color-divider)', padding: '8px 14px', fontSize: 12, opacity: 0.6 }}>Rate = credits per message vs. Architect</div>
    </Popover>
  );
}
