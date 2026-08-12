import { useState, useEffect } from 'react';
import { User, Phone, Plus, Eye, Edit2, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorMessage } from '../lib/apiError';
import { useAuthStore } from '../store/authStore';
import { fetchWithAuth } from '../lib/fetchWithAuth';
import { Client } from '../types';

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({ nom: '', telephone: '' });
  const [filterDettes, setFilterDettes] = useState(false);
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
  const { } = useAuthStore();

  useEffect(() => {
    fetchClients();
  }, [filterDettes]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const url = filterDettes 
        ? `${API_URL}/clients?avec_dettes=1`
        : `${API_URL}/clients`;
      
      const response = await fetchWithAuth(url, { method: 'GET' });
      const data = await response.json();
      
      if (data.success) {
        setClients(data.clients);
      }
    } catch (error) {
      toast.error('Impossible de charger les clients. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.nom || !formData.telephone) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    try {
      const url = editingClient
        ? `${API_URL}/clients/${editingClient.id}`
        : `${API_URL}/clients`;

      const method = editingClient ? 'PUT' : 'POST';
      
      const response = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
        fetchClients();
        setShowModal(false);
        setFormData({ nom: '', telephone: '' });
        setEditingClient(null);
      } else {
        toast.error(getApiErrorMessage(result, editingClient ? 'Impossible de mettre à jour le client.' : 'Impossible de créer le client.'));
      }
    } catch (error) {
      toast.error('Impossible d\'enregistrer le client. Vérifiez votre connexion.');
    }
  };

  const handleDelete = async (id: number) => {
    const client = clients.find(c => c.id === id);
    if (client && getSoldeDette(client.solde_dette) > 0) {
      toast.error('Impossible de supprimer un client avec des dettes');
      return;
    }

    if (!confirm('Voulez-vous vraiment supprimer ce client ?')) return;

    try {
      const response = await fetchWithAuth(`${API_URL}/clients/${id}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      
      if (result.success) {
        toast.success('Client supprimé');
        fetchClients();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Impossible de supprimer le client. Vérifiez votre connexion.');
    }
  };

  const openModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData({ nom: client.nom, telephone: client.telephone });
    } else {
      setEditingClient(null);
      setFormData({ nom: '', telephone: '' });
    }
    setShowModal(true);
  };

  // ✅ Fonction utilitaire pour convertir solde_dette en nombre
  const getSoldeDette = (solde: any): number => {
    const parsed = parseFloat(String(solde || 0));
    return isNaN(parsed) ? 0 : parsed;
  };

  const filteredClients = clients.filter(client =>
    client.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.telephone.includes(searchTerm)
  );

  // ✅ Calculs sécurisés
  const totalDettes = clients.reduce((sum, c) => sum + getSoldeDette(c.solde_dette), 0);
  const clientsAvecDettes = clients.filter(c => getSoldeDette(c.solde_dette) > 0).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-2 sm:px-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestion des clients</h1>
          <p className="text-gray-600 text-sm">Gérez vos clients et leurs dettes</p>
        </div>
        <button
          onClick={() => openModal()}
          className="w-full sm:w-auto bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 flex items-center justify-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouveau client
        </button>
      </div>

      <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher par nom ou téléphone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
          <label className="flex items-center space-x-2 cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={filterDettes}
              onChange={(e) => setFilterDettes(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Avec dettes</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Total clients</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-800">{clients.length}</p>
            </div>
            <div className="p-2 sm:p-3 bg-blue-100 rounded-full">
              <User className="w-5 sm:w-6 h-5 sm:h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Clients avec dettes</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-800">
                {clientsAvecDettes}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Total des dettes</p>
              <p className="text-xl sm:text-2xl font-bold text-red-600">
                {totalDettes.toFixed(2)} F
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Table — Desktop */}
      <div className="hidden md:block bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Téléphone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">carte</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dette actuelle</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredClients.map((client) => {
              const soldeDette = getSoldeDette(client.solde_dette);
              return (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{client.nom}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="w-4 h-4 mr-2" />
                      {client.telephone}
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-600">
                      {client.numero_carte || 'N/A'}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      soldeDette === 0
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {soldeDette.toFixed(2)} F
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => window.location.href = `/clients/${client.id}`}
                        className="text-blue-600 hover:text-blue-900"
                        title="Voir détails"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openModal(client)}
                        className="text-gray-600 hover:text-gray-900"
                        title="Modifier"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(client.id)}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Supprimer"
                        disabled={soldeDette > 0}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredClients.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Aucun client trouvé</p>
          </div>
        )}
      </div>

      {/* Cartes — Mobile */}
      <div className="md:hidden space-y-3">
        {filteredClients.map((client) => {
          const soldeDette = getSoldeDette(client.solde_dette);
          return (
            <div key={client.id} className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{client.nom}</p>
                    <div className="flex items-center text-xs text-gray-600 mt-1">
                      <Phone className="w-3 h-3 mr-1" />
                      {client.telephone}
                    </div>
                    <div className="flex items-center text-xs text-gray-600 mt-1">
                      <span className="font-semibold">Carte:</span>
                      <span className="ml-1">{client.numero_carte || 'N/A'}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-500 mb-1">Dette</p>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium inline-block ${
                    soldeDette === 0
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {soldeDette.toFixed(2)} F
                  </span>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => window.location.href = `/clients/${client.id}`}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-md"
                  title="Voir détails"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => openModal(client)}
                  className="p-2 text-gray-600 hover:bg-gray-50 rounded-md"
                  title="Modifier"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(client.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Supprimer"
                  disabled={soldeDette > 0}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
        {filteredClients.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">Aucun client trouvé</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingClient ? 'Modifier le client' : 'Nouveau client'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom complet
                </label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: Jean Dupont"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={formData.telephone}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: 0612345678"
                />
              </div>

              

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingClient(null);
                    setFormData({ nom: '', telephone: '' });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  {editingClient ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}