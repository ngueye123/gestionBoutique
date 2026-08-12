import React, { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { fetchWithAuth } from '../lib/fetchWithAuth';
import { getApiErrorMessage } from '../lib/apiError';
import { useAuthStore } from '../store/authStore';
import Employes from '../pages/Employes';

interface Props {
  productName: string;
  currentPrice: number;
  onConfirm: (newPrice: number, justification: string, pin?: string) => void;
  onClose: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export function PriceOverrideModal({ productName, currentPrice, onConfirm, onClose }: Props) {
  const { user } = useAuthStore();
  const isExempte = user?.user_type === 'patron' || user?.role === 'admin';

  const [newPrice, setNewPrice]           = useState(currentPrice);
  const [justification, setJustification] = useState('');
  const [pin, setPin]                     = useState('');
  const [error, setError]                 = useState('');
  const [verifying, setVerifying]         = useState(false);

  const handleSubmit = async () => {
    setError('');

    if (newPrice <= 0) {
      setError('Le prix doit être positif');
      return;
    }
 
    if (newPrice === currentPrice) {
      onConfirm(newPrice, '', undefined);
      return;
    }

    if (isExempte) {
      onConfirm(newPrice, justification, undefined);
      return;
    }

    if (pin.length !== 4) {
      setError('Code PIN à 4 chiffres requis');
      return;
    }

    setVerifying(true);
    try {
      const res  = await fetchWithAuth(`${API_URL}/pos/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();

      if (!data.success) {   // ← corrigé : on lit "success", pas "valid"
        setError(getApiErrorMessage(data, 'Code PIN incorrect'));
        return;
      }
      onConfirm(newPrice, justification, pin);
    } catch {
      toast.error('Impossible de vérifier le PIN. Vérifiez votre connexion.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-medium text-gray-900">Modifier le prix</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-sm text-gray-500">{productName}</p>

          <div>
            <label className="text-xs text-gray-500">Nouveau prix</label>
            <input
              type="number"
              step="1"
              value={newPrice}
              onChange={e => setNewPrice(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mt-1"
            />
            <p className="text-xs text-gray-400 mt-1">
              Prix catalogue : {currentPrice.toLocaleString('fr-FR')} F
            </p>
          </div>

          {newPrice !== currentPrice && (
            <div>
              <label className="text-xs text-gray-500">Justification</label>
              <textarea
                value={justification}
                onChange={e => setJustification(e.target.value)}
                placeholder="Ex : fidélisation client, produit abîmé..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mt-1"
              />
            </div>
          )}

          {newPrice !== currentPrice && !isExempte && (
            <div>
              <label className="text-xs text-gray-500">Code PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm
                           tracking-widest text-center focus:ring-2 focus:ring-blue-500
                           focus:border-blue-500 mt-1"
              />
            </div>
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={verifying}
            className="flex-[2] py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium
                       hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400"
          >
            {verifying ? 'Vérification...' : 'Valider'}
          </button>
        </div>
      </div>
    </div>
  );
}