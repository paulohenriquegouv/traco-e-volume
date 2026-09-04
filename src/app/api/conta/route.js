import { NextResponse } from 'next/server';
import {
  criarConta, autenticar, clienteAtual,
  criarTokenCliente, cookieDeSessao, cookieDeSaida,
} from '@/lib/customer-auth';

export const dynamic = 'force-dynamic';

/** GET — quem está logado (usado pelo header e pelo checkout) */
export async function GET(request) {
  const cliente = await clienteAtual(request);
  if (!cliente) return NextResponse.json({ autenticado: false });
  return NextResponse.json({
    autenticado: true,
    cliente: {
      id: cliente.id,
      nome: cliente.name,
      email: cliente.email,
      telefone: cliente.phone || '',
      documento: cliente.document || '',
      emailVerificado: !!cliente.email_verificado_em,
      aceitaMarketing: !!cliente.aceita_marketing,
    },
  });
}

/** POST — cadastrar ou entrar, conforme `acao` */
export async function POST(request) {
  try {
    const body = await request.json();
    const acao = body.acao === 'cadastrar' ? 'cadastrar' : 'entrar';

    const resultado = acao === 'cadastrar'
      ? await criarConta({
          nome: body.nome,
          email: body.email,
          senha: body.senha,
          telefone: body.telefone,
          documento: body.documento,
          aceitaMarketing: !!body.aceitaMarketing,
        })
      : await autenticar(body.email, body.senha);

    if (resultado.erro) {
      return NextResponse.json({ erro: resultado.erro }, { status: 400 });
    }

    const token = await criarTokenCliente({ id: resultado.cliente.id, email: resultado.cliente.email });
    const resposta = NextResponse.json({
      ok: true,
      cliente: { nome: resultado.cliente.name, email: resultado.cliente.email },
    });
    resposta.headers.set('Set-Cookie', cookieDeSessao(token));
    return resposta;
  } catch (e) {
    console.error('[conta] erro:', e?.message);
    return NextResponse.json({ erro: 'Não foi possível concluir. Tente novamente.' }, { status: 500 });
  }
}

/** DELETE — sair */
export async function DELETE() {
  const resposta = NextResponse.json({ ok: true });
  resposta.headers.set('Set-Cookie', cookieDeSaida());
  return resposta;
}
