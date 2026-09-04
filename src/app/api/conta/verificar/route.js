import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { consumirToken } from '@/lib/tokens';
import { enviarVerificacao } from '@/lib/fluxos-email';
import { clienteAtual, adotarPedidosAntigos } from '@/lib/customer-auth';

export const dynamic = 'force-dynamic';

/** POST — reenviar para quem está logado */
export async function POST(request) {
  const cliente = await clienteAtual(request);
  if (!cliente) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 });
  if (cliente.email_verificado_em) {
    return NextResponse.json({ ok: true, mensagem: 'Seu e-mail já está confirmado.' });
  }

  enviarVerificacao(cliente).catch(e => console.error('[verificar] envio falhou:', e?.message));
  return NextResponse.json({ ok: true, mensagem: 'Enviamos o link de confirmação para o seu e-mail.' });
}

/** PUT — confirma o e-mail a partir do token do link */
export async function PUT(request) {
  try {
    const { token } = await request.json();
    const registro = await consumirToken(token, 'verificacao');
    if (!registro) {
      return NextResponse.json({ erro: 'Este link expirou ou já foi usado.' }, { status: 400 });
    }

    const db = await getDb();
    await db.prepare(
      'UPDATE customers SET email_verificado_em = COALESCE(email_verificado_em, NOW()) WHERE id = ?'
    ).run(registro.customer_id);

    // Agora sim: com o e-mail provado, os pedidos feitos antes da conta podem
    // ser ligados a ela sem risco de entregar histórico alheio.
    const { adotados } = await adotarPedidosAntigos(registro.customer_id);

    return NextResponse.json({
      ok: true,
      email: registro.email,
      pedidosAdotados: adotados,
      mensagem: adotados > 0
        ? `E-mail confirmado. Encontramos ${adotados} pedido${adotados > 1 ? 's' : ''} feito${adotados > 1 ? 's' : ''} antes da sua conta e já ${adotados > 1 ? 'estão' : 'está'} no seu histórico.`
        : 'E-mail confirmado.',
    });
  } catch (e) {
    console.error('[verificar] erro:', e?.message);
    return NextResponse.json({ erro: 'Não foi possível confirmar. Tente novamente.' }, { status: 500 });
  }
}
