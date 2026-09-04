'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NovoProdutoPage() {
  const router = useRouter();
  const [f, setF] = useState({ name: '', slug: '', description: '', short_description: '', price: '', compare_price: '', category: '', material: '', weight: '', dimensions: '', stock: '0', featured: false, active: true });
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const body = { ...f, price: parseFloat(f.price) || 0, compare_price: f.compare_price ? parseFloat(f.compare_price) : null, weight: f.weight ? parseFloat(f.weight) : null, stock: parseInt(f.stock) || 0, images };
      const res = await fetch('/api/produtos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao criar');
      router.push('/admin/produtos');
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.success) setImages([...images, data.url]);
  };

  const ic = "w-full border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent";

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/produtos" className="text-gray-400 hover:text-gray-600">← Voltar</Link>
        <h1 className="text-2xl font-bold text-gray-900">Novo Produto</h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
          <h3 className="font-bold text-gray-900">Informações Básicas</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <input type="text" required value={f.name} onChange={e => setF({...f, name: e.target.value})} className={ic} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL)</label>
            <input type="text" value={f.slug} onChange={e => setF({...f, slug: e.target.value})} className={ic} placeholder="Deixe em branco para gerar automático" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição Curta</label>
            <input type="text" value={f.short_description} onChange={e => setF({...f, short_description: e.target.value})} className={ic} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição Completa</label>
            <textarea rows={4} value={f.description} onChange={e => setF({...f, description: e.target.value})} className={ic} />
          </div>
        </div>

<div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
          <h3 className="font-bold text-gray-900">Preço e Estoque</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preço *</label>
              <input type="number" step="0.01" required value={f.price} onChange={e => setF({...f, price: e.target.value})} className={ic} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preço Original (opcional)</label>
              <input type="number" step="0.01" value={f.compare_price} onChange={e => setF({...f, compare_price: e.target.value})} className={ic} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estoque</label>
            <input type="number" value={f.stock} onChange={e => setF({...f, stock: e.target.value})} className={ic} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
          <h3 className="font-bold text-gray-900">Imagens</h3>
          <div className="flex flex-wrap gap-3">
            {images.map((url, i) => (
              <div key={i} className="w-20 h-20 bg-gray-50 rounded-lg overflow-hidden border">
                <img src={url} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
            <label className="w-20 h-20 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center cursor-pointer hover:border-primary-300">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
          <h3 className="font-bold text-gray-900">Características</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <input type="text" value={f.category} onChange={e => setF({...f, category: e.target.value})} className={ic} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
              <input type="text" value={f.material} onChange={e => setF({...f, material: e.target.value})} className={ic} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Peso (g)</label>
              <input type="number" step="0.1" value={f.weight} onChange={e => setF({...f, weight: e.target.value})} className={ic} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dimensões</label>
              <input type="text" value={f.dimensions} onChange={e => setF({...f, dimensions: e.target.value})} className={ic} placeholder="ex: 10x5x3 cm" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
          <h3 className="font-bold text-gray-900">Configurações</h3>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={f.featured} onChange={e => setF({...f, featured: e.target.checked})} />
              <span className="text-sm text-gray-700">Destaque</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={f.active} onChange={e => setF({...f, active: e.target.checked})} />
              <span className="text-sm text-gray-700">Ativo</span>
            </label>
          </div>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm">{error}</div>}

        <button type="submit" disabled={loading}
          className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-lg font-medium disabled:opacity-50">
          {loading && <span className="spinner" aria-hidden="true" />}
          {loading ? 'Salvando...' : 'Salvar Produto'}
        </button>
      </form>
    </div>
  );
}