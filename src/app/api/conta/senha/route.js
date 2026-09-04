import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { conferirToken, consumirToken } from '@/lib/tokens';
import { enviarLinkDeSenha } from '@/lib/fluxos-email';
import { problemaNaSenha, emailValido } from '@/lib/customer-auth';

export const dynamic = 'force-dynamic';

const enderecoDaLoja = () => process.env.NEXT_PUBLIC_SITE_URL || 'https://traco-e-volume.vercel.app';

/**
 * POST — pedir o link de redefinição.
 *
 * Responde sempre a mesma coisa, exista a conta ou não. Confirmar que um e-mail
 * tem cadastro entregaria a quem sonda a lista de clientes da loja.
 */
export async function POST(request) {
  const RESPOSTA = {
    ok: true,
    mensagem: 'Se existir uma conta com esse e-mail, enviamos o link para redefinir a senha.',
  };

  try {
    const { email } = await request.json();
    const limpo = String(email || '').trim().toLowerCase();
    if (!emailValido(limpo)) return NextResponse.json(RESPOSTA);

    const db = await getDb();
    const cliente = await db.prepare('SELECT id, name, email FROM customers WHERE email = ?').get(limpo);
    if (!cliente) return NextResponse.json(RESPOSTA);

    // Aguarda a criação do token (rápida); o envio em si a função supervisiona
    // com waitUntil, sem atrasar a resposta.
    await enviarLinkDeSenha(cliente).catch(e => console.error('[senha] envio falhou:', e?.message));

    return NextResponse.json(RESPOSTA);
  } catch (e) {
    console.error('[senha] erro:', e?.message);
    return NextResponse.json(RESPOSTA);
  }
}

/** GET — a tela pergunta se o link ainda vale antes de mostrar o formulário */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const registro = await conferirToken(searchParams.get('token'), 'senha');
  if (!registro) {
    return NextResponse.json({ valido: false, erro: 'Este link expirou ou já foi usado.' }, { status: 400 });
  }
  return NextResponse.json({ valido: true, email: registro.email });
}

/** PUT — define a nova senha */
export async function PUT(request) {
  try {
    const { token, senha } = await request.json();

    const problema = problemaNaSenha(senha);
    if (problema) return NextResponse.json({ erro: problema }, { status: 400 });

    const registro = await consumirToken(token, 'senha');
    if (!registro) {
      return NextResponse.json({ erro: 'Este link expirou ou já foi usado. Peça um novo.' }, { status: 400 });
    }

    const db = await getDb();
    const hash = await bcrypt.hash(String(senha), 12);
    await db.prepare('UPDATE customers SET password_hash = ? WHERE id = ?').run(hash, registro.customer_id);

    // Quem redefiniu a senha pelo e-mail provou ter acesso a ele
    await db.prepare(
      'UPDATE customers SET email_verificado_em = COALESCE(email_verificado_em, NOW()) WHERE id = ?'
    ).run(registro.customer_id);

    return NextResponse.json({ ok: true, mensagem: 'Senha alterada. Agora é só entrar.' });
  } catch (e) {
    console.error('[senha] erro ao redefinir:', e?.message);
    return NextResponse.json({ erro: 'Não foi possível redefinir. Tente novamente.' }, { status: 500 });
  }
}
