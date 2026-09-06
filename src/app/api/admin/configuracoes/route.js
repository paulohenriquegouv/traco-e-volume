import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { checkAuth } from '@/lib/auth';
import { lerConfigLoja, salvarBloco, CHAVES } from '@/lib/config-loja';

/** Parâmetros da loja: só o admin lê e escreve. */
export async function GET(request) {
  const auth = await checkAuth(request);
  if (!auth.authenticated) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const db = await getDb();
  return NextResponse.json({ config: await lerConfigLoja(db) });
}

/**
 * Salva um bloco por vez (`loja`, `vitrine`, `pagamento`, `prazos`).
 *
 * Bloco a bloco de propósito: duas abas abertas em janelas diferentes não se
 * atropelam, e quem salva a vitrine não regrava o que a outra tela mudou.
 */
export async function PUT(request) {
  const auth = await checkAuth(request);
  if (!auth.authenticated) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  try {
    const body = await request.json();
    const bloco = String(body.bloco || '');
    if (!CHAVES.includes(bloco)) {
      return NextResponse.json({ error: 'Bloco de configuração desconhecido.' }, { status: 400 });
    }
    const db = await getDb();
    // salvarBloco passa tudo pela mescla: campo em branco vira o padrão e número
    // inválido não vira NaN gravado no banco.
    const valor = await salvarBloco(db, bloco, body.valores ?? {});
    return NextResponse.json({ ok: true, bloco, valor });
  } catch (e) {
    console.error('Erro ao salvar configuração:', e?.message);
    return NextResponse.json({ error: 'Não foi possível salvar as configurações.' }, { status: 500 });
  }
}
