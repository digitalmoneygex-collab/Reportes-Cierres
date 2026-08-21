'use client';

const fmtBs = (v: number) =>
  new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES', maximumFractionDigits: 2 }).format(v ?? 0);

// ─── Types ────────────────────────────────────────────────
type ComboItem = { nombre: string; cantidad: number; piezas?: number; talla?: number };
type RepoItem  = { nombre: string; cantidad: number };

interface PskloudData {
  ok: boolean;
  corteCaja: {
    totalBs: number; totalBsUsd: number;               // Total Ingresos
    devolucionesEfBs: number; devolucionesEfUsd: number; // Devoluciones
    totalRecibidoBs: number; totalRecibidoUsd: number;  // TOTAL RECIBIDO
    tasa: number; totalUsd: number;
  };
  burguer: {
    combosHamb: ComboItem[];
    hambSueltas: ComboItem[];
    perros: ComboItem[];
    otros: ComboItem[];
    totalesInsumos: Record<string, number>;
  };
  pasteles: {
    pasapalos: ComboItem[];
    pequenos: ComboItem[];
    empanadas: ComboItem[];
    grandes: ComboItem[];
    otros: ComboItem[];
    totalesInsumos: Record<string, number>;
  };
  reposteria: { items: RepoItem[]; total: number };
  metodosPago?: { metodo: string; cantidad: number; totalBs: number }[];
}

const METODOS_PAGO_LABELS: Record<string, string> = {
  punto_venta: '💳 Punto de Venta',
  dolares_efectivo: '💵 Dólares Efectivo',
  bs_efectivo: '💴 Bs Efectivo',
  transferencia: '🏦 Transferencia',
  pago_movil: '📱 Pago Móvil',
  credito: '📋 Crédito',
  binance: '🟡 Binance',
  zelle: '💸 Zelle',
  bio_pago: '🔵 Bio Pago',
  devolucion: '↩️ Devolución',
};

// ─── Sub-components ───────────────────────────────────────
function SVal({ v, suffix = '' }: { v: number | null; suffix?: string }) {
  if (v === null || v === 0 || isNaN(v)) return (
    <span style={{ color: '#2d3748', fontStyle: 'italic', fontSize: '11px' }}>sin ventas</span>
  );
  return <span>{v}{suffix}</span>;
}

function Row({ label, value, color = '#94a3b8', bold = false, isTotal = false }: {
  label: string; value: React.ReactNode; color?: string; bold?: boolean; isTotal?: boolean;
}) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: isTotal ? '8px 0 4px' : '5px 0',
      borderTop: isTotal ? '1px solid rgba(148,163,184,0.12)' : undefined,
      marginTop: isTotal ? '4px' : undefined,
    }}>
      <span style={{ fontSize: '12px', color: isTotal ? '#94a3b8' : '#475569', fontWeight: isTotal ? '700' : '400' }}>
        {label}
      </span>
      <span style={{ fontSize: '12px', color, fontWeight: bold || isTotal ? '800' : '600', letterSpacing: '-0.02em' }}>
        {value}
      </span>
    </div>
  );
}

function SectionTitle({ children, icon }: { children: React.ReactNode; icon: string }) {
  return (
    <p style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
      <span>{icon}</span>{children}
    </p>
  );
}

function Divider() {
  return <div style={{ borderBottom: '1px dashed rgba(148,163,184,0.08)', margin: '8px 0' }} />;
}

// Helper to render lists
function renderList(title: string, items: ComboItem[], color: string, subtotalLabel: string) {
  if (!items || items.length === 0) return null;
  const subtotal = items.reduce((sum, item) => sum + (item.cantidad || 0), 0);
  
  return (
    <>
      <SectionTitle icon="">{title}</SectionTitle>
      {items.map((item, i) => {
        // Find if there's a multiplier in the name like "COMBO 10" or "6 PASTELES"
        // This is purely visual for the layout requested
        let displayValue = <SVal v={item.cantidad} />;
        if (item.cantidad > 0) {
           let match = item.nombre.match(/(\d+)/);
           let mult = match ? parseInt(match[1]) : 1;
           if (item.nombre.includes("25UND")) mult = 25;
           if (item.nombre.includes("50UND") || item.nombre.includes("X50")) mult = 50;
           if (item.nombre.includes("12")) mult = 12;
           if (item.nombre.includes("6 PASTELES") || item.nombre.includes("6 TEQUEÑOS")) mult = 6;
           
           if (mult > 1 && item.nombre.includes("COMBO") || item.nombre.includes("PASAPALOS") || item.nombre.includes("12")) {
              displayValue = <>{item.cantidad} × {mult} = {item.cantidad * mult}</>;
           }
        }
        return <Row key={i} label={item.nombre} value={displayValue} color={color} />;
      })}
      <Row label={subtotalLabel} value={subtotal > 0 ? subtotal : <SVal v={0} />} color={color} isTotal />
      <Divider />
    </>
  );
}

