'use client';

import { useCallback, useEffect, useState } from 'react';

type WaInstance = {
  id: string;
  name: string;
  connectionStatus: string;
  profileName: string | null;
  profilePicUrl: string | null;
  number: string | null;
  token: string;
  createdAt: string;
  updatedAt: string;
  _count?: { Message: number; Contact: number; Chat: number };
};

type QrData = {
  ok: boolean;
  base64?: string;
  qrcode?: { base64?: string; pairingCode?: string };
  error?: string;
};

type SyncResult = { procesados: number; duplicados: number; errores: number; total: number; errorDetails?: string[]; smartSync?: boolean; lastSyncedAt?: string | null } | null;

export default function ConexionPage() {
  const [instance, setInstance] = useState<WaInstance | null>(null);
  const [qrData, setQrData]     = useState<QrData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [qrLoading, setQrLoad]  = useState(false);
  const [apiError, setApiError] = useState('');
  const [lastCheck, setLastCheck] = useState('');
  const [syncing, setSyncing]   = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res  = await fetch('/api/evolution/status', { cache: 'no-store' });
      const data = await res.json() as { ok: boolean; instances?: WaInstance[]; error?: string };
      if (data.ok && data.instances?.[0]) {
        setInstance(data.instances[0]);
        setApiError('');
      } else {
        setApiError(data.error ?? 'No se pudo contactar Evolution API');
      }
      setLastCheck(new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (e: unknown) {
      setApiError(e instanceof Error ? e.message : 'Error de red');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchQr = useCallback(async () => {
    setQrLoad(true);
    setQrData(null);
    try {
      const res  = await fetch('/api/evolution/qr?instance=mi_bot', { cache: 'no-store' });
      const data = await res.json() as QrData;
      setQrData(data);
    } catch (e: unknown) {
      setQrData({ ok: false, error: e instanceof Error ? e.message : 'Error' });
    } finally {
      setQrLoad(false);
    }
  }, []);

  const runSync = useCallback(async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res  = await fetch('/api/evolution/sync', { method: 'POST', cache: 'no-store' });
      const data = await res.json();
      if (data.ok) setSyncResult({ ...data.resumen, errorDetails: data.errorDetails, smartSync: data.smartSync, lastSyncedAt: data.lastSyncedAt });
      else setApiError(data.error ?? 'Error en sincronización');
    } catch (e: unknown) {
      setApiError(e instanceof Error ? e.message : 'Error de red');
    } finally {
      setSyncing(false);
    }
  }, []);

  // Poll status every 5s
  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 5000);
    return () => clearInterval(id);
  }, [fetchStatus]);

  // Auto-fetch QR when not connected
  useEffect(() => {
    if (instance && instance.connectionStatus !== 'open') {
      fetchQr();
    } else if (instance?.connectionStatus === 'open') {
      setQrData(null);
    }
  }, [instance?.connectionStatus, fetchQr]);

  const connected  = instance?.connectionStatus === 'open';
  const connecting = instance?.connectionStatus === 'connecting';

  const statusColor = connected ? '#34d399' : connecting ? '#fbbf24' : '#f87171';
  const statusLabel = connected ? 'Conectado' : connecting ? 'Conectando…' : 'Desconectado';

  const qrBase64 = qrData?.base64 ?? qrData?.qrcode?.base64;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <p className="eyebrow" style={{ marginBottom: '4px' }}>WhatsApp</p>
        <h1 className="page-title">Conexión</h1>
        <p className="page-subtitle">Instancia <code style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', padding: '1px 6px', borderRadius: '4px', fontSize: '12px' }}>mi_bot</code> · Evolution API v2.3.7</p>
      </div>

      {/* API error */}
      {apiError && (
        <div className="alert alert-error" style={{ marginBottom: '20px' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span><strong>Error al conectar con Evolution API:</strong> {apiError}</span>
        </div>
      )}


      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Status card */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <p style={{ fontSize: '14px', fontWeight: '700', color: '#e8edf5' }}>Estado de instancia</p>
            <button id="conexion-refresh" className="btn btn-ghost btn-sm" onClick={fetchStatus}>
              ↻ Refrescar
            </button>
          </div>

          {loading ? (
            <div style={{ display: 'grid', gap: '12px' }}>
              {[80, 60, 100, 70].map((w, i) => <div key={i} className="skeleton" style={{ height: '18px', width: `${w}%` }} />)}
            </div>
          ) : instance ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', padding: '12px 16px', background: `rgba(${connected ? '52,211,153' : connecting ? '251,191,36' : '248,113,113'},0.07)`, borderRadius: '10px', border: `1px solid rgba(${connected ? '52,211,153' : connecting ? '251,191,36' : '248,113,113'},0.15)` }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: statusColor, boxShadow: `0 0 10px ${statusColor}`, flexShrink: 0 }} className={connected ? 'dot-pulse' : ''} />
                <span style={{ fontSize: '16px', fontWeight: '700', color: statusColor }}>{statusLabel}</span>
              </div>

              {[
                { label: 'Instancia', value: instance.name },
                { label: 'Estado', value: instance.connectionStatus },
                { label: 'Número', value: instance.number ?? 'No vinculado' },
                { label: 'Perfil', value: instance.profileName ?? '—' },
                { label: 'Mensajes', value: String(instance._count?.Message ?? 0) },
                { label: 'Contactos', value: String(instance._count?.Contact ?? 0) },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(148,163,184,0.06)' }}>
                  <span style={{ fontSize: '12px', color: '#475569', fontWeight: '600' }}>{label}</span>
                  <span style={{ fontSize: '13px', color: '#e8edf5', fontWeight: '500', fontFamily: label === 'Estado' ? 'monospace' : 'inherit' }}>{value}</span>
                </div>
              ))}

              <p style={{ fontSize: '11px', color: '#2d3748', marginTop: '14px', textAlign: 'right' }}>
                Verificado: {lastCheck}
              </p>
            </div>
          ) : (
            <p style={{ color: '#f87171' }}>No se pudo obtener la instancia</p>
          )}
        </div>

        {/* QR card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p style={{ fontSize: '14px', fontWeight: '700', color: '#e8edf5', marginBottom: '20px', width: '100%' }}>
            {connected ? '✅ WhatsApp vinculado' : '📱 Escanear código QR'}
          </p>

          {connected ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px 0', gap: '12px' }}>
              <div style={{ fontSize: '64px' }}>✅</div>
              <p style={{ fontSize: '20px', fontWeight: '800', color: '#34d399' }}>Conectado</p>
              <p style={{ fontSize: '13px', color: '#475569' }}>{instance?.profileName ?? 'WhatsApp activo'}</p>
              {instance?.number && (
                <p style={{ fontSize: '13px', color: '#818cf8', fontFamily: 'monospace' }}>{instance.number}</p>
              )}
              <button
                id="conexion-sync"
                onClick={runSync}
                disabled={syncing}
                className="btn btn-primary"
                style={{ marginTop: '8px', width: '100%', opacity: syncing ? 0.7 : 1 }}
              >
                {syncing ? '⏳ Sincronizando…' : '🔍 Sincronizar mensajes del día'}
              </button>
              {syncResult && (
                <div style={{ width: '100%', padding: '10px 14px', background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.15)', borderRadius: '10px', textAlign: 'left' }}>
                  <p style={{ fontSize: '12px', fontWeight: '700', color: '#34d399', marginBottom: '6px' }}>✅ Sincronización completa</p>
                  {/* Smart sync info */}
                  {syncResult.smartSync && syncResult.lastSyncedAt && (
                    <p style={{ fontSize: '10px', color: '#818cf8', marginBottom: '6px', background: 'rgba(99,102,241,0.1)', padding: '3px 8px', borderRadius: '4px' }}>
                      ⚡ Continuando desde: {new Date(syncResult.lastSyncedAt).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} — solo mensajes nuevos
                    </p>
                  )}
                  {!syncResult.smartSync && (
                    <p style={{ fontSize: '10px', color: '#64748b', marginBottom: '6px' }}>📋 Escaneo completo del día</p>
                  )}
                  <p style={{ fontSize: '11px', color: '#94a3b8' }}>✔ Procesados: <strong style={{color:'#e8edf5'}}>{syncResult.procesados}</strong></p>
                  <p style={{ fontSize: '11px', color: '#94a3b8' }}>⚠ Duplicados: <strong style={{color:'#fbbf24'}}>{syncResult.duplicados}</strong></p>
                  <p style={{ fontSize: '11px', color: '#94a3b8' }}>✖ Errores: <strong style={{color:'#f87171'}}>{syncResult.errores}</strong></p>
                  {syncResult.errores > 0 && syncResult.errorDetails && syncResult.errorDetails.length > 0 && (
                    <div style={{ marginTop: '10px', maxHeight: '100px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '6px', fontSize: '10px', color: '#f87171' }}>
                      {syncResult.errorDetails.map((e, idx) => (
                        <div key={idx} style={{ marginBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                          {e}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : qrLoading ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
              <div className="animate-spin" style={{ width: '36px', height: '36px', border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', borderRadius: '50%' }} />
              <p style={{ color: '#475569', fontSize: '14px' }}>Generando QR…</p>
            </div>
          ) : qrBase64 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <div style={{ padding: '12px', background: 'white', borderRadius: '14px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                <img
                  src={qrBase64.startsWith('data:') ? qrBase64 : `data:image/png;base64,${qrBase64}`}
                  alt="QR WhatsApp"
                  style={{ width: '220px', height: '220px', borderRadius: '8px', display: 'block' }}
                />
              </div>
              <p style={{ fontSize: '12px', color: '#475569', textAlign: 'center', maxWidth: '240px' }}>
                Abre WhatsApp → <strong style={{ color: '#e8edf5' }}>Dispositivos vinculados</strong> → Vincular dispositivo
              </p>
              <button id="conexion-refresh-qr" onClick={fetchQr} className="btn btn-ghost" style={{ width: '100%' }}>
                🔄 Nuevo QR
              </button>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px' }}>📵</div>
              <p style={{ color: '#475569' }}>
                {qrData?.error ? `Error: ${qrData.error}` : 'No se pudo obtener el QR'}
              </p>
              <p style={{ fontSize: '12px', color: '#2d3748', maxWidth: '220px' }}>
                Verifica que Evolution API esté corriendo y que Redis esté conectado
              </p>
              <button id="conexion-gen-qr" onClick={fetchQr} className="btn btn-primary">
                Generar QR
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
