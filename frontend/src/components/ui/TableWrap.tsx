import type { CSSProperties, ReactNode } from 'react';

interface TableWrapProps {
  children: ReactNode;
  maxHeight?: string;
  style?: CSSProperties;
}

/**
 * Encapsula o padrão .responsive-table-wrap > table.responsive-table.
 * Toda tabela que usar isto ganha automaticamente o comportamento de
 * colapsar em cards no mobile (ver index.css) — inclusive tabelas novas
 * que antes esqueciam de aplicar essas classes manualmente.
 */
export default function TableWrap({ children, maxHeight = 'calc(100vh - 280px)', style }: TableWrapProps) {
  return (
    <div
      className="responsive-table-wrap"
      style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)' as unknown as number,
        boxShadow: 'var(--shadow)',
        overflowY: 'auto',
        overflowX: 'auto',
        maxHeight,
        minHeight: 120,
        ...style,
      }}
    >
      <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
        {children}
      </table>
    </div>
  );
}

export function Th({ children }: { children?: ReactNode }) {
  return (
    <th
      style={{
        padding: '12px 14px',
        textAlign: 'left',
        fontSize: 12,
        fontWeight: 700,
        color: 'var(--text-secondary)',
        textTransform: 'uppercase',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        background: 'var(--bg-thead)',
        zIndex: 1,
      }}
    >
      {children}
    </th>
  );
}

export function Td({ children, style, ...rest }: { children?: ReactNode; style?: CSSProperties; 'data-label'?: string }) {
  return (
    <td style={{ padding: '11px 14px', fontSize: 13, color: 'var(--text-body)', verticalAlign: 'middle', ...style }} {...rest}>
      {children}
    </td>
  );
}
