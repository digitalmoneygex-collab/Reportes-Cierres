import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { normalizarNombre } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');

    if (!startParam || !endParam) {
      return NextResponse.json({ ok: false, error: 'Faltan parámetros start y end' }, { status: 400 });
    }

    const { data: articulos, error } = await supabaseAdmin
      .from('pskloud_articulos')
      .select('nombre, categoria, cantidad, fechayhora')
      .gte('fechayhora', startParam)
      .lte('fechayhora', endParam);

    if (error) throw error;

    // Agrupar
    const itemsMap = new Map<string, {
      nombre: string;
      categoria: string;
      total: number;
      byHour: number[];
      byShift: number[];
    }>();

    for (const row of articulos || []) {
      const cat = row.categoria || 'otros';
      const nom = normalizarNombre(row.nombre);
      const qty = Number(row.cantidad) || 0;
      
      const key = `${cat}_${nom}`;
      if (!itemsMap.has(key)) {
        itemsMap.set(key, {
          nombre: nom,
          categoria: cat,
          total: 0,
          byHour: Array(24).fill(0),
          byShift: [0, 0, 0], // Shift 0: 6am-2pm, Shift 1: 2pm-10pm, Shift 2: 10pm-6am
        });
      }

      const item = itemsMap.get(key)!;
      item.total += qty;

      if (row.fechayhora) {
        const date = new Date(row.fechayhora);
        // Ajustar a la zona horaria de Venezuela
        const vzDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Caracas' }));
        const hour = vzDate.getHours();

        item.byHour[hour] += qty;

        if (hour >= 6 && hour < 14) {
          item.byShift[0] += qty;
        } else if (hour >= 14 && hour < 22) {
          item.byShift[1] += qty;
        } else {
          item.byShift[2] += qty;
        }
      }
    }

    const result = Array.from(itemsMap.values());
    result.sort((a, b) => b.total - a.total); // Ordenar por ventas

    return NextResponse.json({
      ok: true,
      data: result
    });

  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
