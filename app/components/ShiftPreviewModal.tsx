import React, { useEffect, useState } from 'react';
import { generateShiftReportPdf } from '@/app/lib/pdfGenerator';

type ComboItem = { nombre: string; cantidad: number };
type RepoItem  = { nombre: string; cantidad: number };

type PreviewData = {
  rango: { start: string; end: string };
  cajero: { nombre: string; cedula: string };
  pskloud: { 
    tasa: number;
    totalBs: number; totalBsUsd: number;
    devolucionesEfBs: number; devolucionesEfUsd: number;
    totalRecibidoBs: number; totalRecibidoUsd: number;
    totalGastosBs?: number; totalGastosUsd?: number;
    totalFacturas: number;
  };
  metodosPago: { metodo: string; cantidad: number; totalBs: number }[];
  pagos: { totalBs: number; registradosCount: number; procesadosCount: number; sinProcesarCount: number };
  alertas: { hayPagosSinConciliar: boolean; hayFacturasSinConciliar: boolean; facturasPendientesCount: number };
  articulos: {
    burguer: {
      combosHamb: ComboItem[];
      hambSueltas: ComboItem[];
      perros: ComboItem[];
      otros: ComboItem[];
    };
    pasteles: {
      pasapalos: ComboItem[];
      pequenos: ComboItem[];
      empanadas: ComboItem[];
      grandes: ComboItem[];
      otros: ComboItem[];
    };
    reposteria: RepoItem[];
  };
  insumos?: {
    burguer:  Record<string, number>;
    pasteles: Record<string, number>;
  };
};

// ─── Componentes de UI internos (espejo del Dashboard) ──────────────────────
function SVal({ v, suffix = '' }: { v: number | null; suffix?: string }) {
  if (v === null || v === 0 || isNaN(v)) return <span style={{ color: '#2d3748', fontStyle: 'italic', fontSize: '11px' }}>sin ventas</span>;
  return <span>{v}{suffix}</span>;
}

function Row({ label, value, color = '#94a3b8', bold = false, isTotal = false }: {
  label: string; value: React.ReactNode; color?: string; bold?: boolean; isTotal?: boolean;
}) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: isTotal ? '8px 0 4px' : '5px 0',
      borderTop: isTotal ? '1px solid rgba(148,163,184,0.12)' : undefined,
      marginTop: isTotal ? '4px' : undefined,
    }}>
      <span style={{ fontSize: '11px', color: isTotal ? '#94a3b8' : '#475569', fontWeight: isTotal ? '700' : '400' }}>
        {label}
      </span>
      <span style={{ fontSize: '11px', color, fontWeight: bold || isTotal ? '800' : '600', letterSpacing: '-0.02em' }}>
        {value}
      </span>
    </div>
  );
}

