import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { checkAuth } from '@/lib/auth';

// A imagem vai para o Vercel Blob, nao para o disco.
//
// O motivo: na Vercel o filesystem da funcao e somente leitura (so /tmp aceita
// escrita, e /tmp morre junto com a invocacao). A versao antiga desta rota
// gravava em public/uploads com fs.writeFile -- funcionava no `npm run dev` e
// falhava calada em producao. Pior: public/uploads/* esta no .gitignore, entao
// nem a imagem enviada localmente chegava ao deploy.
//
// Blob devolve URL publica, permanente e servida por CDN. O banco guarda so a URL.

const TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/svg+xml'];
const TAMANHO_MAXIMO = 4 * 1024 * 1024; // abaixo do limite de corpo da funcao (~4,5 MB)

export async function POST(request) {
  try {
    const auth = await checkAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    if (!TIPOS_ACEITOS.includes(file.type)) {
      return NextResponse.json(
        { error: 'Formato não aceito. Use JPG, PNG, WebP, AVIF, GIF ou SVG.' },
        { status: 400 }
      );
    }

    if (file.size > TAMANHO_MAXIMO) {
      return NextResponse.json(
        { error: 'Imagem muito grande (máximo 4 MB). Reduza a foto ou cole a URL de uma imagem já hospedada.' },
        { status: 413 }
      );
    }

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const nome = `produtos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    // Sem token configurado (tipico no `npm run dev`), cai no disco local para
    // nao travar o desenvolvimento. Em producao o token sempre existe.
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      const url = await gravarNoDiscoLocal(file, nome);
      return NextResponse.json({ success: true, url, destino: 'disco-local' });
    }

    const blob = await put(nome, file, {
      access: 'public',
      contentType: file.type,
      addRandomSuffix: false,
    });

    return NextResponse.json({ success: true, url: blob.url, destino: 'blob' });
  } catch (error) {
    console.error('Erro no upload:', error);
    return NextResponse.json({ error: 'Erro ao fazer upload: ' + error.message }, { status: 500 });
  }
}

async function gravarNoDiscoLocal(file, nome) {
  const { writeFile, mkdir } = await import('fs/promises');
  const { join, dirname } = await import('path');
  const destino = join(process.cwd(), 'public', 'uploads', nome);
  await mkdir(dirname(destino), { recursive: true });
  await writeFile(destino, Buffer.from(await file.arrayBuffer()));
  return `/uploads/${nome}`;
}
