import type { CSSProperties, ReactNode } from 'react';

export type BadgeTone = 'primary' | 'danger' | 'success' | 'warning' | 'info' | 'neutral';

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  style?: CSSProperties;
}

const toneStyles: Record<BadgeTone, CSSProperties> = {
  primary: { color: 'var(--color-primary)', background: 'var(--color-primary-bg)' },
  danger: { color: 'var(--color-danger)', background: 'var(--color-danger-bg)' },
  success: { color: 'var(--color-success)', background: 'var(--color-success-bg)' },
  warning: { color: 'var(--color-warning)', background: 'var(--color-warning-bg)' },
  info: { color: 'var(--color-info)', background: 'var(--color-info-bg)' },
  neutral: { color: 'var(--text-secondary)', background: 'var(--bg-thead)' },
};

/** Pill de status/contagem — substitui os mapas de cor duplicados em cada página. */
export default function Badge({ tone = 'neutral', children, style }: BadgeProps) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: 'nowrap',
        ...toneStyles[tone],
        ...style,
      }}
    >
      {children}
    </span>
  );
}
