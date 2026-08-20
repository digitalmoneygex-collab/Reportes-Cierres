'use client';

const fmtBs = (v: number) =>
  new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES', maximumFractionDigits: 2 }).format(v ?? 0);

// ─── Types ────────────────────────────────────────────────
type ComboItem = { nombre: string; cantidad: number; piezas: number; talla?: number };
type RepoItem  = { nombre: string; cantidad: number };

interface PskloudData {
  ok: boolean;
  corteCaja: { totalBs: number; totalUsd: number; tasa: number };
  burguer: {
    hambPollo: number | null; hambCarne: number | null; hambMixta: number | null;
    totalHambSueltas: number; combosBurger: ComboItem[];
    totalPiezasComboBurger: number; totalPanesHamb: number;
    perroSuelto: number | null; combosPerro: ComboItem[];
    totalPanesPerro: number; patacon: number | null;
  };
  pasteles: {
    sueltos: { molida: number|null; papaqueso: number|null; pizza: number|null; queso: number|null; empanada: number|null };
    totalSueltos: number; combos6: ComboItem[]; totalCombos6Piezas: number;
    combos12: ComboItem[]; totalCombos12Piezas: number; totalPiezas: number;
  };
  tequeños: {
    sueltos: number | null; combos6: ComboItem[]; totalCombos6Piezas: number;
    combos12: ComboItem[]; totalCombos12Piezas: number;
    pasapalos: { cantidad: number; piezas: number } | null; totalPiezas: number;
  };
  reposteria: { items: RepoItem[]; total: number };
}

