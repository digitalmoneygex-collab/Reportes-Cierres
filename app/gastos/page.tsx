'use client';

import { useState, useEffect, useCallback } from 'react';

type Gasto = {
  id: string;
  created_at: string;
  descripcion: string;
  referencia: string | null;
  moneda: string;
  monto_bs: number;
  monto_usd: number;
  tasa_aplicada: number;
};

const fmtBs = (v: number) => new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES', maximumFractionDigits: 2 }).format(v ?? 0);
const fmtUsd = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(v ?? 0);

export default function GastosPage() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [tasa, setTasa] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [descripcion, setDescripcion] = useState('');
  const [referencia, setReferencia] = useState('');
  const [moneda, setMoneda] = useState('BS');
  const [monto, setMonto] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load current active shift bounds to fetch matching expenses
      const tRes = await fetch('/api/turnos');
      const tJson = await tRes.json();
      let qs = '';
      if (tJson.ok && tJson.active && tJson.turno) {
        qs = `?abierto_at=${encodeURIComponent(tJson.turno.abierto_at)}`;
      }

      const res = await fetch(`/api/gastos${qs}`);
      const json = await res.json();
      if (json.ok) setGastos(json.data);

      const tasaRes = await fetch('/api/tasa');
      const tasaJson = await tasaRes.json();
      if (tasaJson.ok) setTasa(tasaJson.tasa);
    } catch { }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const numMonto = Number(monto) || 0;
  const equivalente = tasa > 0 ? (moneda === 'BS' ? numMonto / tasa : numMonto * tasa) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descripcion || !monto || numMonto <= 0) return;

    setSubmitting(true);
    try {
      // Get current active shift id if any
      const tRes = await fetch('/api/turnos');
      const tJson = await tRes.json();
      const turno_id = tJson.ok && tJson.active ? tJson.turno.id : null;

      const res = await fetch('/api/gastos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descripcion, referencia, moneda, monto: numMonto, turno_id })
      });
      const json = await res.json();
      if (json.ok) {
        setDescripcion('');
        setReferencia('');
        setMonto('');
        loadData();
      } else {
        alert(json.error || 'Error al guardar gasto');
      }
    } catch {
      alert('Error de red');
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este gasto?')) return;
    try {
      const res = await fetch(`/api/gastos?id=${id}`, { method: 'DELETE' });
      if (res.ok) loadData();
    } catch { }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '28px' }}>
        <p className="eyebrow" style={{ marginBottom: '4px' }}>Caja</p>
        <h1 className="page-title">Otros Gastos</h1>
        <p className="page-subtitle">Registra salidas de efectivo o gastos misceláneos</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Formulario */}
        <div className="card">
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#e8edf5', marginBottom: '16px' }}>Agregar Gasto</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>Descripción</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="Ej. Pago de proveedor..." 
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>Referencia / Cédula / Factura</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="Opcional. Ej. V-12345678, Nro. 123" 
                value={referencia}
                onChange={e => setReferencia(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: '1' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>Moneda</label>
                <select className="input-field" value={moneda} onChange={e => setMoneda(e.target.value)}>
                  <option value="BS">Bolívares (Bs)</option>
                  <option value="USD">Dólares ($)</option>
                </select>
              </div>
              <div style={{ flex: '1' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>Monto</label>
                <input 
                  type="number" 
                  step="0.01"
                  min="0"
                  className="input-field" 
                  placeholder="0.00" 
                  value={monto}
                  onChange={e => setMonto(e.target.value)}
                  required
                />
              </div>
            </div>

            {numMonto > 0 && tasa > 0 && (
              <div style={{ fontSize: '13px', color: '#fbbf24', background: 'rgba(251,191,36,0.1)', padding: '10px 12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Equivalente en {moneda === 'BS' ? 'USD' : 'Bs'}:</span>
                <span style={{ fontWeight: '700' }}>{moneda === 'BS' ? fmtUsd(equivalente) : fmtBs(equivalente)}</span>
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={submitting}>
              {submitting ? 'Guardando...' : 'Agregar Gasto'}
            </button>
          </form>
        </div>

        {/* Tabla */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#e8edf5' }}>Gastos del Turno Actual</h3>
            <button className="btn btn-ghost btn-sm" onClick={loadData}>↻ Actualizar</button>
          </div>

          <div className="table-container">
            <table className="w-full">
              <thead>
                <tr>
                  <th style={{ width: '30%' }}>Descripción</th>
                  <th style={{ width: '20%' }}>Referencia</th>
                  <th>Monto Ref.</th>
                  <th>Total Bs.</th>
                  <th>Total USD</th>
                  <th style={{ width: '50px' }}></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>Cargando gastos...</td>
                  </tr>
                ) : gastos.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#475569' }}>No hay gastos registrados en este turno.</td>
                  </tr>
                ) : (
                  gastos.map(g => (
                    <tr key={g.id}>
                      <td style={{ fontWeight: '500' }}>{g.descripcion}</td>
                      <td style={{ fontSize: '12px', color: '#94a3b8' }}>{g.referencia || '-'}</td>
                      <td>
                        <span style={{ 
                          background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' 
                        }}>
                          {g.moneda === 'BS' ? fmtBs(g.monto_bs) : fmtUsd(g.monto_usd)}
                        </span>
                      </td>
                      <td style={{ color: '#34d399', fontWeight: '600' }}>{fmtBs(g.monto_bs)}</td>
                      <td style={{ color: '#818cf8', fontWeight: '600' }}>{fmtUsd(g.monto_usd)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          className="btn btn-ghost" 
                          style={{ padding: '4px 8px', color: '#f87171' }} 
                          onClick={() => handleDelete(g.id)}
                          title="Eliminar gasto"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {gastos.length > 0 && (
                <tfoot>
                  <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                    <td colSpan={3} style={{ textAlign: 'right', fontWeight: '700', color: '#e8edf5' }}>Total Gastos:</td>
                    <td style={{ color: '#34d399', fontWeight: '800' }}>{fmtBs(gastos.reduce((s, g) => s + g.monto_bs, 0))}</td>
                    <td style={{ color: '#818cf8', fontWeight: '800' }}>{fmtUsd(gastos.reduce((s, g) => s + g.monto_usd, 0))}</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
