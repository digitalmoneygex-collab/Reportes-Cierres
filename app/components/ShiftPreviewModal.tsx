import React, { useEffect, useState } from 'react';
import { generateShiftReportPdf } from '@/app/lib/pdfGenerator';

type PreviewData = {
  rango: { start: string; end: string };
  cajero: { nombre: string; cedula: string };
  pskloud: { 
    tasa: number;
    totalBs: number; totalBsUsd: number;
    devolucionesEfBs: number; devolucionesEfUsd: number;
    totalRecibidoBs: number; totalRecibidoUsd: number;
    totalFacturas: number;
  };
  metodosPago: { metodo: string; cantidad: number; totalBs: number }[];
  pagos: { totalBs: number; registradosCount: number; procesadosCount: number; sinProcesarCount: number };
  alertas: { hayPagosSinConciliar: boolean; hayFacturasSinConciliar: boolean; facturasPendientesCount: number };
  articulos: {
    burguer: { nombre: string; cantidad: number }[];
    pasteles: { nombre: string; cantidad: number }[];
    reposteria: { nombre: string; cantidad: number }[];
  };
};

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

  useEffect(() => {
    if (!isOpen) {
      setData(null);
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
      <div className="card" style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative', animation: 'fade-in 0.2s ease-out' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#e8edf5', marginBottom: '16px' }}>Vista Previa de Cierre</h2>
        
        {loading ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8' }}>Generando resumen del turno...</div>
        ) : error ? (
          <div style={{ color: '#ef4444', padding: '20px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px' }}>{error}</div>
        ) : data ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px', marginBottom: '20px' }}>
              
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
            </div>

            {/* Desglose por Método de Pago */}
            {data.metodosPago && data.metodosPago.length > 0 && (
              <div style={{ marginBottom: '24px', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.1)', borderRadius: '8px', padding: '12px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#a5b4fc', marginBottom: '8px' }}>Desglose por Vía de Pago</h3>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {data.metodosPago.map((m, i) => {
                    const isDev = m.totalBs < 0 || m.metodo === 'gasto' || m.metodo === 'devolucion';
                    return (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                        <span style={{ color: isDev ? '#fca5a5' : '#cbd5e1' }}>
                          {isDev ? '⚠️ ' : ''}{METODOS_LABELS[m.metodo] || m.metodo} ({m.cantidad})
                        </span>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ display: 'block', color: isDev ? '#fca5a5' : '#e8edf5', fontWeight: 'bold' }}>
                            Bs. {m.totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                          </span>
                          {data.pskloud.tasa > 0 && (
                            <span style={{ display: 'block', fontSize: '10px', color: isDev ? '#fca5a5' : '#94a3b8' }}>
                              $ {(m.totalBs / data.pskloud.tasa).toFixed(2)} USD
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0 4px', borderTop: '1px solid rgba(148,163,184,0.15)', marginTop: '4px' }}>
                    <span style={{ fontSize: '12px', color: '#818cf8', fontWeight: '800' }}>VENTAS TOTALES</span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ display: 'block', fontSize: '13px', color: '#818cf8', fontWeight: '800' }}>
                        Bs. {data.metodosPago.reduce((acc, curr) => acc + curr.totalBs, 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                      </span>
                      {data.pskloud.tasa > 0 && (
                        <span style={{ display: 'block', fontSize: '11px', color: '#a5b4fc' }}>
                          $ {(data.metodosPago.reduce((acc, curr) => acc + curr.totalBs, 0) / data.pskloud.tasa).toFixed(2)} USD
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

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

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
              {canClose && (
                <button 
                  className="btn" 
                  style={{ background: '#ef4444', color: 'white', border: 'none' }}
                  onClick={() => {
                    // Generar PDF y Descargar
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
                          articulos: data.articulos || { burguer: [], pasteles: [], reposteria: [] }
                        });
                      } catch (err) {
                        console.error('Error generando PDF:', err);
                        alert('El turno se cerró, pero hubo un error generando el PDF.');
                      }
                    }
                    onConfirm();
                    onClose();
                  }}
                >
                  Confirmar y Cerrar
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
