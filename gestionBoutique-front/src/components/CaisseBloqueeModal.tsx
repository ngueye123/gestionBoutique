// src/components/CaisseBloqueeModal.tsx
import React, { useState } from 'react';
import { AlertTriangle, TrendingDown, Loader2, Printer, X } from 'lucide-react';
import { toast } from 'sonner';
import type { BloquageInfo } from '../hooks/useCaisse';
import { useCaisse } from '../hooks/useCaisse';

interface CaisseBloqueeModalProps {
  bloquage: BloquageInfo;
  onPrelevementFait: () => void; // Callback pour retenter la vente
  onAnnuler: () => void;
}

const COULEURS_RAISON: Record<string, string> = {
  bloquee_manuellement:    'bg-red-50 border-red-300 text-red-800',
  plafond_atteint:         'bg-orange-50 border-orange-300 text-orange-800',
  plafond_depasse_par_vente: 'bg-yellow-50 border-yellow-300 text-yellow-800',
};

export function CaisseBloqueeModal({ bloquage, onPrelevementFait, onAnnuler }: CaisseBloqueeModalProps) {
  const [montant, setMontant]  = useState<string>(
    bloquage.caisse.a_prelever > 0
      ? String(Math.ceil(bloquage.caisse.a_prelever))
      : ''
  );
  const [note, setNote]        = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dernierMouvement, setDernierMouvement] = useState<any>(null);
  const [impression, setImpression] = useState(false);

  const { effectuerMouvement, imprimerTicket } = useCaisse();

  const soldeCourant = bloquage.caisse.solde_actuel;
  const plafond      = bloquage.caisse.plafond;
  const pct          = plafond > 0 ? Math.min(100, (soldeCourant / plafond) * 100) : 0;

  const handlePrelevement = async () => {
    const montantNum = parseFloat(montant);

    if (!montantNum || montantNum <= 0) {
      toast.error('Veuillez entrer un montant valide');
      return;
    }

    if (montantNum > soldeCourant) {
      toast.error(`Le montant ne peut pas dépasser le solde actuel (${soldeCourant.toFixed(0)} F)`);
      return;
    }

    setSubmitting(true);
    const result = await effectuerMouvement('prelevement', montantNum, note || undefined);
    setSubmitting(false);

    if (result.success && result.mouvement) {
      setDernierMouvement(result.mouvement);
      // On ne ferme PAS encore : on affiche le bouton ticket
    }
  };

  const handleContinuer = () => {
    onPrelevementFait();
  };

  const handleImprimerTicket = async () => {
    if (!dernierMouvement) return;
    setImpression(true);
    try {
      const result = await imprimerTicket(dernierMouvement.id);
      if (result.success) {
        toast.success('Ticket envoyé à l\'imprimante');
      } else {
        toast.error(result.error || 'Impossible d\'imprimer le ticket');
      }
    } finally {
      setImpression(false);
    }
  };

  const couleurBandeauRaison = COULEURS_RAISON[bloquage.raison] || COULEURS_RAISON.plafond_atteint;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* ── En-tête rouge ─────────────────────────── */}
        <div className="bg-red-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-7 h-7 flex-shrink-0" />
            <div>
              <h2 className="text-lg font-bold">Caisse bloquée</h2>
              <p className="text-red-200 text-sm">Prélèvement obligatoire</p>
            </div>
          </div>
          <button onClick={onAnnuler} className="p-1 rounded hover:bg-red-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* ── Message explicatif ─────────────────────── */}
          <div className={`border rounded-lg p-3 text-sm ${couleurBandeauRaison}`}>
            {bloquage.message}
          </div>

          {/* ── Jauge de remplissage ─────────────────────── */}
          <div>
            <div className="flex justify-between text-sm font-medium text-gray-700 mb-1">
              <span>Solde caisse</span>
              <span className="text-red-600 font-bold">
                {soldeCourant.toLocaleString('fr-FR')} F / {plafond.toLocaleString('fr-FR')} F
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className={`h-4 rounded-full transition-all ${
                  pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-orange-400' : 'bg-green-500'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0 F</span>
              <span className="font-bold text-red-600">{pct.toFixed(0)}% du plafond</span>
              <span>{plafond.toLocaleString('fr-FR')} F</span>
            </div>
          </div>

          {/* ── Formulaire de prélèvement ─────────────────── */}
          {!dernierMouvement ? (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-800 flex items-center">
                <TrendingDown className="w-5 h-5 mr-2 text-red-500" />
                Effectuer un prélèvement
              </h3>

              {/* Suggestion rapide */}
              {bloquage.caisse.a_prelever > 0 && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs text-gray-500 self-center">Suggestion :</span>
                  {[bloquage.caisse.a_prelever, soldeCourant * 0.5, soldeCourant].map((v, i) => {
                    const val = Math.floor(v);
                    if (val <= 0) return null;
                    return (
                      <button
                        key={i}
                        onClick={() => setMontant(String(val))}
                        className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200"
                      >
                        {val.toLocaleString('fr-FR')} F
                      </button>
                    );
                  })}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Montant à prélever (F CFA)
                </label>
                <input
                  type="number"
                  value={montant}
                  onChange={e => setMontant(e.target.value)}
                  min={1}
                  max={soldeCourant}
                  className="w-full p-2.5 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:outline-none text-lg font-semibold"
                  placeholder="0"
                  autoFocus
                />
                {parseFloat(montant) > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Solde après : {(soldeCourant - parseFloat(montant)).toLocaleString('fr-FR')} F
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note (optionnel)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:border-red-500 focus:outline-none text-sm"
                  placeholder="Ex: Versement en coffre..."
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  onClick={onAnnuler}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  disabled={submitting}
                >
                  Annuler la vente
                </button>
                <button
                  onClick={handlePrelevement}
                  disabled={submitting || !parseFloat(montant) || parseFloat(montant) <= 0}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold flex items-center justify-center"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <TrendingDown className="w-4 h-4 mr-2" />
                      Prélever
                    </>
                  )}
                </button>
              </div>
            </div>

          ) : (
            /* ── Succès : afficher le ticket ─────────────── */
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <div className="text-green-600 font-bold text-lg">✓ Prélèvement effectué !</div>
                <div className="text-gray-600 text-sm mt-1">
                  Réf : <span className="font-mono font-semibold">{dernierMouvement.ticket_reference}</span>
                </div>
                <div className="text-gray-500 text-sm">
                  Montant : {parseFloat(dernierMouvement.montant).toLocaleString('fr-FR')} F
                </div>
              </div>

              <button
                onClick={handleImprimerTicket}
                disabled={impression}
                className="w-full flex items-center justify-center px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {impression ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Printer className="w-4 h-4 mr-2" />
                )}
                Imprimer le ticket de prélèvement
              </button>

              <button
                onClick={handleContinuer}
                className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
              >
                Continuer et retenter la vente →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}