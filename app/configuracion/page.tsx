'use client';

import { useEffect, useState } from 'react';

type Config = {
  startTime: string;
  endTime: string;
  webhookUrl: string;
  instanceName: string;
  numeroReceptor: string;
};

const DEFAULT: Config = {
  startTime: '06:00',
  endTime: '00:00',
  webhookUrl: 'https://reportes-cierres-psi.vercel.app/api/webhooks/whatsapp',
  instanceName: 'mi_bot',
  numeroReceptor: '',
};

export default function ConfiguracionPage() {
  const [cfg, setCfg]       = useState<Config>(DEFAULT);
  const [saved, setSaved]   = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(json => {
        if (json.ok && json.data) setCfg({ ...DEFAULT, ...json.data });
      })
      .catch(() => {});
  }, []);

  const save = async () => {
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      alert('Error guardando configuración');
    }
  };

  const copyWebhook = async () => {
    await navigator.clipboard.writeText(cfg.webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const set = (key: keyof Config) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setCfg(prev => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '28px' }}>
        <p className="eyebrow" style={{ marginBottom: '4px' }}>Sistema</p>
        <h1 className="page-title">Configuración</h1>
        <p className="page-subtitle">Ajustes de captura, webhook y conexión</p>
      </div>

      <div style={{ display: 'grid', gap: '20px', maxWidth: '720px' }}>

        {/* Capture window */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={iconWrap}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div>
              <p style={cardTitle}>Ventana de captura</p>
              <p style={cardSub}>Solo se procesan mensajes dentro de este rango horario</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <p className="label" style={{ marginBottom: '8px' }}>Hora inicio</p>
              <input id="cfg-start" type="time" className="input" value={cfg.startTime} onChange={set('startTime')} />
            </div>
            <div>
              <p className="label" style={{ marginBottom: '8px' }}>Hora fin</p>
              <input id="cfg-end" type="time" className="input" value={cfg.endTime} onChange={set('endTime')} />
              <p style={{ fontSize: '11px', color: '#2d3748', marginTop: '6px' }}>00:00 = medianoche (fin del día)</p>
            </div>
          </div>

          <div style={{ marginTop: '16px', padding: '12px 14px', background: 'rgba(99,102,241,0.06)', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.12)' }}>
            <p style={{ fontSize: '12px', color: '#818cf8', fontWeight: '600' }}>
              Rango activo: {cfg.startTime} → {cfg.endTime === '00:00' ? '24:00 (medianoche)' : cfg.endTime}
            </p>
          </div>
        </div>

        {/* Webhook */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={iconWrap}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
            </div>
            <div>
              <p style={cardTitle}>Webhook de Evolution API</p>
              <p style={cardSub}>URL donde Evolution enviará los mensajes de WhatsApp</p>
            </div>
          </div>

          <div>
            <p className="label" style={{ marginBottom: '8px' }}>URL del Webhook</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input id="cfg-webhook" type="url" className="input" value={cfg.webhookUrl} onChange={set('webhookUrl')} style={{ flex: 1, fontFamily: 'monospace', fontSize: '12px' }} />
              <button id="cfg-copy-webhook" className="btn btn-ghost" style={{ whiteSpace: 'nowrap', flexShrink: 0 }} onClick={copyWebhook}>
                {copied ? '✓ Copiado' : '📋 Copiar'}
              </button>
            </div>
          </div>

          <div className="alert alert-warning" style={{ marginTop: '16px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <div>
              <p style={{ fontWeight: '700', marginBottom: '4px', fontSize: '12px' }}>Configurar en Evolution API (VPS)</p>
              <p style={{ fontSize: '11px', opacity: 0.85 }}>Ejecuta este comando en el VPS para registrar el webhook:</p>
              <code style={{ display: 'block', marginTop: '6px', background: 'rgba(0,0,0,0.25)', padding: '6px 10px', borderRadius: '5px', fontSize: '11px', color: '#fde68a', wordBreak: 'break-all' }}>
                {`curl -X POST http://localhost:8081/webhook/set/mi_bot \\
  -H "apikey: 9f4b61d9-1e2a-4b9d-8a6a-5f8dd6f7f5c1" \\
  -H "Content-Type: application/json" \\
  -d '{"webhook":{"url":"${cfg.webhookUrl}","enabled":true,"events":["MESSAGES_UPSERT"]}}'`}
              </code>
            </div>
          </div>
        </div>

        {/* Instance */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={iconWrap}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div>
              <p style={cardTitle}>Instancia WhatsApp</p>
              <p style={cardSub}>Nombre de la instancia en Evolution API</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <p className="label" style={{ marginBottom: '8px' }}>Nombre de instancia</p>
              <input id="cfg-instance" type="text" className="input" value={cfg.instanceName} onChange={set('instanceName')} placeholder="mi_bot" />
            </div>
            <div>
              <p className="label" style={{ marginBottom: '8px' }}>Número WhatsApp Receptor</p>
              <input id="cfg-receptor" type="text" className="input" value={cfg.numeroReceptor} onChange={set('numeroReceptor')} placeholder="Ej. 584141234567" />
              <p style={{ fontSize: '11px', color: '#2d3748', marginTop: '6px' }}>Número que recibe los captures (con código de país)</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
            <InfoBox label="Estado Redis" value="✅ Conectado" color="#34d399" />
            <InfoBox label="Evolution API" value="✓ Activo :8081" color="#34d399" />
            <InfoBox label="VPS IP" value="144.126.129.154" color="#94a3b8" />
            <InfoBox label="Versión" value="v2.3.7" color="#94a3b8" />
          </div>
        </div>

        {/* Save */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button id="cfg-save" className="btn btn-primary" onClick={save} style={{ flex: 1, height: '44px' }}>
            {saved ? '✓ Guardado' : 'Guardar configuración'}
          </button>
          <button className="btn btn-ghost" onClick={() => setCfg(DEFAULT)}>
            Restaurar
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: 'rgba(148,163,184,0.04)', border: '1px solid rgba(148,163,184,0.08)', borderRadius: '10px', padding: '10px 14px' }}>
      <p style={{ fontSize: '10px', color: '#2d3748', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>{label}</p>
      <p style={{ fontSize: '12px', color, fontWeight: '600' }}>{value}</p>
    </div>
  );
}

const iconWrap: React.CSSProperties = {
  width: '36px',
  height: '36px',
  borderRadius: '10px',
  background: 'rgba(99,102,241,0.1)',
  border: '1px solid rgba(99,102,241,0.15)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};
const cardTitle: React.CSSProperties = { fontSize: '14px', fontWeight: '700', color: '#e8edf5' };
const cardSub: React.CSSProperties   = { fontSize: '12px', color: '#2d3748', marginTop: '2px' };
