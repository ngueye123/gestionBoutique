import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AlertTriangle, TrendingDown, TrendingUp,
  Settings, RefreshCw, Download, ChevronRight,
  Filter, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { fetchWithAuth } from '../lib/fetchWithAuth';
import { BilanSection } from '../components/BilanSection';
import { HistoriqueBilans } from '../components/HistoriqueBilans';
import { useCaisse } from '../hooks/useCaisse';

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
  type: 'apport' | 'prelevement' | 'remboursement_dette';
  montant: number;
  solde_avant: number;
  solde_apres: number;
  note: string | null;
  ticket_reference: string | null;
  caissier?: string;
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
    case 'apport':              return { label: 'Apport',       couleur: 'text-blue-600', signe: '+' };
    case 'remboursement_dette': return { label: 'Remb. dette',  couleur: 'text-teal-600', signe: '+' };
    case 'prelevement':         return { label: 'Prélèvement',  couleur: 'text-red-600',  signe: '-' };
    default:                    return { label: type,           couleur: 'text-gray-600', signe:  '' };
  }
};

// ─── Jauge ───────────────────────────────────────────────────────────────────

const Jauge = ({ pourcentage, niveau }: { pourcentage: number; niveau: StatutAlerte['niveau'] }) => {
  const c   = couleurNiveau(niveau);
  const pct = Math.min(pourcentage, 100);
  return (
    <div className="w-full">
      <div className="relative h-4 bg-gray-200 rounded-full overflow-visible">
        <div className={`h-4 rounded-full transition-all duration-500 ${c.barre}`} style={{ width: `${pct}%` }} />
        {[70, 80, 90].map(s => (
          <div key={s} className="absolute top-0 h-4 w-0.5 bg-white opacity-70" style={{ left: `${s}%` }} title={`${s}%`} />
        ))}
      </div>
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

// ─── Composant principal ─────────────────────────────────────────────────────

export default function Caisse() {
  const {
    caisse, statut, mouvements,
    chargerMaCaisse, effectuerMouvement,
    telechargerTicket, calculerBilan,
    telechargerTicketBilan, chargerHistoriqueBilans,
  } = useCaisse();

  const [toutes, setToutes]                         = useState<VueCaisse[]>([]);
  const [loading, setLoading]                       = useState(true);
  const [isPatron, setIsPatron]                     = useState(false);
  const [mouvementsEmployes, setMouvementsEmployes] = useState<MouvementData[]>([]);
  const [filtreHistorique, setFiltreHistorique]     = useState<'ma_caisse' | 'tous'>('ma_caisse');

  // ✅ Filtres
  const [showFiltres, setShowFiltres]       = useState(false);
  const [filtreType, setFiltreType]         = useState('');
  const [filtreEmploye, setFiltreEmploye]   = useState('');
  const [filtreDateDebut, setFiltreDateDebut] = useState('');
  const [filtreDateFin, setFiltreDateFin]     = useState('');

  // Formulaire mouvement
  const [typeMvt, setTypeMvt]       = useState<'apport' | 'prelevement'>('prelevement');
  const [montantMvt, setMontantMvt] = useState('');
  const [noteMvt, setNoteMvt]       = useState('');
  const [loadingMvt, setLoadingMvt] = useState(false);

  // Formulaire plafond
  const [caisseSelectId, setCaisseSelectId]   = useState<number | null>(null);
  const [nouveauPlafond, setNouveauPlafond]   = useState('');
  const [appliquerTous, setAppliquerTous]     = useState(false);
  const [loadingPlafond, setLoadingPlafond]   = useState(false);
  const [showPlafondForm, setShowPlafondForm] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

  // ── Chargement ────────────────────────────────────────────────────────────

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const data = await chargerMaCaisse();
      if (data?.mouvements_employes) {
        setMouvementsEmployes(data.mouvements_employes);
      }
      const resToutes = await fetchWithAuth(`${API_URL}/caisse/toutes`);
      if (resToutes.ok) {
        const dataToutes = await resToutes.json();
        if (dataToutes.success) {
          setToutes(dataToutes.caisses);
          setIsPatron(true);
          setNouveauPlafond(prev => prev || String(dataToutes.caisses[0]?.plafond || 500000));
        }
      }
    } catch {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [chargerMaCaisse, API_URL]);

  useEffect(() => { charger(); }, [charger]);

  // Notification seuil
  useEffect(() => {
    if (!statut?.attention || !statut.niveau) return;
    const fn = ['danger', 'critique'].includes(statut.niveau) ? toast.error : toast.warning;
    const msg: Record<string, string> = {
      danger:   '⛔ Caisse à 100% — ventes espèces bloquées !',
      critique: `🔴 Caisse à ${statut.pourcentage}% — prélèvement urgent`,
      warning:  `🟠 Caisse à ${statut.pourcentage}% du plafond`,
      info:     `🟡 Caisse à ${statut.pourcentage}% du plafond`,
    };
    fn(msg[statut.niveau], { duration: statut.niveau === 'danger' ? 10000 : 6000 });
  }, [statut?.niveau]);

  // ── Filtrage ──────────────────────────────────────────────────────────────

  const mouvementsBase: MouvementData[] = filtreHistorique === 'ma_caisse'
    ? mouvements
    : mouvementsEmployes;

  // Liste d'employés uniques pour le select
  const employesUniques = useMemo(() => {
    const noms = mouvementsEmployes.map(m => m.caissier).filter((n): n is string => !!n);
    return [...new Set(noms)];
  }, [mouvementsEmployes]);

  // Application des filtres côté client
  const mouvementsFiltres = useMemo(() => {
    return mouvementsBase.filter(m => {
      if (filtreType && m.type !== filtreType) return false;
      if (filtreHistorique === 'tous' && filtreEmploye && m.caissier !== filtreEmploye) return false;
      if (filtreDateDebut) {
        const debut = new Date(filtreDateDebut);
        debut.setHours(0, 0, 0, 0);
        if (new Date(m.created_at) < debut) return false;
      }
      if (filtreDateFin) {
        const fin = new Date(filtreDateFin);
        fin.setHours(23, 59, 59, 999);
        if (new Date(m.created_at) > fin) return false;
      }
      return true;
    });
  }, [mouvementsBase, filtreType, filtreEmploye, filtreHistorique, filtreDateDebut, filtreDateFin]);

  const nombreFiltresActifs = [filtreType, filtreEmploye, filtreDateDebut, filtreDateFin].filter(Boolean).length;

  const reinitialiserFiltres = () => {
    setFiltreType('');
    setFiltreEmploye('');
    setFiltreDateDebut('');
    setFiltreDateFin('');
  };

  // ── Mouvement ─────────────────────────────────────────────────────────────

  const handleMouvement = async () => {
    if (!montantMvt || parseFloat(montantMvt) <= 0) { toast.error('Montant invalide'); return; }
    setLoadingMvt(true);
    try {
      const data = await effectuerMouvement(typeMvt, parseFloat(montantMvt), noteMvt);
      if (data.success) {
        toast.success(typeMvt === 'prelevement' ? 'Prélèvement effectué !' : 'Apport enregistré !');
        setMontantMvt(''); setNoteMvt(''); charger();
      } else { toast.error(data.message); }
    } catch { toast.error('Erreur réseau'); }
    finally  { setLoadingMvt(false); }
  };

  // ── Plafond ───────────────────────────────────────────────────────────────

  const handleModifierPlafond = async () => {
    if (!nouveauPlafond || parseFloat(nouveauPlafond) < 1000) { toast.error('Plafond min 1 000 F'); return; }
    setLoadingPlafond(true);
    try {
      const url = appliquerTous
        ? `${API_URL}/caisse/plafond-global`
        : `${API_URL}/caisse/${caisseSelectId ?? caisse?.id}/plafond`;
      const res  = await fetchWithAuth(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plafond: parseFloat(nouveauPlafond) }),
      });
      const data = await res.json();
      if (data.success) { toast.success(data.message || 'Plafond mis à jour !'); setShowPlafondForm(false); charger(); }
      else toast.error(data.message);
    } catch { toast.error('Erreur réseau'); }
    finally  { setLoadingPlafond(false); }
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

      {/* ── Solde principal ───────────────────────────────────────────────── */}
      {caisse && statut && (
        <div className={`rounded-xl border-2 p-6 ${c.fond} ${c.bordure}`}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500">Solde actuel</p>
              <p className="text-4xl font-bold text-gray-900">
                {caisse.solde_actuel.toLocaleString('fr-FR')}
                <span className="text-xl text-gray-500 ml-1">F</span>
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Plafond : <span className="font-semibold">{caisse.plafond.toLocaleString('fr-FR')} F</span>
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${c.fond} ${c.texte} ${c.bordure}`}>
              {statut.label}
            </span>
          </div>
          <Jauge pourcentage={statut.pourcentage} niveau={statut.niveau} />
          {statut.niveau && (
            <div className={`mt-4 flex items-start gap-2 p-3 rounded-lg border ${c.bordure} ${c.fond}`}>
              <AlertTriangle className={`w-5 h-5 mt-0.5 ${c.texte} flex-shrink-0`} />
              <p className={`text-sm font-semibold ${c.texte}`}>
                {statut.niveau === 'danger'   && '⛔ Plafond atteint — ventes espèces bloquées'}
                {statut.niveau === 'critique' && `🔴 ${statut.pourcentage}% — prélèvement urgent`}
                {statut.niveau === 'warning'  && `🟠 ${statut.pourcentage}% — pensez à prélever`}
                {statut.niveau === 'info'     && `🟡 ${statut.pourcentage}% du plafond`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Vue globale patron ────────────────────────────────────────────── */}
      {isPatron && toutes.length > 0 && (
        <div className="bg-white rounded-xl border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Vue globale des caisses</h2>
            <button onClick={charger} className="text-gray-400 hover:text-gray-600"><RefreshCw className="w-4 h-4" /></button>
          </div>
          <div className="space-y-3">
            {toutes.map(vc => {
              const cv = couleurNiveau(vc.niveau);
              return (
                <div key={vc.id} className={`flex items-center gap-4 p-3 rounded-lg border ${cv.bordure} ${cv.fond}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold truncate">{vc.acteur}</span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{vc.role}</span>
                      {vc.est_bloquee && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Bloquée</span>}
                    </div>
                    <Jauge pourcentage={vc.pourcentage} niveau={vc.niveau} />
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-sm">{vc.solde_actuel.toLocaleString('fr-FR')} F</p>
                    <p className={`text-xs ${cv.texte}`}>{vc.pourcentage}%</p>
                  </div>
                  <button
                    onClick={() => { setCaisseSelectId(vc.id); setNouveauPlafond(String(vc.plafond)); setAppliquerTous(false); setShowPlafondForm(true); }}
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

      {/* ── Plafond (patron) ──────────────────────────────────────────────── */}
      {isPatron && (
        <div className="bg-white rounded-xl border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />Gestion du plafond
            </h2>
            <button onClick={() => setShowPlafondForm(!showPlafondForm)} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              {showPlafondForm ? 'Réduire' : 'Modifier'}
              <ChevronRight className={`w-4 h-4 transition-transform ${showPlafondForm ? 'rotate-90' : ''}`} />
            </button>
          </div>
          {showPlafondForm && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau plafond (F)</label>
                <input type="number" min="1000" step="1000" value={nouveauPlafond}
                  onChange={e => setNouveauPlafond(e.target.value)}
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500" placeholder="Ex: 500000" />
              </div>
              {toutes.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Appliquer à</label>
                  <select
                    value={appliquerTous ? 'tous' : String(caisseSelectId ?? '')}
                    onChange={e => { if (e.target.value === 'tous') { setAppliquerTous(true); setCaisseSelectId(null); } else { setAppliquerTous(false); setCaisseSelectId(parseInt(e.target.value)); }}}
                    className="w-full border rounded-lg p-2"
                  >
                    <option value="tous">Toutes les caisses</option>
                    {toutes.map(vc => <option key={vc.id} value={vc.id}>{vc.acteur} (actuel: {vc.plafond.toLocaleString('fr-FR')} F)</option>)}
                  </select>
                </div>
              )}
              <button onClick={handleModifierPlafond} disabled={loadingPlafond}
                className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
                {loadingPlafond ? 'Mise à jour...' : 'Appliquer le plafond'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Mouvement ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border p-5 shadow-sm">
        <h2 className="text-lg font-bold mb-4">Mouvement de caisse</h2>
        <div className="space-y-3">
          <div className="flex gap-2">
            <button onClick={() => setTypeMvt('prelevement')}
              className={`flex-1 py-2 rounded-lg font-medium border transition ${typeMvt === 'prelevement' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-300 hover:border-red-400'}`}>
              <TrendingDown className="w-4 h-4 inline mr-1" />Prélèvement
            </button>
            <button onClick={() => setTypeMvt('apport')}
              className={`flex-1 py-2 rounded-lg font-medium border transition ${typeMvt === 'apport' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'}`}>
              <TrendingUp className="w-4 h-4 inline mr-1" />Apport
            </button>
          </div>
          <input type="number" min="1" value={montantMvt} onChange={e => setMontantMvt(e.target.value)}
            placeholder="Montant en F" className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500" />
          <input type="text" value={noteMvt} onChange={e => setNoteMvt(e.target.value)}
            placeholder="Note (optionnel)" className="w-full border rounded-lg p-2" />
          {typeMvt === 'prelevement' && caisse && montantMvt && (
            <p className="text-sm text-gray-500 bg-gray-50 p-2 rounded">
              Solde après : <span className="font-semibold">{Math.max(0, caisse.solde_actuel - parseFloat(montantMvt || '0')).toLocaleString('fr-FR')} F</span>
            </p>
          )}
          <button onClick={handleMouvement} disabled={loadingMvt}
            className={`w-full py-2 rounded-lg text-white font-medium disabled:opacity-50 ${typeMvt === 'prelevement' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>
            {loadingMvt ? 'Traitement...' : `Confirmer le ${typeMvt}`}
          </button>
        </div>
      </div>

      {/* ── Bilan ─────────────────────────────────────────────────────────── */}
      <BilanSection calculerBilan={calculerBilan} telechargerTicketBilan={telechargerTicketBilan} />

      {/* ── Historique bilans (patron) ────────────────────────────────────── */}
      {isPatron && (
        <HistoriqueBilans
          chargerHistoriqueBilans={chargerHistoriqueBilans}
          telechargerTicketBilan={telechargerTicketBilan}
          caisses={toutes.map(v => ({ id: v.id, acteur: v.acteur }))}
        />
      )}

      {/* ── Historique mouvements ─────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">

        {/* Header */}
        <div className="px-5 py-4 border-b bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">Historique des mouvements</h2>
            <div className="flex items-center gap-2">
              {/* Bouton filtres */}
              <button
                onClick={() => setShowFiltres(!showFiltres)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                  showFiltres || nombreFiltresActifs > 0
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                }`}
              >
                <Filter className="w-3 h-3" />
                Filtres
                {nombreFiltresActifs > 0 && (
                  <span className="bg-white text-blue-600 rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold">
                    {nombreFiltresActifs}
                  </span>
                )}
              </button>
              {/* Bouton effacer filtres */}
              {nombreFiltresActifs > 0 && (
                <button
                  onClick={reinitialiserFiltres}
                  className="flex items-center gap-1 px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition"
                >
                  <X className="w-3 h-3" />Effacer
                </button>
              )}
            </div>
          </div>

          {/* Onglets Ma caisse / Tous les employés */}
          {isPatron && (
            <div className="flex gap-1 bg-gray-200 rounded-lg p-1 w-fit">
              <button
                onClick={() => { setFiltreHistorique('ma_caisse'); setFiltreEmploye(''); }}
                className={`px-3 py-1 text-xs rounded-md font-medium transition ${
                  filtreHistorique === 'ma_caisse' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Ma caisse
              </button>
              <button
                onClick={() => setFiltreHistorique('tous')}
                className={`px-3 py-1 text-xs rounded-md font-medium transition flex items-center gap-1 ${
                  filtreHistorique === 'tous' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Tous les employés
                {mouvementsEmployes.length > 0 && (
                  <span className="bg-blue-100 text-blue-600 px-1.5 rounded-full text-xs">
                    {mouvementsEmployes.length}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* ✅ Panneau de filtres */}
        {showFiltres && (
          <div className="px-5 py-4 border-b bg-blue-50">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

              {/* Type */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Type</label>
                <select
                  value={filtreType}
                  onChange={e => setFiltreType(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tous les types</option>
                  <option value="apport">Apport</option>
                  <option value="prelevement">Prélèvement</option>
                  <option value="remboursement_dette">Remb. dette</option>
                </select>
              </div>

              {/* Employé — uniquement en vue "tous" */}
              {filtreHistorique === 'tous' && isPatron && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Employé</label>
                  <select
                    value={filtreEmploye}
                    onChange={e => setFiltreEmploye(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Tous les employés</option>
                    {employesUniques.map(nom => (
                      <option key={nom} value={nom}>{nom}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Date début */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Du</label>
                <input
                  type="date" value={filtreDateDebut}
                  onChange={e => setFiltreDateDebut(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Date fin */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Au</label>
                <input
                  type="date" value={filtreDateFin}
                  onChange={e => setFiltreDateFin(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Résumé */}
            <p className="text-xs text-gray-500 mt-3">
              <span className="font-semibold text-gray-700">{mouvementsFiltres.length}</span> mouvement(s) trouvé(s)
              {nombreFiltresActifs > 0 && (
                <button onClick={reinitialiserFiltres} className="ml-2 text-red-500 hover:underline">
                  Effacer les filtres
                </button>
              )}
            </p>
          </div>
        )}

        {/* Liste */}
        <div className="divide-y max-h-96 overflow-y-auto">
          {mouvementsFiltres.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <p className="text-sm">
                {nombreFiltresActifs > 0
                  ? 'Aucun mouvement ne correspond aux filtres'
                  : filtreHistorique === 'tous'
                    ? 'Aucun mouvement pour les employés'
                    : 'Aucun mouvement'}
              </p>
              {nombreFiltresActifs > 0 && (
                <button onClick={reinitialiserFiltres} className="mt-2 text-xs text-blue-600 hover:underline">
                  Effacer les filtres
                </button>
              )}
            </div>
          ) : (
            mouvementsFiltres.map(m => {
              const t = labelType(m.type);
              return (
                <div key={m.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-semibold ${t.couleur}`}>{t.label}</span>
                      {filtreHistorique === 'tous' && m.caissier && (
                        <span className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-200 px-2 py-0.5 rounded-full font-medium">
                          {m.caissier}
                        </span>
                      )}
                      {m.note && <span className="text-xs text-gray-400 truncate max-w-36">{m.note}</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(m.created_at).toLocaleString('fr-FR')}
                      {' · '}Après : {m.solde_apres.toLocaleString('fr-FR')} F
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
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
            })
          )}
        </div>
      </div>

    </div>
  );
}