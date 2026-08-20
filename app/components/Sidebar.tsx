'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const NAV = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    href: '/pagos',
    label: 'Pagos',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2"/>
        <line x1="2" y1="10" x2="22" y2="10"/>
      </svg>
    ),
  },
  {
    href: '/conexion',
    label: 'Conexión WA',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  {
    href: '/configuracion',
    label: 'Config',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  },
];

type WaState = 'open' | 'connecting' | 'offline' | 'checking';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [waState, setWaState] = useState<WaState>('checking');

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/evolution/status', { cache: 'no-store' });
        const data = await res.json();
        const status = data.instances?.[0]?.connectionStatus as string | undefined;
        setWaState(status === 'open' ? 'open' : status === 'connecting' ? 'connecting' : 'offline');
      } catch {
        setWaState('offline');
      }
    };
    check();
    const id = setInterval(check, 12000);
    return () => clearInterval(id);
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const waColor = waState === 'open' ? '#34d399' : waState === 'connecting' ? '#fbbf24' : waState === 'checking' ? '#475569' : '#f87171';
  const waLabel = waState === 'open' ? 'Conectado' : waState === 'connecting' ? 'Conectando…' : waState === 'checking' ? 'Verificando…' : 'Desconectado';

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside className="sidebar-desktop">
        {/* Logo */}
        <div style={S.logoWrap}>
          <div style={S.logoIcon}>G</div>
          <div>
            <div style={S.logoName}>GEX</div>
            <div style={S.logoSub}>Reportes de Cierres</div>
          </div>
        </div>

        {/* WA Status */}
        <div style={S.waBox}>
          <span style={{ ...S.waDot, background: waColor, boxShadow: `0 0 8px ${waColor}` }} className={waState === 'open' ? 'dot-pulse' : ''} />
          <div>
            <div style={S.waHead}>WhatsApp</div>
            <div style={{ ...S.waVal, color: waColor }}>{waLabel}</div>
          </div>
        </div>

        <div style={S.sep} />

        {/* Nav */}
        <nav style={S.nav}>
          <div style={S.navSection}>MENÚ</div>
          {NAV.map(({ href, label, icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                style={active ? { ...S.navItem, ...S.navActive } : S.navItem}
              >
                <span style={{ color: active ? '#818cf8' : '#475569', display: 'flex' }}>{icon}</span>
                <span>{label}</span>
                {active && <span style={S.navDot} />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={S.footer}>
          <div style={S.avatar}>A</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={S.userName}>Administrador</div>
            <div style={S.userRole}>GEX System</div>
          </div>
          <button onClick={handleLogout} style={S.logoutBtn} title="Cerrar sesión" aria-label="Cerrar sesión">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </aside>

      {/* ── Mobile Top Bar ── */}
      <header className="mobile-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ ...S.logoIcon, width: '30px', height: '30px', fontSize: '15px', borderRadius: '8px' }}>G</div>
          <div>
            <div style={{ ...S.logoName, fontSize: '13px' }}>GEX</div>
            <div style={{ ...S.logoSub, fontSize: '9px' }}>Reportes de Cierres</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: waColor, boxShadow: `0 0 6px ${waColor}`, display: 'inline-block' }} />
          <span style={{ fontSize: '11px', fontWeight: '600', color: waColor }}>{waLabel}</span>
        </div>
      </header>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="mobile-bottomnav">
        {NAV.map(({ href, label, icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '3px',
                flex: 1,
                padding: '8px 4px',
                color: active ? '#818cf8' : '#475569',
                textDecoration: 'none',
                fontSize: '10px',
                fontWeight: active ? '700' : '500',
                borderTop: active ? '2px solid #6366f1' : '2px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ display: 'flex' }}>{icon}</span>
              <span>{label}</span>
            </Link>
          );
        })}
        <button
          onClick={handleLogout}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
            flex: 1, padding: '8px 4px', background: 'none', border: 'none',
            color: '#475569', fontSize: '10px', fontWeight: '500', cursor: 'pointer',
            borderTop: '2px solid transparent',
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span>Salir</span>
        </button>
      </nav>
    </>
  );
}

const S: Record<string, React.CSSProperties> = {
  logoWrap: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '22px 20px 20px',
    borderBottom: '1px solid rgba(148,163,184,0.07)',
  },
  logoIcon: {
    width: '36px', height: '36px', borderRadius: '10px',
    background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: '900', fontSize: '18px', color: 'white', flexShrink: 0,
    boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
  },
  logoName: {
    fontSize: '15px', fontWeight: '800', color: '#e8edf5',
    letterSpacing: '-0.03em', lineHeight: 1.1,
  },
  logoSub: {
    fontSize: '10px', color: '#2d3748', fontWeight: '500',
    marginTop: '2px', letterSpacing: '0.02em',
  },
  waBox: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '14px 20px',
    background: 'rgba(148,163,184,0.03)',
    borderBottom: '1px solid rgba(148,163,184,0.07)',
  },
  waDot: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 },
  waHead: {
    fontSize: '10px', color: '#2d3748', fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: '0.1em', lineHeight: 1,
  },
  waVal: { fontSize: '12px', fontWeight: '600', marginTop: '3px', lineHeight: 1 },
  sep: { height: '1px', background: 'rgba(148,163,184,0.05)' },
  nav: {
    flex: 1, padding: '16px 12px',
    display: 'flex', flexDirection: 'column', gap: '2px',
  },
  navSection: {
    fontSize: '10px', fontWeight: '700', color: '#2d3748',
    letterSpacing: '0.12em', padding: '0 8px',
    marginBottom: '8px', marginTop: '4px',
  },
  navItem: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '9px 10px', borderRadius: '10px',
    color: '#475569', textDecoration: 'none',
    fontSize: '13.5px', fontWeight: '500',
    transition: 'all 0.14s ease', position: 'relative', letterSpacing: '-0.01em',
  },
  navActive: {
    background: 'rgba(99,102,241,0.1)', color: '#818cf8',
    fontWeight: '600', border: '1px solid rgba(99,102,241,0.12)',
  },
  navDot: {
    position: 'absolute', right: '10px', top: '50%',
    transform: 'translateY(-50%)',
    width: '5px', height: '5px', borderRadius: '50%', background: '#6366f1',
  },
  footer: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '16px', borderTop: '1px solid rgba(148,163,184,0.07)',
    background: 'rgba(148,163,184,0.02)',
  },
  avatar: {
    width: '30px', height: '30px', borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366f1, #22d3ee)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '12px', fontWeight: '700', color: 'white', flexShrink: 0,
  },
  userName: { fontSize: '12px', fontWeight: '600', color: '#e8edf5', lineHeight: 1.2 },
  userRole: { fontSize: '10px', color: '#2d3748', marginTop: '1px' },
  logoutBtn: {
    background: 'transparent', border: 'none', color: '#2d3748',
    cursor: 'pointer', padding: '6px', borderRadius: '8px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'color 0.15s, background 0.15s', flexShrink: 0,
  },
};
