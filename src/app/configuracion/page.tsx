'use client';

import { useState } from 'react';

export default function ConfiguracionPage() {
  const [status, setStatus] = useState<string>('Sin verificar');
  const [loading, setLoading] = useState(false);
  const [stressResult, setStressResult] = useState<string>('');

  const checkSupabase = async () => {
    setLoading(true);
    setStatus('Verificando Supabase...');

    try {
      const res = await fetch('/api/supabase/status');
      const data = await res.json();
      setStatus(data.ok ? `Conectado: ${data.url} / ${data.table}` : `Error: ${data.reason}`);
    } catch (error: any) {
      setStatus(`Error de conexión: ${error?.message || 'No se pudo consultar Supabase'}`);
    } finally {
      setLoading(false);
    }
  };

  const runStressTest = async () => {
    setLoading(true);
    setStressResult('Insertando filas de prueba...');

    try {
      const res = await fetch('/api/supabase/stress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ total: 25 }),
      });
      const data = await res.json();
      setStressResult(
        data.ok ? `OK: ${data.inserted} filas insertadas en Supabase` : `Error: ${data.reason}`
      );
    } catch (error: any) {
      setStressResult(`Fallo: ${error?.message || 'No se pudo ejecutar la prueba'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-shell">
      <div className="panel">
        <div className="topbar">
          <span className="badge">WhatsApp</span>
          <h1>Configuración de conectividad</h1>
        </div>

        <div className="grid">
          <section className="card">
            <h2>Número maestro A</h2>
            <p>Este es el número principal conectado a Evolution API.</p>

            <label>
              Estado de conexión
              <input value={status} readOnly />
            </label>

            <label>
              URL de la API
              <input value="http://127.0.0.1:8081" readOnly />
            </label>

            <label>
              API Key
              <input value="9f4b61d9-1e2a-4b9d-8a6a-5f8dd6f7f5c1" readOnly />
            </label>

            <button onClick={checkSupabase} disabled={loading}>Conectar a Supabase</button>
          </section>

          <section className="card">
            <h2>Número esclavo B</h2>
            <p>Este será el destino donde llegan las imágenes de comprobantes.</p>

            <label>
              Número destino
              <input placeholder="Ej: 584141234567" />
            </label>

            <label>
              Alias / nombre
              <input placeholder="Pagos - comprobantes" />
            </label>

            <label>
              Webhook endpoint
              <input value="http://localhost:3000/api/webhooks/whatsapp" readOnly />
            </label>

            <button className="secondary" onClick={runStressTest} disabled={loading}>Prueba de estrés Supabase</button>
            <div className="result-box">{stressResult || 'Sin pruebas ejecutadas aún.'}</div>
          </section>
        </div>
      </div>

      <style jsx>{`
        :global(body) {
          margin: 0;
          background: linear-gradient(135deg, #fff0f5 0%, #eef9ff 100%);
          color: #0f172a;
          font-family: Arial, Helvetica, sans-serif;
        }

        .page-shell {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
        }

        .panel {
          width: min(1100px, 100%);
          background: rgba(255,255,255,0.8);
          border: 1px solid rgba(15,23,42,0.08);
          border-radius: 24px;
          box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08);
          padding: 28px;
          backdrop-filter: blur(8px);
        }

        .topbar {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }

        .badge {
          background: #10b981;
          color: white;
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        h1 {
          margin: 0;
          font-size: clamp(2rem, 3vw, 2.8rem);
        }

        h2 {
          margin-top: 0;
          margin-bottom: 12px;
          font-size: 1.25rem;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 20px;
        }

        .card {
          background: white;
          border-radius: 18px;
          border: 1px solid rgba(148,163,184,0.3);
          padding: 22px;
        }

        .card p {
          color: #475569;
          margin-bottom: 18px;
          line-height: 1.5;
        }

        label {
          display: block;
          margin-bottom: 16px;
          font-weight: 600;
          color: #1e293b;
        }

        input {
          width: 100%;
          margin-top: 8px;
          border: 1px solid #cbd5e1;
          background: #f8fafc;
          border-radius: 12px;
          padding: 12px 14px;
          font-size: 14px;
          color: #0f172a;
        }

        button {
          width: 100%;
          border: none;
          border-radius: 12px;
          padding: 12px 16px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          font-weight: 700;
          font-size: 15px;
          cursor: pointer;
          margin-top: 8px;
        }

        button:disabled {
          opacity: 0.7;
          cursor: wait;
        }

        button.secondary {
          background: linear-gradient(135deg, #14b8a6, #0f766e);
        }

        .result-box {
          margin-top: 14px;
          padding: 12px 14px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 12px;
          color: #1d4ed8;
          font-size: 14px;
        }
      `}</style>
    </main>
  );
}