// ─── Main Panel ───────────────────────────────────────────
export default function PskloudPanel({ data, loading }: { data: PskloudData | null; loading: boolean }) {
  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card" style={{ minHeight: '180px' }}>
            <div className="skeleton" style={{ height: '14px', width: '60%', marginBottom: '12px', borderRadius: '4px' }} />
            <div className="skeleton" style={{ height: '32px', marginBottom: '8px', borderRadius: '4px' }} />
            <div className="skeleton" style={{ height: '12px', width: '80%', borderRadius: '4px' }} />
          </div>
        ))}
      </div>
    );
  }

  if (!data || !data.ok || !data.burguer || !data.pasteles) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '32px', color: '#475569' }}>
        <div style={{ fontSize: '28px', marginBottom: '8px' }}>⚠️</div>
        <p style={{ fontWeight: '600' }}>Sin conexión a PSKLOUD o Formato Incorrecto</p>
        <p style={{ fontSize: '12px', marginTop: '4px', color: '#2d3748' }}>Verifica que el script sync-pskloud.js se haya actualizado y ejecutado.</p>
      </div>
    );
  }

  const { corteCaja, burguer, pasteles, reposteria, metodosPago } = data;

  const burguerInsumosKeys = ["PAN BURGUER", "PAN PERRO", "SALCHICHA", "CARNE H", "POLLO", "CARNE M", "TAPA P", "AREPA C", "HUEVO", "BEBIDA", "PAPAS FRITAS 150GR"];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>

      {/* ── Ventas Sistema ── */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #0c1428 0%, #0d1830 100%)', border: '1px solid rgba(99,102,241,0.22)', boxShadow: '0 0 32px rgba(99,102,241,0.07)' }}>
        <SectionTitle icon="🏪">Ventas Sistema</SectionTitle>

        {/* Número grande: TOTAL RECIBIDO */}
        <p style={{ fontSize: '28px', fontWeight: '900', color: '#818cf8', letterSpacing: '-0.05em', lineHeight: 1.1, marginBottom: '2px' }}>
          {fmtBs(corteCaja?.totalRecibidoBs ?? corteCaja?.totalBs)}
        </p>
        {corteCaja?.tasa > 0 && (
          <p style={{ fontSize: '13px', color: '#34d399', fontWeight: '700', marginBottom: '12px' }}>
            ≈ $ {(corteCaja.totalRecibidoUsd ?? corteCaja.totalUsd).toFixed(2)} USD
          </p>
        )}

        <Divider />

        {/* Total Ingresos */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}>
          <span style={{ fontSize: '12px', color: '#475569' }}>Total Ingresos</span>
          <span style={{ textAlign: 'right' }}>
            <span style={{ display: 'block', fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>{fmtBs(corteCaja?.totalBs)}</span>
            {corteCaja?.tasa > 0 && (
              <span style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>$ {(corteCaja.totalBsUsd ?? 0).toFixed(2)} USD</span>
            )}
          </span>
        </div>

        {/* Devoluciones — solo si hay */}
        {(corteCaja?.devolucionesEfBs ?? 0) > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}>
            <span style={{ fontSize: '12px', color: '#f87171', fontWeight: '700' }}>Devoluciones (-)</span>
            <span style={{ textAlign: 'right' }}>
              <span style={{ display: 'block', fontSize: '12px', color: '#f87171', fontWeight: '700' }}>- {fmtBs(corteCaja.devolucionesEfBs)}</span>
              {corteCaja?.tasa > 0 && (
                <span style={{ display: 'block', fontSize: '11px', color: '#fca5a5' }}>- $ {(corteCaja.devolucionesEfUsd ?? 0).toFixed(2)} USD</span>
              )}
            </span>
          </div>
        )}

        {/* TOTAL RECIBIDO */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0 4px', borderTop: '1px solid rgba(148,163,184,0.15)', marginTop: '4px' }}>
          <span style={{ fontSize: '12px', color: '#818cf8', fontWeight: '800' }}>TOTAL RECIBIDO</span>
          <span style={{ textAlign: 'right' }}>
            <span style={{ display: 'block', fontSize: '12px', color: '#818cf8', fontWeight: '800' }}>{fmtBs(corteCaja?.totalRecibidoBs ?? corteCaja?.totalBs)}</span>
            {corteCaja?.tasa > 0 && (
              <span style={{ display: 'block', fontSize: '11px', color: '#a5b4fc' }}>$ {(corteCaja.totalRecibidoUsd ?? corteCaja.totalUsd).toFixed(2)} USD</span>
            )}
          </span>
        </div>

        <Divider />
        <Row label="Tasa BCV" value={`Bs. ${corteCaja?.tasa?.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 0}`} color="#fbbf24" bold />

        {/* ── Métodos de Pago ── */}
        {metodosPago && metodosPago.length > 0 && (
          <div style={{ marginTop: '16px', background: 'rgba(99,102,241,0.05)', borderRadius: '8px', padding: '12px', border: '1px solid rgba(99,102,241,0.1)' }}>
            <SectionTitle icon="💰">Desglose por Pago</SectionTitle>
            <Divider />
            {metodosPago.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  {METODOS_PAGO_LABELS[m.metodo] || m.metodo} <span style={{ color: '#475569', fontSize: '10px' }}>({m.cantidad})</span>
                </span>
                <span style={{ textAlign: 'right' }}>
                  <span style={{ display: 'block', fontSize: '12px', color: '#e8edf5', fontWeight: '600' }}>
                    {fmtBs(m.totalBs)}
                  </span>
                  {corteCaja?.tasa > 0 && (
                    <span style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>
                      $ {(m.totalBs / corteCaja.tasa).toFixed(2)} USD
                    </span>
                  )}
                </span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0 4px', borderTop: '1px solid rgba(148,163,184,0.15)', marginTop: '6px' }}>
              <span style={{ fontSize: '11px', color: '#818cf8', fontWeight: '800' }}>VENTAS TOTALES</span>
              <span style={{ textAlign: 'right' }}>
                <span style={{ display: 'block', fontSize: '13px', color: '#818cf8', fontWeight: '800' }}>
                  {fmtBs(metodosPago.reduce((acc, curr) => acc + curr.totalBs, 0))}
                </span>
                {corteCaja?.tasa > 0 && (
                  <span style={{ display: 'block', fontSize: '11px', color: '#a5b4fc' }}>
                    $ {(metodosPago.reduce((acc, curr) => acc + curr.totalBs, 0) / corteCaja.tasa).toFixed(2)} USD
                  </span>
                )}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Burguer ── */}
      <div className="card">
        <SectionTitle icon="🍔">Burguer</SectionTitle>
        <Divider />
        
        {renderList("Combos Hamburguesa", burguer.combosHamb, "#f59e0b", "SUBTOTAL (Hamburguesas de carne en combo)")}
        {renderList("Hamburguesas por unidad", burguer.hambSueltas, "#fbbf24", "SUBTOTAL (Hamburguesas por unidad)")}
        {renderList("Perros Calientes", burguer.perros, "#fb923c", "SUBTOTAL (Perro Caliente)")}
        {renderList("Otros", burguer.otros, "#a78bfa", "SUBTOTAL (Otros)")}

        <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
          <SectionTitle icon="📊">TOTALES INSUMOS BURGUER</SectionTitle>
          {burguerInsumosKeys.map(k => {
             // Find matching key case insensitive
             const matchKey = Object.keys(burguer.totalesInsumos || {}).find(tk => tk.toUpperCase() === k);
             const val = matchKey ? burguer.totalesInsumos[matchKey] : 0;
             return <Row key={k} label={k} value={<SVal v={val} />} color="#fcd34d" bold={val > 0} />;
          })}
        </div>
      </div>

      {/* ── Pasteles ── */}
      <div className="card">
        <SectionTitle icon="🥐">Pasteles & Pasapalos</SectionTitle>
        <Divider />

        {renderList("Pasapalos de fiesta", pasteles.pasapalos, "#34d399", "SUBTOTAL (Pasapalos)")}
        {renderList("Pasteles Pequeños", pasteles.pequenos, "#6ee7b7", "SUBTOTAL (Pasteles Pequeños)")}
        {renderList("Empanadas", pasteles.empanadas, "#a7f3d0", "SUBTOTAL (Empanadas)")}
        {renderList("Pastel Grande por pieza", pasteles.grandes, "#10b981", "SUBTOTAL (Pastel Grande)")}
        {renderList("Otros", pasteles.otros, "#059669", "SUBTOTAL (Otros)")}

        <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <SectionTitle icon="📊">TOTALES INSUMOS PASTELES</SectionTitle>
          {["Pieza F", "Pieza P", "Pieza G", "Bebida"].map(k => {
             const matchKey = Object.keys(pasteles.totalesInsumos || {}).find(tk => tk.toUpperCase() === k.toUpperCase());
             const val = matchKey ? pasteles.totalesInsumos[matchKey] : 0;
             return <Row key={k} label={k.toUpperCase()} value={<SVal v={val} />} color="#6ee7b7" bold={val > 0} />;
          })}
        </div>
      </div>

      {/* ── Repostería ── */}
      <div className="card">
        <SectionTitle icon="🎂">Repostería</SectionTitle>
        <Divider />
        {(() => {
          const defaultItems = ['NESCAFE+MILHOJA', 'BRAZO GITANO', 'BOMBA', 'MILHOJAS RELLENA'];
          const items = [...(reposteria?.items || [])];
          
          defaultItems.forEach(def => {
            if (!items.some(i => i.nombre === def)) {
              items.push({ nombre: def, cantidad: 0 });
            }
          });
          
          return (
            <>
              {items.map((item, i) => (
                <Row 
                  key={i} 
                  label={item.nombre} 
                  value={<SVal v={item.cantidad} />} 
                  color="#c084fc" 
                />
              ))}
              <Row label="🎂 Total" value={reposteria?.total || <SVal v={0} />} color="#c084fc" isTotal bold />
            </>
          );
        })()}
      </div>
    </div>
  );
}
