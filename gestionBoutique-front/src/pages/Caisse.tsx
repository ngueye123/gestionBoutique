import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingDown, TrendingUp, Settings, RefreshCw,
  Printer, Loader2, ChevronRight, Filter, X, AlertTriangle,
  Wallet, Users, ArrowDownLeft, ArrowUpRight, Clock,
  CheckCircle, BarChart3, ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { fetchWithAuth } from '../lib/fetchWithAuth';
import { getApiErrorMessage } from '../lib/apiError';
import { BilanSection } from '../components/BilanSection';
import { HistoriqueBilans } from '../components/HistoriqueBilans';
import { useCaisse } from '../hooks/useCaisse';
import type { MouvementData } from '../hooks/useCaisse';

// ─── Types locaux ────────────────────────────────────────────────────────────

interface StatutAlerte {
  pourcentage: number;
  niveau: 'info' | 'warning' | 'critique' | 'danger' | null;
  label: string;
  attention: boolean;
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

// ─── Constantes de couleurs ──────────────────────────────────────────────────

const NIVEAU_CONFIG = {
  danger:   { bg: 'bg-red-50',     border: 'border-red-200',    bar: 'bg-red-500',    text: 'text-red-700',    badge: 'bg-red-100 text-red-700',    icon: '🔴' },
  critique: { bg: 'bg-orange-50',  border: 'border-orange-200', bar: 'bg-orange-500', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700', icon: '🟠' },
  warning:  { bg: 'bg-amber-50',   border: 'border-amber-200',  bar: 'bg-amber-400',  text: 'text-amber-700',  badge: 'bg-amber-100 text-amber-700',  icon: '🟡' },
  info:     { bg: 'bg-blue-50',    border: 'border-blue-200',   bar: 'bg-blue-400',   text: 'text-blue-700',   badge: 'bg-blue-100 text-blue-700',    icon: 'ℹ️' },
  default:  { bg: 'bg-emerald-50', border: 'border-emerald-200',bar: 'bg-emerald-500',text: 'text-emerald-700',badge: 'bg-emerald-100 text-emerald-700',icon: '✅' },
} as const;

const MOUVEMENT_CONFIG = {
  apport:              { label: 'Apport',        icon: ArrowUpRight,   color: 'text-emerald-600', bg: 'bg-emerald-50',  signe: '+' },
  remboursement_dette: { label: 'Remb. dette',   icon: ArrowUpRight,   color: 'text-teal-600',    bg: 'bg-teal-50',     signe: '+' },
  prelevement:         { label: 'Prélèvement',   icon: ArrowDownLeft,  color: 'text-red-500',     bg: 'bg-red-50',      signe: '−' },
  depense:             { label: 'Dépense',       icon: ArrowDownLeft,  color: 'text-orange-500',  bg: 'bg-orange-50',   signe: '−' },
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Formatte un montant sans arrondi : affiche exactement la valeur fournie
 * (conserve les décimales telles qu'en base) en utilisant le séparateur
 * des milliers français et la virgule décimale.
 */
const fmt = (n: number | null | undefined) => {
  if (n === null || n === undefined || !isFinite(n as number)) return '0 F';

  const s = String(n);
  // Si notation exponentielle, tomber back sur toLocaleString avec 6 décimales max
  if (s.toLowerCase().includes('e')) {
    return (n as number).toLocaleString('fr-FR', { maximumFractionDigits: 6 }) + ' F';
  }

  const [intPart, fracPart] = s.split('.');
  const intNumber = Number(intPart);
  const intFormatted = intNumber.toLocaleString('fr-FR');

  if (!fracPart || /^0+$/.test(fracPart)) {
    return `${intFormatted} F`;
  }

  // Supprimer les zéros inutiles en fin de fraction pour garder l'affichage "exact"
  const fracTrimmed = fracPart.replace(/0+$/u, '');
  return `${intFormatted},${fracTrimmed} F`;
};

const getNiveauConfig = (niveau: StatutAlerte['niveau']) =>
  NIVEAU_CONFIG[niveau ?? 'default'] ?? NIVEAU_CONFIG.default;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });

// ─── Composant Jauge ─────────────────────────────────────────────────────────

const Jauge = ({ pourcentage, niveau }: { pourcentage: number; niveau: StatutAlerte['niveau'] }) => {
  const cfg = getNiveauConfig(niveau);
  const pct = Math.min(pourcentage, 100);
  return (
    <div className="space-y-1.5">
      <div className="relative h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${cfg.bar}`}
          style={{ width: `${pct}%` }}
        />
        {[70, 80, 90].map(s => (
          <div
            key={s}
            className="absolute top-0 bottom-0 w-px bg-white/70"
            style={{ left: `${s}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 px-0.5">
        <span>0%</span>
        <span>70%</span>
        <span>80%</span>
        <span>90%</span>
        <span className={cfg.text}>{pct}%</span>
      </div>
    </div>
  );
};

// ─── Composant principal ──────────────────────────────────────────────────────

export default function Caisse() {
  const {
    caisse, statut, mouvements,
    chargerMaCaisse, effectuerMouvement,
    imprimerTicket, calculerBilan,
    telechargerTicketBilan, chargerHistoriqueBilans,
  } = useCaisse();

  const [impressionEnCours, setImpressionEnCours] = useState<number | null>(null);
  const [toutes, setToutes]                         = useState<VueCaisse[]>([]);
  const [loading, setLoading]                       = useState(true);
  const [isPatron, setIsPatron]                     = useState(false);
  const [mouvementsEmployes, setMouvementsEmployes] = useState<MouvementData[]>([]);
  const [filtreHistorique, setFiltreHistorique]     = useState<'ma_caisse' | 'tous'>('ma_caisse');
  const [showFiltres, setShowFiltres]               = useState(false);
  const [filtreType, setFiltreType]                 = useState('');
  const [filtreEmploye, setFiltreEmploye]           = useState('');
  const [filtreDateDebut, setFiltreDateDebut]       = useState('');
  const [filtreDateFin, setFiltreDateFin]           = useState('');
  const [typeMvt, setTypeMvt]                       = useState<'apport' | 'prelevement'>('prelevement');
  const [montantMvt, setMontantMvt]                 = useState('');
  const [noteMvt, setNoteMvt]                       = useState('');
  const [loadingMvt, setLoadingMvt]                 = useState(false);
  const [caisseSelectId, setCaisseSelectId]         = useState<number | null>(null);
  const [nouveauPlafond, setNouveauPlafond]         = useState('');
  const [appliquerTous, setAppliquerTous]           = useState(false);
  const [loadingPlafond, setLoadingPlafond]         = useState(false);
  const [showPlafondForm, setShowPlafondForm]       = useState(false);
  const [showMouvForm, setShowMouvForm]             = useState(false);
  const [showVueGlobale, setShowVueGlobale]         = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

  // ── Chargement ────────────────────────────────────────────────────────────

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const data = await chargerMaCaisse();

      // Correction : mouvements_employes peut aussi être paginé
      if (data?.mouvements_employes) {
        const raw = data.mouvements_employes;
        setMouvementsEmployes(
          Array.isArray(raw) ? raw : (raw?.data ?? [])
        );
      }

      const resToutes = await fetchWithAuth(`${API_URL}/caisse/toutes`);
      if (resToutes.ok) {
        const dt = await resToutes.json();
        if (dt.success) {
          setToutes(dt.caisses);
          setIsPatron(true);
          setNouveauPlafond(prev => prev || String(dt.caisses[0]?.plafond || 500000));
        }
      }
    } catch {
      toast.error('Impossible de charger les informations de caisse. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  }, [chargerMaCaisse, API_URL]);

  useEffect(() => { charger(); }, [charger]);

  // Alerte seuil caisse
  useEffect(() => {
    if (!statut?.attention || !statut.niveau) return;
    const fn = ['danger', 'critique'].includes(statut.niveau) ? toast.error : toast.warning;
    const msgs: Record<string, string> = {
      danger:   '⛔ Caisse pleine — ventes espèces bloquées !',
      critique: `🔴 Caisse à ${statut.pourcentage}% — prélèvement urgent`,
      warning:  `🟠 Caisse à ${statut.pourcentage}% du plafond`,
      info:     `🟡 Caisse à ${statut.pourcentage}% du plafond`,
    };
    fn(msgs[statut.niveau], { duration: statut.niveau === 'danger' ? 10000 : 5000 });
  }, [statut?.niveau]);

  // ── Filtrage mouvements ───────────────────────────────────────────────────

  const mouvementsBase: MouvementData[] = filtreHistorique === 'ma_caisse'
    ? mouvements
    : mouvementsEmployes;

  const employesUniques = useMemo(() => {
    const noms = mouvementsEmployes.map(m => m.caissier).filter((n): n is string => !!n);
    return [...new Set(noms)];
  }, [mouvementsEmployes]);

  const mouvementsFiltres = useMemo(() => {
    if (!Array.isArray(mouvementsBase)) return [];
    return mouvementsBase.filter(m => {
      if (filtreType && m.type !== filtreType) return false;
      if (filtreHistorique === 'tous' && filtreEmploye && m.caissier !== filtreEmploye) return false;
      if (filtreDateDebut) {
        const d = new Date(filtreDateDebut); d.setHours(0, 0, 0, 0);
        if (new Date(m.created_at) < d) return false;
      }
      if (filtreDateFin) {
        const d = new Date(filtreDateFin); d.setHours(23, 59, 59, 999);
        if (new Date(m.created_at) > d) return false;
      }
      return true;
    });
  }, [mouvementsBase, filtreType, filtreEmploye, filtreHistorique, filtreDateDebut, filtreDateFin]);

  const nombreFiltresActifs = [filtreType, filtreEmploye, filtreDateDebut, filtreDateFin].filter(Boolean).length;
  const reinitialiserFiltres = () => {
    setFiltreType(''); setFiltreEmploye('');
    setFiltreDateDebut(''); setFiltreDateFin('');
  };

  // Totaux historique visible
  const totalEntrees = useMemo(() =>
    mouvementsFiltres.filter(m => ['apport', 'remboursement_dette'].includes(m.type)).reduce((s, m) => s + m.montant, 0),
    [mouvementsFiltres]);
  const totalSorties = useMemo(() =>
    mouvementsFiltres.filter(m => ['prelevement', 'depense'].includes(m.type)).reduce((s, m) => s + m.montant, 0),
    [mouvementsFiltres]);

  // ── Mouvement ─────────────────────────────────────────────────────────────

  const handleImprimerTicket = async (mouvementId: number) => {
    setImpressionEnCours(mouvementId);
    try {
      const result = await imprimerTicket(mouvementId);
      if (result.success) {
        toast.success('Ticket envoyé à l\'imprimante');
      } else {
        toast.error(result.error || 'Impossible d\'imprimer le ticket');
      }
    } finally {
      setImpressionEnCours(null);
    }
  };

  const handleMouvement = async () => {
    if (!montantMvt || parseFloat(montantMvt) <= 0) { toast.error('Montant invalide'); return; }
    setLoadingMvt(true);
    try {
      const data = await effectuerMouvement(typeMvt, parseFloat(montantMvt), noteMvt);
      if (data.success) {
        toast.success(typeMvt === 'prelevement' ? '💸 Prélèvement effectué' : '💰 Apport enregistré');
        setMontantMvt(''); setNoteMvt(''); setShowMouvForm(false);
        charger();
      } else {
        toast.error(getApiErrorMessage(data, 'Impossible d\'enregistrer le mouvement.'));
      }
    } catch (error) {
      toast.error("Impossible d'enregistrer le mouvement. Vérifiez votre connexion.");
    } finally {
      setLoadingMvt(false);
    }
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
      if (data.success) {
        toast.success('Plafond mis à jour');
        setShowPlafondForm(false);
        charger();
      } else {
        toast.error(getApiErrorMessage(data, 'Impossible de mettre à jour le plafond.')); 
      }
    } catch { toast.error('Impossible de mettre à jour le plafond. Vérifiez votre connexion.'); }
    finally  { setLoadingPlafond(false); }
  };

  // ─── Rendu ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3">
        <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
        <span className="text-sm text-gray-500">Chargement de la caisse…</span>
      </div>
    );
  }

  const cfg = getNiveauConfig(statut?.niveau ?? null);
  const pct = statut?.pourcentage ?? 0;

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-5">

      {/* ══ HERO : Solde principal ══════════════════════════════════════════ */}
      {caisse && statut && (
        <div className={`rounded-2xl border-2 ${cfg.border} ${cfg.bg} p-4 sm:p-6`}>

          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-3 sm:gap-0 mb-4 sm:mb-5">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cfg.badge}`}>
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Solde caisse</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 leading-none mt-0.5">
                  {fmt(caisse.solde_actuel)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {statut.niveau && (
                <span className={`text-xs font-semibold px-2 sm:px-3 py-1 sm:py-1.5 rounded-full ${cfg.badge}`}>
                  {cfg.icon} <span className="hidden sm:inline">{statut.label}</span>
                </span>
              )}
              <button
                onClick={charger}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/70 text-gray-400 hover:text-gray-700 hover:bg-white transition border border-gray-200"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Jauge */}
          <Jauge pourcentage={pct} niveau={statut.niveau} />

          {/* Stats rapides */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-4 sm:mt-5">
            <div className="bg-white/70 rounded-xl p-2.5 sm:p-3 border border-white">
              <p className="text-xs text-gray-500 mb-0.5">Plafond</p>
              <p className="text-base sm:text-lg font-bold text-gray-800">{fmt(caisse.plafond)}</p>
            </div>
            <div className="bg-white/70 rounded-xl p-2.5 sm:p-3 border border-white">
              <p className="text-xs text-gray-500 mb-0.5">Disponible</p>
              <p className={`text-base sm:text-lg font-bold ${cfg.text}`}>
                {fmt(Math.max(0, caisse.plafond - caisse.solde_actuel))}
              </p>
            </div>
          </div>

          {/* Message d'alerte */}
          {statut.niveau && (
            <div className={`mt-3 sm:mt-4 flex items-start sm:items-center gap-2.5 p-2.5 sm:p-3 rounded-xl border ${cfg.border} bg-white/50`}>
              <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 sm:mt-0 ${cfg.text}`} />
              <p className={`text-xs sm:text-sm font-medium ${cfg.text}`}>
                {statut.niveau === 'danger'   && 'Plafond atteint — les ventes espèces sont bloquées.'}
                {statut.niveau === 'critique' && `${pct}% du plafond atteint — effectuez un prélèvement.`}
                {statut.niveau === 'warning'  && `${pct}% du plafond — pensez à prélever bientôt.`}
                {statut.niveau === 'info'     && `${pct}% du plafond utilisé.`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ══ ACTIONS RAPIDES ═════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => { setTypeMvt('prelevement'); setShowMouvForm(true); }}
          className="flex items-center justify-center gap-2 py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium text-sm transition shadow-sm"
        >
          <TrendingDown className="w-4 h-4" />
          Prélèvement
        </button>
        <button
          onClick={() => { setTypeMvt('apport'); setShowMouvForm(true); }}
          className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-sm transition shadow-sm"
        >
          <TrendingUp className="w-4 h-4" />
          Apport
        </button>
      </div>

      {/* ══ FORMULAIRE MOUVEMENT ════════════════════════════════════════════ */}
      {showMouvForm && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            {(['prelevement', 'apport'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTypeMvt(t)}
                className={`flex-1 py-3 text-sm font-semibold transition ${
                  typeMvt === t
                    ? t === 'prelevement'
                      ? 'bg-red-50 text-red-700 border-b-2 border-red-500'
                      : 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-500'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {t === 'prelevement' ? '↓ Prélèvement' : '↑ Apport'}
              </button>
            ))}
          </div>

          <div className="p-5 space-y-4">
            {/* Montant */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                Montant (F)
              </label>
              <input
                type="number"
                min="1"
                value={montantMvt}
                onChange={e => setMontantMvt(e.target.value)}
                placeholder="Ex: 50 000"
                autoFocus
                className="w-full text-2xl font-bold border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-0 focus:border-blue-400 outline-none transition"
              />
              {/* Aperçu solde après */}
              {caisse && montantMvt && parseFloat(montantMvt) > 0 && (
                <div className={`mt-2 flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                  typeMvt === 'prelevement' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                }`}>
                  <span>Solde après</span>
                  <span className="font-bold">
                    {fmt(Math.max(0,
                      typeMvt === 'prelevement'
                        ? caisse.solde_actuel - parseFloat(montantMvt)
                        : caisse.solde_actuel + parseFloat(montantMvt)
                    ))}
                  </span>
                </div>
              )}
            </div>

            {/* Note */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                Note <span className="text-gray-400 font-normal">(optionnel)</span>
              </label>
              <input
                type="text"
                value={noteMvt}
                onChange={e => setNoteMvt(e.target.value)}
                placeholder="Ex: Fond de caisse du matin"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-0 focus:border-blue-400 outline-none transition"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { setShowMouvForm(false); setMontantMvt(''); setNoteMvt(''); }}
                className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleMouvement}
                disabled={loadingMvt || !montantMvt || parseFloat(montantMvt) <= 0}
                className={`flex-[2] py-2.5 rounded-xl text-sm text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${
                  typeMvt === 'prelevement'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {loadingMvt ? 'Traitement…' : `Confirmer le ${typeMvt}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ VUE GLOBALE PATRON ══════════════════════════════════════════════ */}
      {isPatron && toutes.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowVueGlobale(!showVueGlobale)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <span className="font-semibold text-gray-900">Vue globale des caisses</span>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                {toutes.length}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showVueGlobale ? 'rotate-180' : ''}`} />
          </button>

          {showVueGlobale && (
            <div className="px-5 pb-5 space-y-3 border-t border-gray-50">
              {toutes.map(vc => {
                const vcCfg = getNiveauConfig(vc.niveau);
                return (
                  <div
                    key={vc.id}
                    className={`flex items-center gap-4 p-4 rounded-xl border ${vcCfg.border} ${vcCfg.bg} mt-3`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-gray-900 text-sm truncate">{vc.acteur}</span>
                        <span className="text-xs text-gray-400 bg-white px-2 py-0.5 rounded-full border border-gray-100">
                          {vc.role}
                        </span>
                        {vc.est_bloquee && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                            Bloquée
                          </span>
                        )}
                      </div>
                      <Jauge pourcentage={vc.pourcentage} niveau={vc.niveau} />
                    </div>
                    <div className="text-right flex-shrink-0 space-y-1">
                      <p className="font-bold text-sm text-gray-900">{fmt(vc.solde_actuel)}</p>
                      <p className={`text-xs font-medium ${vcCfg.text}`}>{vc.pourcentage}%</p>
                    </div>
                    <button
                      onClick={() => {
                        setCaisseSelectId(vc.id);
                        setNouveauPlafond(String(vc.plafond));
                        setAppliquerTous(false);
                        setShowPlafondForm(true);
                      }}
                      className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg bg-white/80 hover:bg-white text-gray-400 hover:text-blue-600 border border-gray-200 transition"
                      title="Modifier le plafond"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ GESTION DU PLAFOND ══════════════════════════════════════════════ */}
      {isPatron && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowPlafondForm(!showPlafondForm)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <Settings className="w-4 h-4 text-gray-600" />
              </div>
              <span className="font-semibold text-gray-900">Gestion du plafond</span>
            </div>
            <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${showPlafondForm ? 'rotate-90' : ''}`} />
          </button>

          {showPlafondForm && (
            <div className="px-5 pb-5 space-y-4 border-t border-gray-50 pt-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                  Nouveau plafond (F)
                </label>
                <input
                  type="number"
                  min="1000"
                  step="10000"
                  value={nouveauPlafond}
                  onChange={e => setNouveauPlafond(e.target.value)}
                  className="w-full text-xl font-bold border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-0 focus:border-blue-400 outline-none transition"
                  placeholder="Ex: 500 000"
                />
              </div>

              {toutes.length > 1 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                    Appliquer à
                  </label>
                  <select
                    value={appliquerTous ? 'tous' : String(caisseSelectId ?? '')}
                    onChange={e => {
                      if (e.target.value === 'tous') { setAppliquerTous(true); setCaisseSelectId(null); }
                      else { setAppliquerTous(false); setCaisseSelectId(parseInt(e.target.value)); }
                    }}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-0 focus:border-blue-400 outline-none"
                  >
                    <option value="tous">Toutes les caisses</option>
                    {toutes.map(vc => (
                      <option key={vc.id} value={vc.id}>
                        {vc.acteur} (actuel : {fmt(vc.plafond)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={handleModifierPlafond}
                disabled={loadingPlafond}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50"
              >
                {loadingPlafond ? 'Mise à jour…' : 'Appliquer le plafond'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══ BILAN ════════════════════════════════════════════════════════════ */}
      <BilanSection calculerBilan={calculerBilan} telechargerTicketBilan={telechargerTicketBilan} />

      {/* ══ HISTORIQUE BILANS (patron) ════════════════════════════════════════ */}
      {isPatron && (
        <HistoriqueBilans
          chargerHistoriqueBilans={chargerHistoriqueBilans}
          telechargerTicketBilan={telechargerTicketBilan}
          caisses={toutes.map(v => ({ id: v.id, acteur: v.acteur }))}
        />
      )}

      {/* ══ HISTORIQUE MOUVEMENTS ════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        {/* Header historique */}
        <div className="px-5 py-4 border-b border-gray-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-gray-600" />
              </div>
              <span className="font-semibold text-gray-900">Historique</span>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {mouvementsFiltres.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFiltres(!showFiltres)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border font-medium transition ${
                  showFiltres || nombreFiltresActifs > 0
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                }`}
              >
                <Filter className="w-3 h-3" />
                Filtres
                {nombreFiltresActifs > 0 && (
                  <span className="bg-white text-blue-600 rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {nombreFiltresActifs}
                  </span>
                )}
              </button>
              {nombreFiltresActifs > 0 && (
                <button
                  onClick={reinitialiserFiltres}
                  className="flex items-center gap-1 px-2 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded-lg border border-red-200 transition"
                >
                  <X className="w-3 h-3" /> Effacer
                </button>
              )}
            </div>
          </div>

          {/* Onglets Ma caisse / Tous */}
          {isPatron && (
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
              <button
                onClick={() => { setFiltreHistorique('ma_caisse'); setFiltreEmploye(''); }}
                className={`px-4 py-1.5 text-xs rounded-lg font-medium transition ${
                  filtreHistorique === 'ma_caisse'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Ma caisse
              </button>
              <button
                onClick={() => setFiltreHistorique('tous')}
                className={`px-4 py-1.5 text-xs rounded-lg font-medium transition flex items-center gap-1.5 ${
                  filtreHistorique === 'tous'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Tous les employés
                {mouvementsEmployes.length > 0 && (
                  <span className="bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full text-xs">
                    {mouvementsEmployes.length}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Panneau filtres */}
        {showFiltres && (
          <div className="px-5 py-4 border-b border-gray-50 bg-gray-50">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Type</label>
                <select
                  value={filtreType}
                  onChange={e => setFiltreType(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Tous</option>
                  <option value="apport">Apport</option>
                  <option value="prelevement">Prélèvement</option>
                  <option value="remboursement_dette">Remb. dette</option>
                  <option value="depense">Dépense</option>
                </select>
              </div>

              {filtreHistorique === 'tous' && isPatron && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Employé</label>
                  <select
                    value={filtreEmploye}
                    onChange={e => setFiltreEmploye(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Tous</option>
                    {employesUniques.map(nom => (
                      <option key={nom} value={nom}>{nom}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Du</label>
                <input
                  type="date"
                  value={filtreDateDebut}
                  onChange={e => setFiltreDateDebut(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Au</label>
                <input
                  type="date"
                  value={filtreDateFin}
                  onChange={e => setFiltreDateFin(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Mini résumé entrées / sorties */}
        {mouvementsFiltres.length > 0 && (
          <div className="grid grid-cols-2 gap-px bg-gray-100 border-b border-gray-100">
            <div className="bg-white px-5 py-3 flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Entrées</p>
                <p className="text-sm font-bold text-emerald-600">+{fmt(totalEntrees)}</p>
              </div>
            </div>
            <div className="bg-white px-5 py-3 flex items-center gap-2">
              <ArrowDownLeft className="w-4 h-4 text-red-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Sorties</p>
                <p className="text-sm font-bold text-red-500">−{fmt(totalSorties)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Liste mouvements */}
        <div className="divide-y divide-gray-50 max-h-[420px] overflow-y-auto">
          {mouvementsFiltres.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-gray-300 gap-3">
              <Clock className="w-10 h-10" />
              <p className="text-sm text-gray-400 font-medium">
                {nombreFiltresActifs > 0 ? 'Aucun résultat pour ces filtres' : 'Aucun mouvement'}
              </p>
              {nombreFiltresActifs > 0 && (
                <button onClick={reinitialiserFiltres} className="text-xs text-blue-500 hover:underline">
                  Effacer les filtres
                </button>
              )}
            </div>
          ) : (
            mouvementsFiltres.map(m => {
              const mcfg = MOUVEMENT_CONFIG[m.type] ?? {
                label: m.type, icon: Clock, color: 'text-gray-600', bg: 'bg-gray-50', signe: '',
              };
              const Icon = mcfg.icon;
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  {/* Icône type */}
                  <div className={`w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center ${mcfg.bg}`}>
                    <Icon className={`w-4 h-4 ${mcfg.color}`} />
                  </div>

                  {/* Détails */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-semibold ${mcfg.color}`}>{mcfg.label}</span>
                      {filtreHistorique === 'tous' && m.caissier && (
                        <span className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded-full font-medium">
                          {m.caissier}
                        </span>
                      )}
                      {m.note && (
                        <span className="text-xs text-gray-400 truncate max-w-32">{m.note}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDate(m.created_at)}
                      <span className="mx-1.5 text-gray-200">·</span>
                      Solde après : <span className="font-medium text-gray-600">{fmt(m.solde_apres)}</span>
                    </p>
                  </div>

                  {/* Montant + ticket */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-sm font-bold tabular-nums ${mcfg.color}`}>
                      {mcfg.signe}{fmt(m.montant)}
                    </span>
                    {m.ticket_reference && (
                      <button
                        onClick={() => handleImprimerTicket(m.id)}
                        disabled={impressionEnCours === m.id}
                        title={`Imprimer le ticket ${m.ticket_reference}`}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition disabled:opacity-50"
                      >
                        {impressionEnCours === m.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Printer className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer total */}
        {mouvementsFiltres.length > 0 && (
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {mouvementsFiltres.length} mouvement{mouvementsFiltres.length > 1 ? 's' : ''}
              {nombreFiltresActifs > 0 ? ' (filtré)' : ''}
            </span>
            <div className="flex items-center gap-1 text-xs text-emerald-600 font-semibold">
              <CheckCircle className="w-3.5 h-3.5" />
              Net : {fmt(totalEntrees - totalSorties)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}