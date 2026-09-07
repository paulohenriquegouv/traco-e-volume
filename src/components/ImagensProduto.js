'use client';

import { useState } from 'react';
import { redimensionarImagem } from '@/lib/redimensionar-imagem';

// Bloco de imagens do produto, compartilhado pelas telas de novo e de editar.
// Dois caminhos para a mesma lista: enviar arquivo (vai para o Vercel Blob) ou
// colar a URL de uma imagem ja hospedada. O campo de URL e o plano B quando o
// upload falha -- e o unico caminho quando o arquivo passa do limite da funcao.

// Servicos que NAO servem como origem de <img>: o link nao aponta para o
// arquivo, ele redireciona para um visualizador HTML, exige sessao e sofre
// throttling. Avisar aqui e mais barato que descobrir na vitrine quebrada.
const DOMINIOS_QUE_NAO_SERVEM = [
  { padrao: /sharepoint\.com|1drv\.ms|onedrive\.live\.com/i, nome: 'SharePoint/OneDrive' },
  { padrao: /drive\.google\.com/i, nome: 'Google Drive' },
  { padrao: /dropbox\.com/i, nome: 'Dropbox' },
  { padrao: /docs\.google\.com/i, nome: 'Google Docs' },
];

export default function ImagensProduto({ images, onChange }) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [urlColada, setUrlColada] = useState('');

  const enviarArquivo = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite reenviar o mesmo arquivo depois de um erro
    if (!file) return;

    setErro('');
    setEnviando(true);
    try {
      const reduzida = await redimensionarImagem(file);
      const fd = new FormData();
      fd.append('file', reduzida);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Falha no upload');
      onChange([...images, data.url]);
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  };

  const adicionarUrl = () => {
    const url = urlColada.trim();
    if (!url) return;

    if (!/^https?:\/\//i.test(url) && !url.startsWith('/')) {
      setErro('A URL precisa começar com https:// (ou com / se o arquivo for do próprio site).');
      return;
    }

    const bloqueado = DOMINIOS_QUE_NAO_SERVEM.find(d => d.padrao.test(url));
    if (bloqueado) {
      setErro(
        `Link do ${bloqueado.nome} não funciona como imagem de site: ele abre um visualizador, ` +
        `não o arquivo. Envie a foto pelo botão + acima.`
      );
      return;
    }

    if (images.includes(url)) {
      setErro('Essa imagem já está na lista.');
      return;
    }

    setErro('');
    setUrlColada('');
    onChange([...images, url]);
  };

  const remover = (i) => {
    setErro('');
    onChange(images.filter((_, idx) => idx !== i));
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
      <h3 className="font-bold text-gray-900">Imagens</h3>

      <div className="flex flex-wrap gap-3">
        {images.map((url, i) => (
          <div key={url + i} className="relative group">
            <div className="w-20 h-20 bg-gray-50 rounded-lg overflow-hidden border">
              <img src={url} alt="" className="w-full h-full object-cover" />
            </div>
            <button
              type="button"
              onClick={() => remover(i)}
              aria-label={'Remover imagem ' + (i + 1)}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border border-gray-200 text-gray-500 shadow-sm flex items-center justify-center hover:bg-red-50 hover:text-red-600 hover:border-red-200"
            >
              ×
            </button>
            {i === 0 && (
              <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center py-0.5 rounded-b-lg">
                capa
              </span>
            )}
          </div>
        ))}

        <label className={
          'w-20 h-20 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center hover:border-primary-300 ' +
          (enviando ? 'cursor-wait opacity-60' : 'cursor-pointer')
        }>
          {enviando ? (
            <span className="spinner" aria-hidden="true" />
          ) : (
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
          )}
          <input type="file" accept="image/*" onChange={enviarArquivo} disabled={enviando} className="hidden" />
        </label>
      </div>

      <p className="text-xs text-gray-400">
        A primeira imagem é a capa, usada no card da vitrine. As fotos são reduzidas para 1600 px antes de subir.
      </p>

      <div className="pt-2 border-t border-gray-100">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Ou cole a URL de uma imagem
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            value={urlColada}
            onChange={e => setUrlColada(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); adicionarUrl(); } }}
            placeholder="https://..."
            className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={adicionarUrl}
            className="px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50"
          >
            Adicionar
          </button>
        </div>
      </div>

      {erro && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{erro}</div>}
    </div>
  );
}
