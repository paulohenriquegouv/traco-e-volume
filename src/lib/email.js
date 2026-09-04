const nodemailer = require('nodemailer');

/**
 * Envio de e-mail da loja.
 *
 * Regra central: nenhuma falha de envio pode derrubar a operação que a disparou.
 * Se o SMTP estiver fora do ar, o cliente ainda precisa conseguir pagar e ver a
 * tela de sucesso — o e-mail é consequência da compra, não condição dela.
 */

let transporte = null;

function obterTransporte() {
  if (transporte) return transporte;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;

  const port = Number(process.env.SMTP_PORT || 587);
  transporte = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // 465 abre já em TLS; 587 negocia com STARTTLS
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
  return transporte;
}

const remetente = () => process.env.SMTP_FROM || process.env.SMTP_USER || 'Traço & Volume';
const enderecoDaLoja = () => process.env.NEXT_PUBLIC_SITE_URL || 'https://traco-e-volume.vercel.app';

/**
 * Falha temporária do servidor: código 4xx no SMTP quer dizer "tente de novo".
 * A Locaweb responde "454 Try again later" quando chegam envios em rajada — o
 * que acontece, por exemplo, quando alguém pede recuperação de senha logo após
 * se cadastrar.
 */
function ehTemporario(e) {
  const codigo = Number(e?.responseCode) || 0;
  if (codigo >= 400 && codigo < 500) return true;
  return /try again|4\.3\.0|4\.7\.0|temporar|timeout|ETIMEDOUT|ECONNRESET|EAI_AGAIN/i.test(String(e?.message || ''));
}

const esperar = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Envia e nunca lança. Devolve { ok } ou { ok:false, motivo } para o chamador
 * registrar, se quiser. Repete quando a falha é temporária.
 */
async function enviar({ para, assunto, html, texto }) {
  const t = obterTransporte();
  if (!t) {
    console.warn('[email] SMTP não configurado — envio ignorado:', assunto);
    return { ok: false, motivo: 'smtp-nao-configurado' };
  }

  const mensagem = {
    from: remetente(),
    to: para,
    subject: assunto,
    text: texto || html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    html,
  };

  const esperas = [0, 3000, 8000];
  let ultimoErro = null;

  for (let i = 0; i < esperas.length; i++) {
    if (esperas[i]) await esperar(esperas[i]);
    try {
      const info = await t.sendMail(mensagem);
      if (i > 0) console.log(`[email] enviado na tentativa ${i + 1}:`, assunto, '->', para);
      else console.log('[email] enviado:', assunto, '->', para, '|', info.messageId);
      return { ok: true };
    } catch (e) {
      ultimoErro = e;
      if (!ehTemporario(e)) break; // erro definitivo: insistir não adianta
      console.warn(`[email] tentativa ${i + 1} adiada (${e?.message?.slice(0, 60)})`);
    }
  }

  console.error('[email] falhou:', assunto, '->', para, '|', ultimoErro?.message);
  return { ok: false, motivo: ultimoErro?.message };
}

// ---------------------------------------------------------------- modelos

const CORES = { tinta: '#1f2937', suave: '#6b7280', linha: '#e5e7eb', destaque: '#4f46e5' };