// ─── Sub-components ───────────────────────────────────────
function SVal({ v, suffix = '' }: { v: number | null; suffix?: string }) {
  if (v === null || v === 0) return (
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

  if (!data || !data.ok) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '32px', color: '#475569' }}>
        <div style={{ fontSize: '28px', marginBottom: '8px' }}>⚠️</div>
        <p style={{ fontWeight: '600' }}>Sin conexión a PSKLOUD</p>
        <p style={{ fontSize: '12px', marginTop: '4px', color: '#2d3748' }}>Verifica que el servidor MySQL esté activo</p>
      </div>
    );
  }

  const { corteCaja, burguer, pasteles, tequeños, reposteria } = data;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>

      {/* ── Ventas Sistema ── */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #0c1428 0%, #0d1830 100%)', border: '1px solid rgba(99,102,241,0.22)', boxShadow: '0 0 32px rgba(99,102,241,0.07)' }}>
        <SectionTitle icon="🏪">Ventas Sistema</SectionTitle>
        <p style={{ fontSize: '28px', fontWeight: '900', color: '#818cf8', letterSpacing: '-0.05em', lineHeight: 1.1, marginBottom: '4px' }}>
          {fmtBs(corteCaja.totalBs)}
        </p>
        {corteCaja.tasa > 0 && (
          <p style={{ fontSize: '13px', color: '#34d399', fontWeight: '700', marginBottom: '12px' }}>
            ≈ $ {corteCaja.totalUsd.toFixed(2)} USD
          </p>
        )}
        <Divider />
        <Row label="Tasa BCV" value={`Bs. ${corteCaja.tasa.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} color="#fbbf24" bold />
        <Row label="Fuente" value="Corte de Caja" color="#2d3748" />
      </div>

      {/* ── Burguer ── */}
      <div className="card">
        <SectionTitle icon="🍔">Burguer</SectionTitle>

        <SectionTitle icon="">Hamburguesas</SectionTitle>
        <Row label="H. Pollo"    value={<SVal v={burguer.hambPollo} />}  color="#fbbf24" />
        <Row label="H. Carne"   value={<SVal v={burguer.hambCarne} />}  color="#fbbf24" />
        <Row label="H. Mixta"   value={<SVal v={burguer.hambMixta} />}  color="#fbbf24" />
        {burguer.combosBurger.length > 0 && (
          <>
            <Divider />
            <SectionTitle icon="">Combos Hamburguesa</SectionTitle>
            {burguer.combosBurger.map((c, i) => (
              <Row key={i} label={c.nombre} value={`${c.cantidad} u × ${c.talla} = ${c.piezas}`} color="#f59e0b" />
            ))}
          </>
        )}
        <Row label="Total hamburguesas" value={burguer.totalHambSueltas + burguer.totalPiezasComboBurger || <SVal v={null} />} color="#fbbf24" isTotal bold />
        <Row label="🍞 Panes hamburguesa" value={burguer.totalPanesHamb || <SVal v={null} />} color="#f59e0b" bold />

        <Divider />
        <SectionTitle icon="">Perros Calientes</SectionTitle>
        <Row label="Perro Caliente" value={<SVal v={burguer.perroSuelto} />} color="#fb923c" />
        {burguer.combosPerro.map((c, i) => (
          <Row key={i} label={c.nombre} value={`${c.cantidad} u × ${c.talla} = ${c.piezas}`} color="#fb923c" />
        ))}
        <Row label="🍞 Panes perro" value={burguer.totalPanesPerro || <SVal v={null} />} color="#fb923c" isTotal bold />

        {burguer.patacon !== null && burguer.patacon > 0 && (
          <>
            <Divider />
            <Row label="🫓 Patacón" value={burguer.patacon} color="#a78bfa" bold />
          </>
        )}
      </div>

      {/* ── Pasteles & Tequeños ── */}
      <div className="card">
        <SectionTitle icon="🥐">Pasteles</SectionTitle>

        <Row label="Molida"    value={<SVal v={pasteles.sueltos.molida} />}    color="#34d399" />
        <Row label="Papaqueso" value={<SVal v={pasteles.sueltos.papaqueso} />} color="#34d399" />
        <Row label="Pizza"     value={<SVal v={pasteles.sueltos.pizza} />}     color="#34d399" />
        <Row label="Queso"     value={<SVal v={pasteles.sueltos.queso} />}     color="#34d399" />
        {pasteles.sueltos.empanada !== null && pasteles.sueltos.empanada > 0 && (
          <Row label="Empanada" value={pasteles.sueltos.empanada} color="#34d399" />
        )}
        <Row label="Subtotal sueltos" value={pasteles.totalSueltos || <SVal v={null} />} color="#34d399" isTotal />

        {pasteles.combos6.length > 0 && (
          <>
            <Divider />
            <SectionTitle icon="">Combos ×6 piezas</SectionTitle>
            {pasteles.combos6.map((c, i) => (
              <Row key={i} label={c.nombre} value={`${c.cantidad} × 6 = ${c.piezas}`} color="#6ee7b7" />
            ))}
            <Row label="Piezas combo ×6" value={pasteles.totalCombos6Piezas} color="#6ee7b7" isTotal />
          </>
        )}

        {pasteles.combos12.length > 0 && (
          <>
            <Divider />
            <SectionTitle icon="">Combos ×12 piezas</SectionTitle>
            {pasteles.combos12.map((c, i) => (
              <Row key={i} label={c.nombre} value={`${c.cantidad} × 12 = ${c.piezas}`} color="#a7f3d0" />
            ))}
            <Row label="Piezas combo ×12" value={pasteles.totalCombos12Piezas} color="#a7f3d0" isTotal />
          </>
        )}

        <Row label="🥐 Total piezas pasteles" value={pasteles.totalPiezas || <SVal v={null} />} color="#34d399" isTotal bold />

        <Divider />
        <SectionTitle icon="🧀">Tequeños</SectionTitle>

        <Row label="Tequeño suelto" value={<SVal v={tequeños.sueltos} />} color="#22d3ee" />
        {tequeños.combos6.map((c, i) => (
          <Row key={i} label={c.nombre} value={`${c.cantidad} × 6 = ${c.piezas}`} color="#67e8f9" />
        ))}
        {tequeños.combos12.map((c, i) => (
          <Row key={i} label={c.nombre} value={`${c.cantidad} × 12 = ${c.piezas}`} color="#a5f3fc" />
        ))}
        {tequeños.pasapalos && (
          <Row label="Pasapalos 25und" value={`${tequeños.pasapalos.cantidad} × 25 = ${tequeños.pasapalos.piezas}`} color="#7dd3fc" />
        )}
        <Row label="🧀 Total piezas tequeños" value={tequeños.totalPiezas || <SVal v={null} />} color="#22d3ee" isTotal bold />
      </div>

      {/* ── Repostería ── */}
      <div className="card">
        <SectionTitle icon="🎂">Repostería</SectionTitle>
        {reposteria.items.length === 0 ? (
          <p style={{ fontSize: '12px', color: '#2d3748', fontStyle: 'italic', marginTop: '8px' }}>Sin ventas hoy</p>
        ) : (
          <>
            {reposteria.items.map((item, i) => (
              <Row key={i} label={item.nombre} value={item.cantidad} color="#c084fc" />
            ))}
            <Row label="🎂 Total" value={reposteria.total} color="#c084fc" isTotal bold />
          </>
        )}
      </div>
    </div>
  );
}
