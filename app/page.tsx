'use client';

import Link from 'next/link';

const qrPattern = Array.from({ length: 25 }, (_, i) => i);

export default function HomePage() {
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
            <span className="metric">128 hoy</span>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <span>Pagos</span>
              <strong>84</strong>
            </div>
            <div className="stat-card">
              <span>OCR</span>
              <strong>37</strong>
            </div>
            <div className="stat-card">
              <span>Errores</span>
              <strong>02</strong>
            </div>
          </div>

          <div className="list-card">
            <div className="list-header">
              <span>Últimos eventos</span>
              <span>Hace 2 min</span>
            </div>
            <ul>
              <li><span>Banco de Bogotá</span><strong>Capture recibido</strong></li>
              <li><span>Daviplata</span><strong>Referencia validada</strong></li>
              <li><span>Nequi</span><strong>Origen verificado</strong></li>
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