function moldura(conteudo, rodapeExtra = '') {
  const loja = enderecoDaLoja();
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px 12px;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:${CORES.tinta}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="100%" style="max-width:540px;background:#fff;border:1px solid ${CORES.linha};border-radius:12px" cellpadding="0" cellspacing="0">
      <tr><td style="padding:24px 28px 8px">
        <div style="font-size:18px;font-weight:700;color:${CORES.destaque}">Traço &amp; Volume</div>
        <div style="font-size:12px;color:${CORES.suave}">impressão 3D</div>
      </td></tr>
      <tr><td style="padding:8px 28px 28px;font-size:15px;line-height:1.6">${conteudo}</td></tr>
    </table>
    <div style="max-width:540px;margin-top:16px;font-size:12px;color:${CORES.suave};line-height:1.5">
      ${rodapeExtra}
      <a href="${loja}" style="color:${CORES.suave}">${loja.replace(/^https?:\/\//, '')}</a>
    </div>
  </td></tr></table>
</body></html>`;
}

function botao(texto, url) {
  return `<a href="${url}" style="display:inline-block;background:${CORES.destaque};color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:15px">${texto}</a>`;
}

const dinheiro = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

async function enviarRecuperacaoDeSenha({ para, nome, url }) {
  const html = moldura(`
    <p>Olá, ${nome.split(' ')[0]}.</p>
    <p>Recebemos um pedido para redefinir a senha da sua conta. Clique no botão abaixo:</p>
    <p style="margin:24px 0">${botao('Criar nova senha', url)}</p>
    <p style="color:${CORES.suave};font-size:13px">
      O link vale por <strong>1 hora</strong> e só pode ser usado uma vez.
    </p>
    <p style="color:${CORES.suave};font-size:13px">
      Se não foi você que pediu, ignore este e-mail — sua senha atual continua valendo.
    </p>
  `);
  return enviar({ para, assunto: 'Redefinir sua senha — Traço & Volume', html });
}

async function enviarVerificacaoDeEmail({ para, nome, url }) {
  const html = moldura(`
    <p>Olá, ${nome.split(' ')[0]}.</p>
    <p>Sua conta foi criada. Confirme seu e-mail para ativar a recuperação de senha e ver seus pedidos anteriores:</p>
    <p style="margin:24px 0">${botao('Confirmar meu e-mail', url)}</p>
    <p style="color:${CORES.suave};font-size:13px">O link vale por 7 dias.</p>
  `);
  return enviar({ para, assunto: 'Confirme seu e-mail — Traço & Volume', html });
}

async function enviarConfirmacaoDePedido({ para, nome, pedido, itens, endereco }) {
  const loja = enderecoDaLoja();
  const linhas = (itens || []).map(i => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid ${CORES.linha}">
        ${i.product_name}<br><span style="color:${CORES.suave};font-size:13px">${i.quantity} × ${dinheiro(i.unit_price)}</span>
      </td>
      <td style="padding:8px 0;border-bottom:1px solid ${CORES.linha};text-align:right;white-space:nowrap">${dinheiro(i.total)}</td>
    </tr>`).join('');

  const blocoEndereco = endereco?.address ? `
    <p style="margin-top:24px"><strong>Entrega</strong><br>
    <span style="color:${CORES.suave};font-size:14px">
      ${endereco.address}${endereco.number ? `, ${endereco.number}` : ''}${endereco.complement ? ` — ${endereco.complement}` : ''}<br>
      ${endereco.neighborhood ? `${endereco.neighborhood}, ` : ''}${endereco.city}${endereco.state ? `/${endereco.state}` : ''}
      ${endereco.zip ? `· CEP ${endereco.zip}` : ''}
    </span></p>` : '';

  const html = moldura(`
    <p>Olá, ${nome.split(' ')[0]}.</p>
    <p><strong>Seu pagamento foi confirmado</strong> e já estamos preparando o pedido
      <strong>#${pedido.order_id}</strong>.</p>

    <table role="presentation" width="100%" style="margin-top:20px;font-size:14px" cellpadding="0" cellspacing="0">
      ${linhas}
      <tr>
        <td style="padding:12px 0;font-weight:700">Total</td>
        <td style="padding:12px 0;text-align:right;font-weight:700">${dinheiro(pedido.total)}</td>
      </tr>
    </table>

    ${blocoEndereco}

    <p style="margin:24px 0">${botao('Acompanhar pedido', `${loja}/pedido?id=${pedido.order_id}`)}</p>
    <p style="color:${CORES.suave};font-size:13px">
      Avisamos por aqui quando ele for enviado.
    </p>
  `);
  return enviar({ para, assunto: `Pagamento confirmado — pedido #${pedido.order_id}`, html });
}

module.exports = {
  enviar,
  enviarRecuperacaoDeSenha,
  enviarVerificacaoDeEmail,
  enviarConfirmacaoDePedido,
  smtpConfigurado: () => !!obterTransporte(),
};
