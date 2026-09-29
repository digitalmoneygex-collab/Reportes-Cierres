import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const documento = searchParams.get('documento');

  if (!documento) {
    return NextResponse.json({ ok: false, error: 'Documento requerido' }, { status: 400 });
  }

  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '1234',
      database: process.env.DB_NAME || 'adminzuilia',
    });

    const [rows] = await conn.query(`
      SELECT 
        nombre, 
        cantidad, 
        preciofin AS precio, 
        montototal AS total
      FROM opermv
      WHERE tipodoc = 'FAC' AND TRIM(documento) = ?
      ORDER BY nombre
    `, [documento.trim()]);

    await conn.end();
    
    return NextResponse.json({ ok: true, detalles: rows });
  } catch (error: any) {
    if (conn) await conn.end();
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
