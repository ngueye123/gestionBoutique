import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, TrendingDown, TrendingUp, Settings, RefreshCw, Download, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { fetchWithAuth } from '../lib/fetchWithAuth';
import { useAuthStore } from '../store/authStore';

// ─── Types ──────────────────────────────────────────────────────────────────

interface StatutAlerte {
  pourcentage: number;
  niveau: 'info' | 'warning' | 'critique' | 'danger' | null;
  label: string;
  attention: boolean;
}

interface CaisseData {
  id: number;
  solde_actuel: number;
  plafond: number;
  est_bloquee: boolean;
}

interface MouvementData {
  id: number;
  type: 'vente' | 'apport' | 'prelevement' | 'remboursement_dette';
  montant: number;
  solde_avant: number;
  solde_apres: number;
  note: string | null;
  ticket_reference: string | null;
  created_at: string;
}

interface VueCaisse {
  id: number;
  acteur: string;
  role: string;
  solde_actuel: number;
  plafond: number;
  pourcentage: number;
  niveau: StatutAlerte['niveau'];
  statut: StatutAlerte;
  est_bloquee: boolean;
}

// ─── Helpers UI ─────────────────────────────────────────────────────────────

const couleurNiveau = (niveau: StatutAlerte['niveau']) => {
  switch (niveau) {
    case 'danger':   return { barre: 'bg-red-600',    texte: 'text-red-700',    fond: 'bg-red-50',    bordure: 'border-red-300' };
    case 'critique': return { barre: 'bg-orange-500', texte: 'text-orange-700', fond: 'bg-orange-50', bordure: 'border-orange-300' };
    case 'warning':  return { barre: 'bg-yellow-500', texte: 'text-yellow-700', fond: 'bg-yellow-50', bordure: 'border-yellow-200' };
    case 'info':     return { barre: 'bg-blue-400',   texte: 'text-blue-700',   fond: 'bg-blue-50',   bordure: 'border-blue-200' };
    default:         return { barre: 'bg-green-500',  texte: 'text-green-700',  fond: 'bg-green-50',  bordure: 'border-green-200' };
  }
};

const labelType = (type: MouvementData['type']) => {
  switch (type) {
    case 'apport':              return { label: 'Apport',              couleur: 'text-blue-600',   signe: '+' };
    case 'remboursement_dette': return { label: 'Remb. dette',         couleur: 'text-teal-600',   signe: '+' };
    case 'prelevement':         return { label: 'Prélèvement',         couleur: 'text-red-600',    signe: '-' };
    default:                    return { label: type,                  couleur: 'text-gray-600',   signe:  '' };
  }
};

// ─── Composant Jauge ────────────────────────────────────────────────────────

const Jauge = ({ pourcentage, niveau }: { pourcentage: number; niveau: StatutAlerte['niveau'] }) => {
  const c = couleurNiveau(niveau);
  const pct = Math.min(pourcentage, 100);

  // Marqueurs de seuil
  const seuils = [
    { pct: 70, label: '70%', couleur: 'bg-blue-400' },
    { pct: 80, label: '80%', couleur: 'bg-yellow-500' },
    { pct: 90, label: '90%', couleur: 'bg-orange-500' },
  ];

  return (
    <div className="w-full">
      <div className="relative h-4 bg-gray-200 rounded-full overflow-visible">
        {/* Barre de remplissage */}
        <div
          className={`h-4 rounded-full transition-all duration-500 ${c.barre}`}
          style={{ width: `${pct}%` }}
        />
        {/* Marqueurs de seuil */}
        {seuils.map(s => (
          <div
            key={s.pct}
            className="absolute top-0 h-4 w-0.5 bg-white opacity-70"
            style={{ left: `${s.pct}%` }}
            title={s.label}
          />
        ))}
      </div>
      {/* Légende des seuils */}
      <div className="flex justify-between text-xs text-gray-400 mt-1 px-0.5">
        <span>0</span>
        <span className="text-blue-400">70%</span>
        <span className="text-yellow-500">80%</span>
        <span className="text-orange-500">90%</span>
        <span className="text-red-600">100%</span>
      </div>
    </div>
  );
};

// ─── Composant principal ────────────────────────────────────────────────────

