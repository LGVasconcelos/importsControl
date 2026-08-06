import type { ReactNode } from 'react';

interface ChipProps {
  children: ReactNode;
  onRemove?: () => void;
}

export default function Chip({ children, onRemove }: ChipProps) {
  return (
    <span className="ui-chip">
      {children}
      {onRemove && (
        <button type="button" onClick={onRemove} className="ui-chip-remove" aria-label="Remover">×</button>
      )}
    </span>
  );
}
