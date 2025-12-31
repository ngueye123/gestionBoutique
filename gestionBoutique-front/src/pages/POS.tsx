import React, { useState, useEffect } from 'react';
import { Search, ShoppingCart, Plus, Minus, X, User } from 'lucide-react';
import { toast } from 'sonner';
import { Product, Client } from '../types';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { fetchWithAuth } from '../lib/fetchWithAuth';

export default function POS() {
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [receivedAmount, setReceivedAmount] = useState<number>(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'especes' | 'wave' | 'orange_money' | 'carte' | 'dette'>('especes');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientForm, setShowClientForm] = useState(false);
  const [newClient, setNewClient] = useState({ nom: '', telephone: '' });
  const [loading, setLoading] = useState(false);
  
  const { items, addItem, removeItem, updateQuantity, total, clearCart } = useCartStore();
  const { token } = useAuthStore();

  // ✅ Fonction utilitaire pour convertir solde_dette en nombre
  const getSoldeDette = (solde: any): number => {
    const parsed = parseFloat(String(solde || 0));
    return isNaN(parsed) ? 0 : parsed;
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (clientSearch.length >= 2) {
      searchClients();
    } else {
      setClients([]);
    }
  }, [clientSearch]);

  const fetchProducts = async () => {
    try {
      const response = await fetchWithAuth('http://localhost:8000/api/products', {
        method: 'GET',
      });
      const data = await response.json();
      if (data.success) {
        setProducts(data.products);
      }
    } catch (error) {
      toast.error('Erreur lors du chargement des produits');
    }
  };

  const searchClients = async () => {
    try {
      const response = await fetchWithAuth(
        `http://localhost:8000/api/clients/search?q=${clientSearch}`,
        { method: 'GET' }
      );
      const data = await response.json();
      if (data.success) {
        setClients(data.clients);
      }
    } catch (error) {
      console.error('Erreur recherche clients', error);
    }
  };

  const createClient = async () => {
    if (!newClient.nom || !newClient.telephone) {
      toast.error('Nom et téléphone requis');
      return;
    }

    try {
      const response = await fetchWithAuth('http://localhost:8000/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClient),
      });
      const result = await response.json();

      if (result.success) {
        toast.success('Client créé !');
        setSelectedClient(result.client);
        setShowClientForm(false);
        setNewClient({ nom: '', telephone: '' });
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Erreur lors de la création du client');
    }
  };

  const handlePayment = async () => {
    if (paymentMethod === 'especes' && receivedAmount < total) {
      toast.error('Le montant reçu est insuffisant');
      return;
    }

    if (paymentMethod === 'dette' && !selectedClient) {
      toast.error('Veuillez sélectionner un client');
      return;
    }

    setLoading(true);

    try {
      const saleData = {
        items: items.map(item => ({
          id: parseInt(item.id),
          quantity: item.quantity
        })),
        moyen_paiement: paymentMethod,
        montant_recu: paymentMethod === 'especes' ? receivedAmount : total,
        client_id: paymentMethod === 'dette' && selectedClient ? selectedClient.id : null,
      };

      const response = await fetchWithAuth('http://localhost:8000/api/ventes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleData),
      });

      const result = await response.json();

      if (result.success) {
        const change = paymentMethod === 'especes' ? receivedAmount - total : 0;
        
        if (paymentMethod === 'dette') {
          const nouveauSolde = getSoldeDette(result.nouveau_solde_client);
          toast.success(`Vente à crédit enregistrée ! Dette du client: ${nouveauSolde.toFixed(2)} €`);
        } else if (change > 0) {
          toast.success(`Vente enregistrée ! Monnaie à rendre : ${change.toFixed(2)} €`);
        } else {
          toast.success('Vente enregistrée avec succès !');
        }

        clearCart();
        setShowPaymentModal(false);
        setReceivedAmount(0);
        setPaymentMethod('especes');
        setSelectedClient(null);
        setClientSearch('');
        fetchProducts();
      } else {
        toast.error(result.message || 'Erreur lors de l\'enregistrement de la vente');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du traitement de la vente');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.reference.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-2rem)] flex gap-4">
      <div className="flex-1 bg-white rounded-lg shadow-sm p-4 overflow-hidden flex flex-col">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto flex-1">
          {filteredProducts.map((product) => (
            <button
              key={product.id}
              onClick={() => addItem(product)}
              disabled={product.stock === 0}
              className={`p-4 border rounded-lg hover:shadow-md transition-shadow text-left ${
                product.stock === 0 ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''
              }`}
            >
              <h3 className="font-medium truncate">{product.name}</h3>
              <p className="text-sm text-gray-500">{product.reference}</p>
              <p className="text-lg font-bold mt-2">{product.price.toFixed(2)} €</p>
              <p className={`text-sm ${product.stock <= product.min_stock ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                Stock: {product.stock}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="w-96 bg-white rounded-lg shadow-sm p-4 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Panier</h2>
          <ShoppingCart className="w-6 h-6" />
        </div>

        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <p>Panier vide</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2 border-b">
                <div className="flex-1">
                  <h3 className="font-medium">{item.name}</h3>
                  <p className="text-sm text-gray-500">{item.price.toFixed(2)} €</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    disabled={item.quantity >= item.stock}
                    className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1 hover:bg-gray-100 rounded text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t pt-4 mt-4">
          <div className="flex justify-between text-lg font-bold mb-4">
            <span>Total</span>
            <span>{total.toFixed(2)} €</span>
          </div>
          <button
            onClick={() => setShowPaymentModal(true)}
            disabled={items.length === 0}
            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Procéder au paiement
          </button>
        </div>
      </div>

      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Paiement</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Méthode de paiement
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => {
                    setPaymentMethod(e.target.value as typeof paymentMethod);
                    setSelectedClient(null);
                    setClientSearch('');
                  }}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="especes">Espèces</option>
                  <option value="wave">Wave</option>
                  <option value="orange_money">Orange Money</option>
                  <option value="carte">Carte bancaire</option>
                  <option value="dette">Dette (Crédit client)</option>
                </select>
              </div>

              <div className="bg-gray-50 p-3 rounded-md">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total à payer:</span>
                  <span>{total.toFixed(2)} €</span>
                </div>
              </div>

              {paymentMethod === 'especes' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Montant reçu
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={receivedAmount || ''}
                    onChange={(e) => setReceivedAmount(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 border rounded-md"
                    placeholder="0.00"
                  />
                  {receivedAmount >= total && receivedAmount > 0 && (
                    <p className="text-green-600 mt-2 font-semibold">
                      Monnaie: {(receivedAmount - total).toFixed(2)} €
                    </p>
                  )}
                  {receivedAmount > 0 && receivedAmount < total && (
                    <p className="text-red-600 mt-2">
                      Montant insuffisant
                    </p>
                  )}
                </div>
              )}

              {paymentMethod === 'dette' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rechercher un client
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        placeholder="Nom ou téléphone..."
                        className="w-full pl-9 pr-4 py-2 border rounded-md"
                      />
                    </div>
                    
                    {clients.length > 0 && (
                      <div className="mt-2 max-h-40 overflow-y-auto border rounded-md">
                        {clients.map(client => {
                          const soldeDette = getSoldeDette(client.solde_dette);
                          return (
                            <button
                              key={client.id}
                              onClick={() => {
                                setSelectedClient(client);
                                setClients([]);
                                setClientSearch(client.nom);
                              }}
                              className="w-full p-2 text-left hover:bg-gray-50 flex justify-between items-center"
                            >
                              <div>
                                <div className="font-medium">{client.nom}</div>
                                <div className="text-xs text-gray-500">{client.telephone}</div>
                              </div>
                              <span className={`text-sm font-semibold ${
                                soldeDette > 0 ? 'text-red-600' : 'text-green-600'
                              }`}>
                                {soldeDette.toFixed(2)} €
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {selectedClient ? (
                    <div className="bg-blue-50 p-3 rounded-md">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium flex items-center">
                            <User className="w-4 h-4 mr-2" />
                            {selectedClient.nom}
                          </div>
                          <div className="text-sm text-gray-600">{selectedClient.telephone}</div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedClient(null);
                            setClientSearch('');
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="mt-2 text-sm">
                        <span className="text-gray-600">Dette actuelle: </span>
                        <span className="font-semibold text-red-600">
                          {getSoldeDette(selectedClient.solde_dette).toFixed(2)} €
                        </span>
                      </div>
                      <div className="mt-1 text-sm">
                        <span className="text-gray-600">Nouvelle dette: </span>
                        <span className="font-semibold text-orange-600">
                          {(getSoldeDette(selectedClient.solde_dette) + total).toFixed(2)} €
                        </span>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowClientForm(true)}
                      className="w-full p-3 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-blue-400 hover:text-blue-600 flex items-center justify-center"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Créer un nouveau client
                    </button>
                  )}

                  {showClientForm && (
                    <div className="border rounded-md p-3 space-y-3">
                      <h3 className="font-medium">Nouveau client</h3>
                      <input
                        type="text"
                        placeholder="Nom complet"
                        value={newClient.nom}
                        onChange={(e) => setNewClient({ ...newClient, nom: e.target.value })}
                        className="w-full p-2 border rounded-md"
                      />
                      <input
                        type="tel"
                        placeholder="Téléphone"
                        value={newClient.telephone}
                        onChange={(e) => setNewClient({ ...newClient, telephone: e.target.value })}
                        className="w-full p-2 border rounded-md"
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setShowClientForm(false);
                            setNewClient({ nom: '', telephone: '' });
                          }}
                          className="flex-1 px-3 py-2 border rounded-md hover:bg-gray-50"
                        >
                          Annuler
                        </button>
                        <button
                          onClick={createClient}
                          className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                        >
                          Créer
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end space-x-2 mt-6">
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setReceivedAmount(0);
                    setSelectedClient(null);
                    setClientSearch('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  disabled={loading}
                >
                  Annuler
                </button>
                <button
                  onClick={handlePayment}
                  disabled={
                    loading ||
                    (paymentMethod === 'especes' && receivedAmount < total) ||
                    (paymentMethod === 'dette' && !selectedClient)
                  }
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {loading ? 'Traitement...' : 'Confirmer le paiement'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}