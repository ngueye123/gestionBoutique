import React, { useState, useEffect } from 'react';
import { Search, Download, Eye, FileText, X } from 'lucide-react';
import { toast } from 'sonner';
import { fetchWithAuth } from '../lib/fetchWithAuth';

interface Vente {
  id: number;
  reference: string;
  total: number | string; // Peut être string ou number
  moyen_paiement: string;
  created_at: string;
}

interface InvoiceSearchProps {
  onClose?: () => void;
}

export function InvoiceSearch({ onClose }: InvoiceSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<Vente[]>([]);
  const [selectedVente, setSelectedVente] = useState<Vente | null>(null);
  const [loading, setLoading] = useState(false);
  const [format, setFormat] = useState<'a4' | 'thermal'>('a4');
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

  // Fonction utilitaire pour convertir total en number
  const parseTotal = (total: number | string): number => {
    return typeof total === 'string' ? parseFloat(total) : total;
  };

  // Recherche avec autocomplétion
  useEffect(() => {
    if (searchTerm.length >= 3) {
      searchVentes();
    } else {
      setSuggestions([]);
    }
  }, [searchTerm]);

  const searchVentes = async () => {
    try {
      const response = await fetchWithAuth(
        `${API_URL}/ventes/autocomplete?q=${searchTerm}`,
        { method: 'GET' }
      );
      
      const data = await response.json();
      
      if (data.success) {
        setSuggestions(data.ventes);
      }
    } catch (error) {
      console.error('Erreur recherche:', error);
    }
  };

  const searchByReference = async (reference: string) => {
    setLoading(true);
    try {
      const response = await fetchWithAuth(
        `${API_URL}/ventes/search?reference=${reference}`,
        { method: 'GET' }
      );
      const data = await response.json();
      
      if (data.success) {
        setSelectedVente(data.vente);
        setSuggestions([]);
      } else {
        toast.error('Vente introuvable');
      }
    } catch (error) {
      toast.error('Erreur lors de la recherche');
    } finally {
      setLoading(false);
    }
  };

  const downloadInvoice = async (venteId: number, reference: string) => {
    try {
      const response = await fetchWithAuth(
        `${API_URL}/ventes/${venteId}/facture?format=${format}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        toast.error('Erreur lors de la génération');
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Facture_${reference}_${format}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Facture téléchargée !');
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    }
  };

  const previewInvoice = async (venteId: number) => {
    try {
      const response = await fetchWithAuth(
        `${API_URL}/ventes/${venteId}/facture/preview?format=${format}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        toast.error('Erreur lors de la prévisualisation');
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } catch (error) {
      toast.error('Erreur lors de la prévisualisation');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center">
          <FileText className="w-6 h-6 mr-2 text-blue-600" />
          Rechercher une facture
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Barre de recherche */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Référence de vente
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Ex: VT-20260203-0001"
            className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Suggestions d'autocomplétion */}
        {suggestions.length > 0 && (
          <div className="mt-2 border rounded-md max-h-60 overflow-y-auto">
            {suggestions.map((vente) => (
              <button
                key={vente.id}
                onClick={() => {
                  setSearchTerm(vente.reference);
                  searchByReference(vente.reference);
                }}
                className="w-full p-3 text-left hover:bg-gray-50 border-b last:border-b-0 flex items-center justify-between"
              >
                <div>
                  <div className="font-mono font-semibold text-sm">
                    {vente.reference}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(vente.created_at).toLocaleDateString('fr-FR')} - {vente.moyen_paiement}
                  </div>
                </div>
                <div className="font-bold text-blue-600">
                  {parseTotal(vente.total).toFixed(2)} F
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Choix du format */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Format de facture
        </label>
        <div className="flex space-x-4">
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              value="a4"
              checked={format === 'a4'}
              onChange={(e) => setFormat(e.target.value as 'a4' | 'thermal')}
              className="mr-2"
            />
            <div>
              <div className="font-medium">A4 Standard</div>
              <div className="text-xs text-gray-500">Format professionnel (210x297mm)</div>
            </div>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              value="thermal"
              checked={format === 'thermal'}
              onChange={(e) => setFormat(e.target.value as 'a4' | 'thermal')}
              className="mr-2"
            />
            <div>
              <div className="font-medium">Ticket Thermique</div>
              <div className="text-xs text-gray-500">Format caisse (58mm)</div>
            </div>
          </label>
        </div>
      </div>

      {/* Résultat de la recherche */}
      {selectedVente && (
        <div className="border rounded-lg p-4 bg-gray-50 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-mono font-bold text-lg">
                {selectedVente.reference}
              </div>
              <div className="text-sm text-gray-600">
                {new Date(selectedVente.created_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">
                {parseTotal(selectedVente.total).toFixed(2)} F
              </div>
              <div className="text-xs text-gray-500 uppercase">
                {selectedVente.moyen_paiement}
              </div>
            </div>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => previewInvoice(selectedVente.id)}
              className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              <Eye className="w-4 h-4 mr-2" />
              Prévisualiser
            </button>
            <button
              onClick={() => downloadInvoice(selectedVente.id, selectedVente.reference)}
              className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
            >
              <Download className="w-4 h-4 mr-2" />
              Télécharger
            </button>
          </div>
        </div>
      )}

      {/* État de chargement */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-600 mt-2">Recherche en cours...</p>
        </div>
      )}

      {/* Message si aucune sélection */}
      {!selectedVente && !loading && searchTerm.length > 0 && suggestions.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>Aucune vente trouvée</p>
          <p className="text-sm">Vérifiez la référence et réessayez</p>
        </div>
      )}
    </div>
  );
}

// Export également un bouton pour ouvrir le modal de recherche
interface InvoiceSearchButtonProps {
  variant?: 'primary' | 'secondary';
}

export function InvoiceSearchButton({ variant = 'primary' }: InvoiceSearchButtonProps) {
  const [showModal, setShowModal] = useState(false);

  const buttonClass = variant === 'primary'
    ? 'bg-blue-500 text-white hover:bg-blue-600'
    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50';

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`inline-flex items-center px-4 py-2 rounded-md ${buttonClass}`}
      >
        <Search className="w-4 h-4 mr-2" />
        Rechercher une facture
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <InvoiceSearch onClose={() => setShowModal(false)} />
        </div>
      )}
    </>
  );
}