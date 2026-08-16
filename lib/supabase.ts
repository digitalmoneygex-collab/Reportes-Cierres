import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export async function getSupabaseStatus() {
  if (!supabaseUrl || !serviceRoleKey) {
    return {
      ok: false,
      reason: 'Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY',
    };
  }

  try {
    const { count, error } = await supabaseAdmin
      .from('pagos_whatsapp')
      .select('*', { count: 'exact', head: true });

    if (error) {
      return {
        ok: false,
        reason: error.message,
        table: 'pagos_whatsapp',
      };
    }

    return {
      ok: true,
      url: supabaseUrl,
      table: 'pagos_whatsapp',
      count: count ?? 0,
    };
  } catch (error: any) {
    return {
      ok: false,
      reason: error?.message || 'Error al consultar Supabase',
    };
  }
}

export async function insertStressTestRows(total = 25) {
  const safeTotal = Math.max(1, Math.min(Number(total) || 25, 200));

  if (!supabaseUrl || !serviceRoleKey) {
    return { ok: false, reason: 'Faltan credenciales de Supabase' };
  }

  const rows = Array.from({ length: safeTotal }, (_, index) => ({
    telefono_emisor: `58414${String(index + 1000).padStart(6, '0')}`,
    monto_bs: Number((Math.random() * 500 + 10).toFixed(2)),
    referencia: `TEST-${Date.now()}-${index + 1}`,
    banco_origen: index % 2 === 0 ? 'Mercantil' : 'Banesco',
    metodo: 'pago_movil',
    imagen_url: `https://example.com/test-${index + 1}.jpg`,
    procesado: true,
    created_at: new Date().toISOString(),
  }));

  try {
    const { data, error } = await supabaseAdmin.from('pagos_whatsapp').insert(rows).select();

    if (error) {
      return { ok: false, reason: error.message, table: 'pagos_whatsapp' };
    }

    return {
      ok: true,
      inserted: data?.length ?? 0,
      rows: data?.slice(0, 3) ?? [],
    };
  } catch (error: any) {
    return {
      ok: false,
      reason: error?.message || 'Error insertando filas de prueba',
    };
  }
}
