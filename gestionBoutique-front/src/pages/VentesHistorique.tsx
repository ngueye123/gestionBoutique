import React, { useEffect, useState, useCallback } from 'react';
import { History } from 'lucide-react';
import { toast } from 'sonner';
import { fetchWithAuth } from '../lib/fetchWithAuth';
import { useAuthStore } from '../store/authStore';
import VenteFiltres, { VenteFiltresState } from '../components/ventes/VenteFiltres';
import VenteDetailPanel from '../components/ventes/VenteDetailPanel';
import { EmployeFiltre, VenteHistorique, VentesHistoriqueResponse } from '../types';
import { InvoiceButton } from '../components/InvoiceButton';
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

const MOYEN_LABELS: Record<string, string> = {
  especes: 'Espèces',
  wave: 'Wave',
  orange_money: 'Orange Money',
  dette: 'Dette',
  mixte: 'Mixte',
};

const FILTRES_VIDES: VenteFiltresState = {
  startDate: '', endDate: '', employeId: '', clientId: '', moyenPaiement: '',
};

export default function VentesHistorique() {
  const { user } = useAuthStore();
  const isPatronOuAdmin = !!user && (user.user_type === 'patron' || ('role' in user && user.role === 'admin'));

  const [ventes, setVentes]     = useState<VenteHistorique[]>([]);
  const [employes, setEmployes] = useState<EmployeFiltre[]>([]);
  const [clients, setClients]   = useState<{ id: number; nom: string }[]>([]);
  const [filtres, setFiltres]   = useState<VenteFiltresState>(FILTRES_VIDES);
  const [page, setPage]         = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading]   = useState(true);
  const [selectedReference, setSelectedReference] = useState<string | null>(null);

  useEffect(() => {
    if (isPatronOuAdmin) {
      fetchWithAuth(`${API_URL}/ventes/filtres/employes`)
        .then(res => res.json())
        .then(data => { if (data.success) setEmployes(data.employes); })
        .catch(() => {});
    }

    fetchWithAuth(`${API_URL}/clients`)
      .then(res => res.json())
      .then(data => { if (data.success) setClients(data.clients.map((c: any) => ({ id: c.id, nom: c.nom }))); })
      .catch(() => {});
  }, [isPatronOuAdmin]);

  const fetchVentes = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p) });
      if (filtres.startDate)     params.set('start_date', filtres.startDate);
      if (filtres.endDate)       params.set('end_date', filtres.endDate);
      if (filtres.employeId)     params.set('employe_id', filtres.employeId);
      if (filtres.clientId)      params.set('client_id', filtres.clientId);
      if (filtres.moyenPaiement) params.set('moyen_paiement', filtres.moyenPaiement);

      const res  = await fetchWithAuth(`${API_URL}/ventes?${params.toString()}`);
      const data: VentesHistoriqueResponse = await res.json();
      if (data.success) {
        setVentes(data.ventes.data);
        setLastPage(data.ventes.last_page);
      }
    } catch {
      toast.error("Impossible de charger l'historique des ventes. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  }, [filtres]);

  useEffect(() => { setPage(1); }, [filtres]);
  useEffect(() => { fetchVentes(page); }, [page, fetchVentes]);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <History className="w-5 h-5 text-gray-700" />
          <h1 className="text-xl font-semibold text-gray-900">Historique des ventes</h1>
        </div>
        <p className="text-sm text-gray-500">
          {isPatronOuAdmin ? 'Ventes de tous les employés.' : 'Vos ventes enregistrées.'}
        </p>
      </div>

      <VenteFiltres
        filtres={filtres}
        onChange={setFiltres}
        employes={employes}
        clients={clients}
        showEmployeFiltre={isPatronOuAdmin}
      />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-3">Référence</th>
              <th className="px-4 py-3">Date</th>
              {isPatronOuAdmin && <th className="px-4 py-3">Employé</th>}
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Paiement</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-center">Facture</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Chargement...</td></tr>
            )}
            {!loading && ventes.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Aucune vente trouvée</td></tr>
            )}
            {!loading && ventes.map(v => (
              <tr
                key={v.id}
                onClick={() => setSelectedReference(v.reference)}
               className="border-b border-gray-50 last:border-b-0 hover:bg-blue-100 transition-colors cursor-pointer"
              >
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{v.reference}</td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {new Date(v.created_at).toLocaleString('fr-FR', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </td>
                {isPatronOuAdmin && <td className="px-4 py-3 text-gray-700">{v.employe?.nom ?? 'Patron'}</td>}
                <td className="px-4 py-3 text-gray-700">{v.client?.nom ?? '—'}</td>
                <td className="px-4 py-3">{MOYEN_LABELS[v.moyen_paiement] ?? v.moyen_paiement}</td>
                <td className="px-4 py-3 text-right font-medium">{fmt(v.total)}</td>
                <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                <InvoiceButton venteId={v.id} venteReference={v.reference} variant="icon" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {lastPage > 1 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40">
            Précédent
          </button>
          <span className="px-3 py-1.5 text-sm text-gray-500">Page {page} / {lastPage}</span>
          <button onClick={() => setPage(p => Math.min(lastPage, p + 1))} disabled={page === lastPage}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40">
            Suivant
          </button>
        </div>
      )}

      {selectedReference && (
        <VenteDetailPanel reference={selectedReference} onClose={() => setSelectedReference(null)} />
      )}
    </div>
  );
}