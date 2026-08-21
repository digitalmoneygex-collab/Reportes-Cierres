'use client';

import { useCallback, useEffect, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
type Factura = {
  id: string;
  fecha: string;
  documento: string;
  nombre_cliente: string;
  monto_bs: number;
  tipo_doc: 'FAC' | 'DEV';
  metodo_pago: string | null;
  procesado: boolean;
  procesado_at: string | null;
};

const METODOS_PAGO = [
  { value: 'punto_venta',      label: '💳 Punto de Venta' },
  { value: 'dolares_efectivo', label: '💵 Dólares Efectivo' },
  { value: 'bs_efectivo',      label: '💴 Bs Efectivo' },
  { value: 'transferencia',    label: '🏦 Transferencia' },
  { value: 'pago_movil',       label: '📱 Pago Móvil' },
  { value: 'credito',          label: '📋 Crédito' },
  { value: 'binance',          label: '🟡 Binance' },
  { value: 'zelle',            label: '💸 Zelle' },
  { value: 'bio_pago',         label: '🔵 Bio Pago' },
  { value: 'gasto',            label: '📉 Gasto' },
  { value: 'dev_punto_venta',      label: '↩️ Dev. Punto de Venta' },
  { value: 'dev_pago_movil',       label: '↩️ Dev. Pago Móvil' },
  { value: 'dev_bs_efectivo',      label: '↩️ Dev. Bs Efectivo' },
  { value: 'dev_dolares_efectivo', label: '↩️ Dev. Dólares Efect.' },
  { value: 'dev_transferencia',    label: '↩️ Dev. Transferencia' },
  { value: 'dev_binance',          label: '↩️ Dev. Binance' },
  { value: 'dev_zelle',            label: '↩️ Dev. Zelle' },
  { value: 'dev_bio_pago',         label: '↩️ Dev. Bio Pago' },
];

const fmtBs = (v: number) =>
  new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v ?? 0);

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ConciliacionPage() {
  const todayVZ = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });

  const [fecha, setFecha]           = useState('');           // La resuelve la API con la ventana horaria
  const [facturas, setFacturas]     = useState<Factura[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [noTable, setNoTable]       = useState(false);
  const [selects, setSelects]       = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<Record<string, boolean>>({});
  const [toast, setToast]           = useState('');
  const [isSupervisor, setIsSupervisor] = useState(false);

  useEffect(() => {
    fetch('/api/turnos')
      .then(r => r.json())
      .then(d => {
        if (d.perfil && d.perfil.rol === 'SUPERVISOR') setIsSupervisor(true);
      })
      .catch(() => {});
  }, []);

  // ── Cargar facturas ─────────────────────────────────────────────────────────
  const load = useCallback(async (d: string) => {
    setLoading(true);
    setError('');
    setNoTable(false);
    try {
      // Si d está vacío (primera carga), dejar que la API resuelva la fecha operativa
      const url = d ? `/api/conciliacion?date=${d}` : '/api/conciliacion';
      const res  = await fetch(url, { cache: 'no-store' });
      const data = await res.json();
      if (data.ok) {
        setFacturas(data.facturas);
        // La API devuelve la fecha resuelta (respetando ventana 6am)
        if (data.fecha && !d) setFecha(data.fecha);
        // Pre-cargar selects con el método ya guardado (si existe)
        const init: Record<string, string> = {};
        data.facturas.forEach((f: Factura) => {
          if (f.metodo_pago) init[f.id] = f.metodo_pago;
        });
        setSelects(prev => ({ ...init, ...prev }));
      } else if (data.noTable) {
        setNoTable(true);
      } else {
        setError(data.error ?? 'Error al cargar datos');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error de red');
    } finally {
      setLoading(false);
    }
  }, []);

  // Primera carga: sin fecha para que la API resuelva la ventana operativa
  useEffect(() => { load(''); }, [load]);
  // Recargar cuando el usuario cambia la fecha manualmente
  useEffect(() => { if (fecha) load(fecha); }, [fecha, load]);

  // ── Procesar factura ────────────────────────────────────────────────────────
  const procesar = async (id: string) => {
    const f = facturas.find(fact => fact.id === id);
    const metodo = selects[id] || f?.metodo_pago;
    if (!metodo) {
      showToast('⚠️ Selecciona un método de pago primero');
      return;
    }
    setProcessing(p => ({ ...p, [id]: true }));
    try {
      const res  = await fetch('/api/conciliacion', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, metodo_pago: metodo }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast('✅ Procesado y bloqueado correctamente');
        // Actualizar la fila localmente sin recargar todo
        setFacturas(prev =>
          prev.map(f => f.id === id ? { ...f, procesado: true, metodo_pago: metodo, procesado_at: new Date().toISOString() } : f)
        );
      } else {
        showToast(`❌ ${data.error}`);
      }
    } catch {
      showToast('❌ Error de conexión');
    } finally {
      setProcessing(p => ({ ...p, [id]: false }));
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  // ── Stats ───────────────────────────────────────────────────────────────────
  const totalFacturas   = facturas.filter(f => f.tipo_doc === 'FAC').length;
  const totalDev        = facturas.filter(f => f.tipo_doc === 'DEV').length;
  const procesadas      = facturas.filter(f => f.procesado).length;
  const pendientes      = facturas.length - procesadas;
  const montoTotal      = facturas.filter(f => f.tipo_doc === 'FAC').reduce((s, f) => s + f.monto_bs, 0);
  const montoProcesado  = facturas.filter(f => f.procesado && f.tipo_doc === 'FAC').reduce((s, f) => s + f.monto_bs, 0);

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
          background: '#1e293b', border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: '12px', padding: '12px 20px',
          fontSize: '13px', fontWeight: '600', color: '#e8edf5',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          animation: 'fadeIn 0.2s ease',
        }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#e8edf5', letterSpacing: '-0.04em', marginBottom: '4px' }}>
          📋 Conciliación de Caja
        </h1>
        <p style={{ fontSize: '13px', color: '#475569' }}>
          Asigna el método de pago a cada factura de PSKloud. Una vez procesada, la fila queda bloqueada.
        </p>
      </div>

      {/* Filtro fecha + Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '16px', marginBottom: '20px', alignItems: 'start' }}>
        
        {/* Date picker */}
        <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '180px' }}>
          <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Fecha</label>
          <input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            style={{
              background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(148,163,184,0.12)',
              borderRadius: '8px', padding: '8px 10px', color: '#e8edf5',
              fontSize: '13px', fontWeight: '600', outline: 'none', cursor: 'pointer',
            }}
          />
        </div>

        {/* Stats cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
          {[
            { label: 'Facturas', value: totalFacturas, color: '#818cf8' },
            { label: 'Devoluciones', value: totalDev, color: '#f87171' },
            { label: 'Procesadas', value: procesadas, color: '#34d399' },
            { label: 'Pendientes', value: pendientes, color: '#fbbf24' },
            { label: 'Total Bs', value: `Bs. ${fmtBs(montoTotal)}`, color: '#818cf8', small: true },
            { label: 'Procesado Bs', value: `Bs. ${fmtBs(montoProcesado)}`, color: '#34d399', small: true },
          ].map(({ label, value, color, small }) => (
            <div key={label} className="card" style={{ padding: '14px 16px' }}>
              <p style={{ fontSize: '10px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>{label}</p>
              <p style={{ fontSize: small ? '14px' : '24px', fontWeight: '900', color, letterSpacing: '-0.04em', lineHeight: 1 }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        
        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '100px 1fr 110px 140px 200px 130px',
          gap: '0',
          background: 'rgba(30,41,59,0.8)',
          borderBottom: '1px solid rgba(148,163,184,0.1)',
          padding: '12px 16px',
        }}>
          {['Documento', 'Cliente', 'Tipo', 'Monto Bs', 'Método de Pago', 'Acción'].map(h => (
            <span key={h} style={{ fontSize: '10px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {h}
            </span>
          ))}
        </div>

        {/* Rows */}
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#475569' }}>
            <div className="animate-spin" style={{ width: '32px', height: '32px', border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', borderRadius: '50%', margin: '0 auto 12px' }} />
            <p style={{ fontSize: '13px' }}>Cargando facturas…</p>
          </div>
        ) : noTable ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <p style={{ fontSize: '36px', marginBottom: '12px' }}>🗄️</p>
            <p style={{ color: '#fbbf24', fontSize: '14px', fontWeight: '700', marginBottom: '8px' }}>Tabla pskloud_facturas no encontrada</p>
            <p style={{ color: '#475569', fontSize: '12px', marginBottom: '16px' }}>Ejecuta el siguiente SQL en <strong style={{color:'#818cf8'}}>Supabase → SQL Editor</strong>:</p>
            <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '10px', padding: '16px', textAlign: 'left', fontSize: '11px', fontFamily: 'monospace', color: '#34d399', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
              {`CREATE TABLE IF NOT EXISTS pskloud_facturas (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha          date NOT NULL,
  documento      varchar NOT NULL,
  nombre_cliente varchar DEFAULT 'CLIENTE GENERAL',
  monto_bs       numeric DEFAULT 0,
  tipo_doc       varchar DEFAULT 'FAC',
  metodo_pago    varchar,
  procesado      boolean DEFAULT false,
  procesado_at   timestamptz,
  created_at     timestamptz DEFAULT now(),
  UNIQUE(fecha, documento)
);`}
            </div>
            <p style={{ color: '#475569', fontSize: '11px', marginTop: '12px' }}>Luego ejecuta: <code style={{color:'#818cf8'}}>node sync-pskloud.js</code> en la PC local.</p>
          </div>
        ) : error ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <p style={{ fontSize: '28px', marginBottom: '8px' }}>⚠️</p>
            <p style={{ color: '#f87171', fontSize: '13px', fontWeight: '600' }}>{error}</p>
            <p style={{ color: '#475569', fontSize: '12px', marginTop: '6px' }}>Verifica que sync-pskloud.js haya corrido y que la tabla pskloud_facturas exista en Supabase.</p>
          </div>
        ) : facturas.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <p style={{ fontSize: '36px', marginBottom: '8px' }}>📭</p>
            <p style={{ color: '#475569', fontSize: '14px', fontWeight: '600' }}>Sin facturas para {fecha}</p>
            <p style={{ color: '#2d3748', fontSize: '12px', marginTop: '4px' }}>Ejecuta node sync-pskloud.js para importar los datos del día.</p>
          </div>
        ) : (
          <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 360px)' }}>
            {facturas.map((f, idx) => {
              const isDev     = f.tipo_doc === 'DEV';
              const locked    = f.procesado;
              const inProcess = processing[f.id];
              const selected  = selects[f.id] ?? '';
              const metodoLabel = METODOS_PAGO.find(m => m.value === (f.metodo_pago ?? selected))?.label ?? '—';

              return (
                <div
                  key={f.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '100px 1fr 110px 140px 200px 130px',
                    gap: '0',
                    padding: '11px 16px',
                    borderBottom: '1px solid rgba(148,163,184,0.06)',
                    background: locked
                      ? 'rgba(52,211,153,0.03)'
                      : idx % 2 === 0 ? 'transparent' : 'rgba(148,163,184,0.015)',
                    alignItems: 'center',
                    transition: 'background 0.15s',
                  }}
                >
                  {/* Documento */}
                  <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#818cf8', fontWeight: '700' }}>
                    {f.documento}
                  </span>

                  {/* Cliente */}
                  <span style={{ fontSize: '12px', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.nombre_cliente}
                  </span>

                  {/* Tipo */}
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    fontSize: '10px', fontWeight: '700',
                    color: isDev ? '#f87171' : '#34d399',
                    background: isDev ? 'rgba(248,113,113,0.1)' : 'rgba(52,211,153,0.1)',
                    padding: '3px 8px', borderRadius: '6px',
                    width: 'fit-content',
                  }}>
                    {isDev ? '↩️ DEV' : '🧾 FAC'}
                  </span>

                  {/* Monto */}
                  <span style={{ fontSize: '13px', fontWeight: '700', color: isDev ? '#f87171' : '#e8edf5', fontFamily: 'monospace' }}>
                    {isDev ? '- ' : ''}Bs. {fmtBs(f.monto_bs)}
                  </span>

                  {/* Método de pago */}
                  {locked && !isSupervisor ? (
                    <span style={{
                      fontSize: '12px', fontWeight: '600', color: '#34d399',
                      background: 'rgba(52,211,153,0.1)', padding: '5px 10px',
                      borderRadius: '8px', border: '1px solid rgba(52,211,153,0.2)',
                    }}>
                      🔒 {metodoLabel}
                    </span>
                  ) : (
                    <select
                      value={selected || (f.metodo_pago ?? '')}
                      onChange={e => setSelects(prev => ({ ...prev, [f.id]: e.target.value }))}
                      style={{
                        background: 'rgba(15,23,42,0.9)',
                        border: `1px solid ${selected ? 'rgba(99,102,241,0.5)' : 'rgba(148,163,184,0.15)'}`,
                        borderRadius: '8px', padding: '6px 8px',
                        color: selected ? '#e8edf5' : '#475569',
                        fontSize: '12px', outline: 'none', cursor: 'pointer',
                        width: '100%',
                      }}
                    >
                      <option value="">— Seleccionar —</option>
                      {METODOS_PAGO.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  )}

                  {/* Botón Procesar */}
                  {locked && !isSupervisor ? (
                    <span style={{ fontSize: '10px', color: '#34d399', fontWeight: '600' }}>
                      ✅ Procesado<br />
                      <span style={{ color: '#2d3748', fontSize: '9px' }}>
                        {f.procesado_at ? new Date(f.procesado_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </span>
                  ) : (
                    <button
                      onClick={() => procesar(f.id)}
                      disabled={inProcess || !selected}
                      style={{
                        background: selected
                          ? 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)'
                          : 'rgba(71,85,105,0.2)',
                        border: 'none', borderRadius: '8px',
                        padding: '7px 14px', color: selected ? 'white' : '#475569',
                        fontSize: '11px', fontWeight: '700', cursor: selected ? 'pointer' : 'not-allowed',
                        opacity: inProcess ? 0.7 : 1,
                        transition: 'all 0.15s',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {inProcess ? '⏳' : '⚡ Procesar'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer de la tabla */}
        {!loading && facturas.length > 0 && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 16px', borderTop: '1px solid rgba(148,163,184,0.1)',
            background: 'rgba(30,41,59,0.5)',
          }}>
            <span style={{ fontSize: '12px', color: '#475569' }}>
              {facturas.length} registros · {procesadas} procesados · {pendientes} pendientes
            </span>
            <span style={{ fontSize: '12px', color: '#818cf8', fontWeight: '700' }}>
              Total: Bs. {fmtBs(montoTotal)}
            </span>
          </div>
        )}
      </div>

      {/* Nota informativa */}
      <div style={{
        marginTop: '16px', padding: '12px 16px',
        background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.15)',
        borderRadius: '10px', fontSize: '12px', color: '#fbbf24',
      }}>
        🔒 <strong>Inmutabilidad:</strong> Una vez procesada, la conciliación solo puede modificarse directamente en Supabase.
        En futuras versiones, el rol <em>Supervisor</em> podrá hacer correcciones desde el sistema.
      </div>
    </div>
  );
}
