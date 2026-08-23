'use client';

import { useCallback, useEffect, useState } from 'react';

type Pago = {
  id: string;
  created_at: string;
  telefono_emisor: string;
  monto_bs: number;
  monto_usd?: number;
  referencia: string;
  banco_origen: string;
  metodo: string;
  imagen_url: string;
  procesado: boolean;
  auditoria_check?: boolean;
};

const BANCOS = ['Todos', 'Mercantil', 'Banesco', 'Banco de Venezuela', 'Daviplata', 'Nequi', 'Bancolombia', 'Banco de Bogotá'];

const fmtBs = (v: number) =>
  new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES', maximumFractionDigits: 2 }).format(v ?? 0);

function fmtDT(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    time: d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }),
  };
}

export default function PagosPage() {
  const [pagos, setPagos]       = useState<Pago[]>([]);
  const [tasa, setTasa]         = useState<number>(0);
  const [loading, setLoading]   = useState(true);
  const [filterDate, setDate]   = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' }));
  const [filterBanco, setBanco] = useState('Todos');
  const [search, setSearch]     = useState('');
  const [checkedRows, setCheckedRows] = useState<Set<string>>(new Set());

  const loadTasa = useCallback(async () => {
    try {
      const res = await fetch('/api/tasa', { cache: 'no-store' });
      const json = await res.json();
      if (json.ok && json.tasa) setTasa(json.tasa);
    } catch { /* silent */ }
  }, []);

  const loadPagos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '500' });
      
      const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
      if (filterDate === hoy) {
        const tRes = await fetch('/api/turnos');
        const tJson = await tRes.json();
        if (tJson.ok && tJson.active && tJson.turno) {
          params.set('abierto_at', tJson.turno.abierto_at);
          if (tJson.turno.cerrado_at) params.set('cerrado_at', tJson.turno.cerrado_at);
        } else {
          params.set('date', filterDate);
        }
      } else {
        params.set('date', filterDate);
      }

      if (filterBanco !== 'Todos') params.set('banco', filterBanco);
      if (search.trim()) params.set('search', search.trim());

      const res  = await fetch(`/api/pagos?${params}`, { cache: 'no-store' });
      const json = await res.json() as { ok: boolean; data: Pago[] };
      if (json.ok) {
        setPagos(json.data ?? []);
        const initChecks = new Set<string>();
        (json.data ?? []).forEach(p => {
          if (p.auditoria_check) initChecks.add(p.id);
        });
        setCheckedRows(initChecks);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [filterDate, filterBanco, search]);

  useEffect(() => {
    loadTasa();
    const id = setTimeout(loadPagos, 300); // debounce search
    return () => clearTimeout(id);
  }, [loadPagos, loadTasa]);

  const total     = pagos.reduce((s, p) => s + (p.monto_bs ?? 0), 0);
  const totalUsd  = tasa > 0 ? (total / tasa) : 0;
  const procesados = pagos.filter(p => p.procesado).length;

  const exportCSV = () => {
    const headers = ['Fecha', 'Hora', 'Banco', 'Referencia', 'Teléfono', 'Monto Bs.S', 'Método', 'Estado'];
    const rows = pagos.map(p => {
      const { date, time } = fmtDT(p.created_at);
      return [date, time, p.banco_origen, p.referencia, p.telefono_emisor, p.monto_bs, p.metodo, p.procesado ? 'Procesado' : 'Pendiente'];
    });
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `pagos-${filterDate}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: '4px' }}>Historial</p>
          <h1 className="page-title">Pagos capturados</h1>
          <p className="page-subtitle">Registros de WhatsApp en Supabase</p>
        </div>
        <button id="pagos-export" onClick={exportCSV} className="btn btn-ghost">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Exportar CSV
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          <div>
            <p className="label" style={{ marginBottom: '8px' }}>Fecha</p>
            <input id="pagos-date" type="date" className="input" value={filterDate} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <p className="label" style={{ marginBottom: '8px' }}>Banco</p>
            <select id="pagos-banco" className="input" value={filterBanco} onChange={e => setBanco(e.target.value)}>
              {BANCOS.map(b => <option key={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <p className="label" style={{ marginBottom: '8px' }}>Buscar</p>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#2d3748', display: 'flex' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </span>
              <input id="pagos-search" type="text" className="input" style={{ paddingLeft: '36px' }} placeholder="Referencia, teléfono…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {/* Summary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        {[
          { label: 'Total filtrado', value: fmtBs(total), usd: tasa > 0 ? `~ $ ${totalUsd.toFixed(2)} USD` : null, color: '#818cf8' },
          { label: 'Registros', value: String(pagos.length), color: '#34d399' },
          { label: 'Procesados', value: String(procesados), color: '#22d3ee' },
          { label: 'Pendientes', value: String(pagos.length - procesados), color: '#fbbf24' },
        ].map(({ label, value, color, usd }) => (
          <div key={label} className="card">
            <p className="label" style={{ marginBottom: '10px' }}>{label}</p>
            <p style={{ fontSize: '22px', fontWeight: '900', color, letterSpacing: '-0.04em' }}>{loading ? '…' : value}</p>
            {usd && <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', fontWeight: '500' }}>{usd}</p>}
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid rgba(148,163,184,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: '14px', fontWeight: '700', color: '#e8edf5' }}>
            Registros <span style={{ color: '#6366f1' }}>({pagos.length})</span>
          </p>
          <button id="pagos-refresh" className="btn btn-ghost btn-sm" onClick={loadPagos} disabled={loading}>
            {loading ? '…' : '↻ Actualizar'}
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#475569' }}>
            <div className="animate-spin" style={{ width: '22px', height: '22px', border: '2px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', borderRadius: '50%', margin: '0 auto 12px' }} />
            Consultando Supabase…
          </div>
        ) : (
          <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}></th>
                  <th>Fecha / Hora</th>
                  <th>Banco</th>
                  <th>Referencia</th>
                  <th>Teléfono</th>
                  <th>Monto Bs.S</th>
                  <th>Método</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {pagos.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '56px', color: '#475569' }}>
                      <div style={{ fontSize: '32px', marginBottom: '10px' }}>🔍</div>
                      Sin registros para los filtros seleccionados
                    </td>
                  </tr>
                ) : (
                  pagos.map(p => {
                    const { date, time } = fmtDT(p.created_at);
                    return (
                      <tr key={p.id} style={{ background: checkedRows.has(p.id) ? 'rgba(52,211,153,0.05)' : 'transparent', transition: 'background 0.2s' }}>
                        <td style={{ textAlign: 'center' }}>
                          <input 
                            type="checkbox" 
                            checked={checkedRows.has(p.id)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              const newSet = new Set(checkedRows);
                              if (checked) newSet.add(p.id);
                              else newSet.delete(p.id);
                              setCheckedRows(newSet);
                              fetch('/api/pagos', {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: p.id, auditoria_check: checked })
                              }).catch(() => {});
                            }}
                            style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#34d399' }}
                          />
                        </td>
                        <td>
                          <div style={{ fontSize: '13px', fontWeight: '500' }}>{date}</div>
                          <div style={{ fontSize: '11px', color: '#475569', fontFamily: 'monospace' }}>{time}</div>
                        </td>
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
                        <td style={{ fontSize: '12px', color: '#475569' }}>{p.metodo || '—'}</td>
                        <td>
                          <span className={`badge ${p.procesado ? 'badge-green' : 'badge-yellow'}`}>
                            {p.procesado ? '✓ OK' : '⏳ Pendiente'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
