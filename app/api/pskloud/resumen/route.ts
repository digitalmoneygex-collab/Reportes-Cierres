import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getTasaDelDia } from '@/lib/tasa';

// ─── Factores de Insumos (espejo de sync-pskloud.js / factores.json) ──────────
// Cada artículo tiene sus insumos y cuántos usa por unidad vendida.
const FACTORES: Record<string, Record<string, number>> = {
  "AREPA CABIMERA":                    { "Arepa C": 1,  "Carne M": 1,  "Huevo": 1 },
  "COMBO 10 HAMB CARNE + BEBIDA":      { "Carne H": 10, "Pan Burguer": 10, "Bebida": 1 },
  "COMBO 14 HAMB CARNE + BEBIDA":      { "Carne H": 14, "Pan Burguer": 14, "Bebida": 1 },
  "COMBO 7 HAMB CARNE + BEBIDA":       { "Carne H": 7,  "Pan Burguer": 7,  "Bebida": 1 },
  "HAMB. DOBLE CARNE":                 { "Carne H": 2,  "Pan Burguer": 1 },
  "HAMB. POLLO ESPECIAL":              { "Pollo": 2,  "Pan Burguer": 1 },
  "HAMB. MIXTA":                       { "Carne H": 1,  "Pollo": 1,    "Pan Burguer": 1 },
  "HAMB. POLLO":                       { "Pollo": 1,  "Pan Burguer": 1 },
  "HAMB. PAPICHYS":                    { "Carne H": 1,  "Pollo": 2,    "Pan Burguer": 1 },
  "HAMB. CARNE":                       { "Carne H": 1,  "Pan Burguer": 1 },
  "COMBO 8 PERRO CALIENTE + BEBIDA":   { "Pan perro": 8, "Salchicha": 8, "Bebida": 1 },
  "PERRO CALIENTE":                    { "Pan perro": 1, "Salchicha": 1 },
  "PAPAS FRITAS 150GR":                {},
  "PASAPALOS 25UND PASTELES":          { "Pieza F": 25 },
  "PASAPALOS 25UND TEQUEÑOS":          { "Pieza F": 25 },
  "PASAPALOS 50UND PASTELES":          { "Pieza F": 50 },
  "PASAPALOS 50UND TEQUEÑOS":          { "Pieza F": 50 },
  "PASTELES 12 + BEBIDA":              { "Pieza P": 12, "Bebida": 1 },
  "TEQUEÑO 12 + BEBIDAS":              { "Pieza P": 12, "Bebida": 1 },
  "COMBO 6 PASTELES MOLIDA":           { "Pieza P": 6 },
  "COMBO 6 PASTELES PAPAQUESO":        { "Pieza P": 6 },
  "COMBO 6 PASTELES QUESO":            { "Pieza P": 6 },
  "COMBO 6 PASTELES VARIADO":          { "Pieza P": 6 },
  "COMBO 6 TEQUEÑOS":                  { "Pieza P": 6 },
  "TEQUEÑO":                           { "Pieza G": 1 },
  "EMPANADA MECHADA":                  { "Pieza G": 1 },
  "EMPANADA PAPAQUESO":                { "Pieza G": 1 },
  "EMPANADA QUESO":                    { "Pieza G": 1 },
  "MANDOCAS X UND":                    { "Pieza G": 1 },
  "PASAPALOS TEQUE YOYO X50":          { "Pieza F": 50 },
  "TEQUEYOYOS":                        { "Pieza G": 1 },
  "PASTEL PAPAQUESO":                  { "Pieza G": 1 },
  "PASTEL MOLIDA":                     { "Pieza G": 1 },
  "PASTEL MECHADA":                    { "Pieza G": 1 },
  "PASTEL PIZZA":                      { "Pieza G": 1 },
  "PASTEL QUESO":                      { "Pieza G": 1 },
  "SALSA GRANDE":                      {},
  "SALSA PEQUEÑA":                     {},
  "NESCAFE+MILHOJA":                   {},
  "BRAZO GITANO":                      {},
  "BOMBA":                             {},
  "MILHOJAS RELLENA":                  {},
};

