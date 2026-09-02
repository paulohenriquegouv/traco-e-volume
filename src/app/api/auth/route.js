import { NextResponse } from 'next/server';
import { loginAdmin, setAuthCookie, clearAuthCookie, checkAuth } from '@/lib/auth';

// POST /api/auth — Login
export async function POST(request) {
  try {
    const { username, password } = await request.json();
    if (!username || !password) {
      return NextResponse.json({ error: 'Usuário e senha são obrigatórios' }, { status: 400 });
    }

    const result = await loginAdmin(username, password);
    if (!result) {
      return NextResponse.json({ error: 'Usuário ou senha inválidos' }, { status: 401 });
    }

    const response = NextResponse.json({ success: true, user: result.user });
    setAuthCookie(response, result.token);
    return response;
  } catch (error) {
    console.error('Erro no login:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// GET /api/auth — Verificar sessão
export async function GET(request) {
  const auth = await checkAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, user: auth.user });
}

// DELETE /api/auth — Logout
export async function DELETE(request) {
  const response = NextResponse.json({ success: true, message: 'Logout realizado' });
  clearAuthCookie(response);
  return response;
}