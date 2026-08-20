import { supabaseAdmin } from '@/lib/supabase';

// Venezuela timezone offset helper
function toVenezuelaDate(date: Date): Date {
  return new Date(date.toLocaleString('en-US', { timeZone: 'America/Caracas' }));
}

function parseHHMM(timeStr: string): { h: number; m: number } {
  const [h, m] = timeStr.split(':').map(Number);
  return { h: h ?? 0, m: m ?? 0 };
}

export async function getTasaDelDia(force = false): Promise<number> {
  const { data: config } = await supabaseAdmin
    .from('configuracion')
    .select('*')
    .eq('id', 1)
    .single();

  if (!config) return 0;

  const { 
    tasa_dolar, 
    ultima_actualizacion_tasa, 
    horario_1, 
    horario_2, 
    horario_3 
  } = config;

  const now = new Date();
  const vzNow = toVenezuelaDate(now);
  const currentMinutes = vzNow.getHours() * 60 + vzNow.getMinutes();

  let shouldUpdate = force;

  if (!force) {
    if (!ultima_actualizacion_tasa) {
      shouldUpdate = true;
    } else {
      const lastUpdate = new Date(ultima_actualizacion_tasa);
      const vzLastUpdate = toVenezuelaDate(lastUpdate);
      
      if (
        vzLastUpdate.getDate() !== vzNow.getDate() ||
        vzLastUpdate.getMonth() !== vzNow.getMonth() ||
        vzLastUpdate.getFullYear() !== vzNow.getFullYear()
      ) {
        shouldUpdate = true;
      } else {
        const lastMinutes = vzLastUpdate.getHours() * 60 + vzLastUpdate.getMinutes();
        const schedules = [horario_1, horario_2, horario_3]
          .filter(Boolean)
          .map(h => {
            const { h: hh, m: mm } = parseHHMM(h);
            return hh * 60 + mm;
          });

        for (const sched of schedules) {
          if (currentMinutes >= sched && lastMinutes < sched) {
            shouldUpdate = true;
            break;
          }
        }
      }
    }
  }

  let newTasa = tasa_dolar || 0;

  if (shouldUpdate) {
    const apiKey = process.env.COTIZA_VE_KEY;
    if (apiKey) {
      try {
        const res = await fetch('https://api.cotizave.com/v1/fx/rates/reference', {
          headers: { 'X-API-Key': apiKey },
          cache: 'no-store'
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.mid) {
            newTasa = Number(data.mid);
            await supabaseAdmin
              .from('configuracion')
              .update({
                tasa_dolar: newTasa,
                ultima_actualizacion_tasa: now.toISOString()
              })
              .eq('id', 1);
          }
        }
      } catch (e) {
        console.error('Error fetching cotizave', e);
      }
    }
  }

  return newTasa;
}
