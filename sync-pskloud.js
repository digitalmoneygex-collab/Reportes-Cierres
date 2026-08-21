/**
 * sync-pskloud.js
 * ─────────────────────────────────────────────────────────────
 * Script LOCAL que corre en la misma PC donde está instalado
 * PSKLOUD (MySQL adminzuilia). Lee los datos del día y los sube
 * a Supabase para que el Dashboard de Vercel los pueda leer.
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

// ─── Factores de Insumos ──────────────────────────────────────
const FACTORES = {
  "AREPA CABIMERA": { "Arepa C": 1, "Carne M": 1, "Huevo": 1 },
  "COMBO 10 HAMB CARNE + BEBIDA": { "Carne H": 10, "Pan Burguer": 10, "Bebida": 1 },
  "COMBO 14 HAMB CARNE + BEBIDA": { "Carne H": 14, "Pan Burguer": 14, "Bebida": 1 },
  "COMBO 7 HAMB CARNE + BEBIDA": { "Carne H": 7, "Pan Burguer": 7, "Bebida": 1 },
  "HAMB. DOBLE CARNE": { "Carne H": 2, "Pan Burguer": 1 },
  "HAMB. POLLO ESPECIAL": { "Carne H": 2, "Pan Burguer": 1 },
  "HAMB. MIXTA": { "Carne H": 1, "Pollo": 1, "Pan Burguer": 1 },
  "HAMB. POLLO": { "Carne H": 1, "Pan Burguer": 1 },
  "HAMB. PAPICHYS": { "Carne H": 1, "Pollo": 2, "Pan Burguer": 1 },
  "HAMB. CARNE": { "Carne H": 1, "Pan Burguer": 1 },
  "COMBO 8 PERRO CALIENTE + BEBIDA": { "Pan perro": 8, "Salchicha": 8, "Bebida": 1 },
  "PERRO CALIENTE": { "Pan perro": 1, "Salchicha": 1 },
  "PAPAS FRITAS 150GR": {},
  "PASAPALOS 25UND PASTELES": { "Pieza F": 25 },
  "PASAPALOS 25UND TEQUEÑOS": { "Pieza F": 25 },
  "PASAPALOS 50UND PASTELES": { "Pieza F": 50 },
  "PASAPALOS 50UND TEQUEÑOS": { "Pieza F": 50 },
  "PASTELES 12 + BEBIDA": { "Pieza P": 12, "Bebida": 1 },
  "TEQUEÑO 12 + BEBIDAS": { "Pieza P": 12, "Bebida": 1 },
  "COMBO 6 PASTELES MOLIDA": { "Pieza P": 6 },
  "COMBO 6 PASTELES PAPAQUESO": { "Pieza P": 6 },
  "COMBO 6 PASTELES QUESO": { "Pieza P": 6 },
  "COMBO 6 PASTELES VARIADO": { "Pieza P": 6 },
  "COMBO 6 TEQUEÑOS": { "Pieza P": 6 },
  "TEQUEÑO": { "Pieza G": 1 },
  "EMPANADA MECHADA": { "Pieza G": 1 },
  "EMPANADA PAPAQUESO": { "Pieza G": 1 },
  "EMPANADA QUESO": { "Pieza G": 1 },
  "MANDOCAS X UND": { "Pieza G": 1 },
  "PASAPALOS TEQUE YOYO X50": { "Pieza F": 50 },
  "TEQUEYOYOS": { "Pieza G": 1 },
  "PASTEL PAPAQUESO": { "Pieza G": 1 },
  "PASTEL MOLIDA": { "Pieza G": 1 },
  "PASTEL MECHADA": { "Pieza G": 1 },
  "PASTEL PIZZA": { "Pieza G": 1 },
  "PASTEL QUESO": { "Pieza G": 1 },
  "SALSA GRANDE": {},
  "SALSA PEQUEÑA": {},
  "NESCAFE+MILHOJA": {},
  "BRAZO GITANO": {},
  "BOMBA": {},
  "MILHOJAS RELLENA": {}
};

// ─── Categorías Definidas ──────────────────────────────────────
const CAT_BURGUER = {
  combosHamb: ["COMBO 10 HAMB CARNE + BEBIDA", "COMBO 14 HAMB CARNE + BEBIDA", "COMBO 7 HAMB CARNE + BEBIDA"],
  hambSueltas: ["HAMB. DOBLE CARNE", "HAMB. POLLO ESPECIAL", "HAMB. MIXTA", "HAMB. POLLO", "HAMB. PAPICHYS", "HAMB. CARNE"],
  perros: ["COMBO 8 PERRO CALIENTE + BEBIDA", "PERRO CALIENTE"],
  otros: ["AREPA CABIMERA", "PATACON CARNE MECHADA", "PAPAS FRITAS 150GR"]
};

const CAT_PASTELES = {
  pasapalos: ["PASAPALOS 25UND PASTELES", "PASAPALOS 25UND TEQUEÑOS", "PASAPALOS 50UND PASTELES", "PASAPALOS 50UND TEQUEÑOS", "PASAPALOS TEQUE YOYO X50"],
  pequenos: ["PASTELES 12 + BEBIDA", "TEQUEÑO 12 + BEBIDAS", "COMBO 6 PASTELES MOLIDA", "COMBO 6 PASTELES PAPAQUESO", "COMBO 6 PASTELES QUESO", "COMBO 6 PASTELES VARIADO", "COMBO 6 TEQUEÑOS"],
  empanadas: ["EMPANADA MECHADA", "EMPANADA PAPAQUESO", "EMPANADA QUESO"],
  grandes: ["PASTEL PAPAQUESO", "PASTEL MOLIDA", "PASTEL MECHADA", "PASTEL PIZZA", "PASTEL QUESO", "TEQUEÑO"],
  otros: ["MANDOCAS X UND", "TEQUEYOYOS", "SALSA GRANDE", "SALSA PEQUEÑA"]
};

// ─── Helpers ──────────────────────────────────────────────────
const n = (s) => String(s ?? '').trim().toUpperCase();

function normalizarNombre(nombre) {
  let nom = n(nombre);
  nom = nom.replace(/TEQUE.O/g, 'TEQUEÑO');
  nom = nom.replace(/PEQUE.A/g, 'PEQUEÑA');
  return nom;
}

function calcularTotales(itemsArray) {
  let totales = {};
  itemsArray.forEach(item => {
    const itemName = normalizarNombre(item.nombre);
    const qty = Number(item.cantidad) || 0;
    
    let itemFactores = null;
    for (const key in FACTORES) {
      if (normalizarNombre(key) === itemName) {
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

function agruparPorCategoria(rows, catDict) {
  let res = {};
  for (const listName in catDict) {
    res[listName] = [];
    catDict[listName].forEach(expectedName => {
      const match = rows.find(r => normalizarNombre(r.nombre) === normalizarNombre(expectedName));
      if (match) {
        res[listName].push({
          nombre: expectedName,
          cantidad: Number(match.cantidad) || 0
        });
      } else {
        res[listName].push({
          nombre: expectedName,
          cantidad: 0
        });
      }
    });
  }
  return res;
}

// ─── Lógica principal ─────────────────────────────────────────
function fechaVenezuela() {
  const now = new Date();
  const vzOffset = -4 * 60;
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

    // ── Total Ingresos (ventas facturadas) ────────────────────
    const [[totalRow]] = await conn.query(
      `SELECT COALESCE(SUM(monto), 0) AS total
       FROM operclit
       WHERE DATE(fecha) = ?
         AND tipodoc = 'FAC'`,
      [today]
    );
    const totalBs = Number(totalRow?.total ?? 0);

    // Debug: ver qué tipodoc hay realmente hoy
    const [tiposDoc] = await conn.query(
      `SELECT DISTINCT tipodoc FROM operclit WHERE DATE(fecha) = ?`,
      [today]
    );
    console.log(`  INFO Tipos de documento encontrados hoy en operclit:`, tiposDoc.map(r => r.tipodoc).join(', '));

    // ── Devoluciones en Efectivo ───────────────────────────────
    // Las notas de crédito/devoluciones se guardan en la cabecera (operti), no en operclit.
    const [[devRow]] = await conn.query(
      `SELECT COALESCE(SUM(totalfinal), 0) AS total_dev
       FROM operti
       WHERE DATE(emision) = ?
         AND tipodoc IN ('DEV', 'N/C', 'NC')`,
      [today]
    );
    const devolucionesEfectivoBs = Number(devRow?.total_dev ?? 0);
    const totalRecibidoBs = totalBs - devolucionesEfectivoBs;

    const [rows] = await conn.query(
      `SELECT grupo, codigo, nombre, SUM(cantidad) AS cantidad
       FROM opermv
       WHERE DATE(fechadoc) = ?
         AND tipodoc = 'FAC'
         AND grupo IN ('01','02','03','04')
       GROUP BY grupo, codigo, nombre
       ORDER BY grupo, codigo, nombre`,
      [today]
    );

    const g02 = rows.filter(r => String(r.grupo).trim() === '02');
    const g03 = rows.filter(r => String(r.grupo).trim() === '03');
    const g04 = rows.filter(r => String(r.grupo).trim() === '04');

    let burguerData = agruparPorCategoria(g03, CAT_BURGUER);
    burguerData.totalesInsumos = calcularTotales(g03);

    let pastelesData = agruparPorCategoria(g02, CAT_PASTELES);
    pastelesData.totalesInsumos = calcularTotales(g02);

    const repItems = g04.map(r => ({ nombre: String(r.nombre).trim(), cantidad: Number(r.cantidad) }));
    const totalRep = repItems.reduce((s, r) => s + r.cantidad, 0);

    const payload = {
      fecha: today,
      synced_at: new Date().toISOString(),
      corte_caja_bs: totalBs,                          // Total Ingresos (bruto)
      devoluciones_efectivo_bs: devolucionesEfectivoBs, // Devoluc. Efect.(-)
      total_recibido_bs: totalRecibidoBs,              // TOTAL RECIBIDO = Ingresos - Devoluciones
      burguer: burguerData,
      pasteles: pastelesData,
      reposteria: { items: repItems, total: totalRep }
    };

    console.log(`  OK Datos extraidos -> ${rows.length} articulos`);
    console.log(`     Total Ingresos  : Bs. ${totalBs.toLocaleString('es-VE')}`);
    console.log(`     Devoluciones Ef.: Bs. ${devolucionesEfectivoBs.toLocaleString('es-VE')}`);
    console.log(`     TOTAL RECIBIDO  : Bs. ${totalRecibidoBs.toLocaleString('es-VE')}`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // ── Subir snapshot del día ─────────────────────────────────
    const { error } = await supabase
      .from('pskloud_snapshot')
      .upsert(payload, { onConflict: 'fecha' });

    if (error) {
      console.error('  ERROR al subir snapshot a Supabase:', error.message);
    } else {
      console.log('  OK Snapshot subido a Supabase correctamente');
    }

    // ── Subir facturas individuales (para Conciliación) ────────
    // Primero descubrir los nombres reales de las columnas en operclit
    const [colRows] = await conn.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'operclit'
       ORDER BY ORDINAL_POSITION`,
      [DB.database]
    );
    const colNames = colRows.map(r => String(r.COLUMN_NAME).toLowerCase());
    console.log(`  INFO Columnas de operclit: ${colNames.join(', ')}`);

    // Resolver nombre del número de documento (distintas versiones de PSKloud)
    const colDoc   = ['nrodoc','numdoc','documento','ndoc','cod_doc','codoc'].find(c => colNames.includes(c)) || null;
    // Resolver nombre del cliente
    const colCli   = ['nomcli','nombre_cliente','nomcliente','cliente','nom_cli'].find(c => colNames.includes(c)) || null;

    if (!colDoc) {
      console.warn('  WARN No se encontró columna de documento en operclit. Columnas disponibles:', colNames.join(', '));
      console.warn('  WARN Saltando subida de facturas. Ajusta sync-pskloud.js con el nombre correcto.');
    } else {
      const selectDoc = `oc.\`${colDoc}\``;
      const selectCli = colCli ? `oc.\`${colCli}\`` : `'CLIENTE GENERAL'`;

      const [facturaRows] = await conn.query(
        `SELECT
           ${selectDoc}  AS documento,
           ${selectCli}  AS nombre_cliente,
           oc.fecha      AS fecha,
           oc.fechayhora AS fechayhora,
           oc.monto      AS monto_bs,
           oc.tipodoc    AS tipo_doc
         FROM operclit oc
         WHERE DATE(oc.fecha) = ?
           AND oc.tipodoc = 'FAC'
         UNION ALL
         SELECT
           documento,
           nombrecli AS nombre_cliente,
           emision AS fecha,
           fechayhora,
           totalfinal AS monto_bs,
           tipodoc AS tipo_doc
         FROM operti
         WHERE DATE(emision) = ?
           AND tipodoc IN ('DEV', 'N/C', 'NC')
         ORDER BY documento`,
        [today, today]
      );

      if (facturaRows.length > 0) {
        const facturasPayload = facturaRows.map(f => {
          let fechaVal = new Date().toISOString();
          if (f.fechayhora && !isNaN(new Date(f.fechayhora).getTime())) {
            fechaVal = new Date(f.fechayhora).toISOString();
          }
          
          return {
            fecha:           today,
            fechayhora:      fechaVal,
            documento:       String(f.documento || '').trim(),
            nombre_cliente:  String(f.nombre_cliente || 'CLIENTE GENERAL').trim(),
            monto_bs:        Number(f.monto_bs ?? 0),
            tipo_doc:        String(f.tipo_doc || 'FAC').trim(),
          };
        });

        const { error: facError } = await supabase
          .from('pskloud_facturas')
          .upsert(facturasPayload, { onConflict: 'fecha,documento' });

        if (facError) {
          console.error(`  ERROR al subir facturas: ${facError.message}`);
        } else {
          console.log(`  OK ${facturaRows.length} facturas subidas a pskloud_facturas`);
        }
      } else {
        console.log('  INFO Sin facturas para subir hoy');
      }
      
      // ── Subir artículos detallados para turnos ─────────────────
      const [articulosRaw] = await conn.query(
        `SELECT documento, fechayhora, grupo, nombre, cantidad
         FROM opermv
         WHERE DATE(fechadoc) = ?
           AND tipodoc = 'FAC'
           AND grupo IN ('01','02','03','04')`,
        [today]
      );
      
      if (articulosRaw.length > 0) {
         const payloadMap = {};
         for (const r of articulosRaw) {
           let cat = 'otros';
           const g = String(r.grupo).trim();
           if (g === '03') cat = 'burguer';
           else if (g === '02') cat = 'pasteles';
           else if (g === '04') cat = 'reposteria';
           
           let fechaVal = new Date().toISOString();
           if (r.fechayhora && !isNaN(new Date(r.fechayhora).getTime())) {
             fechaVal = new Date(r.fechayhora).toISOString();
           }
           
           const doc = String(r.documento).trim();
           const nom = normalizarNombre(r.nombre);
           const key = `${doc}_${nom}`;
           
           if (!payloadMap[key]) {
             payloadMap[key] = {
               fecha: today,
               fechayhora: fechaVal,
               documento: doc,
               categoria: cat,
               nombre: nom,
               cantidad: 0
             };
           }
           payloadMap[key].cantidad += Number(r.cantidad) || 0;
         }
         
         const articulosPayload = Object.values(payloadMap);

         
         const { error: artError } = await supabase
           .from('pskloud_articulos')
           .upsert(articulosPayload, { onConflict: 'documento,nombre' });
           
         if (artError) {
           console.error(`  ERROR al subir articulos: ${artError.message}`);
         } else {
           console.log(`  OK ${articulosRaw.length} articulos subidos a pskloud_articulos`);
         }
      }

    }

  } catch (err) {
    console.error('  ERROR general:', err.message);
  } finally {
    if (conn) await conn.end();
  }
}

const watchMode = process.argv.includes('--watch');
sync();
if (watchMode) {
  console.log(`\nModo Watch activo - sincronizando cada ${INTERVAL_MS / 60000} minutos. Ctrl+C para detener.\n`);
  setInterval(sync, INTERVAL_MS);
}
