const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL  = 'https://gztjiljxmbpwzwgbxnru.supabase.co';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6dGppbGp4bWJwd3p3Z2J4bnJ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjgwMjY4OCwiZXhwIjoyMTAyMzc4Njg4fQ.xnBmQgUSP2YNmxAfJeqMdMxXS5HnvEVTN0uHg0quWT8';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const { data, error } = await supabase
    .from('pskloud_facturas')
    .update({ metodo_pago: null, procesado: false })
    .eq('documento', '00000014');
    
  console.log('Update Result:', data, error);
}

run();
