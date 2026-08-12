import React, { useEffect, useState } from 'react';
import { History, User } from 'lucide-react';
import { toast } from 'sonner';
import { fetchWithAuth } from '../lib/fetchWithAuth';
import { PriceOverrideItem } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

/** Formatte un montant sans arrondi, préservant les décimales telles qu'en base */
const fmt = (n: number | null | undefined) => {
  if (n === null || n === undefined || !isFinite(n as number)) return '0 F';
  const s = String(n);
  if (s.toLowerCase().includes('e')) {
    return (n as number).toLocaleString('fr-FR', { maximumFractionDigits: 6 }) + ' F';
  }
  const [intPart, fracPart] = s.split('.');
  const intNumber = Number(intPart);
  const intFormatted = intNumber.toLocaleString('fr-FR');
  if (!fracPart || /^0+$/.test(fracPart)) return `${intFormatted} F`;
  const fracTrimmed = fracPart.replace(/0+$/u, '');
  return `${intFormatted},${fracTrimmed} F`;
};

export default function PriceOverrides() {
  const [overrides, setOverrides] = useState<PriceOverrideItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [lastPage, setLastPage]   = useState(1);

  useEffect(() => { fetchOverrides(page); }, [page]);

  const fetchOverrides = async (p: number) => {
    setLoading(true);
    try {
      const res  = await fetchWithAuth(`${API_URL}/price-overrides?page=${p}`);
      const data = await res.json();
      if (data.success) {
        setOverrides(data.price_overrides.data);
        setLastPage(data.price_overrides.last_page);
      }
    } catch {
      toast.error('Impossible de charger les ajustements de prix. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <History className="w-5 h-5 text-gray-700" />
        <h1 className="text-xl font-semibold text-gray-900">Historique des ajustements de prix</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Chaque surcharge de prix appliquée au comptoir, avec l'employé, le produit et la justification.
      </p>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Employé</th>
              <th className="px-4 py-3">Produit</th>
              <th className="px-4 py-3">Prix normal</th>
              <th className="px-4 py-3">Prix appliqué</th>
              <th className="px-4 py-3">Justification</th>
              <th className="px-4 py-3">Vente</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Chargement...</td></tr>
            )}

            {!loading && overrides.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Aucun ajustement de prix enregistré</td></tr>
            )}

            {!loading && overrides.map(o => (
              <tr key={o.id} className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {new Date(o.created_at).toLocaleString('fr-FR', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    {o.employe ? `${o.employe.nom} (${o.employe.role})` : 'Patron'}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-700">{o.product?.name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500">{fmt(o.prix_normal)}</td>
                <td className="px-4 py-3 font-medium text-orange-600">{fmt(o.prix_applique)}</td>
                <td className="px-4 py-3 text-gray-600 max-w-xs truncate" title={o.justification}>
                  {o.justification}
                </td>
                <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                  {o.vente?.reference ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {lastPage > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40"
          >
            Précédent
          </button>
          <span className="px-3 py-1.5 text-sm text-gray-500">Page {page} / {lastPage}</span>
          <button
            onClick={() => setPage(p => Math.min(lastPage, p + 1))}
            disabled={page === lastPage}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40"
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
}