'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Pago = {
  id: string;
  created_at: string;
  telefono_emisor: string;
  monto_bs: number;
  monto_usd?: number;
  referencia: string;
  banco_origen: string;
  metodo: string;
  procesado: boolean;
};

type WaInstance = {
  name: string;
  connectionStatus: string;
  profileName: string | null;
  number: string | null;
};

const fmtBs = (v: number) =>
  new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency: 'VES',
    maximumFractionDigits: 2,
  }).format(v ?? 0);

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });

const fmtDate = () =>
  new Date().toLocaleDateString('es-VE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

export default function DashboardPage() {
  const [pagos, setPagos]       = useState<Pago[]>([]);
  const [waInst, setWaInst]     = useState<WaInstance | null>(null);
  const [tasa, setTasa]         = useState<number>(0);
  const [loading, setLoading]   = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLast]   = useState('');
  const [newCount, setNewCount] = useState(0);
  const prevIdsRef              = useRef<Set<string>>(new Set());

  const loadTasa = useCallback(async () => {
    try {
      const res = await fetch('/api/tasa', { cache: 'no-store' });
      const json = await res.json();
      if (json.ok && json.tasa) setTasa(json.tasa);
    } catch { /* silent */ }
  }, []);

  const loadPagos = useCallback(async () => {
    try {
      const res  = await fetch('/api/pagos?limit=50', { cache: 'no-store' });
      const json = await res.json() as { ok: boolean; data: Pago[] };
      if (json.ok && json.data) {
        const fresh = json.data;
        // detect new rows
        const newIds = fresh.filter(p => !prevIdsRef.current.has(p.id));
        if (prevIdsRef.current.size > 0 && newIds.length > 0) {
          setNewCount(n => n + newIds.length);
        }
        prevIdsRef.current = new Set(fresh.map(p => p.id));
        setPagos(fresh);
        setLast(new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  const loadWA = useCallback(async () => {
    try {
      const res  = await fetch('/api/evolution/status', { cache: 'no-store' });
      const json = await res.json() as { ok: boolean; instances?: WaInstance[] };
      if (json.ok && json.instances?.[0]) setWaInst(json.instances[0]);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    loadPagos();
    loadWA();
    loadTasa();
    const id1 = setInterval(loadPagos, 10000); // poll every 10s
    const id2 = setInterval(loadWA, 15000);
    const id3 = setInterval(loadTasa, 60000); // poll tasa every 1m
    return () => { clearInterval(id1); clearInterval(id2); clearInterval(id3); };
  }, [loadPagos, loadWA, loadTasa]);

  const total     = pagos.reduce((s, p) => s + (p.monto_bs ?? 0), 0);
  const totalUsd  = tasa > 0 ? (total / tasa) : 0;
  const procesados = pagos.filter(p => p.procesado).length;

  const waColor = waInst?.connectionStatus === 'open' ? '#34d399'
    : waInst?.connectionStatus === 'connecting' ? '#fbbf24' : '#f87171';
  const waLabel = waInst?.connectionStatus === 'open' ? 'Conectado'
    : waInst?.connectionStatus === 'connecting' ? 'Conectando…' : 'Desconectado';

  // Bar chart data: group by hour
  const byHour = Array.from({ length: 24 }, (_, h) => {
    const slice = pagos.filter(p => new Date(p.created_at).getHours() === h);
    return { hour: h, count: slice.length, total: slice.reduce((s, p) => s + (p.monto_bs ?? 0), 0) };
  });
  const maxCount = Math.max(...byHour.map(b => b.count), 1);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: '4px' }}>{fmtDate()}</p>
          <h1 className="page-title">Dashboard</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px', flexWrap: 'wrap' }}>
            <p className="page-subtitle" style={{ margin: 0 }}>Vista en tiempo real · actualización cada 10 seg</p>
            {tasa > 0 && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'linear-gradient(135deg, rgba(251,191,36,0.15) 0%, rgba(245,158,11,0.1) 100%)',
                border: '1px solid rgba(251,191,36,0.35)',
                borderRadius: '8px',
                padding: '4px 12px',
                fontFamily: 'Inter, sans-serif',
                fontSize: '13px',
                fontWeight: '800',
                color: '#fbbf24',
                letterSpacing: '-0.01em',
                boxShadow: '0 0 16px rgba(251,191,36,0.12)',
                textShadow: '0 0 12px rgba(251,191,36,0.4)',
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23"/>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
                Tasa BCV: Bs.&nbsp;{tasa.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {newCount > 0 && (
            <button className="badge badge-green" style={{ cursor: 'pointer', border: 'none' }} onClick={() => setNewCount(0)}>
              +{newCount} nuevo{newCount > 1 ? 's' : ''}
            </button>
          )}
          <span style={{ fontSize: '11px', color: '#2d3748' }}>
            {lastUpdate ? `Actualizado ${lastUpdate}` : 'Cargando…'}
          </span>
          <button
            id="dashboard-refresh"
            className="btn btn-ghost btn-sm"
            disabled={isRefreshing}
            onClick={async () => {
              setIsRefreshing(true);
              try {
                await Promise.all([loadPagos(), loadWA(), loadTasa()]);
              } finally {
                setIsRefreshing(false);
              }
            }}
          >
            <svg
              style={{ transition: 'transform 0.6s ease', transform: isRefreshing ? 'rotate(360deg)' : 'rotate(0deg)' }}
              width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            >
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            {isRefreshing ? 'Actualizando...' : 'Refrescar'}
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {/* Total */}
        <div className="card-glow" style={{ background: 'linear-gradient(135deg, #0c1428 0%, #101a2e 100%)' }}>
          <p className="label" style={{ marginBottom: '12px', color: '#475569' }}>Total del día</p>
          {loading ? <div className="skeleton" style={{ height: '36px', marginBottom: '6px' }} /> : (
            <div>
              <p style={{ fontSize: '26px', fontWeight: '900', color: '#818cf8', letterSpacing: '-0.06em', lineHeight: 1 }}>{fmtBs(total)}</p>
              {tasa > 0 && <p style={{ fontSize: '13px', color: '#34d399', marginTop: '6px', fontWeight: '600' }}>~ $ {totalUsd.toFixed(2)} USD</p>}
            </div>
          )}
          <p style={{ fontSize: '12px', color: '#2d3748', marginTop: '6px' }}>Acumulado hoy {tasa > 0 ? `(Tasa BCV: Bs. ${tasa})` : ''}</p>
        </div>

        {/* Capturas */}
        <div className="card">
          <p className="label" style={{ marginBottom: '12px' }}>Capturas</p>
          {loading ? <div className="skeleton" style={{ height: '36px', marginBottom: '6px' }} /> : (
            <p style={{ fontSize: '36px', fontWeight: '900', color: '#34d399', letterSpacing: '-0.06em', lineHeight: 1 }}>{pagos.length}</p>
          )}
          <p style={{ fontSize: '12px', color: '#2d3748', marginTop: '6px' }}>Mensajes recibidos hoy</p>
        </div>

        {/* Procesados */}
        <div className="card">
          <p className="label" style={{ marginBottom: '12px' }}>Procesados</p>
          {loading ? <div className="skeleton" style={{ height: '36px', marginBottom: '6px' }} /> : (
            <p style={{ fontSize: '36px', fontWeight: '900', color: '#22d3ee', letterSpacing: '-0.06em', lineHeight: 1 }}>{procesados}</p>
          )}
          <p style={{ fontSize: '12px', color: '#2d3748', marginTop: '6px' }}>OCR / parsing completado</p>
        </div>

        {/* WhatsApp */}
        <div className="card" style={{ borderColor: waInst?.connectionStatus === 'open' ? 'rgba(52,211,153,0.2)' : 'rgba(148,163,184,0.1)' }}>
          <p className="label" style={{ marginBottom: '12px' }}>WhatsApp</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="dot dot-pulse" style={{ background: waColor, boxShadow: `0 0 8px ${waColor}` }} />
            <p style={{ fontSize: '18px', fontWeight: '700', color: waColor }}>{waLabel}</p>
          </div>
          <p style={{ fontSize: '12px', color: '#2d3748', marginTop: '6px' }}>
            {waInst?.profileName ?? waInst?.name ?? 'mi_bot'}
          </p>
        </div>
      </div>

      {/* Chart + Table row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr', gap: '20px', marginBottom: '28px' }}>
        {/* Bar chart */}
        <div className="card">
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '14px', fontWeight: '700', color: '#e8edf5' }}>Capturas por hora</p>
            <p style={{ fontSize: '11px', color: '#2d3748', marginTop: '2px' }}>Hoy</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '80px' }}>
            {byHour.filter(b => b.hour >= 5 && b.hour <= 22).map(b => (
              <div key={b.hour} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div
                  style={{
                    width: '100%',
                    height: `${Math.max(4, (b.count / maxCount) * 70)}px`,
                    background: b.count > 0
                      ? 'linear-gradient(180deg, #818cf8 0%, #6366f1 100%)'
                      : 'rgba(148,163,184,0.08)',
                    borderRadius: '3px 3px 0 0',
                    transition: 'height 0.3s ease',
                    position: 'relative',
                  }}
                  title={`${b.hour}h: ${b.count} capturas`}
                />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '10px', color: '#2d3748' }}>
            <span>05:00</span>
            <span>13:00</span>
            <span>22:00</span>
          </div>
        </div>

        {/* Stats list */}
        <div className="card">
          <p style={{ fontSize: '14px', fontWeight: '700', color: '#e8edf5', marginBottom: '16px' }}>Resumen del día</p>
          <div style={{ display: 'grid', gap: '0' }}>
            {[
              { label: 'Total Bs.S', value: fmtBs(total), color: '#818cf8' },
              { label: 'Capturas totales', value: pagos.length.toString(), color: '#e8edf5' },
              { label: 'Procesadas (OCR)', value: `${procesados} / ${pagos.length}`, color: '#34d399' },
              { label: 'Tasa de éxito', value: pagos.length > 0 ? `${Math.round((procesados / pagos.length) * 100)}%` : '—', color: '#22d3ee' },
              { label: 'Instancia WA', value: waInst?.name ?? 'mi_bot', color: '#94a3b8' },
              { label: 'Estado WA', value: waLabel, color: waColor },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid rgba(148,163,184,0.06)' }}>
                <span style={{ fontSize: '13px', color: '#475569' }}>{label}</span>
                <span style={{ fontSize: '13px', fontWeight: '700', color }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent payments table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 16px' }}>
          <div>
            <p style={{ fontSize: '14px', fontWeight: '700', color: '#e8edf5' }}>Capturas recientes</p>
            <p style={{ fontSize: '11px', color: '#2d3748', marginTop: '2px' }}>Últimos 50 registros del día</p>
          </div>
          <span className="badge badge-green" style={{ gap: '6px' }}>
            <span className="dot dot-pulse" style={{ background: '#34d399', width: '6px', height: '6px' }} />
            En vivo
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#475569' }}>
            <div className="animate-spin" style={{ width: '24px', height: '24px', border: '2px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', borderRadius: '50%', margin: '0 auto 12px' }} />
            Cargando datos de Supabase…
          </div>
        ) : pagos.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
            <p style={{ color: '#475569', fontWeight: '600' }}>Sin capturas hoy</p>
            <p style={{ color: '#2d3748', fontSize: '12px', marginTop: '6px' }}>
              Los pagos de WhatsApp aparecerán aquí automáticamente
            </p>
          </div>
        ) : (
          <div className="table-wrap" style={{ borderRadius: 0, border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Banco</th>
                  <th>Referencia</th>
                  <th>Teléfono</th>
                  <th>Monto Bs.S</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {pagos.map((p) => (
                  <tr key={p.id}>
                    <td style={{ color: '#475569', fontSize: '12px', fontFamily: 'monospace' }}>{fmtTime(p.created_at)}</td>
                    <td style={{ fontWeight: '500', fontSize: '13px' }}>{p.banco_origen || '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px', color: '#818cf8' }}>{p.referencia || '—'}</td>
                    <td style={{ fontSize: '12px' }}>{p.telefono_emisor || '—'}</td>
                    <td>
                      <div style={{ fontWeight: '800', color: '#34d399', fontSize: '13px' }}>{fmtBs(p.monto_bs)}</div>
                      {(p.monto_usd || (tasa > 0 ? (p.monto_bs / tasa) : 0)) > 0 && (
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', fontWeight: '500' }}>
                          ~ $ {(p.monto_usd || (p.monto_bs / tasa)).toFixed(2)} USD
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${p.procesado ? 'badge-green' : 'badge-yellow'}`}>
                        {p.procesado ? '✓ Procesado' : '⏳ Pendiente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