function SectionTitle({ children, icon }: { children: React.ReactNode; icon: string }) {
  return (
    <p style={{ fontSize: '10px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
      {icon && <span>{icon}</span>}{children}
    </p>
  );
}

function Divider() {
  return <div style={{ borderBottom: '1px dashed rgba(148,163,184,0.08)', margin: '8px 0' }} />;
}

function renderList(title: string, items: ComboItem[], color: string, subtotalLabel: string) {
  if (!items || items.length === 0) return null;
  const subtotal = items.reduce((sum, item) => sum + (item.cantidad || 0), 0);
  
  return (
    <>
      <SectionTitle icon="">{title}</SectionTitle>
      {items.map((item, i) => {
        let displayValue = <SVal v={item.cantidad} />;
        if (item.cantidad > 0) {
           let match = item.nombre.match(/(\d+)/);
           let mult = match ? parseInt(match[1]) : 1;
           if (item.nombre.includes("25UND")) mult = 25;
           if (item.nombre.includes("50UND") || item.nombre.includes("X50")) mult = 50;
           if (item.nombre.includes("12")) mult = 12;
           if (item.nombre.includes("6 PASTELES") || item.nombre.includes("6 TEQUEÑOS")) mult = 6;
           
           if (mult > 1 && (item.nombre.includes("COMBO") || item.nombre.includes("PASAPALOS") || item.nombre.includes("12"))) {
              displayValue = <>{item.cantidad} × {mult} = {item.cantidad * mult}</>;
           }
        }
        return <Row key={i} label={item.nombre} value={displayValue} color={color} />;
      })}
      <Row label={subtotalLabel} value={subtotal > 0 ? subtotal : <SVal v={0} />} color={color} isTotal />
      <Divider />
    </>
  );
}


export default function ShiftPreviewModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  start, 
  end,
  isForcedClose = false,
  supervisorName
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void; 
  start: string; 
  end?: string;
  isForcedClose?: boolean;
  supervisorName?: string;
}) {
  const [data, setData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // 3-step flow: preview → confirming → closing
  const [step, setStep] = useState<'preview' | 'confirming' | 'closing'>('preview');

  useEffect(() => {
    if (!isOpen) {
      setData(null);
      setStep('preview');
      return;
    }
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const url = `/api/turnos/preview?start=${encodeURIComponent(start)}${end ? `&end=${encodeURIComponent(end)}` : ''}`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.ok) setData(json.data);
        else setError(json.error || 'Error al generar vista previa');
      } catch (err) {
        setError('Error de red al consultar vista previa');
      }
      setLoading(false);
    };
    load();
  }, [isOpen, start, end]);

  if (!isOpen) return null;

  const hasDescuadres = data?.alertas.hayPagosSinConciliar || data?.alertas.hayFacturasSinConciliar;
  const canClose = isForcedClose || !hasDescuadres;

  const METODOS_LABELS: Record<string, string> = {
    punto_venta: 'Punto de Venta',
    dolares_efectivo: 'Dólares Efectivo',
    bs_efectivo: 'Bs Efectivo',
    transferencia: 'Transferencia',
    pago_movil: 'Pago Móvil',
    credito: 'Crédito',
    binance: 'Binance',
    zelle: 'Zelle',
    bio_pago: 'Bio Pago',
    gasto: 'Gasto',
    devolucion: 'Devolución',
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: '20px'
    }}>
      <div className="card" style={{ maxWidth: '1100px', width: '100%', maxHeight: '92vh', overflowY: 'auto', position: 'relative', animation: 'fade-in 0.2s ease-out' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#e8edf5', marginBottom: '16px' }}>Vista Previa de Cierre</h2>
        
        {loading ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8' }}>Generando resumen del turno...</div>
        ) : error ? (
          <div style={{ color: '#ef4444', padding: '20px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px' }}>{error}</div>
        ) : data ? (
          <div>
            {/* Top: 3 columnas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.4fr', gap: '12px', marginBottom: '20px' }}>
              
              {/* Bloque PSKLOUD con más detalles */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 'bold' }}>Ventas Sistema (PSKloud)</p>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#cbd5e1' }}>Ingresos brutos</span>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ display: 'block', fontSize: '12px', color: '#e8edf5' }}>Bs. {data.pskloud.totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                    {data.pskloud.tasa > 0 && <span style={{ display: 'block', fontSize: '10px', color: '#94a3b8' }}>~ $ {data.pskloud.totalBsUsd.toFixed(2)} USD</span>}
                  </div>
                </div>
                
                {data.pskloud.devolucionesEfBs > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                    <span style={{ fontSize: '12px', color: '#fca5a5' }}>Devoluciones</span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ display: 'block', fontSize: '12px', color: '#fca5a5' }}>- Bs. {data.pskloud.devolucionesEfBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                      {data.pskloud.tasa > 0 && <span style={{ display: 'block', fontSize: '10px', color: '#fca5a5' }}>- $ {data.pskloud.devolucionesEfUsd.toFixed(2)} USD</span>}
                    </div>
                  </div>
                )}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#818cf8', fontWeight: 'bold' }}>Total Neto</span>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#818cf8' }}>Bs. {data.pskloud.totalRecibidoBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</p>
                    {data.pskloud.tasa > 0 && (
                      <p style={{ fontSize: '10px', color: '#a5b4fc' }}>~ $ {data.pskloud.totalRecibidoUsd.toFixed(2)} USD</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Bloque Bot */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <p style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 'bold' }}>Capturas Bot (Pago Móvil)</p>
                <div style={{ margin: '8px 0 4px' }}>
                  <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#34d399' }}>
                    Bs. {data.pagos.totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                  </p>
                  {data.pskloud.tasa > 0 && (
                    <p style={{ fontSize: '12px', color: '#6ee7b7' }}>~ $ {(data.pagos.totalBs / data.pskloud.tasa).toFixed(2)} USD</p>
                  )}
                </div>
                <p style={{ fontSize: '11px', color: '#64748b' }}>{data.pagos.registradosCount} Capturas recibidas</p>
              </div>

              {/* Bloque Desglose Métodos inline */}
              <div style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.1)', borderRadius: '8px', padding: '12px' }}>
                <p style={{ fontSize: '13px', color: '#a5b4fc', fontWeight: 'bold', marginBottom: '8px' }}>Desglose por Vía de Pago</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {data.metodosPago.map((m, i) => {
                    const isDev = m.totalBs < 0 || m.metodo === 'gasto' || m.metodo === 'devolucion';
                    return (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                        <span style={{ color: isDev ? '#fca5a5' : '#cbd5e1' }}>
                          {isDev ? '⚠️ ' : ''}{METODOS_LABELS[m.metodo] || m.metodo} <span style={{ color: '#475569' }}>({m.cantidad})</span>
                        </span>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ display: 'block', color: isDev ? '#fca5a5' : '#e8edf5', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '11px' }}>
                            Bs. {m.totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                          </span>
                          {data.pskloud.tasa > 0 && (
                            <span style={{ display: 'block', fontSize: '9px', color: isDev ? '#fca5a5' : '#94a3b8' }}>
                              ~ $ {(m.totalBs / data.pskloud.tasa).toFixed(2)} USD
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {data.pskloud.totalGastosBs && data.pskloud.totalGastosBs > 0 ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', borderTop: '1px solid rgba(248,113,113,0.15)', paddingTop: '4px', marginTop: '2px' }}>
                      <span style={{ color: '#f87171' }}>📉 Otros Gastos</span>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ display: 'block', color: '#f87171', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '11px' }}>
                          - Bs. {data.pskloud.totalGastosBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                        </span>
                        {data.pskloud.tasa > 0 && (
                          <span style={{ display: 'block', fontSize: '9px', color: '#fca5a5' }}>
                            - $ {data.pskloud.totalGastosUsd!.toFixed(2)} USD
                          </span>
                        )}
                      </div>
                    </div>
                  ) : null}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px solid rgba(148,163,184,0.15)', marginTop: '2px' }}>
                    <span style={{ fontSize: '12px', color: '#818cf8', fontWeight: '800' }}>TOTAL</span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ display: 'block', fontSize: '12px', color: '#818cf8', fontWeight: '800', fontFamily: 'monospace' }}>
                        Bs. {(data.metodosPago.reduce((a, c) => a + c.totalBs, 0)).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                      </span>
                      {data.pskloud.tasa > 0 && (
                        <span style={{ display: 'block', fontSize: '10px', color: '#a5b4fc' }}>
                          ~ $ {((data.metodosPago.reduce((a, c) => a + c.totalBs, 0)) / data.pskloud.tasa).toFixed(2)} USD
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px solid rgba(148,163,184,0.15)', marginTop: '2px' }}>
                    <span style={{ fontSize: '12px', color: '#34d399', fontWeight: '800' }}>DINERO RECOLECTADO</span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ display: 'block', fontSize: '12px', color: '#34d399', fontWeight: '800', fontFamily: 'monospace' }}>
                        Bs. {(data.metodosPago.reduce((a, c) => a + c.totalBs, 0) - (data.pskloud.totalGastosBs || 0)).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                      </span>
                      {data.pskloud.tasa > 0 && (
                        <span style={{ display: 'block', fontSize: '10px', color: '#6ee7b7' }}>
                          ~ $ {((data.metodosPago.reduce((a, c) => a + c.totalBs, 0) - (data.pskloud.totalGastosBs || 0)) / data.pskloud.tasa).toFixed(2)} USD
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── Sección Piezas Vendidas (Agrupada como en Dashboard) ─── */}
            {(() => {
              if (!data.articulos) return null;
              const { burguer, pasteles, reposteria } = data.articulos;
              const insumosB = data.insumos?.burguer || {};
              const insumosP = data.insumos?.pasteles || {};

              const burguerInsumosKeys = ["PAN BURGUER", "PAN PERRO", "SALCHICHA", "CARNE H", "POLLO", "CARNE M", "TAPA P", "AREPA C", "HUEVO", "BEBIDA", "PAPAS FRITAS 150GR"];
              const pastelesInsumosKeys = ["PIEZA F", "PIEZA P", "PIEZA G", "BEBIDA"];

              const repoTotal = reposteria.reduce((s, i) => s + (i.cantidad || 0), 0);

              return (
                <div style={{ marginBottom: '20px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: '10px', padding: '16px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#e8edf5', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                    Piezas Vendidas
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', alignItems: 'start' }}>

                    {/* BURGUER COL */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.1)' }}>
                      <p style={{ fontSize: '11px', fontWeight: '800', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        🍔 BURGUER
                      </p>
                      
                      {renderList("COMBOS HAMBURGUESA", burguer.combosHamb, '#fbbf24', 'SUBTOTAL (Hamburguesas de carne en combo)')}
                      {renderList("HAMBURGUESAS POR UNIDAD", burguer.hambSueltas, '#fbbf24', 'SUBTOTAL (Hamburguesas por unidad)')}
                      {renderList("PERROS CALIENTES", burguer.perros, '#fbbf24', 'SUBTOTAL (Perro Caliente)')}
                      {renderList("OTROS", burguer.otros, '#fbbf24', 'SUBTOTAL (Otros)')}

                      <div style={{ background: 'rgba(245,158,11,0.08)', borderRadius: '8px', padding: '10px', border: '1px solid rgba(245,158,11,0.2)', marginTop: '8px' }}>
                        <p style={{ fontSize: '10px', fontWeight: '800', color: '#fcd34d', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          📊 TOTALES INSUMOS BURGUER
                        </p>
                        {burguerInsumosKeys.map(k => {
                          const matchKey = Object.keys(insumosB).find(tk => tk.toUpperCase() === k);
                          const val = matchKey ? insumosB[matchKey] : 0;
                          return <Row key={k} label={k} value={val > 0 ? val : <SVal v={0} />} color={val > 0 ? '#fbbf24' : '#94a3b8'} bold={val > 0} />;
                        })}
                      </div>
                    </div>

                    {/* PASTELES COL */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.1)' }}>
                      <p style={{ fontSize: '11px', fontWeight: '800', color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        🥐 PASTELES & PASAPALOS
                      </p>

                      {renderList("PASAPALOS DE FIESTA", pasteles.pasapalos, '#6ee7b7', 'SUBTOTAL (Pasapalos)')}
                      {renderList("PASTELES PEQUEÑOS", pasteles.pequenos, '#6ee7b7', 'SUBTOTAL (Pasteles Pequeños)')}
                      {renderList("EMPANADAS", pasteles.empanadas, '#6ee7b7', 'SUBTOTAL (Empanadas)')}
                      {renderList("PASTEL GRANDE POR PIEZA", pasteles.grandes, '#6ee7b7', 'SUBTOTAL (Pastel Grande)')}
                      {renderList("OTROS", pasteles.otros, '#6ee7b7', 'SUBTOTAL (Otros)')}

                      <div style={{ background: 'rgba(16,185,129,0.08)', borderRadius: '8px', padding: '10px', border: '1px solid rgba(16,185,129,0.2)', marginTop: '8px' }}>
                        <p style={{ fontSize: '10px', fontWeight: '800', color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          📊 TOTALES INSUMOS PASTELES
                        </p>
                        {pastelesInsumosKeys.map(k => {
                          const matchKey = Object.keys(insumosP).find(tk => tk.toUpperCase() === k);
                          const val = matchKey ? insumosP[matchKey] : 0;
                          return <Row key={k} label={k} value={val > 0 ? val : <SVal v={0} />} color={val > 0 ? '#34d399' : '#94a3b8'} bold={val > 0} />;
                        })}
                      </div>
                    </div>

                    {/* REPOSTERIA COL */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(167,139,250,0.1)' }}>
                      <p style={{ fontSize: '11px', fontWeight: '800', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        🍰 REPOSTERIA
                      </p>
                      
                      {reposteria.map((item, i) => (
                        <Row key={i} label={item.nombre} value={<SVal v={item.cantidad} />} color="#c4b5fd" />
                      ))}
                      <Row label="🎂 Total" value={repoTotal > 0 ? repoTotal : <SVal v={0} />} color="#c4b5fd" isTotal />
                    </div>

                  </div>
                </div>
              );
            })()}

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#e8edf5', marginBottom: '12px' }}>Estado de Conciliación</h3>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: '#cbd5e1' }}>Pagos Procesados (OCR)</span>
                <span style={{ fontSize: '13px', color: '#34d399', fontWeight: 'bold' }}>{data.pagos.procesadosCount} / {data.pagos.registradosCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span style={{ fontSize: '13px', color: '#cbd5e1' }}>Facturas Conciliadas (Pago Móvil)</span>
                <span style={{ fontSize: '13px', color: data.alertas.hayFacturasSinConciliar ? '#fbbf24' : '#34d399', fontWeight: 'bold' }}>
                  Restan {data.alertas.facturasPendientesCount} por confirmar
                </span>
              </div>

              {hasDescuadres && (
                <div style={{ 
                  padding: '12px', borderRadius: '8px', 
                  background: isForcedClose ? 'rgba(251,191,36,0.1)' : 'rgba(239,68,68,0.1)', 
                  border: `1px solid ${isForcedClose ? 'rgba(251,191,36,0.3)' : 'rgba(239,68,68,0.3)'}`
                }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isForcedClose ? '#fbbf24' : '#ef4444'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    <div>
                      <p style={{ fontSize: '13px', color: isForcedClose ? '#fcd34d' : '#fca5a5', fontWeight: '700' }}>
                        {isForcedClose ? 'Advertencia: Tienes descuadres pendientes' : 'Error: No puedes cerrar turno con descuadres'}
                      </p>
                      <p style={{ fontSize: '12px', color: isForcedClose ? '#fde68a' : '#fecaca', marginTop: '4px' }}>
                        {isForcedClose 
                          ? 'Al ser un cierre forzado, puedes continuar y se registrarán como no procesados.' 
                          : 'Hay pagos o facturas que aún no se han conciliado. Ve al módulo de Conciliación y procesa todo antes de cerrar el turno.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
              {step === 'preview' && (
                <>
                  <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
                  {canClose && (
                    <button
                      className="btn"
                      style={{ background: '#ef4444', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
                      onClick={() => setStep('confirming')}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      Continuar al cierre
                    </button>
                  )}
                </>
              )}

              {step === 'confirming' && (
                <>
                  {/* Paso de confirmación final */}
                  <div style={{ width: '100%', padding: '16px', borderRadius: '10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: '800', color: '#fca5a5', marginBottom: '4px' }}>¿Confirmar cierre del turno?</p>
                        <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>
                          Esta acción <strong style={{ color: '#fca5a5' }}>no se puede deshacer</strong>. Se generará el PDF del cierre y el turno quedará cerrado en el sistema.
                        </p>
                      </div>
                    </div>
                  </div>
                  <button className="btn btn-ghost" onClick={() => setStep('preview')} style={{ flexShrink: 0 }}>Volver</button>
                  <button
                    className="btn"
                    style={{ background: '#ef4444', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}
                    onClick={async () => {
                      setStep('closing');
                      // Generar PDF primero
                      if (data) {
                        try {
                          generateShiftReportPdf({
                            fecha: new Date(data.rango.start).toLocaleDateString('es-VE'),
                            horaApertura: new Date(data.rango.start).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }),
                            horaCierre: data.rango.end ? new Date(data.rango.end).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }),
                            cajeroNombre: data.cajero?.nombre || 'CAJERO DESCONOCIDO',
                            cajeroCedula: data.cajero?.cedula || 'V-00000000',
                            supervisorNombre: supervisorName,
                            pskloud: data.pskloud,
                            metodosPago: data.metodosPago || [],
                            pagos: data.pagos || { totalBs: 0, registradosCount: 0, procesadosCount: 0 },
                            articulos: data.articulos || { burguer: [], pasteles: [], reposteria: [] },
                            insumos: (data as any).insumos || undefined,
                          });
                        } catch (err) {
                          console.error('Error generando PDF:', err);
                        }
                      }
                      await onConfirm();
                      onClose();
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Sí, cerrar turno
                  </button>
                </>
              )}

              {step === 'closing' && (
                <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', padding: '12px 0', color: '#94a3b8' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  <span style={{ fontSize: '14px', fontWeight: '600' }}>Cerrando turno y generando PDF...</span>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
