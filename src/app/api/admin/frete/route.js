import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { checkAuth } from '@/lib/auth';
import { lerConfig, salvarConfig, REGIOES } from '@/lib/frete';

/** Tabela de frete: só o admin lê e escreve. */
export async function GET(request) {
  const auth = await checkAuth(request);
  if (!auth.authenticated) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const db = await getDb();
  return NextResponse.json({ config: await lerConfig(db), regioes: REGIOES });
}

export async function PUT(request) {
  const auth = await checkAuth(request);
  if (!auth.authenticated) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  try {
    const body = await request.json();
    const db = await getDb();
    // salvarConfig passa tudo por mesclarConfig: campo faltando vira padrão e
    // texto no lugar de número vira zero, nunca NaN no preço.
    const config = await salvarConfig(db, body.config ?? body);
    return NextResponse.json({ ok: true, config });
  } catch (e) {
    console.error('Erro ao salvar frete:', e?.message);
    return NextResponse.json({ error: 'Não foi possível salvar a tabela de frete.' }, { status: 500 });
  }
}
