import React, { useState, useEffect } from 'react';
import { History, Download, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import type { BilanHistorique } from '../hooks/useCaisse';

interface HistoriqueBilansProps {
  chargerHistoriqueBilans: (filtres?: any) => Promise<any>;
  telechargerTicketBilan: (bilanId: number, reference: string) => Promise<void>;
  caisses?: { id: number; acteur: string }[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const badgeEcart = (statut: string) => {
  switch (statut) {
    case 'equilibre': return 'bg-green-100 text-green-700 border-green-200';
    case 'surplus':   return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'manquant':  return 'bg-red-100 text-red-700 border-red-200';
    default:          return 'bg-gray-100 text-gray-600 border-gray-200';
  }
};

const labelEcart = (statut: string, ecart: number) => {
  switch (statut) {
    case 'equilibre': return '✅ Équilibré';
    case 'surplus':   return `↑ +${Math.abs(ecart).toLocaleString('fr-FR')} F`;
    case 'manquant':  return `⚠️ -${Math.abs(ecart).toLocaleString('fr-FR')} F`;
    default:          return '-';
  }
};

// ─── Composant ──────────────────────────────────────────────────────────────

export function HistoriqueBilans({
  chargerHistoriqueBilans,
  telechargerTicketBilan,
  caisses = [],
}: HistoriqueBilansProps) {

  const [bilans, setBilans]           = useState<BilanHistorique[]>([]);
  const [loading, setLoading]         = useState(false);
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [loadingTicket, setLoadingTicket] = useState<number | null>(null);
  const [showFiltres, setShowFiltres] = useState(false);

  // Filtres
  const [filtreStatut, setFiltreStatut]   = useState('');
  const [filtreCaisse, setFiltreCaisse]   = useState('');
  const [filtreDebut, setFiltreDebut]     = useState('');
  const [filtreFin, setFiltreFin]         = useState('');

  // ── Chargement ────────────────────────────────────────────────────────────

  const charger = async (p = 1) => {
    setLoading(true);
    try {
      const data = await chargerHistoriqueBilans({
        page:         p,
        statut_ecart: filtreStatut   || undefined,
        caisse_id:    filtreCaisse   ? parseInt(filtreCaisse) : undefined,
        start_date:   filtreDebut    || undefined,
        end_date:     filtreFin      || undefined,
      });

      if (data.success) {
        setBilans(data.bilans.data || data.bilans);
        setTotalPages(data.bilans.last_page || 1);
        setPage(p);
      }
    } catch {
      toast.error('Impossible de charger l\'historique des bilans. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { charger(1); }, []);

  // ── Appliquer filtres ─────────────────────────────────────────────────────

  const appliquerFiltres = () => {
    charger(1);
    setShowFiltres(false);
  };

  const reinitialiserFiltres = () => {
    setFiltreStatut('');
    setFiltreCaisse('');
    setFiltreDebut('');
    setFiltreFin('');
    setTimeout(() => charger(1), 0);
  };

  // ── Télécharger ticket ────────────────────────────────────────────────────

  const handleTicket = async (bilan: BilanHistorique) => {
    const bilanId = bilan.bilan_id ?? bilan.id;  // ✅ fallback sur id
    if (!bilanId) {
      toast.error('ID bilan manquant');
      return;
    }
    setLoadingTicket(bilanId);
    try {
      await telechargerTicketBilan(bilanId, bilan.ticket_reference);
      toast.success('Ticket téléchargé');
    } catch {
      toast.error('Impossible de télécharger le ticket. Vérifiez votre connexion.');
    } finally {
      setLoadingTicket(null);
    }
  };

  // ─── Rendu ────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
            <History className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Historique des bilans</h2>
            <p className="text-xs text-gray-500">Tous les bilans effectués</p>
          </div>
        </div>
        <button
          onClick={() => setShowFiltres(!showFiltres)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
            showFiltres
              ? 'bg-purple-600 text-white border-purple-600'
              : 'bg-white text-gray-600 border-gray-300 hover:border-purple-400'
          }`}
        >
          <Filter className="w-3 h-3" />
          Filtres
          {(filtreStatut || filtreCaisse || filtreDebut || filtreFin) && (
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 ml-0.5" />
          )}
        </button>
      </div>

      {/* Filtres */}
      {showFiltres && (
        <div className="p-4 border-b bg-purple-50 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Statut écart</label>
              <select
                value={filtreStatut}
                onChange={e => setFiltreStatut(e.target.value)}
                className="w-full border rounded-lg px-2 py-1.5 text-xs"
              >
                <option value="">Tous</option>
                <option value="equilibre">✅ Équilibré</option>
                <option value="surplus">↑ Surplus</option>
                <option value="manquant">⚠️ Manquant</option>
              </select>
            </div>
            {caisses.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Caissier</label>
                <select
                  value={filtreCaisse}
                  onChange={e => setFiltreCaisse(e.target.value)}
                  className="w-full border rounded-lg px-2 py-1.5 text-xs"
                >
                  <option value="">Tous</option>
                  {caisses.map(c => (
                    <option key={c.id} value={c.id}>{c.acteur}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Période du</label>
              <input
                type="date"
                value={filtreDebut}
                onChange={e => setFiltreDebut(e.target.value)}
                className="w-full border rounded-lg px-2 py-1.5 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Au</label>
              <input
                type="date"
                value={filtreFin}
                onChange={e => setFiltreFin(e.target.value)}
                className="w-full border rounded-lg px-2 py-1.5 text-xs"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={appliquerFiltres}
              className="flex-1 py-1.5 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700"
            >
              Appliquer
            </button>
            <button
              onClick={reinitialiserFiltres}
              className="px-3 py-1.5 border text-xs rounded-lg hover:bg-gray-50"
            >
              Réinitialiser
            </button>
          </div>
        </div>
      )}

      {/* Liste */}
      <div className="divide-y">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && bilans.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Aucun bilan trouvé</p>
          </div>
        )}

        {!loading && bilans.map((b) => (
          <div key={b.bilan_id} className="px-5 py-3 hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                {/* Ligne 1 : acteur + statut */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm text-gray-800 truncate">
                    {b.acteur}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${badgeEcart(b.statut_ecart)}`}>
                    {labelEcart(b.statut_ecart, b.ecart)}
                  </span>
                </div>
                {/* Ligne 2 : période */}
                <p className="text-xs text-gray-500">
                  Période : {new Date(b.date_debut).toLocaleDateString('fr-FR')}
                  {' → '}
                  {new Date(b.date_fin).toLocaleDateString('fr-FR')}
                </p>
                {/* Ligne 3 : montants */}
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span className="text-green-600 font-medium">
                    +{b.total_entrees?.toLocaleString('fr-FR')} F
                  </span>
                  <span className="text-red-600 font-medium">
                    -{b.total_sorties?.toLocaleString('fr-FR')} F
                  </span>
                  <span>
                    Théorique : <strong>{b.solde_theorique?.toLocaleString('fr-FR')} F</strong>
                  </span>
                  <span>
                    Réel : <strong>{b.solde_reel?.toLocaleString('fr-FR')} F</strong>
                  </span>
                </div>
                {/* Ligne 4 : ref + date création */}
                <p className="text-xs text-gray-400 mt-0.5 font-mono">
                  {b.ticket_reference}
                  {b.effectue_par && ` · ${b.effectue_par}`}
                  {' · '}
                  {new Date(b.created_at).toLocaleDateString('fr-FR', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>

              {/* Bouton ticket */}
              <button
                onClick={() => handleTicket(b)}
                disabled={loadingTicket === (b.bilan_id ?? b.id)}
                title="Télécharger le ticket PDF"
                className="flex-shrink-0 p-2 hover:bg-purple-50 rounded-lg text-gray-400 hover:text-purple-600 transition-colors disabled:opacity-50"
              >
                {loadingTicket === b.bilan_id ? (
                  <div className="w-4 h-4 border border-purple-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t bg-gray-50">
          <button
            onClick={() => charger(page - 1)}
            disabled={page <= 1 || loading}
            className="flex items-center gap-1 px-3 py-1.5 text-xs border rounded-lg disabled:opacity-40 hover:bg-white transition"
          >
            <ChevronLeft className="w-3 h-3" />
            Précédent
          </button>
          <span className="text-xs text-gray-500">
            Page {page} / {totalPages}
          </span>
          <button
            onClick={() => charger(page + 1)}
            disabled={page >= totalPages || loading}
            className="flex items-center gap-1 px-3 py-1.5 text-xs border rounded-lg disabled:opacity-40 hover:bg-white transition"
          >
            Suivant
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}

    </div>
  );
}