'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const DEFAULT_CAPTURE_WINDOW = { startTime: '06:00', endTime: '00:00' };

type CaptureWindow = {
  startTime: string;
  endTime: string;
};

type ConnectResult = {
  ok: boolean;
  reason?: string;
  status?: string;
  url?: string;
  payload?: any;
};

export default function ConfiguracionPage() {
  const [captureWindow, setCaptureWindow] = useState<CaptureWindow>(DEFAULT_CAPTURE_WINDOW);
  const [instanceName, setInstanceName] = useState('reportes-cierres');
  const [webhookUrl, setWebhookUrl] = useState('http://localhost:3000/api/webhooks/whatsapp');
  const [connectState, setConnectState] = useState<ConnectResult | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem('capture-window');
    if (saved) {
      try {
        setCaptureWindow({ ...DEFAULT_CAPTURE_WINDOW, ...JSON.parse(saved) });
      } catch {
        setCaptureWindow(DEFAULT_CAPTURE_WINDOW);
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem('capture-window', JSON.stringify(captureWindow));
  }, [captureWindow]);

  const checkEvolution = async () => {
    setChecking(true);
    setConnectState(null);

    try {
      const res = await fetch(`/api/evolution/status?instanceName=${encodeURIComponent(instanceName)}`);
      const data = await res.json();
      setConnectState(data);
    } catch (error: any) {
      setConnectState({ ok: false, reason: error?.message || 'No se pudo verificar Evolution.' });
    } finally {
      setChecking(false);
    }
  };

  const connectEvolution = async () => {
    setConnecting(true);
    setConnectState(null);

    try {
      const res = await fetch('/api/evolution/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceName,
          webhook: webhookUrl,
        }),
      });

      const data = await res.json();
      setConnectState(data);
    } catch (error: any) {
      setConnectState({ ok: false, reason: error?.message || 'Error intentando crear la instancia de Evolution.' });
    } finally {
      setConnecting(false);
    }
  };

  return (
    <main className="shell">
      <div className="panel">
        <div className="header-row">
          <div>
            <p className="eyebrow">WhatsApp</p>
            <h1>Configuración real de Evolution</h1>
          </div>

          <div className="header-actions">
            <Link href="/" className="ghost-link">Inicio</Link>
            <Link href="/dashboard" className="primary-link">Ver pagos</Link>
          </div>
        </div>

        <div className="layout">
          <section className="card qr-card">
            <div className="qr-block" aria-label="QR de conexión">
              <div className="qr-frame">
                {Array.from({ length: 25 }, (_, i) => (
                  <span key={i} className={`qr-cell ${i % 2 === 0 ? 'dark' : 'light'}`} />
                ))}
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="instance-name">Nombre de la instancia</label>
              <input
                id="instance-name"
                value={instanceName}
                onChange={(event) => setInstanceName(event.target.value)}
              />
            </div>

            <div className="field-group">
              <label htmlFor="webhook-url">Webhook</label>
              <input
                id="webhook-url"
                value={webhookUrl}
                onChange={(event) => setWebhookUrl(event.target.value)}
              />
            </div>

            <div className="field-row">
              <button type="button" className="primary-button" onClick={connectEvolution} disabled={connecting}>
                {connecting ? 'Conectando...' : 'Conectar a Evolution'}
              </button>
              <button type="button" className="secondary-button" onClick={checkEvolution} disabled={checking}>
                {checking ? 'Verificando...' : 'Verificar estado'}
              </button>
            </div>

            {connectState && (
              <div className={`result-box ${connectState.ok ? 'success' : 'error'}`}>
                <strong>{connectState.ok ? 'Conexión correcta' : 'Error de conexión'}</strong>
                <p>
                  {connectState.reason || connectState.status || 'Sin detalle'}
                </p>
              </div>
            )}
          </section>

          <section className="card settings-card">
            <div className="card-header">
              <p className="eyebrow subtle">Production config</p>
              <h2>Parámetros activos</h2>
            </div>

            <div className="field-group">
              <label htmlFor="api-url">URL de Evolution</label>
              <input id="api-url" value={process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'} readOnly />
            </div>

            <div className="field-group">
              <label htmlFor="server-url">Servidor</label>
              <input id="server-url" value={process.env.SERVER_URL || 'http://144.126.129.154:8081'} readOnly />
            </div>

            <div className="field-group">
              <label htmlFor="start-time">Horario de captura</label>
              <div className="time-grid">
                <input
                  id="start-time"
                  type="time"
                  value={captureWindow.startTime}
                  onChange={(event) =>
                    setCaptureWindow((current) => ({ ...current, startTime: event.target.value }))
                  }
                />
                <input
                  id="end-time"
                  type="time"
                  value={captureWindow.endTime}
                  onChange={(event) =>
                    setCaptureWindow((current) => ({ ...current, endTime: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="status-box">
              <span className="status-pill">Conexión real activa</span>
              <p>La aplicación usa valores del entorno para conectarse a Evolution y al webhook real. Si la instancia aún no existe, el botón de conectar la crea.</p>
            </div>
          </section>
        </div>
      </div>

      <style jsx>{`
        :global(body) {
          margin: 0;
          font-family: Inter, 'Segoe UI', sans-serif;
          background: linear-gradient(135deg, #f8fafc 0%, #eef7ff 100%);
          color: #0f172a;
        }

        * { box-sizing: border-box; }

        .shell {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 20px;
        }

        .panel {
          width: min(1100px, 100%);
          background: rgba(255,255,255,0.85);
          border: 1px solid rgba(148,163,184,0.2);
          border-radius: 28px;
          box-shadow: 0 24px 80px rgba(15, 23, 42, 0.06);
          padding: 28px;
          backdrop-filter: blur(10px);
        }

        .header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
        }

        .header-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .eyebrow {
          margin: 0 0 8px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 11px;
          font-weight: 700;
          color: #2563eb;
        }

        .eyebrow.subtle {
          color: #64748b;
        }

        h1, h2 {
          margin: 0;
          letter-spacing: -0.04em;
        }

        h1 {
          font-size: clamp(2rem, 3vw, 2.6rem);
        }

        h2 {
          font-size: clamp(1.3rem, 2vw, 1.8rem);
        }

        .layout {
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          gap: 22px;
        }

        .card {
          background: #fff;
          border: 1px solid rgba(148,163,184,0.2);
          border-radius: 22px;
          padding: 22px;
        }

        .qr-block {
          display: flex;
          justify-content: center;
          margin-bottom: 22px;
        }

        .qr-frame {
          width: min(240px, 100%);
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 6px;
          padding: 16px;
          background: #f8fafc;
          border: 1px solid rgba(148,163,184,0.2);
          border-radius: 18px;
        }

        .qr-cell {
          width: 100%;
          aspect-ratio: 1;
          border-radius: 4px;
        }

        .qr-cell.dark { background: #0f172a; }
        .qr-cell.light { background: rgba(148,163,184,0.18); }

        .field-group {
          margin-bottom: 16px;
        }

        label {
          display: block;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #475569;
          margin-bottom: 8px;
        }

        input {
          width: 100%;
          border: 1px solid rgba(148,163,184,0.35);
          border-radius: 12px;
          background: #f8fafc;
          padding: 12px 14px;
          font-size: 1rem;
          color: #0f172a;
        }

        .time-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(120px, 1fr));
          gap: 10px;
        }

        .field-row {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 18px;
        }

        .primary-button,
        .secondary-button,
        .ghost-link,
        .primary-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          text-decoration: none;
          font-weight: 700;
          padding: 12px 16px;
          transition: transform 0.15s ease;
          cursor: pointer;
        }

        .primary-button,
        .primary-link {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          border: none;
        }

        .secondary-button {
          background: white;
          color: #0f172a;
          border: 1px solid rgba(148,163,184,0.5);
        }

        .ghost-link {
          background: #f1f5f9;
          color: #0f172a;
          border: 1px solid rgba(148,163,184,0.3);
        }

        .status-box {
          margin-top: 18px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 14px;
          padding: 16px;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: #dcfce7;
          color: #166534;
          padding: 7px 10px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .status-box p {
          margin: 12px 0 0;
          color: #36525c;
          line-height: 1.6;
        }

        .result-box {
          margin-top: 18px;
          border-radius: 12px;
          padding: 14px 16px;
          border: 1px solid transparent;
        }

        .result-box.success {
          background: #ecfdf5;
          border-color: #a7f3d0;
          color: #166534;
        }

        .result-box.error {
          background: #fef2f2;
          border-color: #fecaca;
          color: #991b1b;
        }

        .result-box strong {
          display: block;
          margin-bottom: 6px;
        }

        .result-box p {
          margin: 0;
          line-height: 1.5;
        }

        @media (max-width: 760px) {
          .layout {
            grid-template-columns: 1fr;
          }

          .header-row {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </main>
  );
}
