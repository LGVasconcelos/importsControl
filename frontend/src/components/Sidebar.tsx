import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const links = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/products', label: 'Produtos', icon: '📦' },
  { to: '/stock', label: 'Estoque', icon: '🏭' },
  { to: '/orders', label: 'Pedidos', icon: '🚢' },
  { to: '/costs', label: 'Custos', icon: '💰' },
  { to: '/reports', label: 'Relatórios', icon: '📈' },
  { to: '/mercadolivre', label: 'Mercado Livre', icon: '🛒' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside style={styles.sidebar}>
      <div style={styles.logo}>
        <span style={{ fontSize: 22 }}>🌐</span>
        <span style={styles.logoText}>ImportsControl</span>
      </div>
      <nav style={styles.nav}>
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/'}
            style={({ isActive }) => ({ ...styles.link, ...(isActive ? styles.activeLink : {}) })}
          >
            <span>{l.icon}</span>
            <span>{l.label}</span>
          </NavLink>
        ))}
      </nav>
      <div style={styles.footer}>
        <button onClick={toggleTheme} style={styles.themeBtn}>
          {theme === 'light' ? '🌙 Modo Escuro' : '☀️ Modo Claro'}
        </button>
        <div style={styles.userInfo}>
          <span style={{ fontSize: 18 }}>👤</span>
          <div>
            <div style={styles.userName}>{user?.name}</div>
            <div style={styles.userEmail}>{user?.email}</div>
          </div>
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn}>Sair</button>
      </div>
    </aside>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: { width: 230, minHeight: '100vh', background: '#1e293b', display: 'flex', flexDirection: 'column', padding: '0' },
  logo: { display: 'flex', alignItems: 'center', gap: 10, padding: '24px 20px 20px', borderBottom: '1px solid #334155' },
  logoText: { color: '#f1f5f9', fontWeight: 700, fontSize: 16, letterSpacing: 0.5 },
  nav: { flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 4 },
  link: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, color: '#94a3b8', textDecoration: 'none', fontSize: 14, fontWeight: 500 },
  activeLink: { background: '#334155', color: '#f1f5f9' },
  footer: { padding: '16px 12px', borderTop: '1px solid #334155' },
  themeBtn: { width: '100%', padding: '8px', background: '#334155', color: '#94a3b8', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, marginBottom: 10, textAlign: 'left' as const },
  userInfo: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  userName: { color: '#f1f5f9', fontSize: 13, fontWeight: 600 },
  userEmail: { color: '#64748b', fontSize: 11 },
  logoutBtn: { width: '100%', padding: '8px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
};
