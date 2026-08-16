'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

const DEFAULT_CAPTURE_WINDOW = { startTime: '06:00', endTime: '00:00' };

type CaptureWindow = {
  startTime: string;
  endTime: string;
};

function timeToMinutes(time: string) {
  if (!time) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  const total = (hours || 0) * 60 + (minutes || 0);
  return time === '00:00' ? 24 * 60 : total;
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

const now = new Date();
const todayIso = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 15).toISOString();
const yesterdayIso = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 7, 40).toISOString();
const earlierIso = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 19, 10).toISOString();

const payments = [
  {
    bank: 'Banco de Bogotá',
    date: '2026-08-16',
    time: '08:42:11',
    capture: 'CAP-1048',
    reference: 'REF-487190',
    identification: '1034567890',
    origin: 'Nequi',
    destination: 'Cuenta 0412',
    amount: 1250000,
    createdAt: todayIso,
  },
  {
    bank: 'Daviplata',
    date: '2026-08-16',
    time: '09:11:08',
    capture: 'CAP-1047',
    reference: 'REF-487187',
    identification: '1012345678',
    origin: 'Bancolombia',
    destination: 'Cuenta 0148',
    amount: 890000,
    createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 11, 8).toISOString(),
  },
  {
    bank: 'Nequi',
    date: '2026-08-15',
    time: '07:58:34',
    capture: 'CAP-1046',
    reference: 'REF-487150',
    identification: '1098765432',
    origin: 'Daviplata',
    destination: 'Cuenta 0922',
    amount: 2340000,
    createdAt: yesterdayIso,
  },
  {
    bank: 'Bancolombia',
    date: '2026-08-14',
    time: '07:22:19',
    capture: 'CAP-1045',
    reference: 'REF-487109',
    identification: '1023456789',
    origin: 'Banco de Bogotá',
    destination: 'Cuenta 0515',
    amount: 640000,
    createdAt: earlierIso,
  },
];

export default function DashboardPage() {
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

  const filteredPayments = useMemo(
    () => payments.filter((item) => isWithinCurrentDayWindow(item.createdAt, captureWindow.startTime, captureWindow.endTime)),
    [captureWindow]
  );

  const totalToday = filteredPayments.reduce((sum, item) => sum + item.amount, 0);

  return (
    <main className="shell">
      <div className="panel">
        <div className="header-row">
          <div>
            <p className="eyebrow">Pagos</p>
            <h1>Listado de captures</h1>
          </div>

          <div className="header-actions">
            <Link href="/configuracion" className="nav-link">Configuración QR</Link>
            <span className="badge">{filteredPayments.length} registros</span>
          </div>
        </div>

        <div className="control-row">
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

        <div className="summary-grid">
          <div className="summary-card">
            <span>Total del día</span>
            <strong>{new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES', maximumFractionDigits: 0 }).format(totalToday)}</strong>
          </div>
          <div className="summary-card">
            <span>Capturas</span>
            <strong>{filteredPayments.length}</strong>
          </div>
          <div className="summary-card">
            <span>Rango activo</span>
            <strong>{captureWindow.startTime} - {captureWindow.endTime}</strong>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Banco</th>
                <th>Fecha / Hora</th>
                <th>Capture</th>
                <th>Referencia</th>
                <th>Identificación</th>
                <th>Origen</th>
                <th>Destino</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-state">No hay captures dentro de este rango horario para el día actual.</td>
                </tr>
              ) : (
                filteredPayments.map((item) => (
                  <tr key={item.capture}>
                    <td>{item.bank}</td>
                    <td>
                      <div className="date-block">
                        <span>{item.date}</span>
                        <small>{item.time}</small>
                      </div>
                    </td>
                    <td>{item.capture}</td>
                    <td>{item.reference}</td>
                    <td>{item.identification}</td>
                    <td>{item.origin}</td>
                    <td>{item.destination}</td>
                    <td className="amount">{new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES', maximumFractionDigits: 0 }).format(item.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx>{`
        :global(body) {
          margin: 0;
          background: linear-gradient(180deg, #f8fafc 0%, #eef6ff 100%);
          color: #0f172a;
          font-family: Inter, 'Segoe UI', sans-serif;
        }

        * { box-sizing: border-box; }

        .shell {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
        }

        .panel {
          width: min(1380px, 100%);
          background: rgba(255,255,255,0.85);
          border: 1px solid rgba(148,163,184,0.2);
          border-radius: 28px;
          box-shadow: 0 28px 80px rgba(15, 23, 42, 0.06);
          padding: 26px 26px 18px;
          backdrop-filter: blur(10px);
        }

        .header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 18px;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .nav-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 9px 12px;
          border-radius: 10px;
          background: #eff6ff;
          border: 1px solid rgba(59,130,246,0.25);
          color: #1d4ed8;
          text-decoration: none;
          font-size: 0.8rem;
          font-weight: 700;
        }

        .eyebrow {
          margin: 0 0 8px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 11px;
          font-weight: 700;
          color: #2563eb;
        }

        h1 {
          margin: 0;
          font-size: clamp(2rem, 3vw, 2.8rem);
          letter-spacing: -0.05em;
        }

        .badge {
          background: #e0f2fe;
          color: #0369a1;
          border-radius: 999px;
          padding: 9px 12px;
          font-size: 12px;
          font-weight: 700;
        }

        .control-row {
          display: grid;
          grid-template-columns: repeat(2, minmax(180px, 1fr));
          gap: 16px;
          margin-bottom: 22px;
        }

        .control-row label {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 0.76rem;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .control-row input {
          width: 100%;
          border: 1px solid rgba(148,163,184,0.35);
          border-radius: 12px;
          background: #fff;
          padding: 12px 14px;
          font-size: 1rem;
          color: #0f172a;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(160px, 1fr));
          gap: 16px;
          margin-bottom: 22px;
        }

        .summary-card {
          background: linear-gradient(135deg, #f8fafc, #eef6ff);
          border: 1px solid rgba(148,163,184,0.15);
          border-radius: 18px;
          padding: 18px 16px;
        }

        .summary-card span {
          display: block;
          color: #64748b;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 8px;
        }

        .summary-card strong {
          font-size: clamp(0.9rem, 1.5vw, 1.3rem);
          line-height: 1.4;
        }

        .table-wrap {
          overflow-x: auto;
          border: 1px solid rgba(148,163,184,0.2);
          border-radius: 18px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1150px;
          background: white;
        }

        thead th {
          background: #f8fafc;
          color: #475569;
          font-size: 0.76rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          padding: 14px 12px;
          text-align: left;
        }

        tbody td {
          padding: 14px 12px;
          border-top: 1px solid rgba(148,163,184,0.18);
          vertical-align: middle;
        }

        .date-block {
          display: grid;
          gap: 4px;
        }

        .date-block small {
          color: #64748b;
        }

        .amount {
          font-weight: 700;
          color: #0f172a;
        }

        .empty-state {
          padding: 22px 12px;
          color: #475569;
          text-align: center;
          font-weight: 600;
        }
      `}</style>
    </main>
  );
}
