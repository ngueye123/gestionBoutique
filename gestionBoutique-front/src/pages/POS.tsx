// src/pages/POS.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
  Search, ShoppingCart, Plus, Minus, X, User,
  CheckCircle, FileText, Trash2, CreditCard,
  Smartphone, Banknote, Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { Product, Client } from '../types';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { fetchWithAuth } from '../lib/fetchWithAuth';
import { InvoiceButton } from '../components/InvoiceButton';
import { InvoiceSearch } from '../components/InvoiceSearch';
import { CaisseBloqueeModal } from '../components/CaisseBloqueeModal';
import type { BloquageInfo } from '../hooks/useCaisse';

type PaymentMethod = 'especes' | 'wave' | 'orange_money' | 'carte' | 'dette';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  Math.round(n).toLocaleString('fr-FR') + ' F';

const getSoldeDette = (solde: any): number => {
  const parsed = parseFloat(String(solde || 0));
  return isNaN(parsed) ? 0 : parsed;
};

// ─── Config méthodes de paiement ──────────────────────────────────────────────

const PAYMENT_METHODS: Array<{
  value: PaymentMethod;
  label: string;
  icon: React.ReactNode;
  color: string;
}> = [
  { value: 'especes',      label: 'Espèces',      icon: <Banknote className="w-4 h-4" />,    color: '#16a34a' },
  { value: 'wave',         label: 'Wave',          icon: <Smartphone className="w-4 h-4" />,  color: '#2563eb' },
  { value: 'orange_money', label: 'Orange Money',  icon: <CreditCard className="w-4 h-4" />,  color: '#ea580c' },
  { value: 'dette',        label: 'À crédit',      icon: <Clock className="w-4 h-4" />,       color: '#7c3aed' },
];

// ─── Composant principal ──────────────────────────────────────────────────────

