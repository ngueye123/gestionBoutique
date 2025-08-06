import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useAuthStore } from "../store/authStore";

interface Employe {
  id: number;
  nom: string;
  email: string;
  role: string;
}

const API_URL = "http://localhost:8000/api";

export default function Employes() {
  const token = useAuthStore(s => s.token);
  const isAuthLoaded = useAuthStore(s => s.isAuthLoaded);

  const [employes, setEmployes] = useState<Employe[]>([]);
  const [formData, setFormData] = useState({
    nom: "",
    email: "",
    mot_de_passe: "",
    role: "",
  });
  const [loading, setLoading] = useState(false);

  // Charger les employés quand l'auth est prête + token présent
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);

    try {
      await axios.post(`${API_URL}/employes`, formData, {
        headers: { ...authHeaders, "Content-Type": "application/json" },
      });
      toast.success("Employé ajouté !");
      setFormData({ nom: "", email: "", mot_de_passe: "", role: "" });
      fetchEmployes();
    } catch (err: any) {
      if (err.response?.status === 422) {
        const errors = err.response.data.errors;
        const firstError = errors ? (Object.values(errors)[0] as string[])[0] : "Données invalides.";
        toast.error(firstError);
      } else {
        toast.error(err.response?.data?.message || "Erreur ajout employé.");
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
      toast.success("Employé supprimé.");
      fetchEmployes();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Erreur suppression.");
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
      toast.success("Rôle mis à jour.");
      setEmployes(prev => prev.map(e => (e.id === id ? { ...e, role: newRole } : e)));
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Erreur mise à jour rôle.");
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Gestion des employés</h2>

      <form onSubmit={handleSubmit} className="mb-6 space-y-4 max-w-md">
        <input
          type="text"
          placeholder="Nom"
          value={formData.nom}
          onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
          className="block w-full p-2 border border-gray-300 rounded"
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="block w-full p-2 border border-gray-300 rounded"
          required
        />
        <input
          type="password"
          placeholder="Mot de passe (min 6 caractères)"
          value={formData.mot_de_passe}
          onChange={(e) => setFormData({ ...formData, mot_de_passe: e.target.value })}
          className="block w-full p-2 border border-gray-300 rounded"
          required
        />
        <select
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          className="block w-full p-2 border border-gray-300 rounded"
          required
        >
          <option value="">Choisir un rôle</option>
          <option value="admin">Admin</option>
          <option value="vendeur">Vendeur</option>
          <option value="caissier">Caissier</option>
        </select>

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? "Ajout..." : "Ajouter"}
        </button>
      </form>

      <h3 className="text-lg font-semibold mb-2">Liste des employés</h3>
      <ul className="space-y-2">
        {employes.map((e) => (
          <li
            key={e.id}
            className="bg-white p-3 shadow rounded flex justify-between items-center"
          >
            <div>
              <div className="font-bold">{e.nom}</div>
              <div className="text-sm text-gray-600">{e.email}</div>
              <select
                value={e.role}
                onChange={(event) => updateRole(e.id, event.target.value)}
                className="mt-2 p-1 border rounded"
              >
                <option value="admin">Admin</option>
                <option value="vendeur">Vendeur</option>
                <option value="caissier">Caissier</option>
              </select>
            </div>
            <button
              onClick={() => deleteEmploye(e.id)}
              className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
            >
              Supprimer
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
