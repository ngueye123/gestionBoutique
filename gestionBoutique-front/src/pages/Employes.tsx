import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useAuthStore } from "../store/authStore";
import { PasswordInput } from "../components/PasswordInput";
import { UserPlus, Trash2 } from "lucide-react";

interface Employe {
  id: number;
  nom: string;
  email: string;
  role: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export default function Employes() {
  const token = useAuthStore(s => s.token);
  const isAuthLoaded = useAuthStore(s => s.isAuthLoaded);

  const [employes, setEmployes] = useState<Employe[]>([]);
  const [formData, setFormData] = useState({
    nom: "",
    email: "",
    mot_de_passe: "",
    mot_de_passe_confirmation: "",
    role: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isAuthLoaded || !token) return;
    fetchEmployes();
  }, [isAuthLoaded, token]);

  const authHeaders = token
    ? { Authorization: `Bearer ${token}`, Accept: "application/json" }
    : undefined;

  const fetchEmployes = async () => {
    try {
      const res = await axios.get(`${API_URL}/employes`, { headers: authHeaders });
      const data = res.data;
      const list: Employe[] = Array.isArray(data) ? data : data.employes ?? [];
      setEmployes(list);
    } catch (err: any) {
      if (err.response?.status === 401) {
        toast.error("Session expirée. Veuillez vous reconnecter.");
      } else {
        toast.error("Impossible de charger les employés.");
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nom) newErrors.nom = "Le nom est requis";
    if (!formData.email) newErrors.email = "L'email est requis";
    if (!formData.mot_de_passe) newErrors.mot_de_passe = "Le mot de passe est requis";
    if (formData.mot_de_passe.length < 6) {
      newErrors.mot_de_passe = "Le mot de passe doit contenir au moins 6 caractères";
    }
    if (formData.mot_de_passe !== formData.mot_de_passe_confirmation) {
      newErrors.mot_de_passe_confirmation = "Les mots de passe ne correspondent pas";
    }
    if (!formData.role) newErrors.role = "Le rôle est requis";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("Veuillez corriger les erreurs du formulaire");
      return;
    }

    if (!token) return;
    setLoading(true);

    try {
      await axios.post(`${API_URL}/employes`, {
        nom: formData.nom,
        email: formData.email,
        mot_de_passe: formData.mot_de_passe,
        role: formData.role,
      }, {
        headers: { ...authHeaders, "Content-Type": "application/json" },
      });
      
      toast.success("Employé ajouté avec succès !");
      setFormData({ 
        nom: "", 
        email: "", 
        mot_de_passe: "", 
        mot_de_passe_confirmation: "",
        role: "" 
      });
      setErrors({});
      fetchEmployes();
    } catch (err: any) {
      if (err.response?.status === 422) {
        const apiErrors = err.response.data.errors;
        const firstError = apiErrors ? (Object.values(apiErrors)[0] as string[])[0] : "Données invalides.";
        toast.error(firstError);
      } else {
        toast.error(err.response?.data?.message || "Erreur lors de l'ajout de l'employé.");
      }
    } finally {
      setLoading(false);
    }
  };

  const deleteEmploye = async (id: number) => {
    if (!token) return;
    const confirmDelete = window.confirm("Voulez-vous vraiment supprimer cet employé ?");
    if (!confirmDelete) return;

    try {
      await axios.delete(`${API_URL}/employes/${id}`, { headers: authHeaders });
      toast.success("Employé supprimé avec succès.");
      fetchEmployes();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Erreur lors de la suppression.");
    }
  };

  const updateRole = async (id: number, newRole: string) => {
    if (!token) return;
    try {
      await axios.put(
        `${API_URL}/employes/${id}/role`,
        { role: newRole },
        { headers: { ...authHeaders, "Content-Type": "application/json" } }
      );
      toast.success("Rôle mis à jour avec succès.");
      setEmployes(prev => prev.map(e => (e.id === id ? { ...e, role: newRole } : e)));
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Erreur lors de la mise à jour du rôle.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Gestion des employés</h2>
        <p className="text-gray-600">Ajoutez et gérez les employés de votre boutique</p>
      </div>

      {/* Formulaire d'ajout */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <UserPlus className="w-5 h-5 mr-2 text-blue-500" />
          Ajouter un employé
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nom */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom
              </label>
              <input
                type="text"
                value={formData.nom}
                onChange={(e) => {
                  setFormData({ ...formData, nom: e.target.value });
                  setErrors({ ...errors, nom: "" });
                }}
                className="block w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Nom de l'employé"
              />
              {errors.nom && (
                <p className="text-red-500 text-sm mt-1">{errors.nom}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  setErrors({ ...errors, email: "" });
                }}
                className="block w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="email@exemple.com"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Mot de passe */}
            <div>
              <PasswordInput
                label="Mot de passe"
                name="mot_de_passe"
                onChange={(e) => {
                  setFormData({ ...formData, mot_de_passe: e.target.value });
                  setErrors({ ...errors, mot_de_passe: "" });
                }}
                error={errors.mot_de_passe}
                placeholder="Minimum 6 caractères"
              />
            </div>

            {/* Confirmation */}
            <div>
              <PasswordInput
                label="Confirmer le mot de passe"
                name="mot_de_passe_confirmation"
                onChange={(e) => {
                  setFormData({ ...formData, mot_de_passe_confirmation: e.target.value });
                  setErrors({ ...errors, mot_de_passe_confirmation: "" });
                }}
                error={errors.mot_de_passe_confirmation}
                placeholder="Confirmez le mot de passe"
              />
            </div>
          </div>

          {/* Rôle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rôle
            </label>
            <select
              value={formData.role}
              onChange={(e) => {
                setFormData({ ...formData, role: e.target.value });
                setErrors({ ...errors, role: "" });
              }}
              className="block w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Choisir un rôle</option>
              <option value="admin">Admin - Gestion complète</option>
              <option value="vendeur">Vendeur - Ventes et stocks</option>
              <option value="caissier">Caissier - Point de vente uniquement</option>
            </select>
            {errors.role && (
              <p className="text-red-500 text-sm mt-1">{errors.role}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full md:w-auto bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            {loading ? "Ajout en cours..." : "Ajouter l'employé"}
          </button>
        </form>
      </div>

      {/* Liste des employés */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">Liste des employés ({employes.length})</h3>
        </div>
        
        <div className="divide-y">
          {employes.length > 0 ? (
            employes.map((employe) => (
              <div
                key={employe.id}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800">{employe.nom}</h4>
                    <p className="text-sm text-gray-600">{employe.email}</p>
                    <div className="mt-2">
                      <select
                        value={employe.role}
                        onChange={(e) => updateRole(employe.id, e.target.value)}
                        className="text-sm p-1.5 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="admin">Admin</option>
                        <option value="vendeur">Vendeur</option>
                        <option value="caissier">Caissier</option>
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteEmploye(employe.id)}
                    className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Supprimer l'employé"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
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