export default function Caisse() {
  const [caisse, setCaisse]       = useState<CaisseData | null>(null);
  const [statut, setStatut]       = useState<StatutAlerte | null>(null);
  const [mouvements, setMouvements] = useState<MouvementData[]>([]);
  const [toutes, setToutes]       = useState<VueCaisse[]>([]);
  const [loading, setLoading]     = useState(true);
  const [isPatron, setIsPatron]   = useState(false);

  // Formulaire mouvement
  const [typeMvt, setTypeMvt]     = useState<'apport' | 'prelevement'>('prelevement');
  const [montantMvt, setMontantMvt] = useState('');
  const [noteMvt, setNoteMvt]     = useState('');
  const [loadingMvt, setLoadingMvt] = useState(false);

  // Formulaire plafond (patron)
  const [caisseSelectId, setCaisseSelectId] = useState<number | null>(null);
  const [nouveauPlafond, setNouveauPlafond] = useState('');
  const [appliquerTous, setAppliquerTous]   = useState(false);
  const [loadingPlafond, setLoadingPlafond] = useState(false);
  const [showPlafondForm, setShowPlafondForm] = useState(false);

  // Bilan
  const [bilanDebut, setBilanDebut]   = useState(() => {
    const d = new Date(); d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [bilanFin, setBilanFin]     = useState(() => new Date().toISOString().split('T')[0]);
  const [bilanReel, setBilanReel]   = useState('');
  const [bilanData, setBilanData]   = useState<any | null>(null);
  const [loadingBilan, setLoadingBilan] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

  // ── Chargement ────────────────────────────────────────────────────────────

  const charger = useCallback(async () => {
    try {
      const res  = await fetchWithAuth(`${API_URL}/caisse/moi`);
      const data = await res.json();
      if (data.success) {
        setCaisse(data.caisse);
        setStatut(data.statut);
        setMouvements(data.mouvements);

        // Vérifier le rôle pour afficher les options patron
        const resUser = await fetchWithAuth(`${API_URL}/caisse/toutes`);
        if (resUser.ok) {
          const dataToutes = await resUser.json();
          setToutes(dataToutes.caisses);
          setIsPatron(true);
          if (nouveauPlafond === '') {
            setNouveauPlafond(String(data.caisse.plafond));
          }
        }
      }
    } catch (e) {
      toast.error('Erreur de chargement de la caisse');
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => { charger(); }, [charger]);

  // ── Notification seuil au chargement ─────────────────────────────────────

  useEffect(() => {
    if (!statut || !statut.attention) return;
    const msgs: Record<string, string> = {
      danger:   '⛔ Caisse à 100% du plafond ! Prélevez immédiatement.',
      critique: '🔴 Caisse à ' + statut.pourcentage + '% du plafond. Prélèvement urgent.',
      warning:  '🟠 Caisse à ' + statut.pourcentage + '% du plafond.',
      info:     '🟡 Caisse à ' + statut.pourcentage + '% du plafond.',
    };
    const durees: Record<string, number> = { danger: 10000, critique: 8000, warning: 6000, info: 4000 };
    if (statut.niveau) {
      const fn = statut.niveau === 'danger' || statut.niveau === 'critique' ? toast.error : toast.warning;
      fn(msgs[statut.niveau], { duration: durees[statut.niveau] });
    }
  }, [statut?.niveau]);

  // ── Mouvement (apport / prélèvement) ─────────────────────────────────────

  const handleMouvement = async () => {
    if (!montantMvt || parseFloat(montantMvt) <= 0) {
      toast.error('Saisissez un montant valide');
      return;
    }
    setLoadingMvt(true);
    try {
      const res  = await fetchWithAuth(`${API_URL}/caisse/mouvement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: typeMvt, montant: parseFloat(montantMvt), note: noteMvt }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(typeMvt === 'prelevement' ? 'Prélèvement effectué !' : 'Apport enregistré !');
        setCaisse(data.caisse);
        setStatut(data.statut);
        setMouvements(prev => [data.mouvement, ...prev]);
        setMontantMvt('');
        setNoteMvt('');
      } else {
        toast.error(data.message);
      }
    } catch { toast.error('Erreur réseau'); }
    finally  { setLoadingMvt(false); }
  };

  // ── Modifier plafond ──────────────────────────────────────────────────────

  const handleModifierPlafond = async () => {
    if (!nouveauPlafond || parseFloat(nouveauPlafond) < 1000) {
      toast.error('Le plafond doit être ≥ 1 000 F');
      return;
    }
    setLoadingPlafond(true);
    try {
      let url: string;
      let body: object;

      if (appliquerTous) {
        url  = `${API_URL}/caisse/plafond-global`;
        body = { plafond: parseFloat(nouveauPlafond) };
      } else {
        const id = caisseSelectId ?? caisse?.id;
        if (!id) { toast.error('Sélectionnez une caisse'); setLoadingPlafond(false); return; }
        url  = `${API_URL}/caisse/${id}/plafond`;
        body = { plafond: parseFloat(nouveauPlafond) };
      }

      const res  = await fetchWithAuth(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(data.message || 'Plafond mis à jour !');
        setShowPlafondForm(false);
        charger();
      } else {
        toast.error(data.message);
      }
    } catch { toast.error('Erreur réseau'); }
    finally  { setLoadingPlafond(false); }
  };

  // ── Bilan ─────────────────────────────────────────────────────────────────

  const handleBilan = async () => {
    setLoadingBilan(true);
    try {
      const params = new URLSearchParams({
        start_date: bilanDebut,
        end_date:   bilanFin,
        ...(bilanReel ? { solde_reel: bilanReel } : {}),
      });
      const res  = await fetchWithAuth(`${API_URL}/caisse/bilan?${params}`);
      const data = await res.json();
      if (data.success) {
        setBilanData(data);
      } else {
        toast.error(data.message);
      }
    } catch { toast.error('Erreur réseau'); }
    finally  { setLoadingBilan(false); }
  };

  // ── Télécharger ticket ────────────────────────────────────────────────────

  const telechargerTicket = async (mouvementId: number, reference: string) => {
    try {
      const res  = await fetchWithAuth(`${API_URL}/caisse/ticket/${mouvementId}`);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `Ticket_${reference}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Erreur téléchargement ticket'); }
  };

  // ─── Rendu ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const c = couleurNiveau(statut?.niveau ?? null);

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">

      {/* ── Solde principal ─────────────────────────────────────────────── */}
      {caisse && statut && (
        <div className={`rounded-xl border-2 p-6 ${c.fond} ${c.bordure}`}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500 font-medium">Solde actuel</p>
              <p className="text-4xl font-bold text-gray-900">
                {caisse.solde_actuel.toLocaleString('fr-FR')} <span className="text-xl text-gray-500">F</span>
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Plafond : <span className="font-semibold">{caisse.plafond.toLocaleString('fr-FR')} F</span>
              </p>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-semibold ${c.fond} ${c.texte} border ${c.bordure}`}>
              {statut.label}
            </div>
          </div>

          <Jauge pourcentage={statut.pourcentage} niveau={statut.niveau} />

          {/* Alerte visuelle selon seuil */}
          {statut.niveau && (
            <div className={`mt-4 flex items-start gap-2 p-3 rounded-lg ${c.fond} border ${c.bordure}`}>
              <AlertTriangle className={`w-5 h-5 mt-0.5 ${c.texte} flex-shrink-0`} />
              <div>
                <p className={`text-sm font-semibold ${c.texte}`}>
                  {statut.niveau === 'danger'   && '⛔ Plafond atteint — ventes espèces bloquées'}
                  {statut.niveau === 'critique' && `🔴 ${statut.pourcentage}% du plafond — prélèvement urgent`}
                  {statut.niveau === 'warning'  && `🟠 ${statut.pourcentage}% du plafond — pensez à prélever`}
                  {statut.niveau === 'info'     && `🟡 ${statut.pourcentage}% du plafond`}
                </p>
                {(statut.niveau === 'danger' || statut.niveau === 'critique') && (
                  <p className={`text-xs mt-1 ${c.texte}`}>
                    Effectuez un prélèvement pour débloquer les ventes en espèces.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Vue globale patron ──────────────────────────────────────────── */}
      {isPatron && toutes.length > 0 && (
        <div className="bg-white rounded-xl border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Vue globale des caisses</h2>
            <button onClick={charger} className="text-gray-400 hover:text-gray-600">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            {toutes.map(vc => {
              const cv = couleurNiveau(vc.niveau);
              return (
                <div key={vc.id} className={`flex items-center gap-4 p-3 rounded-lg border ${cv.bordure} ${cv.fond}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold truncate">{vc.acteur}</span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{vc.role}</span>
                      {vc.est_bloquee && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Bloquée</span>}
                    </div>
                    <div className="mt-1">
                      <Jauge pourcentage={vc.pourcentage} niveau={vc.niveau} />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-sm">{vc.solde_actuel.toLocaleString('fr-FR')} F</p>
                    <p className={`text-xs ${cv.texte}`}>{vc.pourcentage}%</p>
                  </div>
                  {/* Sélectionner cette caisse pour modifier le plafond */}
                  <button
                    onClick={() => {
                      setCaisseSelectId(vc.id);
                      setNouveauPlafond(String(vc.plafond));
                      setAppliquerTous(false);
                      setShowPlafondForm(true);
                    }}
                    className="p-1.5 hover:bg-white rounded-lg text-gray-400 hover:text-blue-600 transition"
                    title="Modifier le plafond"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Formulaire plafond (patron) ──────────────────────────────────── */}
      {isPatron && (
        <div className="bg-white rounded-xl border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />
              Gestion du plafond
            </h2>
            <button
              onClick={() => setShowPlafondForm(!showPlafondForm)}
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              {showPlafondForm ? 'Réduire' : 'Modifier'}
              <ChevronRight className={`w-4 h-4 transition-transform ${showPlafondForm ? 'rotate-90' : ''}`} />
            </button>
          </div>

          {showPlafondForm && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau plafond (F)</label>
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  value={nouveauPlafond}
                  onChange={e => setNouveauPlafond(e.target.value)}
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: 500000"
                />
                <p className="text-xs text-gray-400 mt-1">Minimum : 1 000 F</p>
              </div>

              {toutes.length > 1 && (
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Appliquer à</label>
                    <select
                      value={appliquerTous ? 'tous' : String(caisseSelectId ?? '')}
                      onChange={e => {
                        if (e.target.value === 'tous') {
                          setAppliquerTous(true);
                          setCaisseSelectId(null);
                        } else {
                          setAppliquerTous(false);
                          setCaisseSelectId(parseInt(e.target.value));
                        }
                      }}
                      className="w-full border rounded-lg p-2"
                    >
                      <option value="tous">Toutes les caisses</option>
                      {toutes.map(vc => (
                        <option key={vc.id} value={vc.id}>
                          {vc.acteur} (actuel: {vc.plafond.toLocaleString('fr-FR')} F)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <button
                onClick={handleModifierPlafond}
                disabled={loadingPlafond}
                className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {loadingPlafond ? 'Mise à jour...' : 'Appliquer le plafond'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Mouvement (apport / prélèvement) ─────────────────────────────── */}
      <div className="bg-white rounded-xl border p-5 shadow-sm">
        <h2 className="text-lg font-bold mb-4">Mouvement de caisse</h2>
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => setTypeMvt('prelevement')}
              className={`flex-1 py-2 rounded-lg font-medium border transition ${
                typeMvt === 'prelevement'
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-red-400'
              }`}
            >
              <TrendingDown className="w-4 h-4 inline mr-1" />
              Prélèvement
            </button>
            <button
              onClick={() => setTypeMvt('apport')}
              className={`flex-1 py-2 rounded-lg font-medium border transition ${
                typeMvt === 'apport'
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'
              }`}
            >
              <TrendingUp className="w-4 h-4 inline mr-1" />
              Apport
            </button>
          </div>

          <input
            type="number"
            min="1"
            value={montantMvt}
            onChange={e => setMontantMvt(e.target.value)}
            placeholder="Montant en F"
            className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
          />

          <input
            type="text"
            value={noteMvt}
            onChange={e => setNoteMvt(e.target.value)}
            placeholder="Note (optionnel)"
            className="w-full border rounded-lg p-2"
          />

          {typeMvt === 'prelevement' && caisse && montantMvt && (
            <div className="text-sm text-gray-500 bg-gray-50 p-2 rounded">
              Solde après prélèvement :{' '}
              <span className="font-semibold">
                {Math.max(0, caisse.solde_actuel - parseFloat(montantMvt || '0')).toLocaleString('fr-FR')} F
              </span>
            </div>
          )}

          <button
            onClick={handleMouvement}
            disabled={loadingMvt}
            className={`w-full py-2 rounded-lg text-white font-medium disabled:opacity-50 ${
              typeMvt === 'prelevement' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {loadingMvt ? 'Traitement...' : `Confirmer le ${typeMvt}`}
          </button>
        </div>
      </div>

      {/* ── Bilan ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border p-5 shadow-sm">
        <h2 className="text-lg font-bold mb-4">Bilan de caisse</h2>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-sm text-gray-600 block mb-1">Du</label>
            <input type="date" value={bilanDebut} onChange={e => setBilanDebut(e.target.value)}
              className="w-full border rounded-lg p-2" />
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">Au</label>
            <input type="date" value={bilanFin} onChange={e => setBilanFin(e.target.value)}
              className="w-full border rounded-lg p-2" />
          </div>
        </div>
        <input
          type="number"
          min="0"
          value={bilanReel}
          onChange={e => setBilanReel(e.target.value)}
          placeholder="Solde réel compté (optionnel)"
          className="w-full border rounded-lg p-2 mb-3"
        />
        <button
          onClick={handleBilan}
          disabled={loadingBilan}
          className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loadingBilan ? 'Calcul...' : 'Calculer le bilan'}
        </button>

        {bilanData && bilanData.bilans.map((b: any, i: number) => (
          <div key={i} className="mt-4 border rounded-lg p-4 space-y-2 text-sm">
            <p className="font-semibold text-gray-700">{b.acteur}</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-green-50 p-2 rounded text-center">
                <p className="text-xs text-gray-500">Entrées</p>
                <p className="font-bold text-green-700">+{b.total_entrees?.toLocaleString('fr-FR')} F</p>
                <p className="text-xs text-gray-400">{b.nombre_ventes} vente(s) · {b.nombre_remboursements} remb.</p>
              </div>
              <div className="bg-red-50 p-2 rounded text-center">
                <p className="text-xs text-gray-500">Sorties</p>
                <p className="font-bold text-red-700">-{b.total_sorties?.toLocaleString('fr-FR')} F</p>
                <p className="text-xs text-gray-400">{b.nombre_prelevements} prélèvement(s)</p>
              </div>
            </div>
            <div className="bg-gray-50 p-2 rounded flex justify-between">
              <span className="text-gray-600">Solde théorique</span>
              <span className="font-bold">{b.solde_theorique?.toLocaleString('fr-FR')} F</span>
            </div>
            {b.ecart !== null && (
              <div className={`p-2 rounded flex justify-between ${
                b.statut_ecart === 'equilibre' ? 'bg-green-50' :
                b.statut_ecart === 'manquant'  ? 'bg-red-50'   : 'bg-yellow-50'
              }`}>
                <span className="text-gray-600">Écart</span>
                <span className={`font-bold ${
                  b.statut_ecart === 'equilibre' ? 'text-green-700' :
                  b.statut_ecart === 'manquant'  ? 'text-red-700'   : 'text-yellow-700'
                }`}>
                  {b.ecart === 0 ? '✅ Équilibré' : b.ecart > 0 ? `↑ +${b.ecart?.toLocaleString('fr-FR')} F` : `⚠️ ${b.ecart?.toLocaleString('fr-FR')} F`}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Historique mouvements ─────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border p-5 shadow-sm">
        <h2 className="text-lg font-bold mb-4">Historique</h2>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {mouvements.length === 0 && (
            <p className="text-center text-gray-400 py-8">Aucun mouvement</p>
          )}
          {mouvements.map(m => {
            const t = labelType(m.type);
            return (
              <div key={m.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${t.couleur}`}>{t.label}</span>
                    {m.note && <span className="text-xs text-gray-400 truncate max-w-32">{m.note}</span>}
                  </div>
                  <p className="text-xs text-gray-400">
                    {new Date(m.created_at).toLocaleString('fr-FR')}
                    {' · '}Après : {m.solde_apres.toLocaleString('fr-FR')} F
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-bold text-sm ${t.couleur}`}>
                    {t.signe}{m.montant.toLocaleString('fr-FR')} F
                  </span>
                  {m.ticket_reference && (
                    <button
                      onClick={() => telechargerTicket(m.id, m.ticket_reference!)}
                      title={`Ticket ${m.ticket_reference}`}
                      className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}