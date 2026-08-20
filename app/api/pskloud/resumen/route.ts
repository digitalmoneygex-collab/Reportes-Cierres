import { NextResponse } from 'next/server';
import { getPskloudPool } from '@/lib/pskloud';
import { getTasaDelDia } from '@/lib/tasa';
import type { RowDataPacket } from 'mysql2';

interface ArticuloRow extends RowDataPacket {
  grupo:    string;
  codigo:   string;
  nombre:   string;
  cantidad: number;
}

interface TotalRow extends RowDataPacket {
  total: number;
}

// ─── helpers ─────────────────────────────────────────────
const n = (s: string) => s.trim().toUpperCase();

function qty(rows: ArticuloRow[], fn: (r: ArticuloRow) => boolean): number {
  return rows.filter(fn).reduce((s, r) => s + (r.cantidad ?? 0), 0);
}

function nv(v: number): number | null {
  return v > 0 ? v : null;
}

// Encuentra filas combo de 6 para pasteles (excluye tequeños, refrescos y combos de 12)
function esCombo6Pastel(nombre: string): boolean {
  const u = n(nombre);
  return (
    u.includes('COMBO') &&
    !u.includes('12') &&
    !u.includes('TEQUE') &&
    !u.includes('REFRESC')
  );
}

// Encuentra filas combo de 12 para pasteles
function esCombo12Pastel(nombre: string): boolean {
  const u = n(nombre);
  return (
    u.includes('12') &&
    (u.includes('PASTEL') || u.includes('BEBIDA')) &&
    !u.includes('TEQUE') &&
    !u.includes('REFRESC')
  );
}

