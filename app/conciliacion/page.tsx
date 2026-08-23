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
  auditoria_check?: boolean;
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
  const [turnoActivo, setTurnoActivo] = useState<any>(null);
  const [turnoLoaded, setTurnoLoaded] = useState(false);
  const [checkedRows, setCheckedRows] = useState<Set<string>>(new Set());

  // ── Filtros locales ─────────────────────────────────────────────────────────
  const [fMetodo, setFMetodo]   = useState('todos');       // método de pago
  const [fEstado, setFEstado]   = useState('todos');       // todos | pendiente | procesada
  const [fTipo, setFTipo]       = useState('todos');       // todos | con_asterisco | sin_asterisco | dev
  const [fSearch, setFSearch]   = useState('');            // búsqueda libre

  useEffect(() => {
    fetch('/api/turnos')
      .then(r => r.json())
      .then(d => {
        if (d.perfil && d.perfil.rol === 'SUPERVISOR') setIsSupervisor(true);
        if (d.active && d.turno) setTurnoActivo(d.turno);
      })
      .catch(() => {})
      .finally(() => setTurnoLoaded(true));
  }, []);

  // ── Cargar facturas ─────────────────────────────────────────────────────────
  const load = useCallback(async (d: string, currentTurno?: any) => {
    setLoading(true);
    setError('');
    setNoTable(false);
    try {
      const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
      let url = d ? `/api/conciliacion?date=${d}` : '/api/conciliacion';
      
      if ((!d || d === hoy) && currentTurno) {
        url = `/api/conciliacion?abierto_at=${encodeURIComponent(currentTurno.abierto_at)}`;
        if (currentTurno.cerrado_at) {
          url += `&cerrado_at=${encodeURIComponent(currentTurno.cerrado_at)}`;
        }
      }
      const res  = await fetch(url, { cache: 'no-store' });
      const data = await res.json();
      if (data.ok) {
        setFacturas(data.facturas);
        if (data.fecha && !d) setFecha(data.fecha);
        const init: Record<string, string> = {};
        const initChecks = new Set<string>();
        data.facturas.forEach((f: Factura) => {
          if (f.metodo_pago) init[f.id] = f.metodo_pago;
          if (f.auditoria_check) initChecks.add(f.id);
        });
        setSelects(prev => ({ ...init, ...prev }));
        setCheckedRows(initChecks);
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

  // Primera carga: espera a que se resuelva el turno
  useEffect(() => { 
    if (turnoLoaded) load('', turnoActivo); 
  }, [turnoLoaded, turnoActivo, load]);

  // Recargar cuando el usuario cambia la fecha manualmente
  useEffect(() => { 
    if (fecha && turnoLoaded) load(fecha, turnoActivo); 
  }, [fecha, turnoLoaded, turnoActivo, load]);

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

  // ── Stats globales (sobre TODOS los datos) ───────────────────────────────────
  const totalFacturas   = facturas.filter(f => f.tipo_doc === 'FAC').length;
  const totalDev        = facturas.filter(f => f.tipo_doc === 'DEV').length;
  const procesadas      = facturas.filter(f => f.procesado).length;
  const pendientes      = facturas.length - procesadas;
  const montoTotal      = facturas.filter(f => f.tipo_doc === 'FAC').reduce((s, f) => s + f.monto_bs, 0);
  const montoProcesado  = facturas.filter(f => f.procesado && f.tipo_doc === 'FAC').reduce((s, f) => s + f.monto_bs, 0);

  // ── Filtrado local ────────────────────────────────────────────────────────────
  const filteredFacturas = facturas.filter(f => {
    // Tipo de documento / prefijo
    if (fTipo === 'con_asterisco'  && !f.documento.startsWith('*')) return false;
    if (fTipo === 'sin_asterisco'  && f.documento.startsWith('*'))  return false;
    if (fTipo === 'dev'            && f.tipo_doc !== 'DEV')         return false;
    if (fTipo === 'fac'            && f.tipo_doc !== 'FAC')         return false;

    // Estado de conciliación
    if (fEstado === 'pendiente'  && f.procesado)  return false;
    if (fEstado === 'procesada'  && !f.procesado) return false;

    // Método de pago asignado
    if (fMetodo !== 'todos') {
      const metodoActual = selects[f.id] ?? f.metodo_pago ?? '';
      if (metodoActual !== fMetodo) return false;
    }

    // Búsqueda libre
    if (fSearch.trim()) {
      const q = fSearch.trim().toLowerCase();
      const haystack = [
        f.documento,
        f.nombre_cliente,
        f.metodo_pago ?? '',
        String(f.monto_bs),
      ].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    return true;
  });

  const filteredCount      = filteredFacturas.length;
  const filteredProcesadas = filteredFacturas.filter(f => f.procesado).length;
  const filteredPendientes = filteredFacturas.length - filteredProcesadas;
  const filteredMonto      = filteredFacturas.filter(f => f.tipo_doc === 'FAC').reduce((s, f) => s + f.monto_bs, 0);

  const activeFilters = [
    fTipo !== 'todos', fEstado !== 'todos', fMetodo !== 'todos', fSearch.trim() !== ''
  ].filter(Boolean).length;

  const resetFilters = () => { setFMetodo('todos'); setFEstado('todos'); setFTipo('todos'); setFSearch(''); };

  // ── Conteos facetados (calculados sobre TODOS los datos, sin filtros) ────────
  const facets = {
    // Tipo / prefijo
    fac:           facturas.filter(f => f.tipo_doc === 'FAC').length,
    dev:           facturas.filter(f => f.tipo_doc === 'DEV').length,
    con_asterisco: facturas.filter(f => f.documento.startsWith('*')).length,
    sin_asterisco: facturas.filter(f => !f.documento.startsWith('*')).length,
    // Estado
    todos_estado:  facturas.length,
    pendiente:     facturas.filter(f => !f.procesado).length,
    procesada:     facturas.filter(f => f.procesado).length,
    // Métodos de pago: conteo por valor real asignado
    metodos: METODOS_PAGO.reduce((acc, m) => {
      acc[m.value] = facturas.filter(f => {
        const v = selects[f.id] ?? f.metodo_pago ?? '';
        return v === m.value;
      }).length;
      return acc;
    }, {} as Record<string, number>),
    sin_asignar: facturas.filter(f => !(selects[f.id] ?? f.metodo_pago ?? '')).length,
  };

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

      {/* ── Filtros locales ─────────────────────────────────────────────── */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '6px' }}>
            🔍 Filtros
            {activeFilters > 0 && (
              <span style={{ background: '#6366f1', color: 'white', borderRadius: '10px', padding: '1px 8px', fontSize: '10px', fontWeight: '700' }}>
                {activeFilters} activo{activeFilters > 1 ? 's' : ''}
              </span>
            )}
          </span>
          {activeFilters > 0 && (
            <button onClick={resetFilters} style={{ background: 'none', border: '1px solid rgba(148,163,184,0.15)', borderRadius: '8px', padding: '4px 12px', fontSize: '11px', color: '#94a3b8', cursor: 'pointer', fontWeight: '600' }}>
              ✕ Limpiar filtros
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>

          {/* Tipo de documento / prefijo */}
          <div>
            <p style={{ fontSize: '10px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Tipo / Prefijo</p>
            <select
              value={fTipo}
              onChange={e => setFTipo(e.target.value)}
              style={{ width: '100%', background: 'rgba(15,23,42,0.9)', border: `1px solid ${fTipo !== 'todos' ? 'rgba(99,102,241,0.5)' : 'rgba(148,163,184,0.12)'}`, borderRadius: '8px', padding: '7px 10px', color: fTipo !== 'todos' ? '#e8edf5' : '#475569', fontSize: '12px', outline: 'none', cursor: 'pointer' }}
            >
              <option value="todos">— Todos — ({facturas.length})</option>
              <option value="fac">🧾 Solo Facturas (FAC) · {facets.fac}</option>
              <option value="dev">↩️ Solo Devoluciones (DEV) · {facets.dev}</option>
              <option value="con_asterisco">⭐ Con prefijo * · {facets.con_asterisco}</option>
              <option value="sin_asterisco">📄 Sin prefijo · {facets.sin_asterisco}</option>
            </select>
          </div>

          {/* Estado de conciliación */}
          <div>
            <p style={{ fontSize: '10px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Estado</p>
            <div style={{ display: 'flex', gap: '6px' }}>
              {([
                { v: 'todos',    l: 'Todos',      count: facets.todos_estado, activeColor: '#818cf8',  activeBg: 'rgba(99,102,241,0.2)',   activeBorder: 'rgba(99,102,241,0.4)' },
                { v: 'pendiente',l: 'Pendientes', count: facets.pendiente,    activeColor: '#fbbf24',  activeBg: 'rgba(251,191,36,0.2)',   activeBorder: 'rgba(251,191,36,0.5)' },
                { v: 'procesada',l: 'Procesadas', count: facets.procesada,    activeColor: '#34d399',  activeBg: 'rgba(52,211,153,0.15)',  activeBorder: 'rgba(52,211,153,0.4)' },
              ] as const).map(({ v, l, count, activeColor, activeBg, activeBorder }) => (
                <button
                  key={v}
                  onClick={() => setFEstado(v)}
                  style={{
                    flex: 1, padding: '6px 4px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                    background: fEstado === v ? activeBg : 'rgba(15,23,42,0.6)',
                    border: `1px solid ${fEstado === v ? activeBorder : 'rgba(148,163,184,0.1)'}`,
                    color: fEstado === v ? activeColor : '#475569',
                  }}
                >
                  <span style={{ fontSize: '18px', fontWeight: '900', lineHeight: 1 }}>{count}</span>
                  <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{l}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Método de pago */}
          <div>
            <p style={{ fontSize: '10px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Método de Pago</p>
            <select
              value={fMetodo}
              onChange={e => setFMetodo(e.target.value)}
              style={{ width: '100%', background: 'rgba(15,23,42,0.9)', border: `1px solid ${fMetodo !== 'todos' ? 'rgba(99,102,241,0.5)' : 'rgba(148,163,184,0.12)'}`, borderRadius: '8px', padding: '7px 10px', color: fMetodo !== 'todos' ? '#e8edf5' : '#475569', fontSize: '12px', outline: 'none', cursor: 'pointer' }}
            >
              <option value="todos">— Todos — ({facturas.length})</option>
              {facets.sin_asignar > 0 && <option value="">Sin asignar · {facets.sin_asignar}</option>}
              {METODOS_PAGO.map(m => {
                const c = facets.metodos[m.value] ?? 0;
                return c > 0 ? (
                  <option key={m.value} value={m.value}>{m.label} · {c}</option>
                ) : null;
              })}
            </select>
          </div>

          {/* Búsqueda libre */}
          <div>
            <p style={{ fontSize: '10px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Buscar</p>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#2d3748', display: 'flex', pointerEvents: 'none' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </span>
              <input
                type="text"
                value={fSearch}
                onChange={e => setFSearch(e.target.value)}
                placeholder="Doc, cliente, monto…"
                style={{ width: '100%', background: 'rgba(15,23,42,0.9)', border: `1px solid ${fSearch ? 'rgba(99,102,241,0.5)' : 'rgba(148,163,184,0.12)'}`, borderRadius: '8px', padding: '7px 10px 7px 30px', color: '#e8edf5', fontSize: '12px', outline: 'none' }}
              />
              {fSearch && (
                <button onClick={() => setFSearch('')} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: '0', fontSize: '14px', lineHeight: 1 }}>✕</button>
              )}
            </div>
          </div>

        </div>

        {/* Resultado del filtro */}
        {!loading && facturas.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingTop: '8px', borderTop: '1px solid rgba(148,163,184,0.06)', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: '#475569' }}>
              Mostrando <strong style={{ color: '#818cf8' }}>{filteredCount}</strong> de {facturas.length} registros
            </span>
            <span style={{ fontSize: '12px', color: '#fbbf24' }}>⏳ Pendientes: <strong>{filteredPendientes}</strong></span>
            <span style={{ fontSize: '12px', color: '#34d399' }}>✅ Procesadas: <strong>{filteredProcesadas}</strong></span>
            {filteredMonto > 0 && <span style={{ fontSize: '12px', color: '#818cf8' }}>💰 Total: <strong>Bs. {fmtBs(filteredMonto)}</strong></span>}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        
        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '30px 100px 1fr 110px 140px 200px 130px',
          gap: '0',
          background: 'rgba(30,41,59,0.8)',
          borderBottom: '1px solid rgba(148,163,184,0.1)',
          padding: '12px 16px',
        }}>
          <span /> {/* Espacio para el checkbox */}
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
          <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 420px)' }}>
            {filteredFacturas.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center' }}>
                <p style={{ fontSize: '32px', marginBottom: '10px' }}>🔍</p>
                <p style={{ color: '#475569', fontSize: '14px', fontWeight: '600' }}>Sin resultados para los filtros aplicados</p>
                <button onClick={resetFilters} style={{ marginTop: '12px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', padding: '8px 18px', color: '#818cf8', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>Limpiar filtros</button>
              </div>
            ) : filteredFacturas.map((f, idx) => {
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
                    gridTemplateColumns: '30px 100px 1fr 110px 140px 200px 130px',
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
                  {/* Check visual de auditoría */}
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={checkedRows.has(f.id)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const newSet = new Set(checkedRows);
                        if (checked) newSet.add(f.id);
                        else newSet.delete(f.id);
                        setCheckedRows(newSet);
                        fetch('/api/conciliacion', {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ id: f.id, auditoria_check: checked })
                        }).catch(() => {});
                      }}
                      style={{
                        cursor: 'pointer', width: '16px', height: '16px', accentColor: '#34d399'
                      }}
                    />
                  </div>

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
              {filteredCount} mostrados · {filteredProcesadas} procesados · {filteredPendientes} pendientes
              {filteredCount < facturas.length && <span style={{ color: '#6366f1' }}> (filtrado de {facturas.length})</span>}
            </span>
            <span style={{ fontSize: '12px', color: '#818cf8', fontWeight: '700' }}>
              Total: Bs. {fmtBs(filteredMonto)}
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
