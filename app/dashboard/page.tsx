'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import PskloudPanel from '@/app/components/PskloudPanel';
import ShiftPreviewModal from '@/app/components/ShiftPreviewModal';
import { useRouter } from 'next/navigation';

type Pago = { id: string; created_at: string; telefono_emisor: string; monto_bs: number; monto_usd?: number; referencia: string; banco_origen: string; metodo: string; procesado: boolean; };
type WaInstance = { name: string; connectionStatus: string; profileName: string | null; number: string | null; };
type Turno = { id: number; usuario_id: string; abierto_at: string; cerrado_at: string | null; };

const fmtBs = (v: number) => new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES', maximumFractionDigits: 2 }).format(v ?? 0);
const fmtDate = () => new Date().toLocaleDateString('es-VE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

export default function DashboardPage() {
  const router = useRouter();
  const [turno, setTurno] = useState<Turno | null>(null);
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
  const prevIdsRef = useRef<Set<string>>(new Set());

  const loadTurno = useCallback(async () => {
    try {
      const res = await fetch('/api/turnos');
      const json = await res.json();
      if (json.ok && json.active) {
        setTurno(json.turno);
      } else {
        setTurno(null);
      }
    } catch { }
    setLoadingTurno(false);
  }, []);

  const openTurno = async () => {
    try {
      const res = await fetch('/api/turnos', { method: 'POST' });
      const json = await res.json();
      if (json.ok && json.turno) {
        setTurno(json.turno);
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
        setTurno(null);
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
      if (!dateFilter && currentTurno) qs = `?abierto_at=${encodeURIComponent(currentTurno.abierto_at)}`;
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
      if (!dateFilter && currentTurno) qs = `?abierto_at=${encodeURIComponent(currentTurno.abierto_at)}`;
      const res = await fetch(`/api/pskloud/resumen${qs}`, { cache: 'no-store' });
      const json = await res.json();
      if (json.ok) setPskloudData(json);
    } catch { }
    setPskloudLoading(false);
  }, []);

  useEffect(() => {
    loadTurno();
  }, [loadTurno]);

  useEffect(() => {
    if (loadingTurno) return;
    if (!turno && !selectedDate) return;

    loadPagos(selectedDate, turno || undefined);
    loadWA();
    loadTasa();
    loadPskloud(selectedDate, turno || undefined);
    
    if (selectedDate) return;

    const id1 = setInterval(() => loadPagos(selectedDate, turno || undefined), 10000);
    const id2 = setInterval(() => loadWA(), 15000);
    const id3 = setInterval(() => loadTasa(), 60000);
    const id4 = setInterval(() => loadPskloud(selectedDate, turno || undefined), 60000);
    return () => { clearInterval(id1); clearInterval(id2); clearInterval(id3); clearInterval(id4); };
  }, [loadingTurno, turno, selectedDate, loadPagos, loadWA, loadTasa, loadPskloud]);

  if (loadingTurno) {
    return <div style={{ padding: 40, color: '#e8edf5' }}>Cargando turno...</div>;
  }

  if (!turno && !selectedDate) {
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
      {turno && (
        <ShiftPreviewModal 
          isOpen={previewOpen} 
          onClose={() => setPreviewOpen(false)} 
          onConfirm={closeTurno} 
          start={turno.abierto_at} 
        />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: '4px' }}>{fmtDate()}</p>
          <h1 className="page-title">Dashboard</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px', flexWrap: 'wrap' }}>
            <p className="page-subtitle" style={{ margin: 0 }}>
              {selectedDate ? 'Vista de historial' : `Turno Abierto desde: ${new Date(turno!.abierto_at).toLocaleTimeString('es-VE')}`}
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
            try { await Promise.all([loadPagos(selectedDate, turno || undefined), loadWA(), loadTasa(), loadPskloud(selectedDate, turno || undefined)]); } finally { setIsRefreshing(false); }
          }}>Refrescar</button>

          {!selectedDate && turno && (
            <button className="btn btn-sm" style={{ background: '#ef4444', color: 'white', border: 'none' }} onClick={() => setPreviewOpen(true)}>
              Cerrar Turno
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
          <p className="label" style={{ marginBottom: '12px' }}>Capturas Móviles</p>
          {loading ? <div className="skeleton" style={{ height: '36px', marginBottom: '6px' }} /> : <p style={{ fontSize: '36px', fontWeight: '900', color: '#34d399', letterSpacing: '-0.06em', lineHeight: 1 }}>{pagos.length}</p>}
        </div>

        <div className="card">
          <p className="label" style={{ marginBottom: '12px' }}>Procesados (OCR)</p>
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
