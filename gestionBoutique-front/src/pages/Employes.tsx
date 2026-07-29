// src/pages/Employes.tsx
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '../store/authStore';
import { PasswordInput } from '../components/PasswordInput';
import { fetchWithAuth } from '../lib/fetchWithAuth';
import {
  UserPlus, Trash2, CheckCircle, XCircle,
  RefreshCw, Mail, AlertTriangle,
} from 'lucide-react';

interface Employe {
  id: number;
  nom: string;
  email: string;
  role: string;
  email_verified: boolean; 
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export default function Employes() {
  const token        = useAuthStore(s => s.token);
  const isAuthLoaded = useAuthStore(s => s.isAuthLoaded);

  const [employes, setEmployes]   = useState<Employe[]>([]);
  const [formData, setFormData]   = useState({
    nom: '', email: '', mot_de_passe: '', mot_de_passe_confirmation: '', role: '',
  });
  const [loading, setLoading]         = useState(false);
  const [errors, setErrors]           = useState<Record<string, string>>({});
  // Suivi de l'ID en cours de renvoi pour désactiver le bouton pendant l'appel
  const [resendingId, setResendingId] = useState<number | null>(null);
  // Suivi de l'ID en cours de suppression
  const [deletingId, setDeletingId]   = useState<number | null>(null);

  useEffect(() => {
    if (!isAuthLoaded || !token) return;
    fetchEmployes();
  }, [isAuthLoaded, token]);

  // ── Chargement de la liste ──────────────────────────────────────────────

  const fetchEmployes = async () => {
    try {
      const res  = await fetchWithAuth(`${API_URL}/employes`);
      const data = await res.json();
      // L'API retourne { success, employes: [...] }
      const list: Employe[] = Array.isArray(data) ? data : data.employes ?? [];
      setEmployes(list);
    } catch (err: any) {
      toast.error('Impossible de charger les employés.');
    }
  };

  // ── Validation formulaire ──────────────────────────────────────────────

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.nom)          newErrors.nom          = 'Le nom est requis';
    if (!formData.email)        newErrors.email        = "L'email est requis";
    if (!formData.mot_de_passe) newErrors.mot_de_passe = 'Le mot de passe est requis';
    if (formData.mot_de_passe.length < 6)
      newErrors.mot_de_passe = 'Le mot de passe doit contenir au moins 6 caractères';
    if (formData.mot_de_passe !== formData.mot_de_passe_confirmation)
      newErrors.mot_de_passe_confirmation = 'Les mots de passe ne correspondent pas';
    if (!formData.role) newErrors.role = 'Le rôle est requis';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Création d'un employé ──────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Veuillez corriger les erreurs du formulaire');
      return;
    }
    setLoading(true);
    try {
      const res  = await fetchWithAuth(`${API_URL}/employes`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          nom:          formData.nom,
          email:        formData.email,
          mot_de_passe: formData.mot_de_passe,
          role:         formData.role,
        }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(data.message); // inclut la mention de l'email envoyé
        setFormData({ nom: '', email: '', mot_de_passe: '', mot_de_passe_confirmation: '', role: '' });
        setErrors({});
        fetchEmployes();
      } else {
        toast.error(data.message || "Erreur lors de l'ajout de l'employé.");
      }
    } catch {
      toast.error("Erreur lors de l'ajout de l'employé.");
    } finally {
      setLoading(false);
    }
  };

  // ── Suppression d'un employé ───────────────────────────────────────────

  const deleteEmploye = async (id: number) => {
    const confirmDelete = window.confirm('Voulez-vous vraiment supprimer cet employé ?');
    if (!confirmDelete) return;

    setDeletingId(id);
    try {
      const res  = await fetchWithAuth(`${API_URL}/employes/${id}`, { method: 'DELETE' });
      const data = await res.json();

      if (data.success) {
        toast.success('Employé supprimé avec succès.');
        // Retirer directement de la liste locale pour éviter un rechargement
        setEmployes(prev => prev.filter(e => e.id !== id));
      } else {
        toast.error(data.message || 'Erreur lors de la suppression.');
      }
    } catch {
      toast.error('Erreur lors de la suppression.');
    } finally {
      setDeletingId(null);
    }
  };

  // ── Mise à jour du rôle ────────────────────────────────────────────────

  const updateRole = async (id: number, newRole: string) => {
    try {
      const res  = await fetchWithAuth(`${API_URL}/employes/${id}/role`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ role: newRole }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success('Rôle mis à jour avec succès.');
        setEmployes(prev => prev.map(e => (e.id === id ? { ...e, role: newRole } : e)));
      } else {
        toast.error(data.message || 'Erreur lors de la mise à jour du rôle.');
      }
    } catch {
      toast.error('Erreur lors de la mise à jour du rôle.');
    }
  };

  // ── Renvoi de l'email de vérification ─────────────────────────────────

  const resendVerification = async (id: number) => {
    setResendingId(id);
    try {
      const res  = await fetchWithAuth(`${API_URL}/employes/${id}/resend-verification`, {
        method: 'POST',
      });
      const data = await res.json();

      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message || "Erreur lors de l'envoi.");
      }
    } catch {
      toast.error("Erreur lors de l'envoi de l'email.");
    } finally {
      setResendingId(null);
    }
  };

  // ─── Rendu ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 px-2 sm:px-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Gestion des employés</h2>
        <p className="text-gray-600 text-sm">Ajoutez et gérez les employés de votre boutique</p>
      </div>

      {/* ── Formulaire d'ajout ──────────────────────────────────────────── */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
        <h3 className="text-base sm:text-lg font-semibold mb-4 flex items-center">
          <UserPlus className="w-5 h-5 mr-2 text-blue-500" />
          Ajouter un employé
        </h3>

        {/* Information sur la vérification email */}
        <div className="mb-4 p-2.5 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
          <Mail className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs sm:text-sm text-blue-700">
            Un email de vérification sera automatiquement envoyé à l'employé.
            Il devra cliquer sur le lien avant de pouvoir se connecter.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">

            {/* Nom */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input
                type="text"
                value={formData.nom}
                onChange={e => { setFormData({ ...formData, nom: e.target.value }); setErrors({ ...errors, nom: '' }); }}
                className="block w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Nom de l'employé"
              />
              {errors.nom && <p className="text-red-500 text-xs mt-1">{errors.nom}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => { setFormData({ ...formData, email: e.target.value }); setErrors({ ...errors, email: '' }); }}
                className="block w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="email@exemple.com"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <PasswordInput
              label="Mot de passe"
              name="mot_de_passe"
              onChange={e => { setFormData({ ...formData, mot_de_passe: e.target.value }); setErrors({ ...errors, mot_de_passe: '' }); }}
              error={errors.mot_de_passe}
              placeholder="Minimum 6 caractères"
            />
            <PasswordInput
              label="Confirmer le mot de passe"
              name="mot_de_passe_confirmation"
              onChange={e => { setFormData({ ...formData, mot_de_passe_confirmation: e.target.value }); setErrors({ ...errors, mot_de_passe_confirmation: '' }); }}
              error={errors.mot_de_passe_confirmation}
              placeholder="Confirmez le mot de passe"
            />
          </div>

          {/* Rôle */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Rôle</label>
            <select
              value={formData.role}
              onChange={e => { setFormData({ ...formData, role: e.target.value }); setErrors({ ...errors, role: '' }); }}
              className="block w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Choisir un rôle</option>
              <option value="admin">Admin — Gestion complète</option>
              <option value="vendeur">Vendeur — Ventes et stocks</option>
              <option value="caissier">Caissier — Point de vente uniquement</option>
            </select>
            {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full md:w-auto bg-blue-500 text-white px-4 sm:px-6 py-2 rounded-md text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            {loading ? "Ajout en cours…" : "Ajouter l'employé"}
          </button>
        </form>
      </div>

      {/* ── Liste des employés ──────────────────────────────────────────── */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-4 sm:p-6 border-b">
          <h3 className="text-base sm:text-lg font-semibold">
            Liste des employés ({employes.length})
          </h3>
        </div>

        <div className="divide-y">
          {employes.length > 0 ? (
            employes.map(employe => (
              <div key={employe.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-4">

                  {/* Infos employé */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h4 className="font-semibold text-gray-800">{employe.nom}</h4>

                      {/* Badge statut email */}
                      {employe.email_verified ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                          <CheckCircle className="w-3 h-3" />
                          Email vérifié
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">
                          <AlertTriangle className="w-3 h-3" />
                          Email non vérifié
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-500 mb-2">{employe.email}</p>

                    {/* Sélecteur de rôle */}
                    <select
                      value={employe.role}
                      onChange={e => updateRole(employe.id, e.target.value)}
                      className="text-sm p-1.5 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="admin">Admin</option>
                      <option value="vendeur">Vendeur</option>
                      <option value="caissier">Caissier</option>
                    </select>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">

                    {/* Bouton renvoi email — uniquement si non vérifié */}
                    {!employe.email_verified && (
                      <button
                        onClick={() => resendVerification(employe.id)}
                        disabled={resendingId === employe.id}
                        title="Renvoyer l'email de vérification"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 disabled:opacity-50 transition-colors"
                      >
                        {resendingId === employe.id ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Mail className="w-3 h-3" />
                        )}
                        Renvoyer
                      </button>
                    )}

                    {/* Bouton suppression */}
                    <button
                      onClick={() => deleteEmploye(employe.id)}
                      disabled={deletingId === employe.id}
                      title="Supprimer l'employé"
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 disabled:opacity-50 transition-colors"
                    >
                      {deletingId === employe.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-gray-500">
              <UserPlus className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Aucun employé pour le moment</p>
              <p className="text-sm">Ajoutez votre premier employé ci-dessus</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}