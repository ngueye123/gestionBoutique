import React, { useEffect, useState } from 'react';
import { X, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { fetchWithAuth } from '../../lib/fetchWithAuth';
import { VenteHistorique, VenteDetailResponse } from '../../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const fmt = (n: number) =>
  Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 0 }) + ' F';

const MOYEN_LABELS: Record<string, string> = {
  especes: 'Espèces',
  wave: 'Wave',
  orange_money: 'Orange Money',
  dette: 'Dette',
  mixte: 'Mixte',
};

interface VenteDetailPanelProps {
  reference: string;
  onClose: () => void;
}

export default function VenteDetailPanel({ reference, onClose }: VenteDetailPanelProps) {
  const [vente, setVente] = useState<VenteHistorique | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const res  = await fetchWithAuth(`${API_URL}/ventes/${reference}`);
        const data: VenteDetailResponse = await res.json();
        if (cancelled) return;
        if (data.success) {
          setVente(data.vente);
        } else {
          toast.error('Impossible de charger le détail de la vente');
          onClose();
        }
      } catch {
        if (!cancelled) {
          toast.error('Erreur lors du chargement du détail de la vente');
          onClose();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [reference]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold">Vente {reference}</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading && (
          <div className="p-12 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}

        {!loading && vente && (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 rounded-md p-4">
              <div>
                <div className="text-gray-500">Date</div>
                <div className="font-medium">
                  {new Date(vente.created_at).toLocaleString('fr-FR', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Employé</div>
                <div className="font-medium">{vente.employe?.nom ?? 'Patron'}</div>
              </div>
              <div>
                <div className="text-gray-500">Client</div>
                <div className="font-medium">{vente.client?.nom ?? '—'}</div>
              </div>
              <div>
                <div className="text-gray-500">Paiement</div>
                <div className="font-medium">
                  {MOYEN_LABELS[vente.moyen_paiement] ?? vente.moyen_paiement}
                </div>
              </div>
            </div>

            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-2 text-left">Produit</th>
                    <th className="px-4 py-2 text-right">Qté</th>
                    <th className="px-4 py-2 text-right">Prix unitaire</th>
                    <th className="px-4 py-2 text-right">Sous-total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(vente.details ?? []).map(d => (
                    <tr key={d.id}>
                      <td className="px-4 py-2">{d.nom_produit}</td>
                      <td className="px-4 py-2 text-right">{d.quantite} {d.unite_vente}</td>
                      <td className="px-4 py-2 text-right">{fmt(d.prix_unitaire)}</td>
                      <td className="px-4 py-2 text-right font-medium">{fmt(d.sous_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end text-lg font-semibold">
              Total : {fmt(vente.total)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}