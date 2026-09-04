import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

/**
 * TEMPORÁRIO — diagnóstico da conexão com o banco a partir do servidor.
 *
 * Existe só para descobrir por que a Vercel não conecta. Não expõe credenciais:
 * devolve host, porta, usuário e o código do erro. Remover depois.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const url = process.env.DATABASE_URL || '';
  if (!url) return NextResponse.json({ erro: 'DATABASE_URL ausente no ambiente' });

  let u;
  try {
    u = new URL(url);
  } catch {
    return NextResponse.json({ erro: 'DATABASE_URL com formato invalido', tamanho: url.length });
  }

  const info = {
    host: u.hostname,
    porta: u.port || '3306',
    usuario: decodeURIComponent(u.username),
    banco: u.pathname.replace(/^\//, ''),
    tamanhoDaSenha: decodeURIComponent(u.password || '').length,
    regiao: process.env.VERCEL_REGION || '(desconhecida)',
  };

  const tentativas = [];
  for (const comSsl of [true, false]) {
    const inicio = Date.now();
    try {
      const conn = await mysql.createConnection({
        host: u.hostname,
        port: Number(u.port || 3306),
        user: decodeURIComponent(u.username),
        password: decodeURIComponent(u.password),
        database: u.pathname.replace(/^\//, ''),
        ...(comSsl ? { ssl: { rejectUnauthorized: false } } : {}),
        connectTimeout: 10000,
      });
      const [r] = await conn.query('SELECT COUNT(*) as c FROM products');
      await conn.end();
      tentativas.push({ ssl: comSsl, ok: true, ms: Date.now() - inicio, produtos: r[0].c });
      break;
    } catch (e) {
      tentativas.push({
        ssl: comSsl,
        ok: false,
        ms: Date.now() - inicio,
        codigo: e.code || null,
        errno: e.errno || null,
        mensagem: String(e.message || '').slice(0, 200),
      });
    }
  }

  return NextResponse.json({ info, tentativas });
}
