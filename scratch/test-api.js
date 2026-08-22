async function main() {
  const url = 'http://localhost:3000/api/pskloud/resumen?abierto_at=2026-08-21T14%3A00%3A00%2B00%3A00';
  console.log('Fetching', url);
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log('Result ok:', data.ok);
    console.log('corteCaja:', data.corteCaja);
  } catch(e) {
    console.error(e);
  }
}
main();
