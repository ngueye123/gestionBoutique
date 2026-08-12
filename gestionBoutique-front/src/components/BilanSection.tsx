import React, { useState } from 'react';
import { Calculator, Download, AlertTriangle, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import type { BilanData } from '../hooks/useCaisse';

interface BilanSectionProps {
  onBilanCalcule?: (bilan: BilanData) => void;
  onTicketTelecharge?: (bilanId: number, reference: string) => void;
  calculerBilan: (start: string, end: string, soldeReel: number) => Promise<any>;
  telechargerTicketBilan: (bilanId: number, reference: string) => Promise<void>;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const couleurEcart = (statut: BilanData['statut_ecart']) => {
  switch (statut) {
    case 'equilibre': return { fond: 'bg-green-50',  bordure: 'border-green-400', texte: 'text-green-700',  icone: '✅' };
    case 'surplus':   return { fond: 'bg-blue-50',   bordure: 'border-blue-400',  texte: 'text-blue-700',   icone: '↑' };
    case 'manquant':  return { fond: 'bg-red-50',    bordure: 'border-red-400',   texte: 'text-red-700',    icone: '⚠️' };
  }
};

// ─── Composant ──────────────────────────────────────────────────────────────

export function BilanSection({
  calculerBilan,
  telechargerTicketBilan,
}: BilanSectionProps) {

  const [dateDebut, setDateDebut] = useState(() => {
    const d = new Date(); d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [dateFin, setDateFin]       = useState(() => new Date().toISOString().split('T')[0]);
  const [soldeReel, setSoldeReel]   = useState('');
  const [loading, setLoading]       = useState(false);
  const [resultats, setResultats]   = useState<BilanData[] | null>(null);
  const [loadingTicket, setLoadingTicket] = useState<number | null>(null);

  // ── Soumission ────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    // ✅ Validation solde réel obligatoire
    if (!soldeReel || soldeReel.trim() === '') {
      toast.error('Le solde réel compté est obligatoire pour calculer le bilan');
      return;
    }

    const montant = parseFloat(soldeReel);
    if (isNaN(montant) || montant < 0) {
      toast.error('Saisissez un montant valide (≥ 0 F)');
      return;
    }

    if (!dateDebut || !dateFin) {
      toast.error('Les dates de début et de fin sont requises');
      return;
    }

    if (new Date(dateFin) < new Date(dateDebut)) {
      toast.error('La date de fin doit être après la date de début');
      return;
    }

    setLoading(true);
    setResultats(null);

    try {
      const data = await calculerBilan(dateDebut, dateFin, montant);

      if (data.success) {
        setResultats(data.bilans);
        toast.success(`Bilan calculé — ${data.bilans.length} caisse(s)`);
      } else {
        toast.error(data.message || 'Impossible de calculer le bilan. Vérifiez les informations saisies.');
      }
    } catch {
      toast.error('Impossible de calculer le bilan. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  };

  // ── Téléchargement ticket ─────────────────────────────────────────────────

  const handleTicket = async (bilan: BilanData) => {
    const bilanId = bilan.bilan_id ?? (bilan as any).id;  // ✅ fallback
    if (!bilanId) {
      toast.error('ID bilan manquant');
      return;
    }
    setLoadingTicket(bilanId);
    try {
      await telechargerTicketBilan(bilanId, bilan.ticket_reference);
      toast.success('Ticket téléchargé');
    } catch {
      toast.error('Impossible de télécharger le ticket de bilan. Vérifiez votre connexion.');
    } finally {
      setLoadingTicket(null);
    }
  };

  // ─── Rendu ────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b bg-gray-50">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
          <Calculator className="w-4 h-4 text-white" />
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-900">Bilan de caisse</h2>
          <p className="text-xs text-gray-500">Le solde réel compté est obligatoire</p>
        </div>
      </div>

      <div className="p-5 space-y-4">

        {/* Période */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
              Du
            </label>
            <input
              type="date"
              value={dateDebut}
              onChange={e => setDateDebut(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
              Au
            </label>
            <input
              type="date"
              value={dateFin}
              onChange={e => setDateFin(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Solde réel — obligatoire */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
            Solde réel compté <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              min="0"
              step="1"
              value={soldeReel}
              onChange={e => setSoldeReel(e.target.value)}
              placeholder="Saisissez le montant physiquement compté en caisse"
              className={`w-full border rounded-lg px-3 py-2.5 text-sm pr-14 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                soldeReel === ''
                  ? 'border-gray-300'
                  : parseFloat(soldeReel) >= 0
                    ? 'border-green-400 bg-green-50'
                    : 'border-red-400 bg-red-50'
              }`}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
              F CFA
            </span>
          </div>
          {soldeReel === '' && (
            <p className="flex items-center gap-1 text-xs text-amber-600 mt-1">
              <AlertTriangle className="w-3 h-3" />
              Obligatoire — comptez physiquement la caisse avant de soumettre
            </p>
          )}
        </div>

        {/* Bouton */}
        <button
          onClick={handleSubmit}
          disabled={loading || !soldeReel}
          className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Calcul en cours...
            </>
          ) : (
            <>
              <Calculator className="w-4 h-4" />
              Calculer le bilan
            </>
          )}
        </button>

        {/* ── Résultats ─────────────────────────────────────────────────── */}
        {resultats && resultats.map((b, i) => {
          const c = couleurEcart(b.statut_ecart);
          return (
            <div key={i} className="border rounded-xl overflow-hidden mt-2">

              {/* Titre caissier */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
                <div>
                  <p className="font-semibold text-sm text-gray-800">{b.acteur}</p>
                  <p className="text-xs text-gray-500">Réf : <span className="font-mono">{b.ticket_reference}</span></p>
                </div>
                <button
                  onClick={() => handleTicket(b)}
                  disabled={loadingTicket === b.bilan_id}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {loadingTicket === b.bilan_id ? (
                    <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Download className="w-3 h-3" />
                  )}
                  Ticket PDF
                </button>
              </div>

              <div className="p-4 space-y-2">

                {/* Mouvements */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-2.5 text-center">
                    <TrendingUp className="w-4 h-4 text-green-600 mx-auto mb-1" />
                    <p className="text-gray-500">Entrées</p>
                    <p className="font-bold text-green-700 text-sm">
                      +{b.total_entrees.toLocaleString('fr-FR')} F
                    </p>
                    <p className="text-gray-400 mt-0.5">
                      {b.nombre_ventes}v · {b.nombre_remboursements}r
                    </p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-center">
                    <TrendingDown className="w-4 h-4 text-red-600 mx-auto mb-1" />
                    <p className="text-gray-500">Sorties</p>
                    <p className="font-bold text-red-700 text-sm">
                      -{b.total_sorties.toLocaleString('fr-FR')} F
                    </p>
                    <p className="text-gray-400 mt-0.5">
                      {b.nombre_prelevements} prélèv.
                    </p>
                  </div>
                </div>

                {/* Comparaison théorique vs réel */}
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-gray-500">Solde théorique</span>
                    <span className="font-semibold">{b.solde_theorique.toLocaleString('fr-FR')} F</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-gray-500">Solde réel compté</span>
                    <span className="font-semibold">{b.solde_reel.toLocaleString('fr-FR')} F</span>
                  </div>
                </div>

                {/* Résultat écart */}
                <div className={`rounded-lg border-2 p-3 text-center ${c.fond} ${c.bordure}`}>
                  <p className="text-xs text-gray-500 mb-0.5">ÉCART</p>
                  <p className={`text-xl font-bold ${c.texte}`}>
                    {b.statut_ecart === 'equilibre'
                      ? '✅ Équilibré'
                      : b.statut_ecart === 'surplus'
                        ? `↑ +${Math.abs(b.ecart).toLocaleString('fr-FR')} F`
                        : `⚠️ -${Math.abs(b.ecart).toLocaleString('fr-FR')} F`
                    }
                  </p>
                  <p className={`text-xs mt-0.5 ${c.texte}`}>
                    {b.statut_ecart === 'equilibre' && 'Caisse parfaitement équilibrée'}
                    {b.statut_ecart === 'surplus'   && 'Surplus — vérifiez les entrées non enregistrées'}
                    {b.statut_ecart === 'manquant'  && 'Manquant — vérifiez les sorties non enregistrées'}
                  </p>
                </div>

              </div>
            </div>
          );
        })}

      </div>
    </div>
  );
}