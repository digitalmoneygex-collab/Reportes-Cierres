/**
 * sync-pskloud.js
 * ─────────────────────────────────────────────────────────────
 * Script LOCAL que corre en la misma PC donde está instalado
 * PSKLOUD (MySQL adminzuilia). Lee los datos del día y los sube
 * a Supabase para que el Dashboard de Vercel los pueda leer.
 *
 * USO:
 *   node sync-pskloud.js          ← sincroniza una vez
 *   node sync-pskloud.js --watch  ← sincroniza cada 5 minutos
 *
 * DEPENDENCIAS (instalar una sola vez):
 *   npm install mysql2 @supabase/supabase-js
 */

const mysql = require('mysql2/promise');
const { createClient } = require('@supabase/supabase-js');

// ─── Configuración ────────────────────────────────────────────
const DB = {
  host:     'localhost',
  user:     'root',
  password: '1234',
  database: 'adminzuilia',
};

const SUPABASE_URL  = 'https://gztjiljxmbpwzwgbxnru.supabase.co';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6dGppbGp4bWJwd3p3Z2J4bnJ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjgwMjY4OCwiZXhwIjoyMTAyMzc4Njg4fQ.xnBmQgUSP2YNmxAfJeqMdMxXS5HnvEVTN0uHg0quWT8';
const INTERVAL_MS   = 5 * 60 * 1000; // 5 minutos

// ─── Helpers ──────────────────────────────────────────────────
const n  = (s) => String(s ?? '').trim().toUpperCase();
const nv = (v) => (v > 0 ? v : null);

function qty(rows, fn) {
  return rows.filter(fn).reduce((s, r) => s + (Number(r.cantidad) ?? 0), 0);
}

function esCombo6Pastel(nombre) {
  const u = n(nombre);
  return u.includes('COMBO') && !u.includes('12') && !u.includes('TEQUE') && !u.includes('REFRESC');
}

function esCombo12Pastel(nombre) {
  const u = n(nombre);
  return u.includes('12') && (u.includes('PASTEL') || u.includes('BEBIDA')) && !u.includes('TEQUE') && !u.includes('REFRESC');
}

