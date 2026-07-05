import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/products': 'Produtos',
  '/stock': 'Estoque',
  '/orders': 'Pedidos',
  '/costs': 'Custos',
  '/reports': 'Relatórios',
  '/mercadolivre': 'Mercado Livre',
};

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const title = pageTitles[location.pathname] ?? '';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-app)' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 100, display: 'none',
          }}
          className="mobile-overlay"
        />
      )}

      <div className={`sidebar-wrap${sidebarOpen ? ' open' : ''}`}>
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Mobile topbar */}
        <header className="mobile-topbar">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menu"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 22, color: 'var(--text-primary)', lineHeight: 1,
            }}
          >
            ☰
          </button>
          <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>{title}</span>
          <span style={{ width: 28 }} />
        </header>

        <main className="main-content" style={{ flex: 1, padding: '32px', overflow: 'auto' }}>
          <Outlet />
        </main>
      </div>

      <style>{`
        .sidebar-wrap {
          flex-shrink: 0;
        }
        .mobile-topbar {
          display: none;
        }
        @media (max-width: 768px) {
          .sidebar-wrap {
            position: fixed;
            top: 0; left: 0; bottom: 0;
            z-index: 200;
            transform: translateX(-100%);
            transition: transform 0.25s ease;
          }
          .sidebar-wrap.open {
            transform: translateX(0);
          }
          .sidebar-wrap.open ~ * .mobile-overlay {
            display: block;
          }
          .mobile-overlay {
            display: block !important;
          }
          .mobile-topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            background: var(--bg-card);
            border-bottom: 1px solid var(--border);
            position: sticky;
            top: 0;
            z-index: 50;
            box-shadow: var(--shadow);
          }
          .main-content {
            padding: 16px !important;
          }
        }
      `}</style>
    </div>
  );
}
