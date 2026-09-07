// Reduz a imagem NO NAVEGADOR antes de subir. Duas razoes:
//
// 1. A funcao serverless da Vercel recusa corpo de requisicao acima de ~4,5 MB,
//    e foto de celular passa disso sem esforco. Redimensionando antes, o upload
//    nunca chega perto do limite.
// 2. Foto de 12 MP servida para um celular e desperdicio puro de banda do
//    cliente e da nossa conta de CDN. A vitrine nunca mostra a imagem maior que
//    LADO_MAXIMO -- guardar mais que isso nao melhora nada na tela.
//
// Roda so no cliente (usa canvas). O original fica no acervo, nao aqui.

const LADO_MAXIMO = 1600;
const QUALIDADE = 0.85;

export async function redimensionarImagem(arquivo) {
  // SVG e vetor e GIF pode ser animado: o canvas destroi os dois (o GIF vira
  // um quadro parado). Passam direto, sem redimensionar.
  if (arquivo.type === 'image/svg+xml' || arquivo.type === 'image/gif') return arquivo;

  const bitmap = await carregarBitmap(arquivo);
  const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));

  const largura = Math.round(bitmap.width * escala);
  const altura = Math.round(bitmap.height * escala);

  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, largura, altura);
  if (bitmap.close) bitmap.close();

  // WebP economiza ~30% sobre JPEG na mesma qualidade. Se o navegador nao
  // souber gerar, toBlob devolve PNG e a gente tenta JPEG no lugar.
  let blob = await paraBlob(canvas, 'image/webp');
  if (!blob || blob.type !== 'image/webp') {
    blob = await paraBlob(canvas, 'image/jpeg');
  }
  if (!blob) return arquivo; // nao deu: sobe o original e deixa o servidor decidir

  // Se o "otimizado" ficou maior que o original (acontece com imagem ja
  // comprimida e pequena), o original vence.
  if (blob.size >= arquivo.size && escala === 1) return arquivo;

  const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
  const base = arquivo.name.replace(/\.[^.]+$/, '') || 'imagem';
  return new File([blob], base + '.' + ext, { type: blob.type });
}

function carregarBitmap(arquivo) {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(arquivo);
  }
  // Safari antigo nao tem createImageBitmap para File.
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Imagem invalida')); };
    img.src = url;
  });
}

function paraBlob(canvas, tipo) {
  return new Promise(resolve => canvas.toBlob(resolve, tipo, QUALIDADE));
}
