import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch {
      toast.error('E-mail ou senha inválidos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <span style={{ fontSize: 40 }}>🌐</span>
          <h1 style={styles.title}>ImportsControl</h1>
          <p style={styles.subtitle}>Sistema de Controle de Estoque</p>
        </div>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>E-mail</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              style={styles.input} placeholder="seu@email.com" required
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Senha</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              style={styles.input} placeholder="••••••••" required
            />
          </div>
          <button type="submit" style={styles.btn} disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e293b' },
  card: { background: 'var(--bg-card)', borderRadius: 16, padding: '40px 36px', width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
  header: { textAlign: 'center', marginBottom: 32 },
  title: { fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', margin: '8px 0 4px' },
  subtitle: { color: 'var(--text-secondary)', fontSize: 14 },
  form: { display: 'flex', flexDirection: 'column', gap: 18 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: 'var(--text-body)' },
  input: { padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 14, background: 'var(--bg-input)', color: 'var(--text-body)' },
  btn: { padding: '12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 4 },
};