// ─── Lógica principal ─────────────────────────────────────────
// Fecha actual en hora Venezuela (UTC-4), independiente del timezone del servidor
function fechaVenezuela() {
  const now = new Date();
  // Restar 4 horas a UTC para obtener hora VE
  const vzOffset = -4 * 60; // minutos
  const utcMinutes = now.getTime() / 60000 + now.getTimezoneOffset();
  const vzDate = new Date((utcMinutes + vzOffset) * 60000);
  const y = vzDate.getFullYear();
  const m = String(vzDate.getMonth() + 1).padStart(2, '0');
  const d = String(vzDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function sync() {
  const today = fechaVenezuela();
  const startTime = new Date().toISOString();
  console.log(`\n[${startTime}] Sincronizando datos del dia: ${today} (hora Venezuela)`);

  let conn;
  try {
    conn = await mysql.createConnection(DB);
    console.log('  OK Conexion MySQL establecida');

    // 1. Total recibido (corte de caja) - usando fecha Venezuela explícita
    const [[totalRow]] = await conn.query(
      `SELECT COALESCE(SUM(monto), 0) AS total
       FROM operclit
       WHERE DATE(fecha) = ?
         AND tipodoc = 'FAC'`,
      [today]
    );
    const totalBs = Number(totalRow?.total ?? 0);

    // 2. Articulos del dia (grupos 02, 03, 04) - usando fecha Venezuela explícita
    const [rows] = await conn.query(
      `SELECT grupo, codigo, nombre, SUM(cantidad) AS cantidad
       FROM opermv
       WHERE DATE(fechadoc) = ?
         AND tipodoc = 'FAC'
         AND grupo IN ('02','03','04')
       GROUP BY grupo, codigo, nombre
       ORDER BY grupo, codigo, nombre`,
      [today]
    );

    const g02 = rows.filter(r => String(r.grupo).trim() === '02');
    const g03 = rows.filter(r => String(r.grupo).trim() === '03');
    const g04 = rows.filter(r => String(r.grupo).trim() === '04');

    // BURGUER (03)
    const hambPollo       = nv(qty(g03, r => n(r.nombre) === 'HAMB. POLLO'));
    const hambCarne       = nv(qty(g03, r => n(r.nombre) === 'HAMB. CARNE'));
    const hambMixta       = nv(qty(g03, r => n(r.nombre) === 'HAMB. MIXTA'));
    const totalHambSueltas = (hambPollo ?? 0) + (hambCarne ?? 0) + (hambMixta ?? 0);

    const combosBurgerRows = g03.filter(r => n(r.nombre).includes('COMBO') && !n(r.nombre).includes('PERRO'));
    const combosBurger = combosBurgerRows.map(r => ({
      nombre:   String(r.nombre).trim(),
      cantidad: Number(r.cantidad),
      talla:    n(r.nombre).includes('12') ? 12 : 6,
      piezas:   Number(r.cantidad) * (n(r.nombre).includes('12') ? 12 : 6),
    }));
    const totalPiezasComboBurger = combosBurger.reduce((s, c) => s + c.piezas, 0);
    const totalPanesHamb = totalHambSueltas + totalPiezasComboBurger;

    const perroSuelto    = nv(qty(g03, r => n(r.nombre) === 'PERRO CALIENTE'));
    const combosPerroRows = g03.filter(r => n(r.nombre).includes('COMBO') && n(r.nombre).includes('PERRO'));
    const combosPerro = combosPerroRows.map(r => ({
      nombre:   String(r.nombre).trim(),
      cantidad: Number(r.cantidad),
      talla:    n(r.nombre).includes('12') ? 12 : 6,
      piezas:   Number(r.cantidad) * (n(r.nombre).includes('12') ? 12 : 6),
    }));
    const totalPanesPerro = (perroSuelto ?? 0) + combosPerro.reduce((s, c) => s + c.piezas, 0);
    const patacon = nv(qty(g03, r => n(r.nombre).startsWith('PATACON') && !n(r.nombre).includes('CARNE MECHADA') && !n(r.nombre).includes('HUEVO')));

    // PASTELES (02)
    const pastelMolida    = nv(qty(g02, r => n(r.nombre) === 'PASTEL MOLIDA'));
    const pastelPapaqueso = nv(qty(g02, r => n(r.nombre) === 'PASTEL PAPAQUESO'));
    const pastelPizza     = nv(qty(g02, r => n(r.nombre) === 'PASTEL PIZZA'));
    const pastelQueso     = nv(qty(g02, r => n(r.nombre) === 'PASTEL QUESO'));
    const empanada        = nv(qty(g02, r => n(r.nombre).includes('EMPANADA')));
    const totalPastelesSueltos = (pastelMolida ?? 0) + (pastelPapaqueso ?? 0) + (pastelPizza ?? 0) + (pastelQueso ?? 0);

    const combo6PastelRows  = g02.filter(r => esCombo6Pastel(r.nombre));
    const combos6Pastel     = combo6PastelRows.map(r => ({ nombre: String(r.nombre).trim(), cantidad: Number(r.cantidad), piezas: Number(r.cantidad) * 6 }));
    const totalCombos6Piezas = combos6Pastel.reduce((s, c) => s + c.piezas, 0);

    const combo12PastelRows = g02.filter(r => esCombo12Pastel(r.nombre));
    const combos12Pastel    = combo12PastelRows.map(r => ({ nombre: String(r.nombre).trim(), cantidad: Number(r.cantidad), piezas: Number(r.cantidad) * 12 }));
    const totalCombos12Piezas = combos12Pastel.reduce((s, c) => s + c.piezas, 0);

    const totalPastelesPiezas = totalPastelesSueltos + totalCombos6Piezas + totalCombos12Piezas;

    // TEQUEÑOS
    const tequSuelto    = nv(qty(g02, r => n(r.nombre) === 'TEQUEÑO'));
    const comboTQ6Rows  = g02.filter(r => n(r.nombre).includes('COMBO') && n(r.nombre).includes('TEQUE') && !n(r.nombre).includes('12'));
    const comboTQ12Rows = g02.filter(r => n(r.nombre).includes('12') && n(r.nombre).includes('TEQUE') && !n(r.nombre).includes('REFRESC'));
    const combosTQ6  = comboTQ6Rows.map(r  => ({ nombre: String(r.nombre).trim(), cantidad: Number(r.cantidad), piezas: Number(r.cantidad) * 6  }));
    const combosTQ12 = comboTQ12Rows.map(r => ({ nombre: String(r.nombre).trim(), cantidad: Number(r.cantidad), piezas: Number(r.cantidad) * 12 }));
    const pasapalos25Qty    = qty(g02, r => n(r.nombre).includes('25UND') || n(r.nombre).includes('PASAPALOS'));
    const pasapalos25Piezas = pasapalos25Qty * 25;
    const totalTequPiezas   = (tequSuelto ?? 0) + combosTQ6.reduce((s,c)=>s+c.piezas,0) + combosTQ12.reduce((s,c)=>s+c.piezas,0) + pasapalos25Piezas;

    // REPOSTERIA (04)
    const repItems = g04.map(r => ({ nombre: String(r.nombre).trim(), cantidad: Number(r.cantidad) }));
    const totalRep = repItems.reduce((s, r) => s + r.cantidad, 0);

    // Payload para Supabase
    const payload = {
      fecha: today,  // fecha Venezuela (UTC-4) — debe coincidir con lo que busca la API de Vercel
      synced_at: new Date().toISOString(),
      corte_caja_bs: totalBs,
      burguer: {
        hambPollo, hambCarne, hambMixta,
        totalHambSueltas, combosBurger, totalPiezasComboBurger, totalPanesHamb,
        perroSuelto, combosPerro, totalPanesPerro, patacon,
      },
      pasteles: {
        sueltos: { molida: pastelMolida, papaqueso: pastelPapaqueso, pizza: pastelPizza, queso: pastelQueso, empanada },
        totalSueltos: totalPastelesSueltos,
        combos6: combos6Pastel, totalCombos6Piezas,
        combos12: combos12Pastel, totalCombos12Piezas,
        totalPiezas: totalPastelesPiezas,
      },
      teques: {
        sueltos: tequSuelto,
        combos6: combosTQ6, totalCombos6Piezas: combosTQ6.reduce((s,c)=>s+c.piezas,0),
        combos12: combosTQ12, totalCombos12Piezas: combosTQ12.reduce((s,c)=>s+c.piezas,0),
        pasapalos: pasapalos25Qty > 0 ? { cantidad: pasapalos25Qty, piezas: pasapalos25Piezas } : null,
        totalPiezas: totalTequPiezas,
      },
      reposteria: { items: repItems, total: totalRep },
    };

    console.log(`  OK Datos extraidos -> Bs. ${totalBs.toLocaleString('es-VE')}, ${rows.length} articulos`);

    // Subir a Supabase (upsert por fecha)
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { error } = await supabase
      .from('pskloud_snapshot')
      .upsert(payload, { onConflict: 'fecha' });

    if (error) {
      console.error('  ERROR al subir a Supabase:', error.message);
    } else {
      console.log('  OK Datos subidos a Supabase correctamente');
      console.log(`     Total Bs.: ${totalBs.toLocaleString('es-VE')}`);
      console.log(`     Hamburguesas (panes): ${totalPanesHamb}  |  Perros (panes): ${totalPanesPerro}`);
      console.log(`     Pasteles (piezas): ${totalPastelesPiezas}  |  Tequenos (piezas): ${totalTequPiezas}`);
      console.log(`     Reposteria: ${totalRep}`);
    }

  } catch (err) {
    console.error('  ERROR general:', err.message);
  } finally {
    if (conn) await conn.end();
  }
}

// ─── Punto de entrada ─────────────────────────────────────────
const watchMode = process.argv.includes('--watch');

sync();

if (watchMode) {
  console.log(`\nModo Watch activo - sincronizando cada ${INTERVAL_MS / 60000} minutos. Ctrl+C para detener.\n`);
  setInterval(sync, INTERVAL_MS);
}
