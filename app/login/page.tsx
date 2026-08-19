'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.ok) {
        router.push('/dashboard');
        router.refresh();
      } else {
        setError(data.error || 'Usuario o contraseña incorrectos');
      }
    } catch {
      setError('Error de red. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.shell}>
      {/* Ambient glow */}
      <div style={S.glow1} />
      <div style={S.glow2} />

      <div style={S.card}>
        {/* Logo */}
        <div style={S.logoWrap}>
          <div style={S.logoIcon}>G</div>
          <h1 style={S.logoTitle}>GEX Reportes</h1>
          <p style={S.logoSub}>Sistema de cierres diarios · Evolution API</p>
        </div>

        <form onSubmit={handleSubmit} style={S.form}>
          <div style={S.field}>
            <label htmlFor="login-user" style={S.label}>Usuario</label>
            <div style={S.inputWrap}>
              <span style={S.inputIcon}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </span>
              <input
                id="login-user"
                className="input"
                style={{ paddingLeft: '40px' }}
                type="text"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                autoComplete="username"
              />
            </div>
          </div>

          <div style={S.field}>
            <label htmlFor="login-pass" style={S.label}>Contraseña</label>
            <div style={S.inputWrap}>
              <span style={S.inputIcon}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </span>
              <input
                id="login-pass"
                className="input"
                style={{ paddingLeft: '40px', paddingRight: '44px' }}
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                style={S.eyeBtn}
                onClick={() => setShowPass(!showPass)}
                tabIndex={-1}
                aria-label={showPass ? 'Ocultar' : 'Mostrar'}
              >
                {showPass ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {error && (
            <div style={S.errorBox}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', height: '46px', fontSize: '14px', marginTop: '4px' }}
          >
            {loading ? (
              <>
                <span className="animate-spin" style={{ width: '15px', height: '15px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block' }} />
                Entrando…
              </>
            ) : (
              'Iniciar sesión'
            )}
          </button>
        </form>

        <p style={S.footer}>DigitalMoneyGex © 2026 · v2.3</p>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  shell: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#060c18',
    position: 'relative',
    overflow: 'hidden',
    padding: '24px',
  },
  glow1: {
    position: 'absolute',
    top: '-10%',
    left: '30%',
    width: '700px',
    height: '700px',
    background: 'radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 65%)',
    pointerEvents: 'none',
    transform: 'translateX(-50%)',
  },
  glow2: {
    position: 'absolute',
    bottom: '-10%',
    right: '20%',
    width: '500px',
    height: '500px',
    background: 'radial-gradient(circle, rgba(34,211,238,0.08) 0%, transparent 65%)',
    pointerEvents: 'none',
  },
  card: {
    position: 'relative',
    background: '#0c1428',
    border: '1px solid rgba(148,163,184,0.1)',
    borderRadius: '24px',
    padding: '44px 40px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.02) inset',
    animation: 'fade-in 0.4s ease forwards',
  },
  logoWrap: {
    textAlign: 'center',
    marginBottom: '36px',
  },
  logoIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '900',
    fontSize: '26px',
    color: 'white',
    margin: '0 auto 16px',
    boxShadow: '0 8px 32px rgba(99,102,241,0.45)',
  },
  logoTitle: {
    fontSize: '22px',
    fontWeight: '800',
    color: '#e8edf5',
    letterSpacing: '-0.04em',
    margin: '0 0 6px',
  },
  logoSub: {
    fontSize: '12px',
    color: '#2d3748',
    letterSpacing: '0.01em',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  },
  inputWrap: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: '13px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#2d3748',
    display: 'flex',
    pointerEvents: 'none',
  },
  eyeBtn: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    lineHeight: 1,
    padding: '2px',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(248,113,113,0.08)',
    border: '1px solid rgba(248,113,113,0.2)',
    borderRadius: '10px',
    padding: '11px 14px',
    fontSize: '13px',
    color: '#f87171',
  },
  footer: {
    textAlign: 'center',
    marginTop: '28px',
    fontSize: '11px',
    color: '#1a2030',
    letterSpacing: '0.02em',
  },
};
