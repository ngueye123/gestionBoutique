// src/pages/POS.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
  Search, ShoppingCart, Plus, Minus, X,
  CheckCircle, FileText, Trash2, CreditCard,
  Smartphone, Banknote, Clock, Pencil, Gift, User,
} from 'lucide-react';
import { toast } from 'sonner';
import { Product, Client, FideliteConfig } from '../types';
import { useCartStore } from '../store/cartStore';
import { fetchWithAuth } from '../lib/fetchWithAuth';
import { getApiErrorMessage } from '../lib/apiError';
import { InvoiceButton, useInvoicePrint } from '../components/InvoiceButton';
import { InvoiceSearch } from '../components/InvoiceSearch';
import { CaisseBloqueeModal } from '../components/CaisseBloqueeModal';
import { PriceOverrideModal } from '../components/PriceOverrideModal';
import type { BloquageInfo } from '../hooks/useCaisse';
import { UNIT_CONFIG, compatibleUnits, fromBase, lineSubtotal } from '../lib/unitConverter';

type PaymentMethod = 'especes' | 'wave' | 'orange_money' | 'dette';

interface LignePaiement {
  id: string;
  mode: PaymentMethod;
  montant: number;
  montant_recu?: number;
  reference_transaction?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

const getSoldeDette = (solde: any): number => {
  const parsed = parseFloat(String(solde || 0));
  return isNaN(parsed) ? 0 : parsed;
};

const getSoldePoints = (solde: any): number => {
  const parsed = parseInt(String(solde || 0), 10);
  return isNaN(parsed) ? 0 : parsed;
};

const formatQty = (n: number) => Number(n.toFixed(3)).toString();
const unitLabel = (type: Product['unit_type'], unit: string) => UNIT_CONFIG[type].labels[unit] ?? unit;

// Billets courants au Sénégal, pour l'encaissement en un clic
const BILLETS_RAPIDES = [500, 1000, 2000, 5000, 10000];

// ─── Config méthodes de paiement ──────────────────────────────────────────────

const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string; icon: React.ReactNode }> = [
  { value: 'especes',      label: 'Espèces',      icon: <Banknote className="w-4 h-4" /> },
  { value: 'wave',         label: 'Wave',          icon: <Smartphone className="w-4 h-4" /> },
  { value: 'orange_money', label: 'Orange Money',  icon: <CreditCard className="w-4 h-4" /> },
  { value: 'dette',        label: 'À crédit',      icon: <Clock className="w-4 h-4" /> },
];

// ─── Composant principal ──────────────────────────────────────────────────────

