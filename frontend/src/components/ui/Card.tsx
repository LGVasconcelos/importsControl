import type { CSSProperties, ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  style?: CSSProperties;
  accent?: string;
}

export function Card({ children, style, accent }: CardProps) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)' as unknown as number,
        padding: '20px 24px',
        boxShadow: 'var(--shadow)',
        ...(accent ? { borderTop: `3px solid ${accent}` } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

interface StatCardProps {
  icon?: ReactNode;
  label: string;
  value: ReactNode;
  color: string;
  active?: boolean;
  onClick?: () => void;
}

/** Card de estatística clicável (usado como filtro) ou apenas informativo. */
export function StatCard({ icon, label, value, color, active, onClick }: StatCardProps) {
  const clickable = !!onClick;
  const Tag = clickable ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: clickable ? 'center' : 'flex-start',
        justifyContent: 'center',
        gap: 6,
        padding: clickable ? '14px 10px' : '20px 24px',
        background: 'var(--bg-card)',
        border: clickable ? `2px solid ${active ? color : 'transparent'}` : 'none',
        borderRadius: 'var(--radius-lg)' as unknown as number,
        cursor: clickable ? 'pointer' : 'default',
        boxShadow: clickable && active ? `0 0 0 2px ${color}40` : 'var(--shadow)',
        fontFamily: 'inherit',
        textAlign: clickable ? 'center' : 'left',
      }}
    >
      {icon && <div style={{ fontSize: 28, marginBottom: clickable ? 0 : 8 }}>{icon}</div>}
      <span style={{ fontSize: clickable ? 22 : 32, fontWeight: 800, color, lineHeight: 1 }}>{value}</span>
      {clickable ? (
        <span style={{ fontSize: 11, fontWeight: 600, color, background: `${color}1a`, padding: '2px 8px', borderRadius: 20 }}>{label}</span>
      ) : (
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, fontWeight: 500 }}>{label}</span>
      )}
    </Tag>
  );
}
