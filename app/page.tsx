'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const qrPattern = Array.from({ length: 25 }, (_, i) => i);
const DEFAULT_CAPTURE_WINDOW = { startTime: '06:00', endTime: '00:00' };

type CaptureWindow = {
  startTime: string;
  endTime: string;
};

function timeToMinutes(time: string) {
  if (!time) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  const totalMinutes = (hours || 0) * 60 + (minutes || 0);
  return time === '00:00' ? 24 * 60 : totalMinutes;
}

function isWithinCurrentDayWindow(dateIso: string, startTime: string, endTime: string) {
  const itemDate = new Date(dateIso);
  const today = new Date();

  if (itemDate.toDateString() !== today.toDateString()) {
    return false;
  }

  const currentMinutes = itemDate.getHours() * 60 + itemDate.getMinutes();
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }

  return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
}

export default function HomePage() {
  const [captureWindow, setCaptureWindow] = useState<CaptureWindow>(DEFAULT_CAPTURE_WINDOW);

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

  const statusText = `Captura activa: ${captureWindow.startTime} a ${captureWindow.endTime}`;

  return (
    <main className="shell">
      <div className="layout">
        <aside className="panel config-panel">
          <div className="topbar">
            <div>
              <p className="eyebrow">WhatsApp</p>
              <h1>Conexión maestro</h1>
            </div>
            <span className="status-pill success">En línea</span>
          </div>

          <div className="qr-block">
            <div className="qr-frame" aria-label="QR de conexión">
              {qrPattern.map((item) => (
                <span key={item} className={`qr-cell ${item % 2 === 0 ? 'dark' : 'light'}`} />
              ))}
            </div>
          </div>

          <div className="field-group">
            <label htmlFor="master-number">Número maestro</label>
            <input id="master-number" value="+57 300 123 4567" readOnly />
          </div>

          <div className="field-group">
            <label htmlFor="slave-number">Número esclavo receptor</label>
            <input id="slave-number" placeholder="Ej. +57 301 765 4321" />
          </div>

          <div className="window-block">
            <div className="window-label-row">
              <span>Horario de captura</span>
              <strong>{statusText}</strong>
            </div>

            <div className="time-grid">
              <label>
                Inicio
                <input
                  type="time"
                  value={captureWindow.startTime}
                  onChange={(event) =>
                    setCaptureWindow((current) => ({ ...current, startTime: event.target.value }))
                  }
                />
              </label>

              <label>
                Fin
                <input
                  type="time"
                  value={captureWindow.endTime}
                  onChange={(event) =>
                    setCaptureWindow((current) => ({ ...current, endTime: event.target.value }))
                  }
                />
              </label>
            </div>

            <p className="window-note">
              Solo se toman registros del día actual dentro del rango configurado. No se capturan datos pasados.
            </p>
          </div>

          <div className="field-row">
            <button type="button" className="primary">Guardar conexión</button>
            <Link href="/dashboard" className="secondary">Ver pagos</Link>
          </div>
        </aside>

        <section className="panel info-panel">
          <div className="info-header">
            <div>
              <p className="eyebrow subtle">Monitoreo</p>
              <h2>Capturas interceptadas</h2>
            </div>
            <span className="metric">{captureWindow.startTime} - {captureWindow.endTime}</span>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <span>Pagos</span>
              <strong>{isWithinCurrentDayWindow(new Date().toISOString(), captureWindow.startTime, captureWindow.endTime) ? '01' : '00'}</strong>
            </div>
            <div className="stat-card">
              <span>OCR</span>
              <strong>00</strong>
            </div>
            <div className="stat-card">
              <span>Errores</span>
              <strong>00</strong>
            </div>
          </div>

          <div className="list-card">
            <div className="list-header">
              <span>Últimos eventos</span>
              <span>Hoy</span>
            </div>
            <ul>
              <li><span>Rango activo</span><strong>{captureWindow.startTime} - {captureWindow.endTime}</strong></li>
              <li><span>Histórico</span><strong>Ignorado</strong></li>
              <li><span>Captura</span><strong>Solo actual</strong></li>
            </ul>
          </div>
        </section>
      </div>

      <style jsx>{`
        :global(body) {
          margin: 0;
          font-family: Inter, 'Segoe UI', sans-serif;
          background:
            radial-gradient(circle at top, rgba(59,130,246,0.12), transparent 32%),
            #f4f7fb;
          color: #0f172a;
        }

        * { box-sizing: border-box; }

        .shell {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 32px 20px;
        }

        .layout {
          width: min(1180px, 100%);
          display: grid;
          grid-template-columns: 520px 1fr;
          gap: 26px;
        }

        .panel {
          background: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(148, 163, 184, 0.18);
          border-radius: 28px;
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.06);
          backdrop-filter: blur(10px);
        }

        .config-panel {
          padding: 30px;
        }

        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 26px;
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
          font-size: clamp(1.5rem, 2vw, 2rem);
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 700;
        }

        .status-pill.success {
          background: #dcfce7;
          color: #166534;
        }

        .qr-block {
          display: flex;
          justify-content: center;
          margin-bottom: 22px;
        }

        .qr-frame {
          width: 220px;
          height: 220px;
          padding: 18px;
          border-radius: 22px;
          background: linear-gradient(135deg, #f8fafc, #e2e8f0);
          border: 1px solid rgba(148, 163, 184, 0.28);
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 6px;
        }

        .qr-cell {
          border-radius: 7px;
          display: block;
        }

        .qr-cell.dark { background: #0f172a; }
        .qr-cell.light { background: rgba(148,163,184,0.15); }

        .field-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 18px;
        }

        label {
          font-size: 0.82rem;
          font-weight: 700;
          color: #475569;
        }

        input {
          width: 100%;
          border: 1px solid rgba(148, 163, 184, 0.4);
          border-radius: 14px;
          background: rgba(248,250,252,0.9);
          padding: 14px 16px;
          font-size: 0.98rem;
          color: #0f172a;
          outline: none;
        }

        .window-block {
          border: 1px solid rgba(148, 163, 184, 0.28);
          border-radius: 18px;
          background: rgba(248, 250, 252, 0.9);
          padding: 16px;
          margin-bottom: 18px;
        }

        .window-label-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          margin-bottom: 12px;
          font-size: 0.78rem;
          color: #475569;
          font-weight: 700;
        }

        .window-label-row strong {
          color: #0f172a;
          font-size: 0.75rem;
        }

        .time-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(120px, 1fr));
          gap: 12px;
        }

        .time-grid label {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .window-note {
          margin: 12px 0 0;
          color: #475569;
          line-height: 1.5;
          font-size: 0.76rem;
        }

        .field-row {
          display: flex;
          gap: 12px;
          margin-top: 18px;
        }

        button,
        .secondary {
          flex: 1;
          border: none;
          border-radius: 14px;
          padding: 14px 16px;
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s ease;
        }

        button:hover,
        .secondary:hover {
          transform: translateY(-1px);
        }

        .primary {
          background: linear-gradient(135deg, #0f172a, #1e293b);
          color: white;
        }

        .secondary {
          background: #e2e8f0;
          color: #0f172a;
        }

        .info-panel {
          padding: 28px;
        }

        .info-header {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 22px;
        }

        .metric {
          background: #eff6ff;
          color: #1d4ed8;
          border-radius: 999px;
          padding: 9px 12px;
          font-weight: 700;
          font-size: 0.78rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(140px, 1fr));
          gap: 16px;
          margin-bottom: 22px;
        }

        .stat-card {
          background: linear-gradient(135deg, #f8fafc, #eff6ff);
          border: 1px solid rgba(148,163,184,0.2);
          border-radius: 18px;
          padding: 18px 16px;
        }

        .stat-card span {
          display: block;
          margin-bottom: 8px;
          color: #64748b;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .stat-card strong {
          font-size: clamp(1.8rem, 2vw, 2.4rem);
        }

        .list-card {
          background: white;
          border-radius: 20px;
          border: 1px solid rgba(148,163,184,0.2);
          padding: 18px 18px 8px;
        }

        .list-header {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          color: #64748b;
          font-size: 0.8rem;
          margin-bottom: 12px;
          font-weight: 700;
        }

        ul {
          list-style: none;
          margin: 0;
          padding: 0;
        }

        li {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 0;
          border-top: 1px solid rgba(148,163,184,0.2);
          color: #0f172a;
        }

        li span {
          color: #475569;
        }

        @media (max-width: 900px) {
          .layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
