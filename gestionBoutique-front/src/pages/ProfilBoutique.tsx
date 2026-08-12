import { useEffect, useState } from 'react';
import { Store, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { fetchWithAuth } from '../lib/fetchWithAuth';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

interface BoutiqueProfile {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  email_verified: boolean;
  nom_boutique: string | null;
  adresse_boutique: string | null;
  telephone_boutique: string | null;
  logo_boutique: string | null;
}

export default function ProfilBoutique() {
  const { user } = useAuthStore();
  const isPatron = user?.user_type === 'patron';

  const [profile, setProfile] = useState<BoutiqueProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await fetchWithAuth(`${API_URL}/profile-boutique`);
        const data = await res.json();
        if (res.ok && data.success) {
          setProfile(data.profile);
        } else {
          toast.error(data.message || 'Impossible de charger le profil de la boutique.');
        }
      } catch {
        toast.error('Impossible de charger le profil. Vérifiez votre connexion.');
      } finally {
        setIsLoading(false);
      }
    };
    loadProfile();
  }, []);

  const updateField = (field: keyof BoutiqueProfile, value: string) => {
    setProfile(p => (p ? { ...p, [field]: value } : p));
  };

  const handleSave = async () => {
    if (!profile) return;
    setIsSaving(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/profile-boutique`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: profile.nom,
          prenom: profile.prenom,
          email: profile.email,
          nom_boutique: profile.nom_boutique,
          adresse_boutique: profile.adresse_boutique,
          telephone_boutique: profile.telephone_boutique,
          logo_boutique: profile.logo_boutique,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProfile(data.profile);
        toast.success(data.message || 'Profil mis à jour avec succès');
      } else {
        toast.error(data.message || 'Impossible de mettre à jour le profil.');
      }
    } catch {
      toast.error('Impossible de mettre à jour le profil. Vérifiez votre connexion.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!profile) {
    return <p className="text-sm text-gray-500">Profil introuvable.</p>;
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Store className="w-6 h-6 text-gray-700" />
        <h1 className="text-xl font-semibold text-gray-900">Profil Boutique</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Informations liées à votre boutique.
        {!isPatron && ' Seul le propriétaire peut modifier ces informations.'}
      </p>

      <div className="max-w-2xl bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500">Prénom</label>
            <input
              type="text"
              value={profile.prenom}
              onChange={e => updateField('prenom', e.target.value)}
              disabled={!isPatron}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm
                         focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Nom</label>
            <input
              type="text"
              value={profile.nom}
              onChange={e => updateField('nom', e.target.value)}
              disabled={!isPatron}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm
                         focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500">Email</label>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="email"
              value={profile.email}
              onChange={e => updateField('email', e.target.value)}
              disabled={!isPatron}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm
                         focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            />
            <span
              className={`shrink-0 text-xs px-2 py-1 rounded-full ${
                profile.email_verified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
              }`}
            >
              {profile.email_verified ? 'Vérifié' : 'Non vérifié'}
            </span>
          </div>
        </div>

        <hr className="border-gray-100" />

        <div>
          <label className="text-xs text-gray-500">Nom de la boutique</label>
          <input
            type="text"
            value={profile.nom_boutique ?? ''}
            onChange={e => updateField('nom_boutique', e.target.value)}
            disabled={!isPatron}
            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm
                       focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500">Adresse de la boutique</label>
          <input
            type="text"
            value={profile.adresse_boutique ?? ''}
            onChange={e => updateField('adresse_boutique', e.target.value)}
            disabled={!isPatron}
            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm
                       focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500">Téléphone de la boutique</label>
            <input
              type="text"
              value={profile.telephone_boutique ?? ''}
              onChange={e => updateField('telephone_boutique', e.target.value)}
              disabled={!isPatron}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm
                         focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Logo (URL ou chemin)</label>
            <input
              type="text"
              value={profile.logo_boutique ?? ''}
              onChange={e => updateField('logo_boutique', e.target.value)}
              disabled={!isPatron}
              placeholder="https://... ou chemin de stockage"
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm
                         focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
        </div>

        {profile.logo_boutique && (
          <div>
            <label className="text-xs text-gray-500">Aperçu du logo</label>
            <img
              src={profile.logo_boutique}
              alt="Logo boutique"
              className="mt-1 max-h-20 rounded-md border border-gray-100"
              onError={e => (e.currentTarget.style.display = 'none')}
            />
          </div>
        )}

        {isPatron && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium
                       hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400
                       flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isSaving ? 'Enregistrement…' : 'Enregistrer les modifications'}
          </button>
        )}
      </div>
    </div>
  );
}
