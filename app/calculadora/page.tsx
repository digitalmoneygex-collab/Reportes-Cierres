'use client';
import { useState, useEffect } from 'react';

const METODOS_PAGO = [
  { value: 'punto_venta', label: '💳 Punto de Venta' },
  { value: 'dolares_efectivo', label: '💵 Dólares Efectivo' },
  { value: 'bs_efectivo', label: '💵 Bs Efectivo' },
  { value: 'transferencia', label: '🏦 Transferencia' },
  { value: 'pago_movil', label: '📱 Pago Móvil' },
  { value: 'credito', label: '📝 Crédito' },
  { value: 'binance', label: '🪙 Binance' },
  { value: 'zelle', label: '❇️ Zelle' },
  { value: 'bio_pago', label: '👆 Bio Pago' }
];

export default function CalculadoraPage() {
  const [tasa, setTasa] = useState(0);
  const [calcTargetBs, setCalcTargetBs] = useState('');
  const [calcAmounts, setCalcAmounts] = useState<Record<string, string>>({});
  const [calcChecks, setCalcChecks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/tasa')
      .then(r => r.json())
      .then(d => { if (d.ok) setTasa(d.tasa); })
      .catch(() => {});
  }, []);

  const target = Number(calcTargetBs) || 0;
  const getBsValue = (k: string, val: string) => {
    const num = Number(val) || 0;
    return ['dolares_efectivo', 'zelle', 'binance'].includes(k) && tasa > 0 ? num * tasa : num;
  };
  const sum = Object.keys(calcChecks).filter(k => calcChecks[k]).reduce((s, k) => s + getBsValue(k, calcAmounts[k]), 0);
  const diff = sum - target;
  const isMatch = target > 0 && Math.abs(diff) < 0.01;

  return (
    <div style={{ background: '#1e293b', minHeight: '100vh', width: '100%', padding: '20px', color: '#e8edf5', fontFamily: 'system-ui, sans-serif' }}>
        <h2 style={{ fontSize: '18px', color: '#e8edf5', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 20px 0' }}>
          🧮 Calculadora de Vuelto
        </h2>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px', display: 'block' }}>Monto total de la factura (Bs.)</label>
          <input 
            type="number" 
            value={calcTargetBs}
            onChange={e => setCalcTargetBs(e.target.value)}
            placeholder="Ej: 2727.83"
            style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '10px 14px', color: 'white', fontSize: '18px', outline: 'none', fontWeight: 'bold' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
          {METODOS_PAGO.map(m => {
            const isUsd = ['dolares_efectivo', 'zelle', 'binance'].includes(m.value);
            return (
              <div key={m.value} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input 
                  type="checkbox" 
                  checked={!!calcChecks[m.value]}
                  onChange={e => setCalcChecks(prev => ({...prev, [m.value]: e.target.checked}))}
                  style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#6366f1' }}
                />
                <span style={{ fontSize: '13px', color: '#cbd5e1', width: '130px' }}>{m.label}</span>
                {calcChecks[m.value] && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', background: '#0f172a', border: '1px solid #475569', borderRadius: '6px', padding: '4px 8px', flex: 1 }}>
                      <span style={{ color: '#94a3b8', fontSize: '12px', marginRight: '4px' }}>{isUsd ? '$' : 'Bs.'}</span>
                      <input 
                        type="number"
                        value={calcAmounts[m.value] || ''}
                        onChange={e => setCalcAmounts(prev => ({...prev, [m.value]: e.target.value}))}
                        style={{ background: 'transparent', border: 'none', outline: 'none', color: 'white', width: '100%', fontSize: '14px' }}
                        autoFocus
                      />
                    </div>
                    {isUsd && tasa > 0 && calcAmounts[m.value] && (
                      <div style={{ fontSize: '11px', color: '#94a3b8', width: '70px', textAlign: 'right' }}>
                        ~ Bs. {(Number(calcAmounts[m.value]) * tasa).toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2})}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ padding: '16px', background: isMatch ? 'rgba(52,211,153,0.1)' : 'rgba(15,23,42,0.6)', borderRadius: '12px', border: `1px solid ${isMatch ? 'rgba(52,211,153,0.3)' : 'rgba(51,65,85,0.5)'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>Monto a cobrar:</span>
            <strong style={{ fontSize: '14px', color: '#e8edf5' }}>Bs. {target.toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2})}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>Total recibido:</span>
            <strong style={{ fontSize: '14px', color: isMatch ? '#34d399' : '#818cf8' }}>Bs. {sum.toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2})}</strong>
          </div>
          
          <div style={{ height: '1px', background: 'rgba(148,163,184,0.1)', margin: '12px 0' }} />
          
          {target > 0 && diff < -0.01 ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#fbbf24', fontWeight: 'bold' }}>Falta por cobrar:</span>
              <div style={{ textAlign: 'right' }}>
                <strong style={{ fontSize: '16px', color: '#fbbf24', display: 'block' }}>Bs. {Math.abs(diff).toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2})}</strong>
                {tasa > 0 && <span style={{ fontSize: '11px', color: '#f59e0b' }}>~ $ {(Math.abs(diff) / tasa).toFixed(2)}</span>}
              </div>
            </div>
          ) : target > 0 && diff > 0.01 ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#f87171', fontWeight: 'bold' }}>Vuelto a dar:</span>
              <div style={{ textAlign: 'right' }}>
                <strong style={{ fontSize: '16px', color: '#f87171', display: 'block' }}>Bs. {diff.toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2})}</strong>
                {tasa > 0 && <span style={{ fontSize: '11px', color: '#ef4444' }}>~ $ {(diff / tasa).toFixed(2)}</span>}
              </div>
            </div>
          ) : target > 0 ? (
            <div style={{ textAlign: 'center', color: '#34d399', fontWeight: 'bold', fontSize: '16px' }}>
              ¡Montos cuadrados perfectamente! ✅
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
              Ingresa el monto de la factura para calcular
            </div>
          )}
        </div>

        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
            <button style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }} onClick={() => { setCalcTargetBs(''); setCalcAmounts({}); setCalcChecks({}); }}>
              Limpiar todo
            </button>
        </div>
    </div>
  );
}
