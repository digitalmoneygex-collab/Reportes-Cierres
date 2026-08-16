export default function DashboardPage() {
  return (
    <main className="shell">
      <div className="panel">
        <div className="header-row">
          <div>
            <p className="eyebrow">Resumen</p>
            <h1>Dashboard</h1>
          </div>
          <span className="status-pill">Activo</span>
        </div>

        <p className="subtitle">Panel central para cierres de caja y pagos por WhatsApp.</p>

        <div className="stats-grid">
          <div className="stat-box">
            <span className="label">Pagos recibidos</span>
            <strong>1,284</strong>
          </div>
          <div className="stat-box">
            <span className="label">Cierres del día</span>
            <strong>24</strong>
          </div>
          <div className="stat-box">
            <span className="label">OCR procesadas</span>
            <strong>986</strong>
          </div>
        </div>

        <div className="table-box">
          <h2>Últimos movimientos</h2>
          <ul>
            <li><span>08:42</span><strong>Pago recibido - Factura 1048</strong></li>
            <li><span>08:21</span><strong>Comprobante OCR validado</strong></li>
            <li><span>08:10</span><strong>Venta de cierre registrada</strong></li>
          </ul>
        </div>
      </div>

      <style jsx>{`
        :global(body) {
          margin: 0;
          background: #f8fafc;
          color: #0f172a;
          font-family: Arial, Helvetica, sans-serif;
        }

        .shell {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
        }

        .panel {
          width: min(980px, 100%);
          background: rgba(255,255,255,0.86);
          border: 1px solid rgba(15,23,42,0.08);
          border-radius: 24px;
          box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08);
          padding: 32px;
        }

        .header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 8px;
        }

        .eyebrow {
          margin: 0 0 8px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: #2563eb;
          font-size: 12px;
          font-weight: 700;
        }

        h1 {
          margin: 0;
          font-size: clamp(2rem, 3vw, 2.8rem);
        }

        .status-pill {
          background: #dcfce7;
          color: #166534;
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 700;
        }

        .subtitle {
          margin: 0 0 24px;
          color: #475569;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-box {
          background: linear-gradient(135deg, #eff6ff, #f8fafc);
          border: 1px solid rgba(148,163,184,0.4);
          border-radius: 18px;
          padding: 18px;
        }

        .label {
          display: block;
          color: #475569;
          font-size: 13px;
          margin-bottom: 10px;
        }

        .stat-box strong {
          font-size: clamp(1.8rem, 3vw, 2.4rem);
        }

        .table-box {
          background: #fff;
          border: 1px solid rgba(148,163,184,0.4);
          border-radius: 18px;
          padding: 18px 20px;
        }

        h2 {
          margin: 0 0 16px;
          font-size: 1.2rem;
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
          padding: 12px 0;
          border-bottom: 1px solid rgba(148,163,184,0.25);
        }

        li:last-child {
          border-bottom: none;
        }

        li span {
          color: #64748b;
        }
      `}</style>
    </main>
  );
}
