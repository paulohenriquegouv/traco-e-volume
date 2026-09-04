const { criarToken } = require('./tokens');
const { enviarVerificacaoDeEmail, enviarRecuperacaoDeSenha } = require('./email');

/**
 * Disparos de e-mail que envolvem token.
 *
 * Ficam aqui, e não dentro de um route.js, porque o Next compila cada rota de
 * forma isolada: importar uma função exportada por um route handler funciona em
 * desenvolvimento e some no build de produção — foi exatamente o que aconteceu
 * com a verificação de e-mail do cadastro.
 */

const enderecoDaLoja = () => process.env.NEXT_PUBLIC_SITE_URL || 'https://traco-e-volume.vercel.app';

/**
 * Segura a função serverless até o trabalho terminar.
 *
 * Na Vercel a função é encerrada assim que responde: um envio disparado sem
 * espera some no meio do caminho — foi o que fez o link de recuperação nunca
 * sair em produção, embora funcionasse em desenvolvimento. waitUntil avisa a
 * plataforma para aguardar sem atrasar a resposta ao cliente.
 */
function emSegundoPlano(promessa) {
  // Não devolve a promessa de propósito: quem chama faz await só da criação do
  // token, e a resposta sai sem esperar o SMTP.
  const segura = Promise.resolve(promessa).catch(e =>
    console.error('[email] envio em segundo plano falhou:', e?.message)
  );
  try {
    const { waitUntil } = require('@vercel/functions');
    waitUntil(segura);
  } catch {
    // Fora da Vercel (dev, outro host) o processo não morre: deixar rodar basta
  }
}

async function enviarVerificacao(cliente) {
  // O token é criado com await: sem ele o link do e-mail não existe
  const token = await criarToken(cliente.id, 'verificacao');
  const url = `${enderecoDaLoja()}/verificar-email?token=${token}`;
  emSegundoPlano(enviarVerificacaoDeEmail({
    para: cliente.email,
    nome: cliente.name || cliente.nome || 'cliente',
    url,
  }));
  return { ok: true, token: true };
}

async function enviarLinkDeSenha(cliente) {
  const token = await criarToken(cliente.id, 'senha');
  const url = `${enderecoDaLoja()}/redefinir-senha?token=${token}`;
  emSegundoPlano(enviarRecuperacaoDeSenha({
    para: cliente.email,
    nome: cliente.name || cliente.nome || 'cliente',
    url,
  }));
  return { ok: true, token: true };
}

module.exports = { enviarVerificacao, enviarLinkDeSenha };
