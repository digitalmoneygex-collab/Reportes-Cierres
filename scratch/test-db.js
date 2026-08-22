const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://gztjiljxmbpwzwgbxnru.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6dGppbGp4bWJwd3p3Z2J4bnJ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjgwMjY4OCwiZXhwIjoyMTAyMzc4Njg4fQ.xnBmQgUSP2YNmxAfJeqMdMxXS5HnvEVTN0uHg0quWT8'
);

async function main() {
  console.log('--- ARTICULOS ---');
  const { data: arts } = await supabase.from('pskloud_articulos').select('*').limit(5);
  console.log(arts);

  console.log('--- TURNOS ---');
  const { data: turnos } = await supabase.from('turnos').select('*').order('abierto_at', { ascending: false }).limit(3);
  console.log(turnos);

  console.log('--- FACTURAS ---');
  const { data: facs } = await supabase.from('pskloud_facturas').select('*').order('fechayhora', { ascending: true }).limit(5);
  console.log(facs.map(f => `${f.documento} - ${f.fechayhora} - ${f.monto_bs} - ${f.tipo_doc}`));
  
  const { data: devs } = await supabase.from('pskloud_facturas').select('*').in('tipo_doc', ['DEV', 'N/C', 'NC']).order('fechayhora', { ascending: false }).limit(5);
  console.log('--- DEVS ---');
  console.log(devs.map(f => `${f.documento} - ${f.fechayhora} - ${f.monto_bs} - ${f.tipo_doc}`));
}

main();
