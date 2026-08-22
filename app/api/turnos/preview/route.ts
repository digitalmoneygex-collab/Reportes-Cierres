import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getTasaDelDia } from '@/lib/tasa';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startStr = searchParams.get('start');
    const endStr = searchParams.get('end');

    if (!startStr) {
      return NextResponse.json({ ok: false, error: 'Se requiere fecha de inicio (start)' }, { status: 400 });
    }

    const start = new Date(startStr);
    const end = endStr ? new Date(endStr) : new Date();

    const [tasaResult, facturasResult, pagosResult, articulosResult, turnoResult] = await Promise.all([
      getTasaDelDia().catch(() => 0),
      supabaseAdmin
        .from('pskloud_facturas')
        .select('monto_bs, tipo_doc, metodo_pago, procesado')
        .gte('fechayhora', start.toISOString())
        .lte('fechayhora', end.toISOString()),
      supabaseAdmin
        .from('pagos_whatsapp')
        .select('id, monto_bs, procesado')
        .eq('es_duplicado', false)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString()),
      supabaseAdmin
        .from('pskloud_articulos')
        .select('*')
        .gte('fechayhora', start.toISOString())
        .lte('fechayhora', end.toISOString()),
      supabaseAdmin
        .from('turnos')
        .select('*, usuarios(nombre_completo, cedula)')
        .eq('abierto_at', start.toISOString())
        .maybeSingle()
    ]);

    if (facturasResult.error) throw new Error(facturasResult.error.message);
    if (pagosResult.error) throw new Error(pagosResult.error.message);
    if (articulosResult.error) throw new Error(articulosResult.error.message);

    const facturas = facturasResult.data || [];
    const pagos = pagosResult.data || [];
    const articulos = articulosResult.data || [];
    const turno = turnoResult?.data;
    
    // Extraer datos del cajero
    // @ts-ignore
    const cajero = turno?.usuarios ? { nombre: turno.usuarios.nombre_completo, cedula: turno.usuarios.cedula } : { nombre: 'CAJERO DESCONOCIDO', cedula: 'V-00000000' };

    const tasa = Number(tasaResult ?? 0);

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

    // ─── Factores de Insumos (espejo de sync-pskloud.js / factores.json) ──────
    const FACTORES: Record<string, Record<string, number>> = {
      "AREPA CABIMERA":                    { "Arepa C": 1,  "Carne M": 1,  "Huevo": 1 },
      "COMBO 10 HAMB CARNE + BEBIDA":      { "Carne H": 10, "Pan Burguer": 10, "Bebida": 1 },
      "COMBO 14 HAMB CARNE + BEBIDA":      { "Carne H": 14, "Pan Burguer": 14, "Bebida": 1 },
      "COMBO 7 HAMB CARNE + BEBIDA":       { "Carne H": 7,  "Pan Burguer": 7,  "Bebida": 1 },
      "HAMB. DOBLE CARNE":                 { "Carne H": 2,  "Pan Burguer": 1 },
      "HAMB. POLLO ESPECIAL":              { "Carne H": 2,  "Pan Burguer": 1 },
      "HAMB. MIXTA":                       { "Carne H": 1,  "Pollo": 1,    "Pan Burguer": 1 },
      "HAMB. POLLO":                       { "Carne H": 1,  "Pan Burguer": 1 },
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

    type ItemCantidad = { nombre: string; cantidad: number };

    const normNombre = (s: string): string => {
      let n = String(s ?? '').trim().toUpperCase();
      n = n.replace(/TEQUE.O/g, 'TEQUEÑO');
      n = n.replace(/PEQUE.A/g, 'PEQUEÑA');
      return n;
    };

    /** Suma insumos según FACTORES — réplica exacta de sync-pskloud.js */
    const calcularTotales = (items: ItemCantidad[]): Record<string, number> => {
      const totales: Record<string, number> = {};
      items.forEach(item => {
        const nombreNorm = normNombre(item.nombre);
        const qty = Number(item.cantidad) || 0;
        let itemFactores: Record<string, number> | null = null;
        for (const key in FACTORES) {
          if (normNombre(key) === nombreNorm) { itemFactores = FACTORES[key]; break; }
        }
        if (itemFactores) {
          for (const insumo in itemFactores) {
            if (!totales[insumo]) totales[insumo] = 0;
            totales[insumo] += itemFactores[insumo] * qty;
          }
        }
      });
      return totales;
    };

    const agruparPorCategoria = (items: ItemCantidad[], catDict: Record<string, string[]>): Record<string, ItemCantidad[]> => {
      const res: Record<string, ItemCantidad[]> = {};
      for (const listName in catDict) {
        res[listName] = catDict[listName].map(expectedName => {
          const match = items.find(r => normNombre(r.nombre) === normNombre(expectedName));
          return { nombre: expectedName, cantidad: match ? (Number(match.cantidad) || 0) : 0 };
        });
      }
      return res;
    };

    // Sumar cantidades del período por nombre+categoría
    const sumByKey = new Map<string, ItemCantidad & { categoria: string }>();
    articulos.forEach((a: any) => {
      const key = `${a.categoria}||${normNombre(a.nombre)}`;
      if (sumByKey.has(key)) {
        sumByKey.get(key)!.cantidad += Number(a.cantidad) || 0;
      } else {
        sumByKey.set(key, { nombre: normNombre(a.nombre), cantidad: Number(a.cantidad) || 0, categoria: a.categoria });
      }
    });

    const allItems     = Array.from(sumByKey.values());
    const g03Items     = allItems.filter(a => a.categoria === 'burguer');
    const g02Items     = allItems.filter(a => a.categoria === 'pasteles');
    const g04Items     = allItems.filter(a => a.categoria === 'reposteria');

    const burguerCats    = agruparPorCategoria(g03Items, CAT_BURGUER);
    const burguerInsumos = calcularTotales(g03Items);

    const pastelesCats    = agruparPorCategoria(g02Items, CAT_PASTELES);
    const pastelesInsumos = calcularTotales(g02Items);

    const reposteriaItems = g04Items.map(i => ({ nombre: i.nombre, cantidad: i.cantidad }));

    // Calcular PSKloud Ventas (Ingresos)
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
    const totalBsUsd = tasa > 0 ? totalBs / tasa : 0;
    const devolucionesEfUsd = tasa > 0 ? devolucionesEfBs / tasa : 0;
    const totalRecibidoUsd = tasa > 0 ? totalRecibidoBs / tasa : 0;

    // Desglose por métodos de pago
    const metodosPago = facturas.filter(f => f.procesado).reduce((acc: any, curr) => {
      if (!curr.metodo_pago) return acc;
      let metodoPagoReal = curr.metodo_pago;
      let isDevolucionManual = false;

      if (curr.metodo_pago.startsWith('dev_')) {
        metodoPagoReal = curr.metodo_pago.replace('dev_', '');
        isDevolucionManual = true;
      }

      const exists = acc.find((m: any) => m.metodo === metodoPagoReal);
      const isNegative = curr.tipo_doc === 'DEV' || curr.tipo_doc === 'N/C' || curr.tipo_doc === 'NC' || isDevolucionManual || curr.metodo_pago === 'devolucion' || curr.metodo_pago === 'gasto';
      const monto = isNegative ? -Math.abs(Number(curr.monto_bs)) : Math.abs(Number(curr.monto_bs));

      if (exists) {
        exists.cantidad += 1;
        exists.totalBs += monto;
      } else {
        acc.push({ metodo: metodoPagoReal, cantidad: 1, totalBs: monto });
      }
      return acc;
    }, []);

    // Calcular Pagos Móviles Capturados vs Conciliados
    const totalPagosBs = pagos.reduce((s, p) => s + (p.monto_bs ?? 0), 0);
    const pagosRegistradosCount = pagos.length;
    const pagosProcesadosCount = pagos.filter(p => p.procesado).length;
    const pagosSinProcesarCount = pagosRegistradosCount - pagosProcesadosCount;
    
    // Facturas en PSKloud marcadas como Pago Movil pero sin procesar
    const facturasPagoMovil = facturas.filter(f => f.metodo_pago === 'pago_movil');
    const facturasPagoMovilProcesadas = facturasPagoMovil.filter(f => f.procesado).length;
    const facturasPagoMovilPendientes = facturasPagoMovil.length - facturasPagoMovilProcesadas;

    return NextResponse.json({
      ok: true,
      data: {
        rango: { start: start.toISOString(), end: end.toISOString() },
        cajero,
        pskloud: {
          tasa,
          totalBs,
          totalBsUsd,
          devolucionesEfBs,
          devolucionesEfUsd,
          totalRecibidoBs,
          totalRecibidoUsd,
          totalFacturas: facturas.length
        },
        metodosPago,

        pagos: {
          totalBs: totalPagosBs,
          registradosCount: pagosRegistradosCount,
          procesadosCount: pagosProcesadosCount,
          sinProcesarCount: pagosSinProcesarCount,
        },
        alertas: {
          hayPagosSinConciliar: pagosSinProcesarCount > 0,
          hayFacturasSinConciliar: facturasPagoMovilPendientes > 0,
          facturasPendientesCount: facturasPagoMovilPendientes
        },
        articulos: {
          burguer: {
            combosHamb: burguerCats.combosHamb,
            hambSueltas: burguerCats.hambSueltas,
            perros: burguerCats.perros,
            otros: burguerCats.otros,
          },
          pasteles: {
            pasapalos: pastelesCats.pasapalos,
            pequenos: pastelesCats.pequenos,
            empanadas: pastelesCats.empanadas,
            grandes: pastelesCats.grandes,
            otros: pastelesCats.otros,
          },
          reposteria: reposteriaItems
        },
        insumos: {
          burguer: burguerInsumos,
          pasteles: pastelesInsumos
        }
      }
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
