import type { ButtonHTMLAttributes, CSSProperties } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
export type ButtonSize = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, CSSProperties> = {
  primary: { background: 'var(--color-primary)', color: '#fff' },
  danger: { background: 'var(--color-danger-bg)', color: 'var(--color-danger)' },
  success: { background: 'var(--color-success-bg)', color: 'var(--color-success)' },
  secondary: { background: 'var(--bg-cancel)', color: 'var(--text-cancel)', border: '1.5px solid var(--border)' },
  ghost: { background: 'transparent', color: 'var(--text-body)', border: '1.5px solid var(--border)' },
};

const sizeStyles: Record<ButtonSize, CSSProperties> = {
  md: { padding: '9px 18px', fontSize: 13, borderRadius: 'var(--radius-md)' as unknown as number },
  sm: { padding: '5px 12px', fontSize: 12, borderRadius: 'var(--radius-sm)' as unknown as number },
};

export default function Button({ variant = 'primary', size = 'md', style, className, ...props }: ButtonProps) {
  return (
    <button
      className={`ui-btn${className ? ` ${className}` : ''}`}
      style={{
        fontWeight: 700,
        border: 'none',
        whiteSpace: 'nowrap',
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...style,
      }}
      {...props}
    />
  );
}
