// src/pages/ClientDetails.tsx

import { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Phone, Plus, Gift, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../store/authStore';
import { fetchWithAuth } from '../lib/fetchWithAuth';
import { getApiErrorMessage } from '../lib/apiError';
import { Acompte, Client, Remboursement, VenteCredit, FideliteHistorique } from '../types';
import { useParams } from 'react-router-dom';
import VenteDetailPanel from '../components/ventes/VenteDetailPanel';
import { InvoiceButton } from '../components/InvoiceButton';
export default function ClientDetails() {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
  const { id } = useParams<{ id: string }>();
  const clientId = parseInt(id || '1');
  const [client, setClient] = useState<Client | null>(null);
  const [remboursements, setRemboursements] = useState<Remboursement[]>([]);
  const [acomptes, setAcomptes] = useState<Acompte[]>([]);
  const [ventes, setVentes] = useState<VenteCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRemboursementModal, setShowRemboursementModal] = useState(false);
  const [showAcompteModal, setShowAcompteModal] = useState(false);
  const [remboursementData, setRemboursementData] = useState({
    montant: '',
    moyen_paiement: 'especes' as 'especes' | 'wave' | 'orange_money' | 'carte',
    note: ''
  });
  const [selectedReference, setSelectedReference] = useState<string | null>(null);
  const [acompteData, setAcompteData] = useState({
    montant: '',
    moyen_paiement: 'especes' as 'especes' | 'wave' | 'orange_money' | 'carte',
    note: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Fidélité
  const [fideliteHistoriques, setFideliteHistoriques] = useState<FideliteHistorique[]>([]);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const canGererRecompense = useAuthStore(s => s.canManageProducts); // patron/admin/vendeur — même règle que côté back

  // ✅ Fonction utilitaire pour convertir solde_dette en nombre
  const getSoldeDette = (solde: any): number => {
    const parsed = parseFloat(String(solde || 0));
    return isNaN(parsed) ? 0 : parsed;
  };

  // ✅ Fonction utilitaire pour convertir montant en nombre
  const getMontant = (montant: any): number => {
    const parsed = parseFloat(String(montant || 0));
    return isNaN(parsed) ? 0 : parsed;
  };

  useEffect(() => {
    fetchClientDetails();
    fetchFideliteHistorique();
  }, [clientId]);

  const fetchClientDetails = async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth(`${API_URL}/clients/${clientId}`, {
        method: 'GET'
      });
      const data = await response.json();

      if (data.success) {
        setClient(data.client);
        setRemboursements(data.client.remboursements || []);
        setAcomptes(data.client.acomptes || []);
        setVentes(data.client.ventes || []);
      } else {
        toast.error('Client non trouvé');
      }
    } catch (error) {
      toast.error('Impossible de charger ce client. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFideliteHistorique = async () => {
    try {
      const res  = await fetchWithAuth(`${API_URL}/clients/${clientId}/fidelite-historique`);
      const data = await res.json();
      if (data.success) setFideliteHistoriques(data.historiques);
    } catch { /* non bloquant pour le reste de la page */ }
  };

  const toggleConsomme = async (historique: FideliteHistorique) => {
    setTogglingId(historique.id);
    try {
      const res = await fetchWithAuth(`${API_URL}/fidelite/historique/${historique.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ est_consomme: !historique.est_consomme }),
      });
      const result = await res.json();
      if (result.success) {
        setFideliteHistoriques(list =>
          list.map(h => (h.id === historique.id ? result.historique : h))
        );
        toast.success(result.historique.est_consomme
          ? 'Récompense marquée comme utilisée'
          : 'Récompense remise à disposition');
      } else {
        toast.error(getApiErrorMessage(result, 'Impossible de mettre à jour le statut de fidélité.'));
      }
    } catch { toast.error('Impossible de mettre à jour le statut de fidélité. Vérifiez votre connexion.'); }
    finally { setTogglingId(null); }
  };

  const MOIS_LABELS = [
    '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
  ];

  const handleRemboursement = async () => {
    if (!remboursementData.montant || parseFloat(remboursementData.montant) <= 0) {
      toast.error('Veuillez entrer un montant valide');
      return;
    }

    const montant = parseFloat(remboursementData.montant);
    const soldeDette = client ? getSoldeDette(client.solde_dette) : 0;

    if (client && montant > soldeDette) {
      toast.error(`Le montant ne peut pas dépasser la dette actuelle (${soldeDette.toFixed(2)} €)`);
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetchWithAuth(`${API_URL}/remboursements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          montant,
          moyen_paiement: remboursementData.moyen_paiement,
          note: remboursementData.note || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        const pts = result.fidelite?.points ?? 0;
        toast.success(
          'Remboursement enregistré !' + (pts > 0 ? ` +${pts} pts fidélité` : '')
        );
        fetchClientDetails();
        fetchFideliteHistorique();
        setShowRemboursementModal(false);
        setRemboursementData({ montant: '', moyen_paiement: 'especes', note: '' });
      } else {
        toast.error(getApiErrorMessage(result, 'Impossible d\'enregistrer le remboursement.'));
      }
    } catch (error) {
      toast.error('Impossible d\'enregistrer le remboursement. Vérifiez votre connexion.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcompte = async () => {
    const montant = parseInt(acompteData.montant, 10);
    if (!Number.isInteger(montant) || montant <= 0) {
      toast.error('Veuillez entrer un montant entier valide');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetchWithAuth(`${API_URL}/clients/${clientId}/acomptes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...acompteData, montant, note: acompteData.note || null }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success('Acompte enregistré avec succès');
        fetchClientDetails();
        setShowAcompteModal(false);
        setAcompteData({ montant: '', moyen_paiement: 'especes', note: '' });
      } else {
        toast.error(getApiErrorMessage(result, "Impossible d'enregistrer l'acompte."));
      }
    } catch {
      toast.error("Impossible d'enregistrer l'acompte. Vérifiez votre connexion.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Client non trouvé</p>
      </div>
    );
  }

  // ✅ Calcul sécurisé du solde
  const soldeDette = getSoldeDette(client.solde_dette);
  const detteActuelle = Math.max(0, soldeDette);
  const acompteDisponible = Math.max(0, -soldeDette);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => window.history.back()}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{client.nom}</h1>
            <p className="text-gray-600 flex items-center">
              <Phone className="w-4 h-4 mr-2" />
              {client.telephone}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowAcompteModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Enregistrer un acompte
          </button>
        {detteActuelle > 0 && (
          <button
            onClick={() => setShowRemboursementModal(true)}
            className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Enregistrer un remboursement
          </button>
        )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Dette actuelle</p>
              <p className={`text-2xl font-bold ${
                detteActuelle === 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {detteActuelle.toFixed(2)} F
              </p>
            </div>
            <div className={`p-3 rounded-full ${
              detteActuelle === 0 ? 'bg-green-100' : 'bg-red-100'
            }`}>
             
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Acompte disponible</p>
              <p className="text-2xl font-bold text-green-600">{acompteDisponible.toFixed(2)} F</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Points fidélité (mois en cours)</p>
              <p className="text-2xl font-bold text-purple-600">
                {client.solde_points ?? 0} pts
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Gift className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Nombre de ventes</p>
              <p className="text-2xl font-bold text-gray-800">{ventes.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Remboursements</p>
              <p className="text-2xl font-bold text-gray-800">{remboursements.length}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Historique des acomptes</h2>
        </div>
        <div className="divide-y">
          {acomptes.length > 0 ? acomptes.map(acompte => (
            <div key={acompte.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-green-600">+{getMontant(acompte.montant).toFixed(2)} F</div>
                  <div className="text-sm text-gray-600 mt-1">{acompte.moyen_paiement} - {new Date(acompte.created_at).toLocaleDateString('fr-FR')}</div>
                  {acompte.note && <div className="text-sm text-gray-500 mt-1">Note: {acompte.note}</div>}
                </div>
              </div>
            </div>
          )) : <div className="p-12 text-center text-gray-500"><p>Aucun acompte enregistré</p></div>}
        </div>
      </div>

      {/* Historique des remboursements */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Historique des remboursements</h2>
        </div>

        <div className="divide-y">
          {remboursements.length > 0 ? (
            remboursements.map((remb) => {
              const montantRemb = getMontant(remb.montant);
              return (
                <div key={remb.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="font-semibold text-green-600">
                          +{montantRemb.toFixed(2)} €
                        </div>
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          {remb.moyen_paiement}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {new Date(remb.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      {remb.note && (
                        <div className="text-sm text-gray-500 mt-1">
                          Note: {remb.note}
                        </div>
                      )}
                      {remb.employe && (
                        <div className="text-xs text-gray-400 mt-1">
                          Par: {remb.employe.nom}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Aucun remboursement enregistré</p>
            </div>
          )}
        </div>
      </div>

      {/* Historique fidélité mensuel */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b flex items-center gap-2">
          <Gift className="w-5 h-5 text-purple-500" />
          <h2 className="text-lg font-semibold">Historique fidélité mensuel</h2>
        </div>

        {fideliteHistoriques.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-6 py-3 text-left">Mois</th>
                  <th className="px-6 py-3 text-right">Total acheté</th>
                  <th className="px-6 py-3 text-right">Points cumulés</th>
                  <th className="px-6 py-3 text-center">Récompense utilisée</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {fideliteHistoriques.map(h => (
                  <tr key={h.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-800">
                      {MOIS_LABELS[h.mois]} {h.annee}
                    </td>
                    <td className="px-6 py-3 text-right text-gray-700">
                      {Math.round(h.montant_achat_total).toLocaleString('fr-FR')} F
                    </td>
                    <td className="px-6 py-3 text-right font-semibold text-purple-600">
                      {h.points_total} pts
                    </td>
                    <td className="px-6 py-3 text-center">
                      {canGererRecompense() ? (
                        <button
                          onClick={() => toggleConsomme(h)}
                          disabled={togglingId === h.id}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                                      transition-colors disabled:opacity-50
                            ${h.est_consomme
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        >
                          {h.est_consomme && <Check className="w-3.5 h-3.5" />}
                          {h.est_consomme ? 'Utilisée' : 'Non utilisée'}
                        </button>
                      ) : (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                          ${h.est_consomme ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {h.est_consomme && <Check className="w-3.5 h-3.5" />}
                          {h.est_consomme ? 'Utilisée' : 'Non utilisée'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-gray-500">
            <Gift className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Aucun historique de fidélité pour ce client</p>
          </div>
        )}
      </div>

      {/* Historique des ventes à crédit */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Ventes à crédit</h2>
        </div>

        <div className="divide-y">
          {ventes.length > 0 ? (
            ventes.map((vente) => {
              const totalVente = getMontant(vente.total);
              return (
               <div
                  key={vente.id}
                  onClick={() => setSelectedReference(vente.reference)}
                  className="p-6 hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="font-mono text-sm text-gray-600">
                          {vente.reference}
                        </div>
                        <div className="font-semibold text-red-600">
                          {totalVente.toFixed(2)} €
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {new Date(vente.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center gap-1">
                        <InvoiceButton
                          venteId={vente.id}
                          venteReference={vente.reference}
                          variant="icon"
                          iconAction="preview"
                        />
                        <InvoiceButton
                          venteId={vente.id}
                          venteReference={vente.reference}
                          variant="icon"
                          iconAction="print"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center text-gray-500">
              
              <p>Aucune vente à crédit</p>
            </div>
          )}
        </div>
      </div>

      {selectedReference && (
        <VenteDetailPanel
          reference={selectedReference}
          onClose={() => setSelectedReference(null)}
        />
      )}

      {/* Modal de remboursement */}
      {showRemboursementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Enregistrer un remboursement</h2>

            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Dette actuelle:</span>
                  <span className="font-semibold text-red-600">
                    {soldeDette.toFixed(2)} F
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Montant remboursé (F)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={soldeDette}
                  value={remboursementData.montant}
                  onChange={(e) => setRemboursementData({ ...remboursementData, montant: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Moyen de paiement
                </label>
                <select
                  value={remboursementData.moyen_paiement}
                  onChange={(e) => setRemboursementData({ 
                    ...remboursementData, 
                    moyen_paiement: e.target.value as typeof remboursementData.moyen_paiement 
                  })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="especes">Espèces</option>
                  <option value="wave">Wave</option>
                  <option value="orange_money">Orange Money</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note (optionnel)
                </label>
                <textarea
                  value={remboursementData.note}
                  onChange={(e) => setRemboursementData({ ...remboursementData, note: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Ajouter une note..."
                />
              </div>

              {remboursementData.montant && parseFloat(remboursementData.montant) > 0 && (
                <div className="bg-blue-50 p-3 rounded-md">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Nouveau solde:</span>
                    <span className="font-semibold text-blue-600">
                      {(soldeDette - parseFloat(remboursementData.montant)).toFixed(2)} €
                    </span>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  onClick={() => {
                    setShowRemboursementModal(false);
                    setRemboursementData({ montant: '', moyen_paiement: 'especes', note: '' });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  disabled={submitting}
                >
                  Annuler
                </button>
                <button
                  onClick={handleRemboursement}
                  disabled={submitting || !remboursementData.montant || parseFloat(remboursementData.montant) <= 0}
                  className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAcompteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Enregistrer un acompte</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Montant (F)</label>
                <input type="number" step="1" min="1" value={acompteData.montant}
                  onChange={e => setAcompteData({ ...acompteData, montant: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" placeholder="0" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Moyen de paiement</label>
                <select value={acompteData.moyen_paiement}
                  onChange={e => setAcompteData({ ...acompteData, moyen_paiement: e.target.value as typeof acompteData.moyen_paiement })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                  <option value="especes">Espèces</option><option value="wave">Wave</option><option value="orange_money">Orange Money</option><option value="carte">Carte</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note (optionnel)</label>
                <textarea value={acompteData.note} onChange={e => setAcompteData({ ...acompteData, note: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" rows={3} />
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <button onClick={() => setShowAcompteModal(false)} disabled={submitting}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Annuler</button>
                <button onClick={handleAcompte} disabled={submitting || !acompteData.montant}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300">{submitting ? 'Enregistrement...' : 'Enregistrer'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}