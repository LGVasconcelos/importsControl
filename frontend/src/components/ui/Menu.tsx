import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Button from './Button';

export interface MenuItemDef {
  label: ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface MenuProps {
  label: ReactNode;
  items: (MenuItemDef | 'divider')[];
}

/** Dropdown de ações secundárias — usado para tirar botões pouco usados do topo da página. */
export default function Menu({ label, items }: MenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="ui-menu" ref={ref}>
      <Button variant="secondary" onClick={() => setOpen(o => !o)}>{label}</Button>
      {open && (
        <div className="ui-menu-panel">
          {items.map((item, i) =>
            item === 'divider' ? (
              <div key={i} className="ui-menu-divider" />
            ) : (
              <button
                key={i}
                className={`ui-menu-item${item.danger ? ' danger' : ''}`}
                disabled={item.disabled}
                onClick={() => { setOpen(false); item.onClick(); }}
              >
                {item.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
