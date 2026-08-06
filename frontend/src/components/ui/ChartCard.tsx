import type { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  children: ReactNode;
}

export default function ChartCard({ title, children }: ChartCardProps) {
  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)' as unknown as number, padding: '20px 24px', boxShadow: 'var(--shadow)' }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>{title}</h2>
      {children}
    </div>
  );
}
