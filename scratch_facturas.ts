import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabaseAdmin
    .from('pskloud_facturas')
    .select('fechayhora, monto_bs, tipo_doc')
    .gte('fechayhora', '2026-08-22T04:00:00.000Z') // 12am VET
    .lte('fechayhora', '2026-08-23T03:59:59.000Z') // 11:59pm VET
    .order('fechayhora', { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  console.log(`Total facturas: ${data.length}`);
  let totalDay = 0;
  let totalShift = 0;

  const shiftStart = new Date('2026-08-22T07:47:39.000-04:00'); // Based on user image

  for (const f of data) {
    const isNeg = f.tipo_doc === 'DEV' || f.tipo_doc === 'N/C' || f.tipo_doc === 'NC';
    const m = Number(f.monto_bs) * (isNeg ? -1 : 1);
    totalDay += m;

    const fd = new Date(f.fechayhora);
    if (fd >= shiftStart) {
      totalShift += m;
    } else {
      console.log(`Before shift: ${f.fechayhora} - ${m}`);
    }
  }

  console.log(`Total Day: ${totalDay}`);
  console.log(`Total Shift (since 07:47): ${totalShift}`);
}

main();