export default function POS() {
  const [products, setProducts]             = useState<Product[]>([]);
  const [clients, setClients]               = useState<Client[]>([]);
  const [searchTerm, setSearchTerm]         = useState('');
  const [clientSearch, setClientSearch]     = useState('');
  const [lignesPaiement, setLignesPaiement] = useState<LignePaiement[]>([]);
  const [modeEnCours, setModeEnCours]       = useState<PaymentMethod>('especes');
  const [montantEnCours, setMontantEnCours] = useState<number>(0);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientForm, setShowClientForm] = useState(false);
  const [newClient, setNewClient]           = useState({ nom: '', telephone: '' });
  const [loading, setLoading]               = useState(false);

  // Fidélité
  const [fideliteConfig, setFideliteConfig] = useState<FideliteConfig | null>(null);

  // Modals
  const [showPaymentModal, setShowPaymentModal]         = useState(false);
  const [showSuccessModal, setShowSuccessModal]         = useState(false);
  const [showInvoiceSearchModal, setShowInvoiceSearchModal] = useState(false);
  const [bloquageCaisse, setBloquageCaisse]             = useState<BloquageInfo | null>(null);
  const [overrideProduct, setOverrideProduct]           = useState<Product | null>(null);

  // Infos dernière vente
  const [lastSaleId, setLastSaleId]               = useState<number | null>(null);
  const [lastSaleReference, setLastSaleReference] = useState('');
  const [lastSalePoints, setLastSalePoints]       = useState<number>(0);
  const [showTicketPrompt, setShowTicketPrompt]   = useState(false);
  const [isPrintingTicket, setIsPrintingTicket]   = useState(false);
  const [defaultInvoiceFormat, setDefaultInvoiceFormat] = useState<'a4' | 'thermal'>('thermal');

  const { items, addItem, removeItem, updateQuantity, changeUnite, overridePrice, total, clearCart } = useCartStore();
  const { printInvoice: printLastSaleInvoice } = useInvoicePrint();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
  const receivedRef = useRef<HTMLInputElement>(null);
  const searchRef   = useRef<HTMLInputElement>(null); // NEW — pour garder le focus en continu

  // ── Chargements ───────────────────────────────────────────────────────────

  useEffect(() => { fetchProducts(); }, []);
  useEffect(() => { fetchFideliteConfig(); }, []);
  useEffect(() => { fetchInvoiceFormat(); }, []);
  useEffect(() => { searchRef.current?.focus(); }, []); // NEW — prêt à scanner/taper dès l'ouverture

  useEffect(() => {
    if (clientSearch.length >= 2 && !selectedClient) searchClients();
    else setClients([]);
  }, [clientSearch, selectedClient]);

  useEffect(() => {
    if (showPaymentModal && modeEnCours === 'especes') {
      setTimeout(() => receivedRef.current?.focus(), 100);
    }
  }, [showPaymentModal, modeEnCours]);

  // NEW — fermeture des modales au clavier, sans quitter le clavier/la douchette
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showPaymentModal) { setShowPaymentModal(false); resetPaymentState(); }
      else if (showInvoiceSearchModal) setShowInvoiceSearchModal(false);
      else if (overrideProduct) setOverrideProduct(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showPaymentModal, showInvoiceSearchModal, overrideProduct]);

  const fetchProducts = async () => {
    try {
      const res  = await fetchWithAuth(`${API_URL}/products`);
      const data = await res.json();
      if (data.success) setProducts(data.products);
      else toast.error(getApiErrorMessage(data, 'Impossible de charger les produits.'));
    } catch { toast.error('Impossible de charger les produits. Vérifiez votre connexion.'); }
  };

  const fetchFideliteConfig = async () => {
    try {
      const res  = await fetchWithAuth(`${API_URL}/fidelite/config`);
      const data = await res.json();
      if (data.success) setFideliteConfig(data.config);
    } catch { /* dégradation silencieuse */ }
  };

  const fetchInvoiceFormat = async () => {
    try {
      const res  = await fetchWithAuth(`${API_URL}/invoice-settings`);
      const data = await res.json();
      if (data.success) setDefaultInvoiceFormat(data.default_format);
    } catch { /* dégradation silencieuse — reste sur 'thermal' */ }
  };

  const searchClients = async () => {
    try {
      const res  = await fetchWithAuth(`${API_URL}/clients/search?q=${clientSearch}`);
      const data = await res.json();
      if (data.success) setClients(data.clients);
    } catch { console.error('Erreur recherche clients'); }
  };

  const createClient = async () => {
    if (!newClient.nom || !newClient.telephone) {
      toast.error('Nom et téléphone requis'); return;
    }
    try {
      const res  = await fetchWithAuth(`${API_URL}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClient),
      });
      const result = await res.json();
      if (result.success) {
        toast.success('Client créé !');
        setSelectedClient(result.client);
        setShowClientForm(false);
        setNewClient({ nom: '', telephone: '' });
        setClientSearch('');
      } else {
        toast.error(getApiErrorMessage(result, 'Impossible de créer le client.'));
      }
    } catch { toast.error('Impossible de créer le client. Vérifiez votre connexion.'); }
  };

  // ── Produits : ajout rapide via Entrée (scan douchette ou frappe clavier) ──

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const matches = filteredProducts.filter(p => p.stock > 0);
    if (matches.length === 1) {
      addItem(matches[0]);
      setSearchTerm('');
      toast.success(`${matches[0].name} ajouté`, { duration: 1200 });
    }
  };

  // ── Paiement ──────────────────────────────────────────────────────────────

  const round2 = (n: number) => Math.round(n * 100) / 100;

  const totalVerse = lignesPaiement.reduce((s, l) => s + l.montant, 0);
  const resteAPayer = Math.max(0, round2(total - totalVerse));
  const monnaieTotale = lignesPaiement
    .filter(l => l.mode === 'especes')
    .reduce((s, l) => s + ((l.montant_recu ?? 0) - l.montant), 0);

  // Fidélité : part comptant déjà affectée — ne compte que si un client est rattaché
  const montantComptantAffecte = lignesPaiement
    .filter(l => l.mode !== 'dette')
    .reduce((s, l) => s + l.montant, 0);

  const pointsAGagner = (selectedClient && fideliteConfig && fideliteConfig.montant_tranche > 0)
    ? Math.floor(montantComptantAffecte / fideliteConfig.montant_tranche) * fideliteConfig.points_accordes
    : 0;

  const ajouterLignePaiement = (montantForce?: number): LignePaiement | null => {
    const montant = montantForce ?? montantEnCours;

    if (modeEnCours === 'dette' && !selectedClient) {
      toast.error('Sélectionnez un client pour le paiement à crédit'); return null;
    }
    if (montant <= 0) {
      toast.error('Montant invalide'); return null;
    }

    if (modeEnCours === 'especes') {
      const montantAffecte = Math.min(montant, resteAPayer > 0 ? resteAPayer : montant);
      const ligne: LignePaiement = {
        id: crypto.randomUUID(),
        mode: 'especes',
        montant: montantAffecte,
        montant_recu: montant,
      };
      setLignesPaiement(l => [...l, ligne]);
      setMontantEnCours(0);
      return ligne;
    } else {
      if (montant > resteAPayer) {
        toast.error(`Le montant dépasse le reste à payer (${fmt(resteAPayer)})`); return null;
      }
      const ligne: LignePaiement = {
        id: crypto.randomUUID(),
        mode: modeEnCours,
        montant,
      };
      setLignesPaiement(l => [...l, ligne]);
      setMontantEnCours(0);
      return ligne;
    }
  };

  const supprimerLignePaiement = (id: string) =>
    setLignesPaiement(l => l.filter(x => x.id !== id));

  const handlePayment = async (paiementsOverride?: LignePaiement[]) => {
    const paiements = paiementsOverride ?? lignesPaiement;
    const totalPaye = paiements.reduce((sum, line) => sum + line.montant, 0);
    const reste = Math.max(0, round2(total - totalPaye));

    if (reste > 0) {
      toast.error(`Il reste ${fmt(reste)} à payer`); return;
    }

    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/ventes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: selectedClient?.id,
          items: items.map(i => ({
            id: parseInt(i.id),
            quantity: i.quantity,
            unite: i.unite_vente,
            prix_override: i.isOverridden ? i.price : undefined,
            justification: i.isOverridden ? i.justification : undefined,
          })),
          paiements: paiements.map(l => ({
            mode: l.mode,
            montant: l.mode === 'especes' ? undefined : l.montant,
            montant_recu: l.mode === 'especes' ? l.montant_recu : undefined,
            reference_transaction: l.reference_transaction,
          })),
        }),
      });
      const result = await res.json();

      if (!result.success && result.code === 'CAISSE_BLOQUEE') {
        setShowPaymentModal(false);
        setBloquageCaisse(result as BloquageInfo);
        return;
      }

      if (result.success) {
        setLastSaleId(result.vente.id);
        setLastSaleReference(result.vente.reference);
        setLastSalePoints(result.fidelite?.points ?? 0);

        const detteLine = paiements.find(l => l.mode === 'dette');
        const pts = result.fidelite?.points ?? 0;

        if (detteLine) {
          const solde = getSoldeDette(result.nouveau_solde_client);
          toast.success(
            `Vente enregistrée ! Part à crédit — nouvelle dette : ${fmt(solde)}` +
            (pts > 0 ? ` · +${pts} pts fidélité` : '')
          );
        } else if (monnaieTotale > 0) {
          toast.success(`Monnaie à rendre : ${fmt(monnaieTotale)}` + (pts > 0 ? ` · +${pts} pts fidélité` : ''));
        } else {
          toast.success('Vente enregistrée avec succès !' + (pts > 0 ? ` +${pts} pts fidélité` : ''));
        }

        if (result.caisse?.attention) {
          toast.warning(
            `⚠️ Caisse à ${result.caisse.pourcentage}% du plafond (${fmt(result.caisse.solde_actuel)} / ${fmt(result.caisse.plafond)}). Pensez à prélever bientôt.`,
            { duration: 7000 }
          );
        }

        setShowSuccessModal(true);
        setShowTicketPrompt(true);
        clearCart();
        setShowPaymentModal(false);
        resetPaymentState();
        fetchProducts();
        setTimeout(() => searchRef.current?.focus(), 150); // NEW — prêt pour la vente suivante
      } else {
        toast.error(getApiErrorMessage(result, 'Impossible d\'enregistrer la vente.'));
      }
    } catch { toast.error('Impossible d\'enregistrer la vente. Vérifiez votre connexion.'); }
    finally { setLoading(false); }
  };

  const resetPaymentState = () => {
    setLignesPaiement([]);
    setModeEnCours('especes');
    setMontantEnCours(0);
    setSelectedClient(null);
    setClientSearch('');
    setShowClientForm(false);
  };

  const handleConfirmPayment = async () => {
    if (items.length === 0) return;

    let paiements = lignesPaiement;

    if (resteAPayer > 0) {
      const ligne = ajouterLignePaiement();
      if (!ligne) return;

      paiements = [...lignesPaiement, ligne];
      const totalPaye = paiements.reduce((sum, line) => sum + line.montant, 0);
      const nouveauReste = Math.max(0, round2(total - totalPaye));

      if (nouveauReste > 0) {
        toast.message(`Reste à payer: ${fmt(nouveauReste)}`);
        if (modeEnCours !== 'especes') {
          setMontantEnCours(nouveauReste);
        }
        return;
      }
    }

    await handlePayment(paiements);
  };

  // ── Données dérivées ──────────────────────────────────────────────────────

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.reference.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ─── Rendu ────────────────────────────────────────────────────────────────

  return (
    // NEW — page verrouillée à la hauteur de l'écran : plus jamais de scroll global,
    // ni sur desktop ni sur mobile. Seules les zones internes défilent.
    <div className="h-screen lg:h-[calc(100vh-5rem)] flex flex-col lg:flex-row gap-3 lg:p-3 overflow-hidden">

      {/* ══ Colonne gauche : catalogue produits ════════════════════════════ */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200
                      flex flex-col overflow-hidden min-w-0 min-h-0">

        {/* Header fixe : recherche + accès factures */}
        <div className="px-4 py-3 border-b border-gray-100 flex gap-2 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Rechercher un produit, une référence, ou scanner..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200
                         rounded-lg text-sm focus:ring-2 focus:ring-blue-500
                         focus:border-blue-500 focus:bg-white transition-colors"
            />
          </div>
          <button
            onClick={() => setShowInvoiceSearchModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border
                       border-gray-200 rounded-lg text-sm text-gray-600
                       hover:bg-gray-100 transition-colors whitespace-nowrap shrink-0"
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Factures</span>
          </button>
        </div>

        <div className="px-4 py-2 border-b border-gray-50 shrink-0">
          <span className="text-xs text-gray-400">
            {filteredProducts.length} produit{filteredProducts.length > 1 ? 's' : ''}
            {searchTerm && ` pour "${searchTerm}"`}
          </span>
        </div>

        {/* SEULE zone qui défile de toute la page gauche */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3
                [&::-webkit-scrollbar]:w-2
                [&::-webkit-scrollbar-track]:bg-transparent
                [&::-webkit-scrollbar-thumb]:bg-gray-300
                [&::-webkit-scrollbar-thumb]:rounded-full
                hover:[&::-webkit-scrollbar-thumb]:bg-gray-400
                [scrollbar-width:thin] [scrollbar-color:#d1d5db_transparent]">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
            {filteredProducts.map(product => {
              const rupture  = product.stock === 0;
              const stockBas = !rupture && product.stock <= product.min_stock;
              const inCart   = items.find(i => i.id === String(product.id));
              const stockDisplay = formatQty(fromBase(product.unit_type, product.unit_reference, product.stock));

              return (
                <div
                  key={product.id}
                  role="button"
                  tabIndex={rupture ? -1 : 0}
                  onClick={() => !rupture && addItem(product)}
                  onKeyDown={e => {
                    if (!rupture && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      addItem(product);
                    }
                  }}
                  aria-disabled={rupture}
                  className={`
                    relative p-3 border rounded-xl text-left transition-all duration-100 group cursor-pointer
                    ${rupture
                      ? 'opacity-45 cursor-not-allowed bg-gray-50 border-gray-100'
                      : inCart
                        ? 'border-blue-400 bg-blue-50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm'
                    }
                  `}
                >
                  {inCart && (
                    <span className="absolute top-2 right-2 min-w-5 h-5 px-1 bg-blue-600 text-white
                                     text-xs rounded-full flex items-center justify-center font-medium">
                      {formatQty(inCart.quantity)}
                    </span>
                  )}
                  {rupture && (
                    <span className="absolute top-2 right-2 text-xs bg-red-100 text-red-700
                                     px-1.5 py-0.5 rounded-full">
                      Rupture
                    </span>
                  )}
                  <p className="text-sm font-medium text-gray-900 truncate pr-5 leading-tight">
                    {product.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{product.reference}</p>
                  <p className="text-base font-medium text-blue-700 mt-2">
                    {fmt(product.price)}
                    <span className="text-xs text-gray-400 font-normal">
                      /{unitLabel(product.unit_type, product.unit_reference)}
                    </span>
                  </p>
                  <p className={`text-xs mt-0.5 ${stockBas ? 'text-orange-600 font-medium' : 'text-gray-400'}`}>
                    Stock : {stockDisplay} {unitLabel(product.unit_type, product.unit_reference)}{stockBas ? ' ⚠' : ''}
                  </p>
                  {!rupture && (
                    <button
                      onClick={e => { e.stopPropagation(); setOverrideProduct(product); }}
                      className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1
                                 bg-blue-50 text-blue-600 text-xs font-medium rounded-md
                                 border border-blue-200 hover:bg-blue-100 hover:border-blue-300
                                 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Pencil className="w-3 h-3" />
                      Ajuster
                    </button>
                  )}
                </div>
              );
            })}

            {filteredProducts.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center
                              py-16 text-gray-300">
                <Search className="w-12 h-12 mb-2" />
                <p className="text-sm text-gray-400">Aucun produit trouvé</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ Colonne droite : panier ═════════════════════════════════════════ */}
      <div className="w-full lg:w-[340px] shrink-0 bg-white rounded-xl border border-gray-200
                      flex flex-col overflow-hidden min-h-0 h-[42vh] lg:h-auto">

        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-gray-600" />
            <span className="font-medium text-gray-800 text-sm">Panier</span>
            {items.length > 0 && (
              <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                {items.length}
              </span>
            )}
          </div>
          {items.length > 0 && (
            <button
              onClick={clearCart}
              className="flex items-center gap-1 text-xs text-red-500
                         hover:text-red-700 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Vider
            </button>
          )}
        </div>

        {/* SEULE zone qui défile dans le panier */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 flex flex-col gap-2">
          {items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center
                            text-gray-300 py-12">
              <ShoppingCart className="w-12 h-12 mb-3" />
              <p className="text-sm text-gray-400">Le panier est vide</p>
              <p className="text-xs text-gray-300 mt-1">Cliquez sur un produit pour l'ajouter</p>
            </div>
          ) : (
            items.map(item => (
              <div key={item.id}
                   className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate flex items-center gap-1.5">
                    {item.name}
                    {item.isOverridden && (
                      <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full shrink-0">
                        Prix modifié
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    {fmt(item.price)}/{unitLabel(item.unit_type, item.unit_reference)} × {formatQty(item.quantity)} {unitLabel(item.unit_type, item.unite_vente)}{' '}
                    <span className="font-medium text-gray-700">
                      = {fmt(lineSubtotal(item))}
                    </span>
                  </p>
                </div>
               <div className="flex items-center gap-1 shrink-0">
                {item.unit_type === 'piece' ? (
                  <>
                    <button
                      onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))}
                      className="w-6 h-6 rounded-full border border-gray-300 flex items-center
                                justify-center text-gray-500 hover:bg-gray-200 transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={item.stock}
                      value={item.quantity}
                      onChange={e => {
                        const raw = e.target.value;
                        if (raw === '') return;
                        const parsed = parseInt(raw, 10);
                        if (isNaN(parsed)) return;
                        const clamped = Math.min(Math.max(parsed, 1), item.stock);
                        updateQuantity(item.id, clamped);
                      }}
                      onBlur={e => {
                        const parsed = parseInt(e.target.value, 10);
                        if (isNaN(parsed) || parsed < 1) {
                          updateQuantity(item.id, 1);
                        }
                      }}
                      onFocus={e => e.target.select()}
                      className="w-12 text-center text-sm font-medium border border-gray-200 rounded-md
                                py-0.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none
                                [&::-webkit-inner-spin-button]:appearance-none
                                [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      disabled={item.quantity >= item.stock}
                      className="w-6 h-6 rounded-full border border-gray-300 flex items-center
                                justify-center text-gray-500 hover:bg-gray-200 transition-colors
                                disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <>
                    <input
                      type="number"
                      step="0.001"
                      min={0.001}
                      value={item.quantity}
                      onChange={e => {
                        const parsed = parseFloat(e.target.value);
                        updateQuantity(item.id, isNaN(parsed) ? 0 : Math.max(0, parsed));
                      }}
                      onFocus={e => e.target.select()}
                      className="w-16 text-center text-sm font-medium border border-gray-200 rounded-md
                                py-0.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none
                                [&::-webkit-inner-spin-button]:appearance-none
                                [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    {compatibleUnits(item.unit_type).length > 1 ? (
                      <select
                        value={item.unite_vente}
                        onChange={e => changeUnite(item.id, e.target.value)}
                        className="text-xs border border-gray-200 rounded-md py-0.5 px-1
                                  focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      >
                        {compatibleUnits(item.unit_type).map(u => (
                          <option key={u} value={u}>{unitLabel(item.unit_type, u)}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-gray-400 px-1">
                        {unitLabel(item.unit_type, item.unite_vente)}
                      </span>
                    )}
                  </>
                )}
                <button
                  onClick={() => removeItem(item.id)}
                  className="ml-1 text-gray-300 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              </div>
            ))
          )}
        </div>

        {/* Footer fixe : total + CTA, toujours visible */}
        <div className="border-t border-gray-100 p-3 space-y-3 shrink-0">
          <div className="flex items-baseline justify-between px-1">
            <span className="text-sm text-gray-500">Total</span>
            <span className="text-2xl font-medium text-gray-900">{fmt(total)}</span>
          </div>
          <button
            onClick={() => setShowPaymentModal(true)}
            disabled={items.length === 0}
            className="w-full py-3 bg-green-600 text-white rounded-lg text-sm
                       font-medium flex items-center justify-center gap-2
                       hover:bg-green-700 transition-colors
                       disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            <CheckCircle className="w-4 h-4" />
            Procéder au paiement
          </button>
        </div>
      </div>

      {/* ══ Modal paiement — hauteur fixe, deux colonnes, aucun défilement ═══ */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl overflow-hidden
                          h-[min(680px,92vh)] flex flex-col">

            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <h2 className="font-medium text-gray-900">Finaliser la vente</h2>
              <button onClick={() => { setShowPaymentModal(false); resetPaymentState(); }}
                      className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corps en 2 colonnes — aucune des deux ne défile globalement */}
            <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">

              {/* ── Colonne gauche : contexte de la vente ── */}
              <div className="p-5 flex flex-col gap-3 min-h-0 overflow-hidden">

                <div className="bg-gray-50 rounded-xl px-4 py-3 flex justify-between items-center shrink-0">
                  <span className="text-sm text-gray-500">Total à encaisser</span>
                  <span className="text-2xl font-medium text-gray-900">{fmt(total)}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 shrink-0">
                  <div className="bg-gray-50 rounded-xl px-3 py-2">
                    <p className="text-xs text-gray-400">Versé</p>
                    <p className="text-lg font-medium text-gray-900">{fmt(totalVerse)}</p>
                  </div>
                  <div className={`rounded-xl px-3 py-2 ${resteAPayer > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                    <p className={`text-xs ${resteAPayer > 0 ? 'text-red-500' : 'text-green-600'}`}>Reste à payer</p>
                    <p className={`text-lg font-medium ${resteAPayer > 0 ? 'text-red-600' : 'text-green-700'}`}>
                      {fmt(resteAPayer)}
                    </p>
                  </div>
                </div>

                {/* Client : replié par défaut pour ne prendre que peu de place */}
               {/* Colonne gauche : devient scrollable pour absorber la hauteur du bloc client toujours ouvert */}
<div className="p-5 flex flex-col gap-3 min-h-0 overflow-y-auto
    [&::-webkit-scrollbar]:w-2
    [&::-webkit-scrollbar-track]:bg-transparent
    [&::-webkit-scrollbar-thumb]:bg-gray-300
    [&::-webkit-scrollbar-thumb]:rounded-full
    [scrollbar-width:thin] [scrollbar-color:#d1d5db_transparent]">

  {/* Client : toujours ouvert, zéro clic pour y accéder */}
  <div className="border border-gray-200 rounded-xl p-3 space-y-2.5 shrink-0">
    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
      <User className="w-3.5 h-3.5" />
      Client (optionnel — pour cumuler des points de fidélité)
    </p>

    {!selectedClient && !showClientForm && (
      <>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={clientSearch}
            onChange={e => setClientSearch(e.target.value)}
            placeholder="Nom ou téléphone..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg
                       text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {clients.length > 0 && (
          <div className="border border-gray-200 rounded-lg overflow-y-auto max-h-32">
            {clients.map(client => {
              const dette = getSoldeDette(client.solde_dette);
              return (
                <button
                  key={client.id}
                  onClick={() => {
                    setSelectedClient(client);
                    setClients([]);
                    setClientSearch('');
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50
                             flex justify-between items-center border-b
                             border-gray-100 last:border-b-0"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{client.nom}</p>
                    <p className="text-xs text-gray-400">{client.telephone}</p>
                  </div>
                  <div className="text-right">
                    <span className={`block text-sm font-medium ${dette > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {fmt(dette)}
                    </span>
                    <span className="block text-[11px] text-purple-500">
                      {getSoldePoints(client.solde_points)} pts
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <button
          onClick={() => setShowClientForm(true)}
          className="w-full py-1.5 border-2 border-dashed border-gray-300 rounded-lg
                     text-xs text-gray-500 hover:border-blue-400 hover:text-blue-600
                     flex items-center justify-center gap-1.5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Nouveau client
        </button>
      </>
    )}

    {showClientForm && (
      <div className="space-y-2">
        <input type="text" placeholder="Nom complet"
               value={newClient.nom}
               onChange={e => setNewClient(c => ({ ...c, nom: e.target.value }))}
               className="w-full px-3 py-2 border border-gray-200 rounded-lg
                          text-sm focus:ring-2 focus:ring-blue-500" />
        <input type="tel" placeholder="Téléphone"
               value={newClient.telephone}
               onChange={e => setNewClient(c => ({ ...c, telephone: e.target.value }))}
               className="w-full px-3 py-2 border border-gray-200 rounded-lg
                          text-sm focus:ring-2 focus:ring-blue-500" />
        <div className="flex gap-2">
          <button onClick={() => { setShowClientForm(false); setNewClient({ nom: '', telephone: '' }); }}
                  className="flex-1 py-1.5 border border-gray-200 rounded-lg
                             text-xs text-gray-600 hover:bg-gray-50">
            Annuler
          </button>
          <button onClick={createClient}
                  className="flex-1 py-1.5 bg-blue-600 text-white rounded-lg
                             text-xs hover:bg-blue-700">
            Créer
          </button>
        </div>
      </div>
    )}

    {selectedClient && (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center
                            justify-center text-blue-700 text-sm font-medium">
              {selectedClient.nom.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{selectedClient.nom}</p>
              <p className="text-xs text-gray-500">{selectedClient.telephone}</p>
            </div>
          </div>
          <button onClick={() => setSelectedClient(null)}
                  className="text-gray-400 hover:text-red-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-2.5 pt-2.5 border-t border-blue-200 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-500">Dette actuelle</span>
            <p className="font-medium text-red-600">{fmt(getSoldeDette(selectedClient.solde_dette))}</p>
          </div>
          <div>
            <span className="text-gray-500">Points fidélité</span>
            <p className="font-medium text-purple-600">{getSoldePoints(selectedClient.solde_points)} pts</p>
          </div>
        </div>
      </div>
    )}
  </div>

  {pointsAGagner > 0 && (
    <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 border border-purple-200
                    rounded-lg text-sm text-purple-700 shrink-0">
      <Gift className="w-4 h-4 shrink-0" />
      <span>Points à gagner : <span className="font-semibold">{pointsAGagner} pts</span></span>
    </div>
  )}

  {lignesPaiement.length > 0 && (
    <div className="space-y-1.5 shrink-0">
      {lignesPaiement.map(l => (
        <div key={l.id} className="flex items-center justify-between px-3 py-2
                                    bg-gray-50 rounded-lg text-sm">
          <div className="flex items-center gap-2">
            {PAYMENT_METHODS.find(pm => pm.value === l.mode)?.icon}
            <span className="font-medium text-gray-700">
              {PAYMENT_METHODS.find(pm => pm.value === l.mode)?.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{fmt(l.montant)}</span>
            <button onClick={() => supprimerLignePaiement(l.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )}
</div>
</div>

              {/* ── Colonne droite : saisie du paiement ── */}
              <div className="p-5 flex flex-col gap-3 min-h-0">
                {resteAPayer > 0 ? (
                  <>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide shrink-0">
                      Mode de paiement
                    </p>
                    <div className="grid grid-cols-2 gap-2 shrink-0">
                      {PAYMENT_METHODS.map(pm => (
                        <button
                          key={pm.value}
                          onClick={() => {
                            setModeEnCours(pm.value);
                            setMontantEnCours(pm.value === 'especes' ? 0 : resteAPayer);
                          }}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border
                                      text-sm font-medium transition-all
                            ${modeEnCours === pm.value
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                          {pm.icon}
                          {pm.label}
                        </button>
                      ))}
                    </div>

                    {modeEnCours === 'dette' && !selectedClient && (
                      <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 shrink-0">
                        Sélectionnez un client à gauche pour un paiement à crédit
                      </p>
                    )}

                    <div className="shrink-0">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                        {modeEnCours === 'especes' ? 'Montant reçu' : 'Montant'}
                      </p>
                      <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200
                                      focus-within:border-blue-400 focus-within:bg-white transition-colors">
                        <input
                          ref={receivedRef}
                          type="number"
                          step="1"
                          value={montantEnCours || ''}
                          onChange={e => setMontantEnCours(parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full bg-transparent text-2xl font-medium text-gray-900
                                     outline-none placeholder-gray-300"
                        />
                        <span className="text-xs text-gray-400">francs CFA</span>
                      </div>

                      {/* NEW — billets rapides pour l'espèce : le geste le plus fréquent en 1 clic */}
                      {modeEnCours === 'especes' && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <button
                            onClick={() => setMontantEnCours(resteAPayer)}
                            className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-blue-200
                                       bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                          >
                            Exact ({fmt(resteAPayer)})
                          </button>
                          {BILLETS_RAPIDES.filter(b => b >= resteAPayer).slice(0, 3).map(b => (
                            <button
                              key={b}
                              onClick={() => setMontantEnCours(b)}
                              className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200
                                         text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                              {fmt(b)}
                            </button>
                          ))}
                        </div>
                      )}

                      {modeEnCours === 'especes' && montantEnCours > 0 && (
                        <div className="mt-2 flex items-center justify-between px-3 py-2
                                        bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                          <span>
                            {montantEnCours > resteAPayer ? 'Monnaie à rendre' : 'Affecté à la vente'}
                          </span>
                          <span className="font-medium">
                            {montantEnCours > resteAPayer
                              ? fmt(montantEnCours - resteAPayer)
                              : fmt(montantEnCours)}
                          </span>
                        </div>
                      )}

                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 text-green-600">
                    <CheckCircle className="w-10 h-10" />
                    <p className="text-sm font-medium">Montant entièrement couvert</p>
                    <p className="text-xs text-gray-400">Confirmez pour enregistrer la vente</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer fixe : actions toujours visibles, jamais à scroller pour y accéder */}
            <div className="px-5 py-4 border-t border-gray-100 flex gap-2 shrink-0">
              <button
                onClick={() => { setShowPaymentModal(false); resetPaymentState(); }}
                disabled={loading}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm
                           text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmPayment}
                disabled={loading || items.length === 0 || (resteAPayer > 0 && montantEnCours <= 0 && lignesPaiement.length === 0)}
                className="flex-[2] py-2.5 bg-green-600 text-white rounded-lg text-sm
                           font-medium flex items-center justify-center gap-2
                           hover:bg-green-700 transition-colors
                           disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {loading
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Traitement…</>
                  : <><CheckCircle className="w-4 h-4" /> Confirmer le paiement</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Modal succès ════════════════════════════════════════════════════ */}
      {showSuccessModal && lastSaleId && lastSaleReference && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center
                            justify-center mx-auto mb-4">
              <CheckCircle className="w-9 h-9 text-green-600" />
            </div>
            <h2 className="text-xl font-medium text-gray-900 mb-1">Vente enregistrée !</h2>
            <p className="text-sm text-gray-500 mb-1">
              Référence :{' '}
              <span className="font-mono font-medium text-gray-700">{lastSaleReference}</span>
            </p>
            {lastSalePoints > 0 && (
              <p className="text-sm text-purple-600 mb-6 flex items-center justify-center gap-1">
                <Gift className="w-4 h-4" />
                +{lastSalePoints} points fidélité crédités
              </p>
            )}
            {lastSalePoints === 0 && <div className="mb-6" />}
            {showTicketPrompt ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-left">
                  <p className="text-sm font-medium text-gray-900 mb-2">Voulez-vous un ticket ?</p>
                  <p className="text-sm text-gray-600 mb-4">
                    Le ticket sera envoyé directement à l'imprimante ({defaultInvoiceFormat === 'a4' ? 'A4' : 'thermique'}) si QZ Tray est connecté.
                  </p>
                  <div className="grid gap-2">
                    <button
                      onClick={async () => {
                        if (!lastSaleId) return;
                        setIsPrintingTicket(true);
                        const result = await printLastSaleInvoice(lastSaleId, defaultInvoiceFormat);
                        setIsPrintingTicket(false);
                        if (result.success) {
                          toast.success('Ticket envoyé à l\'imprimante.');
                        } else {
                          toast.error('Impossible d\'imprimer le ticket. Vérifiez QZ Tray ou imprimez manuellement.');
                        }
                        setShowSuccessModal(false);
                        setShowTicketPrompt(false);
                        setLastSaleId(null);
                        setLastSaleReference('');
                        setLastSalePoints(0);
                      }}
                      disabled={isPrintingTicket}
                      className="w-full inline-flex items-center justify-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
                    >
                      {isPrintingTicket ? 'Impression en cours…' : 'Oui, imprimer le ticket'}
                    </button>
                    <button
                      onClick={() => {
                        setShowSuccessModal(false);
                        setShowTicketPrompt(false);
                        setLastSaleId(null);
                        setLastSaleReference('');
                        setLastSalePoints(0);
                      }}
                      className="w-full py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Non, terminer
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <InvoiceButton
                  venteId={lastSaleId}
                  venteReference={lastSaleReference}
                  variant="primary"
                  defaultFormat={defaultInvoiceFormat}
                />
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    setLastSaleId(null);
                    setLastSaleReference('');
                    setLastSalePoints(0);
                  }}
                  className="w-full py-2.5 border border-gray-200 rounded-lg text-sm
                             text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Fermer
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showInvoiceSearchModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <InvoiceSearch onClose={() => setShowInvoiceSearchModal(false)} />
        </div>
      )}

      {bloquageCaisse && (
        <CaisseBloqueeModal
          bloquage={bloquageCaisse}
          onPrelevementFait={() => { setBloquageCaisse(null); setShowPaymentModal(true); }}
          onAnnuler={() => setBloquageCaisse(null)}
        />
      )}

      {overrideProduct && (
        <PriceOverrideModal
          productName={overrideProduct.name}
          currentPrice={overrideProduct.price}
          onClose={() => setOverrideProduct(null)}
          onConfirm={(newPrice, justification) => {
            const alreadyInCart = items.find(i => i.id === overrideProduct.id);
            if (!alreadyInCart) addItem(overrideProduct);
            overridePrice(overrideProduct.id, newPrice, justification);
            setOverrideProduct(null);
          }}
        />
      )}
    </div>
  );
}