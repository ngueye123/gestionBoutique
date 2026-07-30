// src/pages/FideliteSettings.tsx
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { fetchWithAuth } from '../lib/fetchWithAuth';
import type { FideliteConfig } from '../types';

export default function FideliteSettings() {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
  const [config, setConfig] = useState<Partial<FideliteConfig>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchWithAuth(`${API_URL}/fidelite/config`)
      .then(r => r.json())
      .then(d => d.success && setConfig(d.config));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/fidelite/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          montant_tranche: Number(config.montant_tranche),
          points_accordes: Number(config.points_accordes),
        }),
      });
      const data = await res.json();
      data.success ? toast.success(data.message) : toast.error(data.message);
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-md space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700">Montant par tranche (FCFA)</label>
        <input type="number" min={1} step={1}
               value={config.montant_tranche ?? ''}
               onChange={e => setConfig(c => ({ ...c, montant_tranche: Number(e.target.value) }))}
               className="w-full border rounded-lg px-3 py-2 mt-1" />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700">Points accordés par tranche</label>
        <input type="number" min={1} step={1}
               value={config.points_accordes ?? ''}
               onChange={e => setConfig(c => ({ ...c, points_accordes: Number(e.target.value) }))}
               className="w-full border rounded-lg px-3 py-2 mt-1" />
      </div>
      <button onClick={save} disabled={saving}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
        {saving ? 'Enregistrement…' : 'Enregistrer la règle'}
      </button>
    </div>
  );
}