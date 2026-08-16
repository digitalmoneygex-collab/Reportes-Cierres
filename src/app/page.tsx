import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="landing-shell">
      <div className="hero-card">
        <p className="kicker">Sistema de pagos</p>
        <h1>Reportes de Cierres</h1>
        <p className="subtitle">
          Sistema de pagos por WhatsApp, OCR y cierres diarios.
        </p>

        <div className="actions">
          <Link href="/configuracion" className="primary">Configuración</Link>
          <Link href="/dashboard" className="secondary">Dashboard</Link>
        </div>

        <ul className="mini-list">
          <li>Health: /api/health</li>
          <li>Webhook: /api/webhooks/whatsapp</li>
        </ul>
      </div>

      <style jsx>{`
        :global(body) {
          margin: 0;
          background: linear-gradient(135deg, #fff1f3 0%, #eef7ff 100%);
          color: #0f172a;
          font-family: Arial, Helvetica, sans-serif;
        }

        .landing-shell {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 32px;
        }

        .hero-card {
          width: min(760px, 100%);
          background: rgba(255,255,255,0.78);
          border: 1px solid rgba(15,23,42,0.08);
          border-radius: 28px;
          box-shadow: 0 25px 70px rgba(15, 23, 42, 0.08);
          padding: 38px;
        }

        .kicker {
          margin: 0 0 10px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: #2563eb;
          font-size: 12px;
          font-weight: 700;
        }

        h1 {
          margin: 0;
          font-size: clamp(2.2rem, 5vw, 4rem);
          line-height: 1.1;
        }

        .subtitle {
          font-size: 1.07rem;
          color: #475569;
          margin: 16px 0 28px;
        }

        .actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 22px;
        }

        .actions a {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 160px;
          padding: 12px 18px;
          border-radius: 12px;
          text-decoration: none;
          font-weight: 700;
        }

        .primary {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
        }

        .secondary {
          background: white;
          color: #0f172a;
          border: 1px solid rgba(148,163,184,0.6);
        }

        .mini-list {
          margin: 0;
          padding-left: 20px;
          color: #334155;
          line-height: 1.9;
        }
      `}</style>
    </main>
  );
}
