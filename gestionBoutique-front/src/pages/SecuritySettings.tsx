import React, { useState } from 'react';
import { toast } from 'sonner';
import { fetchWithAuth } from '../lib/fetchWithAuth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export default function SecuritySettings() {
  const [pin, setPin]               = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading]       = useState(false);

  const handleSave = async () => {
    if (pin.length !== 4) { toast.error('Le PIN doit contenir 4 chiffres'); return; }
    if (pin !== confirmPin) { toast.error('Les deux codes ne correspondent pas'); return; }

    setLoading(true);
    try {
      const res  = await fetchWithAuth(`${API_URL}/security-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Code PIN mis à jour avec succès');
        setPin(''); setConfirmPin('');
      } else {
        toast.error(data.message || 'Erreur lors de la mise à jour');
      }
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md">
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Sécurité — Code PIN</h1>
      <p className="text-sm text-gray-500 mb-6">
        Ce code est demandé aux vendeurs lorsqu'ils ajustent le prix d'un produit au comptoir.
      </p>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div>
          <label className="text-xs text-gray-500">Nouveau code PIN (4 chiffres)</label>
          <input
            type="password" inputMode="numeric" maxLength={4}
            value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm
                       tracking-widest text-center focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Confirmer le code</label>
          <input
            type="password" inputMode="numeric" maxLength={4}
            value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm
                       tracking-widest text-center focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium
                     hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400"
        >
          {loading ? 'Enregistrement...' : 'Enregistrer le code PIN'}
        </button>
      </div>
    </div>
  );
}