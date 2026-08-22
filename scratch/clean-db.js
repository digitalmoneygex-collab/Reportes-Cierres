const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://gztjiljxmbpwzwgbxnru.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6dGppbGp4bWJwd3p3Z2J4bnJ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjgwMjY4OCwiZXhwIjoyMTAyMzc4Njg4fQ.xnBmQgUSP2YNmxAfJeqMdMxXS5HnvEVTN0uHg0quWT8'
);

async function main() {
  const { error } = await supabase.from('pskloud_articulos').delete().like('nombre', '%Ñ%');
  if (error) console.error(error);
  else console.log('Cleaned corrupted articles.');
}

main();
