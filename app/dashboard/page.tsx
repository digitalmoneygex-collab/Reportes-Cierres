'use client';

const payments = [
  {
    bank: 'Banco de Bogotá',
    date: '2026-08-15',
    time: '08:42:11',
    capture: 'CAP-1048',
    reference: 'REF-487190',
    identification: '1034567890',
    origin: 'Nequi',
    destination: 'Cuenta 0412',
    amount: '$1.250.000',
  },
  {
    bank: 'Daviplata',
    date: '2026-08-15',
    time: '08:11:08',
    capture: 'CAP-1047',
    reference: 'REF-487187',
    identification: '1012345678',
    origin: 'Bancolombia',
    destination: 'Cuenta 0148',
    amount: '$890.000',
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
    amount: '$2.340.000',
  },
  {
    bank: 'Bancolombia',
    date: '2026-08-15',
    time: '07:22:19',
    capture: 'CAP-1045',
    reference: 'REF-487109',
    identification: '1023456789',
    origin: 'Banco de Bogotá',
    destination: 'Cuenta 0515',
    amount: '$640.000',
  },
];

export default function DashboardPage() {
  return (
    <main className="shell">
      <div className="panel">
        <div className="header-row">
          <div>
            <p className="eyebrow">Pagos</p>
            <h1>Listado de captures</h1>
          </div>
          <span className="badge">4 registros</span>
        </div>

        <div className="summary-grid">
          <div className="summary-card">
            <span>Total del día</span>
            <strong>$5.120.000</strong>
          </div>
          <div className="summary-card">
            <span>Capturas</span>
            <strong>128</strong>
          </div>
          <div className="summary-card">
            <span>Confirmadas</span>
            <strong>116</strong>
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
              {payments.map((item) => (
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
                  <td className="amount">{item.amount}</td>
                </tr>
              ))}
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
          margin-bottom: 24px;
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
          font-size: clamp(1.5rem, 2vw, 2.2rem);
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
          border-bottom: 1px solid rgba(148,163,184,0.2);
        }

        tbody td {
          padding: 16px 12px;
          border-bottom: 1px solid rgba(148,163,184,0.15);
          font-size: 0.92rem;
          vertical-align: middle;
        }

        tbody tr:hover {
          background: rgba(239,246,255,0.7);
        }

        .date-block {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .date-block small {
          color: #64748b;
          font-size: 0.75rem;
        }

        .amount {
          color: #059669;
          font-weight: 800;
        }
      `}</style>
    </main>
  );
}
