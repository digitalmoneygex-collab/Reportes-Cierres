'use client';

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import PskloudPanel from '@/app/components/PskloudPanel';
import ShiftPreviewModal from '@/app/components/ShiftPreviewModal';
import { useRouter } from 'next/navigation';
import { generateShiftReportPdf } from '@/app/lib/pdfGenerator';

type Pago = { id: string; created_at: string; telefono_emisor: string; monto_bs: number; monto_usd?: number; referencia: string; banco_origen: string; metodo: string; procesado: boolean; };
type WaInstance = { name: string; connectionStatus: string; profileName: string | null; number: string | null; };
type Turno = { id: number; usuario_id: string; abierto_at: string; cerrado_at: string | null; };

const fmtBs = (v: number) => new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES', maximumFractionDigits: 2 }).format(v ?? 0);
const fmtDate = () => new Date().toLocaleDateString('es-VE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

export default function DashboardPage() {
  const router = useRouter();
  const [activeTurno, setActiveTurno] = useState<Turno | null>(null);
  const [turnosList, setTurnosList] = useState<Turno[]>([]);
  const [selectedView, setSelectedView] = useState<string>('activo'); // 'activo', 'consolidado', o ID
  const [perfil, setPerfil] = useState<any>(null);
  const [loadingTurno, setLoadingTurno] = useState(true);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [waInst, setWaInst] = useState<WaInstance | null>(null);
  const [tasa, setTasa] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [pskloudData, setPskloudData] = useState<any>(null);
  const [pskloudLoading, setPskloudLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const prevIdsRef = useRef<Set<string>>(new Set());

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      let url = '/api/turnos/preview?';
      if (selectedView === 'consolidado') {
        url += selectedDate ? `date=${selectedDate}` : 'date=';
      } else if (effectiveTurno) {
        url += `start=${encodeURIComponent(effectiveTurno.abierto_at)}`;
        if (effectiveTurno.cerrado_at) {
          url += `&end=${encodeURIComponent(effectiveTurno.cerrado_at)}`;
        }
      } else {
        throw new Error('No hay turno válido seleccionado');
      }

      const res = await fetch(url);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Error al generar vista previa');
      
      const data = json.data;
      generateShiftReportPdf({
        fecha: new Date(data.rango.start).toLocaleDateString('es-VE'),
        horaApertura: new Date(data.rango.start).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }),
        horaCierre: data.rango.end ? new Date(data.rango.end).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }),
        cajeroNombre: data.cajero?.nombre || (selectedView === 'consolidado' ? 'CONSOLIDADO' : 'CAJERO DESCONOCIDO'),
        cajeroCedula: data.cajero?.cedula || 'N/A',
        supervisorNombre: perfil?.nombre_completo,
        pskloud: data.pskloud,
        metodosPago: data.metodosPago || [],
        pagos: data.pagos || { totalBs: 0, registradosCount: 0, procesadosCount: 0 },
        articulos: data.articulos || { burguer: [], pasteles: [], reposteria: [] },
        insumos: data.insumos || undefined,
      });
    } catch (err) {
      console.error('Error generando PDF:', err);
      alert('Hubo un error al generar el PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const loadTurno = useCallback(async () => {
    try {
      const res = await fetch('/api/turnos');
      const json = await res.json();
      if (json.ok) {
        if (json.active) setActiveTurno(json.turno);
        else setActiveTurno(null);
        setPerfil(json.perfil);

        const listRes = await fetch('/api/turnos/list');
        const listJson = await listRes.json();
        if (listJson.ok) {
          setTurnosList(listJson.turnos);
        }
      }
    } catch { }
    setLoadingTurno(false);
  }, []);

  const openTurno = async () => {
    try {
      const res = await fetch('/api/turnos', { method: 'POST' });
      const json = await res.json();
      if (json.ok && json.turno) {
        setActiveTurno(json.turno);
      }
    } catch (e) {
      alert('Error abriendo turno');
    }
  };

  const closeTurno = async () => {
    try {
      const res = await fetch('/api/turnos', { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }
      });
      const json = await res.json();
      if (json.ok) {
        setActiveTurno(null);
        setPskloudData(null);
        setPagos([]);
        setNewCount(0);
      } else {
        alert('Error cerrando turno: ' + (json.error || 'desconocido'));
      }
    } catch (e) {
      alert('Error de red al cerrar turno');
    }
  };

  const loadTasa = useCallback(async () => {
    try {
      const res = await fetch('/api/tasa', { cache: 'no-store' });
      const json = await res.json();
      if (json.ok && json.tasa) setTasa(json.tasa);
    } catch { }
  }, []);

  const loadPagos = useCallback(async (dateFilter?: string, currentTurno?: Turno) => {
    try {
      let qs = dateFilter ? `?date=${dateFilter}` : '';
      if (!dateFilter && currentTurno) {
        qs = `?abierto_at=${encodeURIComponent(currentTurno.abierto_at)}`;
        if (currentTurno.cerrado_at) {
          qs += `&cerrado_at=${encodeURIComponent(currentTurno.cerrado_at)}`;
        }
      }
      const res = await fetch(`/api/pagos${qs ? qs + '&limit=50' : '?limit=50'}`, { cache: 'no-store' });
      const json = await res.json();
      if (json.ok && json.data) {
        const fresh = json.data as Pago[];
        const newIds = fresh.filter(p => !prevIdsRef.current.has(p.id));
        if (prevIdsRef.current.size > 0 && newIds.length > 0) setNewCount(n => n + newIds.length);
        prevIdsRef.current = new Set(fresh.map(p => p.id));
        setPagos(fresh);
      }
    } catch { }
    setLoading(false);
  }, []);

  const loadWA = useCallback(async () => {
    try {
      const res = await fetch('/api/evolution/status', { cache: 'no-store' });
      const json = await res.json();
      if (json.ok && json.instances?.[0]) setWaInst(json.instances[0]);
    } catch { }
  }, []);

  const loadPskloud = useCallback(async (dateFilter?: string, currentTurno?: Turno) => {
    try {
      let qs = dateFilter ? `?date=${dateFilter}` : '';
      if (!dateFilter && currentTurno) {
        qs = `?abierto_at=${encodeURIComponent(currentTurno.abierto_at)}`;
        if (currentTurno.cerrado_at) {
          qs += `&cerrado_at=${encodeURIComponent(currentTurno.cerrado_at)}`;
        }
      }
      const res = await fetch(`/api/pskloud/resumen${qs}`, { cache: 'no-store' });
      const json = await res.json();
      if (json.ok) setPskloudData(json);
    } catch { }
    setPskloudLoading(false);
  }, []);

  useEffect(() => {
    loadTurno();
  }, [loadTurno]);

  const effectiveTurno = useMemo(() => {
    if (selectedView === 'activo') return activeTurno;
    if (selectedView === 'consolidado') return null;
    return turnosList.find(t => String(t.id) === selectedView) || null;
  }, [selectedView, activeTurno, turnosList]);

  useEffect(() => {
    if (loadingTurno) return;
    if (selectedView === 'activo' && !activeTurno && !selectedDate) return;

    loadPagos(selectedDate, effectiveTurno || undefined);
    loadWA();
    loadTasa();
    loadPskloud(selectedDate, effectiveTurno || undefined);
    
    if (selectedDate) return;
    if (effectiveTurno?.cerrado_at) return; // No refrescar si es un turno cerrado

    const id1 = setInterval(() => loadPagos(selectedDate, effectiveTurno || undefined), 10000);
    const id2 = setInterval(() => loadWA(), 15000);
    const id3 = setInterval(() => loadTasa(), 60000);
    const id4 = setInterval(() => loadPskloud(selectedDate, effectiveTurno || undefined), 60000);
    return () => { clearInterval(id1); clearInterval(id2); clearInterval(id3); clearInterval(id4); };
  }, [loadingTurno, selectedView, activeTurno, selectedDate, effectiveTurno, loadPagos, loadWA, loadTasa, loadPskloud]);

  if (loadingTurno) {
    return <div style={{ padding: 40, color: '#e8edf5' }}>Cargando turno...</div>;
  }

  if (!activeTurno && !selectedDate && selectedView === 'activo') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <h2 style={{ color: '#e8edf5', fontSize: '24px', marginBottom: '8px' }}>No tienes un turno activo</h2>
        <p style={{ color: '#94a3b8', marginBottom: '24px' }}>Abre tu turno para comenzar a registrar las ventas del sistema.</p>
        <button className="btn btn-primary" style={{ padding: '12px 24px', fontSize: '16px' }} onClick={openTurno}>
          Abrir Turno
        </button>
      </div>
    );
  }

  const total = pagos.reduce((s, p) => s + (p.monto_bs ?? 0), 0);
  const totalUsd = tasa > 0 ? (total / tasa) : 0;
  const procesados = pagos.filter(p => p.procesado).length;

  const waColor = waInst?.connectionStatus === 'open' ? '#34d399' : waInst?.connectionStatus === 'connecting' ? '#fbbf24' : '#f87171';
  const waLabel = waInst?.connectionStatus === 'open' ? 'Conectado' : waInst?.connectionStatus === 'connecting' ? 'Conectando…' : 'Desconectado';

  const byHour = Array.from({ length: 24 }, (_, h) => {
    const slice = pagos.filter(p => new Date(p.created_at).getHours() === h);
    return { hour: h, count: slice.length, total: slice.reduce((s, p) => s + (p.monto_bs ?? 0), 0) };
  });
  const maxCount = Math.max(...byHour.map(b => b.count), 1);

  return (
    <div className="animate-fade-in">
      {activeTurno && (
        <ShiftPreviewModal 
          isOpen={previewOpen} 
          onClose={() => setPreviewOpen(false)} 
          onConfirm={closeTurno} 
          start={activeTurno.abierto_at} 
        />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: '4px' }}>{fmtDate()}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h1 className="page-title" style={{ margin: 0 }}>Dashboard</h1>
              <select 
                style={{
                  background: '#1e293b', color: 'white', border: '1px solid #334155', borderRadius: '6px', padding: '4px 12px', fontSize: '14px', cursor: 'pointer', outline: 'none'
                }}
                value={selectedView}
                onChange={(e) => setSelectedView(e.target.value)}
              >
                <option value="activo">Turno Actual (Activo)</option>
                {perfil?.rol === 'SUPERVISOR' && <option value="consolidado">Consolidado del Día</option>}
                {turnosList.filter(t => t.cerrado_at).map(t => {
                  const d = new Date(t.abierto_at);
                  const dia = String(d.getDate()).padStart(2, '0');
                  const mes = String(d.getMonth() + 1).padStart(2, '0');
                  const anio = String(d.getFullYear()).slice(-2);
                  return (
                    <option key={t.id} value={String(t.id)}>
                      Cerrado: ({dia}-{mes}-{anio}) {d.toLocaleTimeString('es-VE', {hour: '2-digit', minute:'2-digit'})} - {new Date(t.cerrado_at!).toLocaleTimeString('es-VE', {hour: '2-digit', minute:'2-digit'})}
                    </option>
                  );
                })}
              </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '10px', flexWrap: 'wrap' }}>
            <p className="page-subtitle" style={{ margin: 0 }}>
              {selectedView === 'activo' && activeTurno 
                ? `Turno Abierto desde: ${new Date(activeTurno.abierto_at).toLocaleTimeString('es-VE')}`
                : selectedView === 'consolidado' 
                ? 'Consolidado del Día' 
                : effectiveTurno?.cerrado_at 
                ? `Turno Cerrado (${new Date(effectiveTurno.abierto_at).toLocaleTimeString('es-VE')} - ${new Date(effectiveTurno.cerrado_at).toLocaleTimeString('es-VE')})`
                : 'Sin Turno Activo'}
            </p>
            {tasa > 0 && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, rgba(251,191,36,0.15) 0%, rgba(245,158,11,0.1) 100%)',
                border: '1px solid rgba(251,191,36,0.35)', borderRadius: '8px', padding: '4px 12px', fontSize: '13px', fontWeight: '800', color: '#fbbf24'
              }}>
                Tasa BCV: Bs. {tasa.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {newCount > 0 && !selectedDate && (
            <button className="badge badge-green" style={{ cursor: 'pointer', border: 'none' }} onClick={() => setNewCount(0)}>
              +{newCount} nuevo{newCount > 1 ? 's' : ''}
            </button>
          )}
          
          <button className="btn btn-ghost btn-sm" disabled={isRefreshing} onClick={async () => {
            setIsRefreshing(true);
            try { await Promise.all([loadPagos(selectedDate, effectiveTurno || undefined), loadWA(), loadTasa(), loadPskloud(selectedDate, effectiveTurno || undefined)]); } finally { setIsRefreshing(false); }
          }}>Refrescar</button>

          {selectedView === 'activo' && activeTurno && (
            <button className="btn btn-sm" style={{ background: '#ef4444', color: 'white', border: 'none' }} onClick={() => setPreviewOpen(true)}>
              Cerrar Turno
            </button>
          )}

          {(selectedView !== 'activo' || !activeTurno) && (
            <button className="btn btn-sm" style={{ background: '#3b82f6', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '6px' }} disabled={isGeneratingPdf} onClick={handleDownloadPdf}>
              {isGeneratingPdf ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                  Generando...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Descargar PDF
                </>
              )}
            </button>
          )}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div className="card-glow" style={{ background: 'linear-gradient(135deg, #0c1428 0%, #101a2e 100%)' }}>
          <p className="label" style={{ marginBottom: '12px', color: '#475569' }}>Pagos Móviles del Día</p>
          {loading ? <div className="skeleton" style={{ height: '36px', marginBottom: '6px' }} /> : (
            <div>
              <p style={{ fontSize: '26px', fontWeight: '900', color: '#818cf8', letterSpacing: '-0.06em', lineHeight: 1 }}>{fmtBs(total)}</p>
              {tasa > 0 && <p style={{ fontSize: '13px', color: '#34d399', marginTop: '6px', fontWeight: '600' }}>~ $ {totalUsd.toFixed(2)} USD</p>}
            </div>
          )}
        </div>

        <div className="card">
          <p className="label" style={{ marginBottom: '12px' }}>Interceptados (Bot)</p>
          {loading ? <div className="skeleton" style={{ height: '36px', marginBottom: '6px' }} /> : <p style={{ fontSize: '36px', fontWeight: '900', color: '#34d399', letterSpacing: '-0.06em', lineHeight: 1 }}>{pagos.length}</p>}
        </div>

        <div className="card">
          <p className="label" style={{ marginBottom: '12px' }}>Procesados (IA)</p>
          {loading ? <div className="skeleton" style={{ height: '36px', marginBottom: '6px' }} /> : <p style={{ fontSize: '36px', fontWeight: '900', color: '#22d3ee', letterSpacing: '-0.06em', lineHeight: 1 }}>{procesados}</p>}
        </div>

        <div className="card" style={{ borderColor: waInst?.connectionStatus === 'open' ? 'rgba(52,211,153,0.2)' : 'rgba(148,163,184,0.1)' }}>
          <p className="label" style={{ marginBottom: '12px' }}>WhatsApp</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="dot dot-pulse" style={{ background: waColor, boxShadow: `0 0 8px ${waColor}` }} />
            <p style={{ fontSize: '18px', fontWeight: '700', color: waColor }}>{waLabel}</p>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#e8edf5', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="dot dot-pulse" style={{ background: '#6366f1' }}></span> Datos PSKLOUD (Turno actual)
        </h2>
        <PskloudPanel data={pskloudData} loading={pskloudLoading} />
      </div>

    </div>
  );
}
