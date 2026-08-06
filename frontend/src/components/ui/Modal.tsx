import type { ReactNode } from 'react';

interface ModalProps {
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  maxWidth?: number;
}

/** Overlay + box padrão, sempre com as classes modal-overlay/modal-box (comportamento mobile fullscreen). */
export default function Modal({ title, subtitle, children, footer, onClose, maxWidth = 520 }: ModalProps) {
  return (
    <div
      className="modal-overlay"
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
      onClick={onClose}
    >
      <div
        className="modal-box"
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)' as unknown as number,
          padding: '28px 32px',
          width: '100%',
          maxWidth,
          maxHeight: '90dvh',
          overflowY: 'auto',
          boxSizing: 'border-box',
          boxShadow: 'var(--shadow-lg)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h2>
          {subtitle && <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{subtitle}</p>}
        </div>
        {children}
        {footer && <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>{footer}</div>}
      </div>
    </div>
  );
}
