'use client';

import { useEffect, useState } from 'react';

const dinheiro = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/**
 * Sugestão de partida para quem está com a tabela zerada.
 *
 * Não é preço oficial de ninguém: é um ponto de partida plausível para uma loja
 * que despacha do Norte, para o lojista ajustar com a transportadora dele. Só
 * entra nos campos quando alguém clica — e só vale depois de salvar. A loja
 * nasce com tudo zerado de propósito, para não cobrar do cliente um valor que
 * ninguém escolheu.
 */
const SUGESTAO = {
  norte: { base: 22, kg_extra: 6, prazo_dias: 5 },
  nordeste: { base: 28, kg_extra: 8, prazo_dias: 8 },
  centro_oeste: { base: 30, kg_extra: 9, prazo_dias: 8 },
  sudeste: { base: 32, kg_extra: 10, prazo_dias: 9 },
  sul: { base: 35, kg_extra: 11, prazo_dias: 10 },
};

const ic = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500';

export default function PainelFrete() {
  const [config, setConfig] = useState(null);
  const [regioes, setRegioes] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    fetch('/api/admin/frete')
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Não foi possível carregar');
        setConfig(d.config);
        setRegioes(d.regioes);
      })
      .catch(e => setErro(e.message));
  }, []);

  if (erro && !config) return <p className="text-red-600">{erro}</p>;
  if (!config) return <p className="text-sm text-gray-400">Carregando tabela de frete...</p>;

  const mudarRegiao = (chave, campo, valor) => {
    setConfig(c => ({
      ...c,
      regioes: { ...c.regioes, [chave]: { ...c.regioes[chave], [campo]: valor } },
    }));
  };

  const mudarEmbalagem = (i, campo, valor) => {
    setConfig(c => ({
      ...c,
      embalagens: c.embalagens.map((e, j) => (j === i ? { ...e, [campo]: valor } : e)),
    }));
  };

  const adicionarEmbalagem = () => {
    setConfig(c => ({
      ...c,
      // id vazio: quem batiza é o servidor, a partir do nome, na hora de salvar.
      embalagens: [...(c.embalagens || []), { id: '', nome: '', length_cm: '', width_cm: '', height_cm: '', peso_g: '' }],
    }));
  };

  const removerEmbalagem = (i) => {
    setConfig(c => ({ ...c, embalagens: c.embalagens.filter((_, j) => j !== i) }));
  };

  const aplicarSugestao = () => {
    setConfig(c => ({
      ...c,
      regioes: Object.fromEntries(
        Object.keys(c.regioes).map(k => [k, { ...c.regioes[k], ...(SUGESTAO[k] || {}) }])
      ),
    }));
    setAviso('Sugestão preenchida nos campos. Confira os valores e clique em Salvar.');
  };

  const zerado = Object.values(config.regioes).every(r => Number(r.base) === 0 && Number(r.kg_extra) === 0);

  const salvar = async (e) => {
    e.preventDefault();
    setSalvando(true); setErro(''); setAviso('');
    try {
      const r = await fetch('/api/admin/frete', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Falha ao salvar');
      setConfig(d.config);
      setAviso('Tabela de frete salva. Já vale para os próximos pedidos.');
    } catch (e2) {
      setErro(e2.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div>
      <p className="text-sm text-gray-500 mb-6">
        O preço da entrega é a base da região mais o adicional por quilo que passar do peso base.
        O peso vem do cadastro do produto.
      </p>

      {zerado && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 mb-6">
          <strong>A tabela está zerada.</strong> Enquanto estiver assim, todo pedido sai com frete
          grátis — que é como a loja funcionava antes desta tela existir.
          <button type="button" onClick={aplicarSugestao} className="btn underline font-medium ml-1">
            Preencher com uma sugestão de partida
          </button>{' '}
          e conferir com a sua transportadora.
        </div>
      )}

      {aviso && <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 text-sm mb-6">{aviso}</div>}
      {erro && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm mb-6">{erro}</div>}

      <form onSubmit={salvar} className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="font-bold text-gray-900 mb-4">Preço por região</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="pb-2 font-medium">Região</th>
                  <th className="pb-2 font-medium w-36">Base (R$)</th>
                  <th className="pb-2 font-medium w-36">Por kg extra (R$)</th>
                  <th className="pb-2 font-medium w-32">Prazo (dias)</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(config.regioes).map(([chave, r]) => (
                  <tr key={chave} className="border-t border-gray-50">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-gray-900">{regioes[chave]?.nome || chave}</p>
                      <p className="text-xs text-gray-400">{(regioes[chave]?.ufs || []).join(' · ')}</p>
                    </td>
                    <td className="py-3 pr-3">
                      <input type="number" min="0" step="0.01" value={r.base}
                        onChange={e => mudarRegiao(chave, 'base', e.target.value)} className={ic} />
                    </td>
                    <td className="py-3 pr-3">
                      <input type="number" min="0" step="0.01" value={r.kg_extra}
                        onChange={e => mudarRegiao(chave, 'kg_extra', e.target.value)} className={ic} />
                    </td>
                    <td className="py-3">
                      <input type="number" min="0" step="1" value={r.prazo_dias}
                        onChange={e => mudarRegiao(chave, 'prazo_dias', e.target.value)} className={ic} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="font-bold text-gray-900 mb-4">Peso e frete grátis</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Peso base (g)</label>
              <input type="number" min="0" step="1" value={config.peso_base_g}
                onChange={e => setConfig(c => ({ ...c, peso_base_g: e.target.value }))} className={ic} />
              <p className="text-xs text-gray-400 mt-1">Até este peso o pedido paga só a base.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Peso padrão (g)</label>
              <input type="number" min="0" step="1" value={config.peso_padrao_g}
                onChange={e => setConfig(c => ({ ...c, peso_padrao_g: e.target.value }))} className={ic} />
              <p className="text-xs text-gray-400 mt-1">Usado quando o produto está sem peso cadastrado.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frete grátis acima de (R$)</label>
              <input type="number" min="0" step="0.01" value={config.gratis_acima}
                onChange={e => setConfig(c => ({ ...c, gratis_acima: e.target.value }))} className={ic} />
              <p className="text-xs text-gray-400 mt-1">
                {Number(config.gratis_acima) > 0
                  ? `Pedido a partir de ${dinheiro(config.gratis_acima)} não paga entrega.`
                  : 'Zero desliga a regra.'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="font-bold text-gray-900 mb-1">Embalagens</h2>
          <p className="text-sm text-gray-500 mb-4">
            As caixas que você usa de verdade. O que a transportadora mede é a caixa, não a peça:
            um vaso de 12 cm dentro de uma caixa de 20 cm viaja como 20 cm. No cadastro do produto
            você escolhe qual caixa ele usa; sem escolher, valem as medidas do próprio produto.
          </p>

          {(config.embalagens || []).length === 0 && (
            <p className="text-sm text-gray-400 mb-4">
              Nenhuma caixa cadastrada — o frete usa as medidas de cada produto.
            </p>
          )}

          <div className="space-y-3">
            {(config.embalagens || []).map((e, i) => (
              <div key={i} className="grid grid-cols-2 md:grid-cols-12 gap-2 items-start">
                <div className="col-span-2 md:col-span-4">
                  <input type="text" value={e.nome} placeholder="Nome (ex: Caixa média)"
                    onChange={ev => mudarEmbalagem(i, 'nome', ev.target.value)} className={ic} />
                  {i === 0 && <p className="text-xs text-gray-400 mt-1">Nome</p>}
                </div>
                {[['length_cm', 'Comp.'], ['width_cm', 'Larg.'], ['height_cm', 'Alt.']].map(([campo, rotulo]) => (
                  <div key={campo} className="md:col-span-2">
                    <input type="number" min="0" step="0.1" value={e[campo]} placeholder={rotulo}
                      onChange={ev => mudarEmbalagem(i, campo, ev.target.value)} className={ic} />
                    {i === 0 && <p className="text-xs text-gray-400 mt-1">{rotulo} (cm)</p>}
                  </div>
                ))}
                <div className="md:col-span-1">
                  <input type="number" min="0" step="1" value={e.peso_g} placeholder="Peso"
                    onChange={ev => mudarEmbalagem(i, 'peso_g', ev.target.value)} className={ic} />
                  {i === 0 && <p className="text-xs text-gray-400 mt-1">Vazia (g)</p>}
                </div>
                <div className="md:col-span-1">
                  <button type="button" onClick={() => removerEmbalagem(i)}
                    className="btn w-full px-2 py-2 text-sm text-gray-400 hover:text-red-600" aria-label={`Remover ${e.nome || 'caixa'}`}>
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button type="button" onClick={adicionarEmbalagem}
            className="btn mt-4 text-sm font-medium text-primary-700 hover:text-primary-800 underline">
            Adicionar caixa
          </button>
          <p className="text-xs text-gray-400 mt-3">
            Linha sem nome ou sem as três medidas é descartada ao salvar — caixa pela metade
            cobraria frete errado calada. O peso é o da caixa <strong>vazia</strong>: papelão e
            plástico-bolha pesam.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="font-bold text-gray-900 mb-1">Cubagem</h2>
          <p className="text-sm text-gray-500 mb-4">
            Peça impressa em 3D é leve e volumosa: a transportadora cobra pelo espaço que a caixa
            ocupa, não pelo que a balança marca. Com a cubagem ligada, o pedido é cobrado pelo
            maior dos dois — peso real ou peso do volume. Só entra na conta o produto com as três
            medidas cadastradas.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Divisor de cubagem (cm³ por kg)
              </label>
              <input type="number" min="0" step="1" value={config.divisor_cubagem}
                onChange={e => setConfig(c => ({ ...c, divisor_cubagem: e.target.value }))} className={ic} />
              <p className="text-xs text-gray-400 mt-1">
                {Number(config.divisor_cubagem) > 0
                  ? `Cada ${Number(config.divisor_cubagem).toLocaleString('pt-BR')} cm³ contam como 1 kg. Uma caixa de 30x25x20 pesaria ${(15000 / Number(config.divisor_cubagem)).toFixed(1).replace('.', ',')} kg.`
                  : 'Zero desliga: o frete sai só pelo peso. 6000 é o divisor usual das encomendas.'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cubar só acima de (cm³)
              </label>
              <input type="number" min="0" step="100" value={config.cubagem_minima_cm3}
                onChange={e => setConfig(c => ({ ...c, cubagem_minima_cm3: e.target.value }))} className={ic} />
              <p className="text-xs text-gray-400 mt-1">
                Caixa menor que isso paga pelo peso. Zero cuba qualquer volume.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="font-bold text-gray-900 mb-4">Retirada</h2>
          <label className="flex items-center gap-2 mb-4">
            <input type="checkbox" checked={config.retirada.ativa}
              onChange={e => setConfig(c => ({ ...c, retirada: { ...c.retirada, ativa: e.target.checked } }))} />
            <span className="text-sm text-gray-700">Oferecer retirada (sem frete) no checkout</span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Como aparece</label>
              <input type="text" value={config.retirada.titulo}
                onChange={e => setConfig(c => ({ ...c, retirada: { ...c.retirada, titulo: e.target.value } }))} className={ic} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Onde retirar</label>
              <input type="text" value={config.retirada.endereco} placeholder="Combinamos pelo WhatsApp"
                onChange={e => setConfig(c => ({ ...c, retirada: { ...c.retirada, endereco: e.target.value } }))} className={ic} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fica pronto em (dias)</label>
              <input type="number" min="0" step="1" value={config.retirada.prazo_dias}
                onChange={e => setConfig(c => ({ ...c, retirada: { ...c.retirada, prazo_dias: e.target.value } }))} className={ic} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button type="submit" disabled={salvando}
            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-lg font-medium disabled:opacity-70">
            {salvando ? 'Salvando...' : 'Salvar tabela'}
          </button>
          {!zerado && (
            <button type="button" onClick={aplicarSugestao} className="btn text-sm text-gray-500 hover:text-gray-800 underline">
              Preencher com a sugestão de partida
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