// ─── Categorías (espejo de sync-pskloud.js) ───────────────────────────────────
const CAT_BURGUER: Record<string, string[]> = {
  combosHamb:  ["COMBO 10 HAMB CARNE + BEBIDA", "COMBO 14 HAMB CARNE + BEBIDA", "COMBO 7 HAMB CARNE + BEBIDA"],
  hambSueltas: ["HAMB. DOBLE CARNE", "HAMB. POLLO ESPECIAL", "HAMB. MIXTA", "HAMB. POLLO", "HAMB. PAPICHYS", "HAMB. CARNE"],
  perros:      ["COMBO 8 PERRO CALIENTE + BEBIDA", "PERRO CALIENTE"],
  otros:       ["AREPA CABIMERA", "PATACON CARNE MECHADA", "PAPAS FRITAS 150GR"],
};

const CAT_PASTELES: Record<string, string[]> = {
  pasapalos: ["PASAPALOS 25UND PASTELES", "PASAPALOS 25UND TEQUEÑOS", "PASAPALOS 50UND PASTELES", "PASAPALOS 50UND TEQUEÑOS", "PASAPALOS TEQUE YOYO X50"],
  pequenos:  ["PASTELES 12 + BEBIDA", "TEQUEÑO 12 + BEBIDAS", "COMBO 6 PASTELES MOLIDA", "COMBO 6 PASTELES PAPAQUESO", "COMBO 6 PASTELES QUESO", "COMBO 6 PASTELES VARIADO", "COMBO 6 TEQUEÑOS"],
  empanadas: ["EMPANADA MECHADA", "EMPANADA PAPAQUESO", "EMPANADA QUESO"],
  grandes:   ["PASTEL PAPAQUESO", "PASTEL MOLIDA", "PASTEL MECHADA", "PASTEL PIZZA", "PASTEL QUESO", "TEQUEÑO"],
  otros:     ["MANDOCAS X UND", "TEQUEYOYOS", "SALSA GRANDE", "SALSA PEQUEÑA"],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function normalizarNombre(nombre: string): string {
  let nom = String(nombre ?? '').trim().toUpperCase();
  nom = nom.replace(/TEQUE.O/g, 'TEQUEÑO');
  nom = nom.replace(/PEQUE.A/g, 'PEQUEÑA');
  return nom;
}

type ItemCantidad = { nombre: string; cantidad: number };

/**
 * Dado un array de { nombre, cantidad }, suma los insumos según FACTORES.
 * Replica exactamente la función calcularTotales() de sync-pskloud.js.
 */
function calcularTotales(items: ItemCantidad[]): Record<string, number> {
  const totales: Record<string, number> = {};
  items.forEach(item => {
    const nombreNorm = normalizarNombre(item.nombre);
    const qty = Number(item.cantidad) || 0;
    let itemFactores: Record<string, number> | null = null;
    for (const key in FACTORES) {
      if (normalizarNombre(key) === nombreNorm) {
        itemFactores = FACTORES[key];
        break;
      }
    }
    if (itemFactores) {
      for (const insumo in itemFactores) {
        if (!totales[insumo]) totales[insumo] = 0;
        totales[insumo] += itemFactores[insumo] * qty;
      }
    }
  });
  return totales;
}

/**
 * Clasifica un array plano de { nombre, cantidad } en las categorías definidas.
 * Para cada nombre esperado en la categoría, busca en el array y pone 0 si no está.
 */
function agruparPorCategoria(
  items: ItemCantidad[],
  catDict: Record<string, string[]>
): Record<string, ItemCantidad[]> {
  const res: Record<string, ItemCantidad[]> = {};
  for (const listName in catDict) {
    res[listName] = catDict[listName].map(expectedName => {
      const match = items.find(r => normalizarNombre(r.nombre) === normalizarNombre(expectedName));
      return {
        nombre:   expectedName,
        cantidad: match ? (Number(match.cantidad) || 0) : 0,
      };
    });
  }
  return res;
}

// ─── Route Handler ────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const abierto_at = searchParams.get('abierto_at');
    const cerrado_at = searchParams.get('cerrado_at');
    const dateParam = searchParams.get('date');

    let start: Date;
    let end: Date;

    if (abierto_at) {
      start = new Date(abierto_at);
      end = cerrado_at ? new Date(cerrado_at) : new Date(); // Si está activo, hasta ahora
    } else if (dateParam) {
      start = new Date(`${dateParam}T00:00:00.000-04:00`);
      end = new Date(`${dateParam}T23:59:59.999-04:00`);
    } else {
      // Legacy / Fallback
      const { data: config } = await supabaseAdmin.from('configuracion').select('start_time').eq('id', 1).single();
      const startTime = config?.start_time || '06:00';
      
      const now = new Date();
      const vzDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Caracas' }));
      
      const [sh, sm] = startTime.split(':').map(Number);
      const resetMinutes = sh * 60 + sm;
      const currentMinutes = vzDate.getHours() * 60 + vzDate.getMinutes();
      
      if (currentMinutes < resetMinutes) {
        vzDate.setDate(vzDate.getDate() - 1);
      }
      
      const y = vzDate.getFullYear();
      const m = String(vzDate.getMonth() + 1).padStart(2, '0');
      const d = String(vzDate.getDate()).padStart(2, '0');
      
      start = new Date(`${y}-${m}-${d}T${startTime}:00.000-04:00`);
      
      const nextDay = new Date(vzDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const ny = nextDay.getFullYear();
      const nm = String(nextDay.getMonth() + 1).padStart(2, '0');
      const nd = String(nextDay.getDate()).padStart(2, '0');
      
      end = new Date(`${ny}-${nm}-${nd}T${startTime}:00.000-04:00`);
      end = new Date(end.getTime() - 1);
    }

    const [tasaResult, facturasResult, articulosResult, gastosResult] = await Promise.all([
      getTasaDelDia().catch(() => 0),
      supabaseAdmin
        .from('pskloud_facturas')
        .select('*')
        .gte('fechayhora', start.toISOString())
        .lte('fechayhora', end.toISOString()),
      supabaseAdmin
        .from('pskloud_articulos')
        .select('*')
        .gte('fechayhora', start.toISOString())
        .lte('fechayhora', end.toISOString()),
      supabaseAdmin
        .from('otros_gastos')
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
    ]);

    if (facturasResult.error) throw new Error(facturasResult.error.message);
    if (articulosResult.error) throw new Error(articulosResult.error.message);
    if (gastosResult.error) throw new Error(gastosResult.error.message);

    const facturas = facturasResult.data || [];
    const articulos = articulosResult.data || [];
    const gastos = gastosResult.data || [];

    const totalGastosBs = gastos.reduce((sum, g) => sum + (Number(g.monto_bs) || 0), 0);
    const totalGastosUsd = gastos.reduce((sum, g) => sum + (Number(g.monto_usd) || 0), 0);

    // ── Calcular Totales de Caja ──────────────────────────────────────────────
    let totalBs = 0;
    let devolucionesEfBs = 0;

    facturas.forEach(f => {
      const isNeg = f.tipo_doc === 'DEV' || f.tipo_doc === 'N/C' || f.tipo_doc === 'NC';
      const m = Number(f.monto_bs) || 0;
      if (isNeg) {
        devolucionesEfBs += m;
      } else {
        totalBs += m;
      }
    });

    const totalRecibidoBs = totalBs - devolucionesEfBs;
    const tasa = Number(tasaResult ?? 0);
    const totalBsUsd = tasa > 0 ? totalBs / tasa : 0;
    const devolucionesEfUsd = tasa > 0 ? devolucionesEfBs / tasa : 0;
    const totalRecibidoUsd = tasa > 0 ? totalRecibidoBs / tasa : 0;

    // ── Métodos de Pago Conciliados ───────────────────────────────────────────
    const metodosPago = facturas.filter(f => f.procesado).reduce((acc: any, curr) => {
      if (!curr.metodo_pago) return acc;
      let metodoPagoReal = curr.metodo_pago;
      let isDevolucionManual = false;

      if (curr.metodo_pago.startsWith('dev_')) {
        metodoPagoReal = curr.metodo_pago.replace('dev_', '');
        isDevolucionManual = true;
      }

      const exists = acc.find((m: any) => m.metodo === metodoPagoReal);
      const isNegative = curr.tipo_doc === 'DEV' || curr.tipo_doc === 'N/C' || curr.tipo_doc === 'NC' || isDevolucionManual || curr.metodo_pago === 'devolucion';
      const monto = isNegative ? -Math.abs(Number(curr.monto_bs)) : Math.abs(Number(curr.monto_bs));

      if (exists) {
        exists.cantidad += 1;
        exists.totalBs += monto;
      } else {
        acc.push({ metodo: metodoPagoReal, cantidad: 1, totalBs: monto });
      }
      return acc;
    }, []);

    // ── Agrupar artículos por categoría sumando cantidades del período ────────
    const sumByKey = new Map<string, ItemCantidad & { categoria: string }>();
    articulos.forEach((a: any) => {
      const key = `${a.categoria}||${normalizarNombre(a.nombre)}`;
      if (sumByKey.has(key)) {
        sumByKey.get(key)!.cantidad += Number(a.cantidad) || 0;
      } else {
        sumByKey.set(key, {
          nombre:    normalizarNombre(a.nombre),
          cantidad:  Number(a.cantidad) || 0,
          categoria: a.categoria,
        });
      }
    });

    const allItems    = Array.from(sumByKey.values());
    const g03Items    = allItems.filter(a => a.categoria === 'burguer');
    const g02Items    = allItems.filter(a => a.categoria === 'pasteles');
    const g04Items    = allItems.filter(a => a.categoria === 'reposteria');

    // ── Burguer: clasificar + calcular insumos ────────────────────────────────
    const burguerCats    = agruparPorCategoria(g03Items, CAT_BURGUER);
    const burguerInsumos = calcularTotales(g03Items);

    // ── Pasteles: clasificar + calcular insumos ───────────────────────────────
    const pastelesCats    = agruparPorCategoria(g02Items, CAT_PASTELES);
    const pastelesInsumos = calcularTotales(g02Items);

    // ── Repostería ────────────────────────────────────────────────────────────
    const reposteriaItems = g04Items.map(i => ({ nombre: i.nombre, cantidad: i.cantidad }));
    const reposteriaTotal = reposteriaItems.reduce((acc, i) => acc + i.cantidad, 0);

    return NextResponse.json({
      ok: true,
      synced_at: new Date().toISOString(),
      is_recent: true,
      corteCaja: {
        totalBs,
        totalBsUsd,
        devolucionesEfBs,
        devolucionesEfUsd,
        totalRecibidoBs,
        totalRecibidoUsd,
        totalGastosBs,
        totalGastosUsd,
        tasa,
        totalUsd: tasa > 0 ? totalRecibidoBs / tasa : 0,
      },
      gastos: {
        items: gastos,
        totalBs: totalGastosBs,
        totalUsd: totalGastosUsd
      },
      metodosPago,
      burguer: {
        combosHamb:     burguerCats.combosHamb   || [],
        hambSueltas:    burguerCats.hambSueltas  || [],
        perros:         burguerCats.perros       || [],
        otros:          burguerCats.otros        || [],
        totalesInsumos: burguerInsumos,
      },
      pasteles: {
        pasapalos:      pastelesCats.pasapalos   || [],
        pequenos:       pastelesCats.pequenos    || [],
        empanadas:      pastelesCats.empanadas   || [],
        grandes:        pastelesCats.grandes     || [],
        otros:          pastelesCats.otros       || [],
        totalesInsumos: pastelesInsumos,
      },
      reposteria: {
        items: reposteriaItems,
        total: reposteriaTotal,
      },
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
