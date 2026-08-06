interface EmptyStateProps {
  children: React.ReactNode;
  color?: string;
}

export default function EmptyState({ children, color }: EmptyStateProps) {
  return (
    <div style={{ padding: 40, textAlign: 'center', color: color || 'var(--text-secondary)' }}>
      {children}
    </div>
  );
}