// ─── GET handler ──────────────────────────────────────────
export async function GET() {
  try {
    const pool = getPskloudPool();

    // ── 1. Total recibido (corte de caja) ──────────────────
    const [[totalRow]] = await pool.query<TotalRow[]>(
      `SELECT COALESCE(SUM(monto), 0) AS total
       FROM operclit
       WHERE DATE(fecha) = CURDATE()
         AND tipodoc = 'FAC'`,
    );
    const totalBs: number = Number(totalRow?.total ?? 0);

    // ── 2. Tasa BCV ────────────────────────────────────────
    const tasa = await getTasaDelDia();
    const totalUsd = tasa > 0 ? totalBs / tasa : 0;

    // ── 3. Artículos del día (grupos 02, 03, 04) ───────────
    const [rows] = await pool.query<ArticuloRow[]>(
      `SELECT grupo, codigo, nombre, SUM(cantidad) AS cantidad
       FROM opermv
       WHERE DATE(fechadoc) = CURDATE()
         AND tipodoc = 'FAC'
         AND grupo IN ('02','03','04')
       GROUP BY grupo, codigo, nombre
       ORDER BY grupo, codigo, nombre`,
    );

    const g02 = rows.filter(r => r.grupo.trim() === '02');
    const g03 = rows.filter(r => r.grupo.trim() === '03');
    const g04 = rows.filter(r => r.grupo.trim() === '04');

    // ── BURGUER (03) ───────────────────────────────────────
    const hambPollo = nv(qty(g03, r => n(r.nombre) === 'HAMB. POLLO'));
    const hambCarne = nv(qty(g03, r => n(r.nombre) === 'HAMB. CARNE'));
    const hambMixta = nv(qty(g03, r => n(r.nombre) === 'HAMB. MIXTA'));
    const totalHambSueltas = (hambPollo ?? 0) + (hambCarne ?? 0) + (hambMixta ?? 0);

    // Combos burguer dinámicos: cualquier nombre con COMBO en grupo 03
    const combosBurgerRows = g03.filter(r => n(r.nombre).includes('COMBO'));
    const combosBurger = combosBurgerRows.map(r => ({
      nombre:   r.nombre.trim(),
      cantidad: r.cantidad,
      talla:    n(r.nombre).includes('12') ? 12 : 6,
      piezas:   r.cantidad * (n(r.nombre).includes('12') ? 12 : 6),
    }));
    const totalPiezasComboBurger = combosBurger.reduce((s, c) => s + c.piezas, 0);
    const totalPanesHamb = totalHambSueltas + totalPiezasComboBurger;

    const perroSuelto = nv(qty(g03, r => n(r.nombre) === 'PERRO CALIENTE'));
    const combosPerroRows = g03.filter(r => n(r.nombre).includes('COMBO') && n(r.nombre).includes('PERRO'));
    const combosPerro = combosPerroRows.map(r => ({
      nombre:   r.nombre.trim(),
      cantidad: r.cantidad,
      talla:    n(r.nombre).includes('12') ? 12 : 6,
      piezas:   r.cantidad * (n(r.nombre).includes('12') ? 12 : 6),
    }));
    const totalPanesPerro = (perroSuelto ?? 0) + combosPerro.reduce((s, c) => s + c.piezas, 0);

    // Patacón (si hay)
    const patacon = nv(qty(g03, r => n(r.nombre).startsWith('PATACON') && !n(r.nombre).includes('TAPA') && !n(r.nombre).includes('CARNE MECHADA') && !n(r.nombre).includes('HUEVO')));

    // ── PASTELES (02) ──────────────────────────────────────
    const pastelMolida    = nv(qty(g02, r => n(r.nombre) === 'PASTEL MOLIDA'));
    const pastelPapaqueso = nv(qty(g02, r => n(r.nombre) === 'PASTEL PAPAQUESO'));
    const pastelPizza     = nv(qty(g02, r => n(r.nombre) === 'PASTEL PIZZA'));
    const pastelQueso     = nv(qty(g02, r => n(r.nombre) === 'PASTEL QUESO'));
    const empanada        = nv(qty(g02, r => n(r.nombre).includes('EMPANADA')));
    const totalPastelesSueltos =
      (pastelMolida ?? 0) + (pastelPapaqueso ?? 0) +
      (pastelPizza ?? 0)  + (pastelQueso ?? 0);

    // Combos pasteles ×6
    const combo6PastelRows = g02.filter(r => esCombo6Pastel(r.nombre));
    const combos6Pastel = combo6PastelRows.map(r => ({
      nombre:   r.nombre.trim(),
      cantidad: r.cantidad,
      piezas:   r.cantidad * 6,
    }));
    const totalCombos6PastelPiezas = combos6Pastel.reduce((s, c) => s + c.piezas, 0);

    // Combos pasteles ×12
    const combo12PastelRows = g02.filter(r => esCombo12Pastel(r.nombre));
    const combos12Pastel = combo12PastelRows.map(r => ({
      nombre:   r.nombre.trim(),
      cantidad: r.cantidad,
      piezas:   r.cantidad * 12,
    }));
    const totalCombos12PastelPiezas = combos12Pastel.reduce((s, c) => s + c.piezas, 0);

    const totalPastelesPiezas = totalPastelesSueltos + totalCombos6PastelPiezas + totalCombos12PastelPiezas;

    // ── TEQUEÑOS ───────────────────────────────────────────
    const tequSuelto = nv(qty(g02, r => n(r.nombre) === 'TEQUEÑO'));

    const comboTQ6Rows  = g02.filter(r => n(r.nombre).includes('COMBO') && n(r.nombre).includes('TEQUE') && !n(r.nombre).includes('12'));
    const comboTQ12Rows = g02.filter(r => n(r.nombre).includes('12') && n(r.nombre).includes('TEQUE') && !n(r.nombre).includes('REFRESC') && !n(r.nombre).includes('PARA COMBO'));

    const combosTQ6  = comboTQ6Rows.map(r  => ({ nombre: r.nombre.trim(), cantidad: r.cantidad, piezas: r.cantidad * 6 }));
    const combosTQ12 = comboTQ12Rows.map(r => ({ nombre: r.nombre.trim(), cantidad: r.cantidad, piezas: r.cantidad * 12 }));

    const pasapalos25Qty    = qty(g02, r => n(r.nombre).includes('25UND') || n(r.nombre).includes('PASAPALOS'));
    const pasapalos25Piezas = pasapalos25Qty * 25;

    const totalTequPiezas =
      (tequSuelto ?? 0) +
      combosTQ6.reduce((s, c) => s + c.piezas, 0) +
      combosTQ12.reduce((s, c) => s + c.piezas, 0) +
      pasapalos25Piezas;

    // ── REPOSTERÍA (04) ────────────────────────────────────
    const repItems = g04.map(r => ({ nombre: r.nombre.trim(), cantidad: r.cantidad }));
    const totalRep = repItems.reduce((s, r) => s + r.cantidad, 0);

    return NextResponse.json({
      ok: true,
      corteCaja: { totalBs, totalUsd, tasa },
      burguer: {
        hambPollo,
        hambCarne,
        hambMixta,
        totalHambSueltas,
        combosBurger,
        totalPiezasComboBurger,
        totalPanesHamb,
        perroSuelto,
        combosPerro,
        totalPanesPerro,
        patacon,
      },
      pasteles: {
        sueltos: { molida: pastelMolida, papaqueso: pastelPapaqueso, pizza: pastelPizza, queso: pastelQueso, empanada },
        totalSueltos: totalPastelesSueltos,
        combos6: combos6Pastel,
        totalCombos6Piezas: totalCombos6PastelPiezas,
        combos12: combos12Pastel,
        totalCombos12Piezas: totalCombos12PastelPiezas,
        totalPiezas: totalPastelesPiezas,
      },
      tequeños: {
        sueltos: tequSuelto,
        combos6: combosTQ6,
        totalCombos6Piezas: combosTQ6.reduce((s, c) => s + c.piezas, 0),
        combos12: combosTQ12,
        totalCombos12Piezas: combosTQ12.reduce((s, c) => s + c.piezas, 0),
        pasapalos: pasapalos25Qty > 0 ? { cantidad: pasapalos25Qty, piezas: pasapalos25Piezas } : null,
        totalPiezas: totalTequPiezas,
      },
      reposteria: { items: repItems, total: totalRep },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