export default function POS() {
  const [products, setProducts]             = useState<Product[]>([]);
  const [clients, setClients]               = useState<Client[]>([]);
  const [searchTerm, setSearchTerm]         = useState('');
  const [clientSearch, setClientSearch]     = useState('');
  const [receivedAmount, setReceivedAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod]   = useState<PaymentMethod>('especes');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientForm, setShowClientForm] = useState(false);
  const [newClient, setNewClient]           = useState({ nom: '', telephone: '' });
  const [loading, setLoading]               = useState(false);

  // Modals
  const [showPaymentModal, setShowPaymentModal]         = useState(false);
  const [showSuccessModal, setShowSuccessModal]         = useState(false);
  const [showInvoiceSearchModal, setShowInvoiceSearchModal] = useState(false);
  const [bloquageCaisse, setBloquageCaisse]             = useState<BloquageInfo | null>(null);

  // Infos dernière vente
  const [lastSaleId, setLastSaleId]               = useState<number | null>(null);
  const [lastSaleReference, setLastSaleReference] = useState('');

  const { items, addItem, removeItem, updateQuantity, total, clearCart } = useCartStore();
  const { token } = useAuthStore();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
  const receivedRef = useRef<HTMLInputElement>(null);

  // ── Chargements ───────────────────────────────────────────────────────────

  useEffect(() => { fetchProducts(); }, []);

  useEffect(() => {
    if (clientSearch.length >= 2) searchClients();
    else setClients([]);
  }, [clientSearch]);

  // Focus automatique sur le montant reçu quand le modal s'ouvre en espèces
  useEffect(() => {
    if (showPaymentModal && paymentMethod === 'especes') {
      setTimeout(() => receivedRef.current?.focus(), 100);
    }
  }, [showPaymentModal, paymentMethod]);

  const fetchProducts = async () => {
    try {
      const res  = await fetchWithAuth(`${API_URL}/products`);
      const data = await res.json();
      if (data.success) setProducts(data.products);
    } catch { toast.error('Erreur lors du chargement des produits'); }
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
      } else { toast.error(result.message); }
    } catch { toast.error('Erreur lors de la création du client'); }
  };

  // ── Paiement ──────────────────────────────────────────────────────────────

  const handlePayment = async () => {
    if (paymentMethod === 'especes' && receivedAmount < total) {
      toast.error('Le montant reçu est insuffisant'); return;
    }
    if (paymentMethod === 'dette' && !selectedClient) {
      toast.error('Veuillez sélectionner un client'); return;
    }

    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/ventes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(i => ({ id: parseInt(i.id), quantity: i.quantity })),
          moyen_paiement: paymentMethod,
          montant_recu: paymentMethod === 'especes' ? receivedAmount : total,
          client_id: paymentMethod === 'dette' && selectedClient ? selectedClient.id : null,
        }),
      });
      const result = await res.json();

      // Blocage caisse
      if (!result.success && result.code === 'CAISSE_BLOQUEE') {
        setShowPaymentModal(false);
        setBloquageCaisse(result as BloquageInfo);
        return;
      }

      if (result.success) {
        setLastSaleId(result.vente.id);
        setLastSaleReference(result.vente.reference);

        const change = paymentMethod === 'especes' ? receivedAmount - total : 0;
        if (paymentMethod === 'dette') {
          const solde = getSoldeDette(result.nouveau_solde_client);
          toast.success(`Vente à crédit enregistrée ! Dette : ${fmt(solde)}`);
        } else if (change > 0) {
          toast.success(`Monnaie à rendre : ${fmt(change)}`);
        } else {
          toast.success('Vente enregistrée avec succès !');
        }

        if (result.caisse?.attention) {
          toast.warning(
            `⚠️ Caisse à ${result.caisse.pourcentage}% du plafond (${fmt(result.caisse.solde_actuel)} / ${fmt(result.caisse.plafond)}). Pensez à prélever bientôt.`,
            { duration: 7000 }
          );
        }

        setShowSuccessModal(true);
        clearCart();
        setShowPaymentModal(false);
        resetPaymentState();
        fetchProducts();
      } else {
        toast.error(result.message || 'Erreur lors de la vente');
      }
    } catch { toast.error('Erreur lors du traitement de la vente'); }
    finally { setLoading(false); }
  };

  const resetPaymentState = () => {
    setReceivedAmount(0);
    setPaymentMethod('especes');
    setSelectedClient(null);
    setClientSearch('');
    setShowClientForm(false);
  };

  // ── Données dérivées ──────────────────────────────────────────────────────

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.reference.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const monnaie        = paymentMethod === 'especes' ? receivedAmount - total : 0;
  const paiementValide = paymentMethod !== 'especes' && paymentMethod !== 'dette'
    ? true
    : paymentMethod === 'especes'
      ? receivedAmount >= total
      : !!selectedClient;

  const nbArticles = items.reduce((s, i) => s + i.quantity, 0);

  // ─── Rendu ────────────────────────────────────────────────────────────────

  return (
    <div className="flex gap-3 h-[calc(100vh-5rem)]">

      {/* ══ Colonne gauche : catalogue produits ════════════════════════════ */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200
                      flex flex-col overflow-hidden min-w-0">

        {/* Barre de recherche */}
        <div className="px-4 py-3 border-b border-gray-100 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un produit ou référence..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200
                         rounded-lg text-sm focus:ring-2 focus:ring-blue-500
                         focus:border-blue-500 focus:bg-white transition-colors"
            />
          </div>
          <button
            onClick={() => setShowInvoiceSearchModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border
                       border-gray-200 rounded-lg text-sm text-gray-600
                       hover:bg-gray-100 transition-colors whitespace-nowrap"
          >
            <FileText className="w-4 h-4" />
            Factures
          </button>
        </div>

        {/* Compteur résultats */}
        <div className="px-4 py-2 border-b border-gray-50">
          <span className="text-xs text-gray-400">
            {filteredProducts.length} produit{filteredProducts.length > 1 ? 's' : ''}
            {searchTerm && ` pour "${searchTerm}"`}
          </span>
        </div>

        {/* Grille produits */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
            {filteredProducts.map(product => {
              const rupture  = product.stock === 0;
              const stockBas = !rupture && product.stock <= product.min_stock;
              const inCart   = items.find(i => i.id === String(product.id));

              return (
                <button
                  key={product.id}
                  onClick={() => !rupture && addItem(product)}
                  disabled={rupture}
                  className={`
                    relative p-3 border rounded-xl text-left transition-all duration-100 group
                    ${rupture
                      ? 'opacity-45 cursor-not-allowed bg-gray-50 border-gray-100'
                      : inCart
                        ? 'border-blue-400 bg-blue-50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm'
                    }
                  `}
                >
                  {/* Badge quantité dans le panier */}
                  {inCart && (
                    <span className="absolute top-2 right-2 w-5 h-5 bg-blue-600 text-white
                                     text-xs rounded-full flex items-center justify-center font-medium">
                      {inCart.quantity}
                    </span>
                  )}

                  {/* Badge rupture */}
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
                  </p>
                  <p className={`text-xs mt-0.5 ${stockBas ? 'text-orange-600 font-medium' : 'text-gray-400'}`}>
                    Stock : {product.stock}{stockBas ? ' ⚠' : ''}
                  </p>
                </button>
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
      <div className="w-[340px] shrink-0 bg-white rounded-xl border border-gray-200
                      flex flex-col overflow-hidden">

        {/* En-tête panier */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-gray-600" />
            <span className="font-medium text-gray-800 text-sm">Panier</span>
            {nbArticles > 0 && (
              <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                {nbArticles}
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

        {/* Liste articles */}
        <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-2">
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
                  <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                  <p className="text-xs text-gray-500">
                    {fmt(item.price)} × {item.quantity}{' '}
                    <span className="font-medium text-gray-700">
                      = {fmt(item.price * item.quantity)}
                    </span>
                  </p>
                </div>
               <div className="flex items-center gap-1 shrink-0">
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

      // Permet de vider le champ temporairement pendant la saisie
      // sans forcer immédiatement une valeur (sinon impossible de retaper)
      if (raw === '') return;

      const parsed = parseInt(raw, 10);
      if (isNaN(parsed)) return;

      // On clamp entre 1 et le stock disponible
      const clamped = Math.min(Math.max(parsed, 1), item.stock);
      updateQuantity(item.id, clamped);
    }}
    onBlur={e => {
      // Si l'utilisateur laisse le champ vide ou à 0 en sortant, on remet à 1
      const parsed = parseInt(e.target.value, 10);
      if (isNaN(parsed) || parsed < 1) {
        updateQuantity(item.id, 1);
      }
    }}
    onFocus={e => e.target.select()} // sélectionne tout le texte au focus, pratique pour retaper vite
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

        {/* Pied de panier : total + paiement */}
        <div className="border-t border-gray-100 p-3 space-y-3">

          {/* Total */}
          <div className="flex items-baseline justify-between px-1">
            <span className="text-sm text-gray-500">Total</span>
            <span className="text-2xl font-medium text-gray-900">{fmt(total)}</span>
          </div>

          {/* Bouton paiement */}
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

      {/* ══ Modal paiement ══════════════════════════════════════════════════ */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">

            {/* Header modal */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-medium text-gray-900">Finaliser la vente</h2>
              <button onClick={() => { setShowPaymentModal(false); resetPaymentState(); }}
                      className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">

              {/* Récap total */}
              <div className="bg-gray-50 rounded-xl px-4 py-3 flex justify-between items-center">
                <span className="text-sm text-gray-500">Total à encaisser</span>
                <span className="text-2xl font-medium text-gray-900">{fmt(total)}</span>
              </div>

              {/* Méthodes de paiement */}
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                  Mode de paiement
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map(pm => (
                    <button
                      key={pm.value}
                      onClick={() => {
                        setPaymentMethod(pm.value);
                        setSelectedClient(null);
                        setClientSearch('');
                      }}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border
                                  text-sm font-medium transition-all
                        ${paymentMethod === pm.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      {pm.icon}
                      {pm.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Champ montant reçu (espèces) */}
              {paymentMethod === 'especes' && (
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                    Montant reçu
                  </p>
                  <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200
                                  focus-within:border-blue-400 focus-within:bg-white transition-colors">
                    <input
                      ref={receivedRef}
                      type="number"
                      step="1"
                      value={receivedAmount || ''}
                      onChange={e => setReceivedAmount(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full bg-transparent text-2xl font-medium text-gray-900
                                 outline-none placeholder-gray-300"
                    />
                    <span className="text-xs text-gray-400">francs CFA</span>
                  </div>

                  {receivedAmount > 0 && receivedAmount >= total && (
                    <div className="mt-2 flex items-center justify-between px-3 py-2
                                    bg-green-50 border border-green-200 rounded-lg">
                      <span className="text-sm text-green-700">Monnaie à rendre</span>
                      <span className="font-medium text-green-700">{fmt(monnaie)}</span>
                    </div>
                  )}
                  {receivedAmount > 0 && receivedAmount < total && (
                    <div className="mt-2 px-3 py-2 bg-red-50 border border-red-200
                                    rounded-lg text-sm text-red-600">
                      Il manque {fmt(total - receivedAmount)}
                    </div>
                  )}
                </div>
              )}

              {/* Sélection client (dette) */}
              {paymentMethod === 'dette' && (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                    Client
                  </p>

                  {/* Recherche client */}
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

                  {/* Résultats recherche */}
                  {clients.length > 0 && !selectedClient && (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      {clients.map(client => {
                        const dette = getSoldeDette(client.solde_dette);
                        return (
                          <button
                            key={client.id}
                            onClick={() => {
                              setSelectedClient(client);
                              setClients([]);
                              setClientSearch(client.nom);
                            }}
                            className="w-full px-3 py-2.5 text-left hover:bg-gray-50
                                       flex justify-between items-center border-b
                                       border-gray-100 last:border-b-0"
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-900">{client.nom}</p>
                              <p className="text-xs text-gray-400">{client.telephone}</p>
                            </div>
                            <span className={`text-sm font-medium ${dette > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {fmt(dette)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Client sélectionné */}
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
                        <button onClick={() => { setSelectedClient(null); setClientSearch(''); }}
                                className="text-gray-400 hover:text-red-500 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="mt-2.5 pt-2.5 border-t border-blue-200 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">Dette actuelle</span>
                          <p className="font-medium text-red-600">
                            {fmt(getSoldeDette(selectedClient.solde_dette))}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Nouvelle dette</span>
                          <p className="font-medium text-orange-600">
                            {fmt(getSoldeDette(selectedClient.solde_dette) + total)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Créer un nouveau client */}
                  {!selectedClient && !showClientForm && (
                    <button
                      onClick={() => setShowClientForm(true)}
                      className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-lg
                                 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600
                                 flex items-center justify-center gap-2 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Créer un nouveau client
                    </button>
                  )}

                  {showClientForm && (
                    <div className="border border-gray-200 rounded-xl p-3 space-y-2.5">
                      <p className="text-sm font-medium text-gray-700">Nouveau client</p>
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
                                className="flex-1 py-2 border border-gray-200 rounded-lg
                                           text-sm text-gray-600 hover:bg-gray-50">
                          Annuler
                        </button>
                        <button onClick={createClient}
                                className="flex-1 py-2 bg-blue-600 text-white rounded-lg
                                           text-sm hover:bg-blue-700">
                          Créer
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer modal : boutons action */}
            <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
              <button
                onClick={() => { setShowPaymentModal(false); resetPaymentState(); }}
                disabled={loading}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm
                           text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handlePayment}
                disabled={loading || !paiementValide || items.length === 0}
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
            <p className="text-sm text-gray-500 mb-6">
              Référence :{' '}
              <span className="font-mono font-medium text-gray-700">{lastSaleReference}</span>
            </p>
            <div className="space-y-2">
              <InvoiceButton
                venteId={lastSaleId}
                venteReference={lastSaleReference}
                variant="primary"
              />
              <button
                onClick={() => { setShowSuccessModal(false); setLastSaleId(null); setLastSaleReference(''); }}
                className="w-full py-2.5 border border-gray-200 rounded-lg text-sm
                           text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Modal recherche factures ═════════════════════════════════════════ */}
      {showInvoiceSearchModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <InvoiceSearch onClose={() => setShowInvoiceSearchModal(false)} />
        </div>
      )}

      {/* ══ Modal blocage caisse ═════════════════════════════════════════════ */}
      {bloquageCaisse && (
        <CaisseBloqueeModal
          bloquage={bloquageCaisse}
          onPrelevementFait={() => { setBloquageCaisse(null); setShowPaymentModal(true); }}
          onAnnuler={() => setBloquageCaisse(null)}
        />
      )}
    </div>
  );
}