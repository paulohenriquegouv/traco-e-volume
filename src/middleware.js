import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

/**
 * Protege /admin no SERVIDOR, antes de qualquer página renderizar.
 *
 * O admin/layout.js valida a sessão no navegador (useEffect), o que expulsa o
 * visitante da tela — mas só depois de o servidor ter montado e enviado o HTML.
 * Páginas de admin renderizadas no servidor (dashboard e produtos consultam o
 * banco direto) entregavam seus dados a quem pedisse a URL sem sessão nenhuma.
 *
 * Aqui a requisição é barrada antes disso. Usa só `jose`, que roda no Edge —
 * `lib/auth.js` não serve porque arrasta o driver MySQL junto.
 */

const COOKIE_NAME = 'tv_admin_token';

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-do-not-use-in-production'
);

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // A tela de login precisa ficar acessível, senão vira loop de redirecionamento
  if (pathname === '/admin/login') return NextResponse.next();

  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (token) {
    try {
      await jwtVerify(token, secret);
      return NextResponse.next();
    } catch {
      // token expirado, adulterado ou assinado com outro segredo: trata como ausente
    }
  }

  const url = request.nextUrl.clone();
  url.pathname = '/admin/login';
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
