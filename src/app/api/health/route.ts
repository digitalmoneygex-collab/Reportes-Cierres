export async function GET() {
  return Response.json({ ok: true, service: 'reportes-cierres', timestamp: new Date().toISOString() });
}
