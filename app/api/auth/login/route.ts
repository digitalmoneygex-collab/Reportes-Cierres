import { NextResponse } from 'next/server';

const VALID_USER = process.env.ADMIN_USER ?? 'admin';
const VALID_PASS = process.env.ADMIN_PASS ?? 'Admin2024!';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json() as { username: string; password: string };

    if (username === VALID_USER && password === VALID_PASS) {
      const response = NextResponse.json({ ok: true });
      response.cookies.set('auth-token', 'gex-authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 días
        path: '/',
      });
      return response;
    }

    return NextResponse.json({ ok: false, error: 'Usuario o contraseña incorrectos' }, { status: 401 });
  } catch {
    return NextResponse.json({ ok: false, error: 'Solicitud inválida' }, { status: 400 });
  }
}
