// src/pages/Depenses.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, Edit2, TrendingDown, Calendar,
  RefreshCw, X, ChevronDown, ChevronUp, Tag,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDepenses, DEPENSE_FORM_VIDE } from '../hooks/useDepenses';
import type { Depense, DepenseFormData, FiltresDepenses } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatMontant = (m: number) =>
  m.toLocaleString('fr-FR', { minimumFractionDigits: 0 }) + ' F';


/// Formate une date en YYYY-MM-DD en restant en heure LOCALE (pas UTC)
// toISOString() est interdit ici car il convertit en UTC et décale d'un jour
function formatDateLocale(d: Date): string {
  const annee = d.getFullYear();
  const mois  = String(d.getMonth() + 1).padStart(2, '0');
  const jour  = String(d.getDate()).padStart(2, '0');
  return `${annee}-${mois}-${jour}`;
}

function bornesPeriode(type: 'today' | 'week' | 'month' | 'year'): {
  start: string;
  end: string;
} {
  const now = new Date();

  switch (type) {
    case 'today': {
      const today = formatDateLocale(now);
      return { start: today, end: today };
    }

    case 'week': {
      // Lundi de la semaine courante (getDay() : 0=dim, 1=lun ... 6=sam)
      const jourSemaine = now.getDay() === 0 ? 7 : now.getDay(); // dimanche → 7
      const lundi       = new Date(now);
      lundi.setDate(now.getDate() - jourSemaine + 1);
      return { start: formatDateLocale(lundi), end: formatDateLocale(now) };
    }

    case 'month': {
      // Premier jour du mois courant
      const debut = new Date(now.getFullYear(), now.getMonth(), 1);
      // Dernier jour du mois courant : jour 0 du mois suivant
      const fin   = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { start: formatDateLocale(debut), end: formatDateLocale(fin) };
    }

    case 'year': {
      const debut = new Date(now.getFullYear(), 0, 1);
      const fin   = new Date(now.getFullYear(), 11, 31);
      return { start: formatDateLocale(debut), end: formatDateLocale(fin) };
    }
  }
}
// ─── Composant principal ──────────────────────────────────────────────────────

export default function Depenses() {
  const {
    data, loading, submitting,
    charger, creer, modifier, supprimer,
    mettreAJourLocal, supprimerLocal,
  } = useDepenses();

  // ── Filtres ───────────────────────────────────────────────────────────────
  // Initialisation sur le mois courant

  const { start: debutMois, end: finMois } = bornesPeriode('month');
  const [startDate, setStartDate]   = useState(debutMois);
  const [endDate, setEndDate]       = useState(finMois);
  const [categorieFil, setCategorieFil] = useState('');

  // ── Formulaire ────────────────────────────────────────────────────────────
  const [showForm, setShowForm]     = useState(false);
  const [editingId, setEditingId]   = useState<number | null>(null);
  const [form, setForm]             = useState<DepenseFormData>(DEPENSE_FORM_VIDE);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ── Affichage répartition catégories ─────────────────────────────────────
  const [showCategories, setShowCategories] = useState(false);

  // ── Chargement des données ────────────────────────────────────────────────

  const chargerDonnees = useCallback(() => {
    if (!startDate || !endDate) return;

    const filtres: FiltresDepenses = {
      start_date: startDate,
      end_date:   endDate,
    };
    if (categorieFil) filtres.categorie = categorieFil;

    charger(filtres);
  }, [startDate, endDate, categorieFil, charger]);

  // Chargement initial et à chaque changement de filtres
  useEffect(() => { chargerDonnees(); }, [chargerDonnees]);

  // ── Raccourcis de période ─────────────────────────────────────────────────

  const appliquerRaccourci = (type: 'today' | 'week' | 'month' | 'year') => {
    const { start, end } = bornesPeriode(type);
    setStartDate(start);
    setEndDate(end);
  };

  // ── Soumission formulaire ─────────────────────────────────────────────────

  const validerForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.description.trim()) errs.description = 'La description est obligatoire';
    if (!form.montant || parseFloat(form.montant) < 1)
      errs.montant = 'Le montant doit être ≥ 1 F';
    if (!form.date_depense) errs.date_depense = 'La date est obligatoire';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validerForm()) return;

    const result = editingId
      ? await modifier(editingId, form)
      : await creer(form);

    if (result.success) {
      toast.success(result.message);

      if (editingId && result.depense) {
        // Mise à jour locale optimiste — évite un rechargement complet
        mettreAJourLocal(result.depense);
      } else {
        // Nouvelle dépense : rechargement pour recalculer les totaux
        chargerDonnees();
      }

      resetForm();
    } else {
      // Afficher les erreurs de validation côté serveur
      if (result.errors) {
        const premierMessage = Object.values(result.errors)[0]?.[0];
        toast.error(premierMessage || result.message);
      } else {
        toast.error(result.message);
      }
    }
  };

  const resetForm = () => {
    setForm(DEPENSE_FORM_VIDE);
    setEditingId(null);
    setFormErrors({});
    setShowForm(false);
  };

  const ouvrirEdition = (d: Depense) => {
    setForm({
      montant:      String(d.montant),
      date_depense: d.date_depense.slice(0, 10),
      description:  d.description,
      categorie:    d.categorie,
    });
    setEditingId(d.id);
    setFormErrors({});
    setShowForm(true);
    // Scroll vers le haut pour voir le formulaire
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer cette dépense définitivement ?')) return;

    // Suppression optimiste : retire de la liste avant la réponse serveur
    supprimerLocal(id);

    const result = await supprimer(id);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
      // En cas d'erreur, rechargement pour restaurer l'état correct
      chargerDonnees();
    }
  };

  // ─── Rendu ─────────────────────────────────────────────────────────────────

  const categories   = data?.categories   ?? {};
  const depenses     = data?.depenses.data ?? [];
  const totalPeriode = data?.total_periode ?? 0;
  const parCategorie = data?.par_categorie ?? [];
  const periodeLabel = data?.periode.label ?? '';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* ── En-tête ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestion des dépenses</h1>
          <p className="text-sm text-gray-500">
            {periodeLabel ? `Période : ${periodeLabel}` : 'Suivez vos dépenses par période'}
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(s => !s); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600
                     text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" />
          Nouvelle dépense
        </button>
      </div>

      {/* ── Formulaire ──────────────────────────────────────────────────── */}
      {showForm && (
        <div className="bg-white rounded-xl border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-700">
              {editingId ? 'Modifier la dépense' : 'Nouvelle dépense'}
            </h2>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Ex : Achat matériel bureau"
                className={`w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500
                  ${formErrors.description ? 'border-red-400' : ''}`}
              />
              {formErrors.description && (
                <p className="text-red-500 text-xs mt-1">{formErrors.description}</p>
              )}
            </div>

            {/* Montant */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Montant (F) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={form.montant}
                onChange={e => setForm(f => ({ ...f, montant: e.target.value }))}
                placeholder="Ex : 15000"
                className={`w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500
                  ${formErrors.montant ? 'border-red-400' : ''}`}
              />
              {formErrors.montant && (
                <p className="text-red-500 text-xs mt-1">{formErrors.montant}</p>
              )}
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.date_depense}
                max={new Date().toISOString().slice(0, 10)}
                onChange={e => setForm(f => ({ ...f, date_depense: e.target.value }))}
                className={`w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500
                  ${formErrors.date_depense ? 'border-red-400' : ''}`}
              />
              {formErrors.date_depense && (
                <p className="text-red-500 text-xs mt-1">{formErrors.date_depense}</p>
              )}
            </div>

            {/* Catégorie */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Catégorie
              </label>
              <select
                value={form.categorie}
                onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))}
                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(categories).length > 0
                  ? Object.entries(categories).map(([val, lab]) => (
                      <option key={val} value={val}>{lab as string}</option>
                    ))
                  : <option value="autre">Autre</option>
                }
              </select>
            </div>
          </div>

          <div className="flex gap-3 mt-5">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg
                         hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {submitting
                ? 'Enregistrement...'
                : editingId ? 'Mettre à jour' : 'Enregistrer'}
            </button>
            <button
              onClick={resetForm}
              className="px-5 py-2 border border-gray-300 text-gray-700
                         rounded-lg hover:bg-gray-50"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* ── Filtres ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border p-5 shadow-sm">
        <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-500" />
          Filtrer par période
        </h2>

        {/* Raccourcis rapides */}
        <div className="flex flex-wrap gap-2 mb-4">
          {(
            [
              { label: "Aujourd'hui", type: 'today' },
              { label: 'Cette semaine', type: 'week' },
              { label: 'Ce mois', type: 'month' },
              { label: 'Cette année', type: 'year' },
            ] as const
          ).map(({ label, type }) => {
            // Mettre en surbrillance le raccourci actif
            const { start, end } = bornesPeriode(type);
            const actif = startDate === start && endDate === end;
            return (
              <button
                key={type}
                onClick={() => appliquerRaccourci(type)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition
                  ${actif
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'text-gray-600 border-gray-300 hover:border-blue-500 hover:text-blue-600'
                  }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Sélection de dates manuelle */}
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
              Du
            </label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
              Au
            </label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={e => setEndDate(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filtre catégorie */}
          {Object.keys(categories).length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                Catégorie
              </label>
              <select
                value={categorieFil}
                onChange={e => setCategorieFil(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Toutes</option>
                {Object.entries(categories).map(([val, lab]) => (
                  <option key={val} value={val}>{lab as string}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={chargerDonnees}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white
                       rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>
      </div>

      {/* ── Total période ────────────────────────────────────────────────── */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-5
                      flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-100 rounded-full">
            <TrendingDown className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-red-700">Total dépenses</p>
            <p className="text-xs text-red-400">{periodeLabel}</p>
          </div>
        </div>
        <p className="text-3xl font-bold text-red-700">{formatMontant(totalPeriode)}</p>
      </div>

      {/* ── Répartition par catégorie (repliable) ────────────────────────── */}
      {parCategorie.length > 0 && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <button
            onClick={() => setShowCategories(s => !s)}
            className="w-full px-5 py-4 flex items-center justify-between
                       text-left hover:bg-gray-50 transition"
          >
            <span className="font-semibold text-gray-700 flex items-center gap-2">
              <Tag className="w-4 h-4 text-blue-500" />
              Répartition par catégorie
            </span>
            {showCategories
              ? <ChevronUp className="w-4 h-4 text-gray-400" />
              : <ChevronDown className="w-4 h-4 text-gray-400" />
            }
          </button>

          {showCategories && (
            <div className="px-5 pb-4 grid grid-cols-2 md:grid-cols-3 gap-3">
              {parCategorie.map(pc => {
                const pct = totalPeriode > 0
                  ? Math.round((pc.total / totalPeriode) * 100)
                  : 0;
                return (
                  <div key={pc.categorie}
                       className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">{pc.label}</p>
                    <p className="font-bold text-gray-800">{formatMontant(pc.total)}</p>
                    <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-1.5 bg-blue-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{pct}% · {pc.nombre} dépense(s)</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Tableau des dépenses ─────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b bg-gray-50 flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">
            Dépenses ({data?.depenses.total ?? 0})
          </h2>
          {loading && <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />}
        </div>

        {!loading && depenses.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <TrendingDown className="w-12 h-12 mx-auto mb-3 text-gray-200" />
            <p className="font-medium">Aucune dépense sur cette période</p>
            <p className="text-xs mt-1">Modifiez les dates ou ajoutez une dépense</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold
                                 text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold
                                 text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold
                                 text-gray-500 uppercase tracking-wider">
                    Catégorie
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold
                                 text-gray-500 uppercase tracking-wider">
                    Montant
                  </th>
                  <th className="px-5 py-3 text-center text-xs font-semibold
                                 text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {depenses.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50 transition-colors">

                    <td className="px-5 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {new Date(d.date_depense).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </td>

                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-gray-900">{d.description}</p>
                    </td>

                    <td className="px-5 py-3">
                      <span className="px-2 py-1 bg-gray-100 text-gray-600
                                       rounded-full text-xs">
                        {categories[d.categorie] ?? d.categorie}
                      </span>
                    </td>

                    <td className="px-5 py-3 text-right font-semibold
                                   text-red-600 text-sm whitespace-nowrap">
                      {formatMontant(Number(d.montant))}
                    </td>

                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => ouvrirEdition(d)}
                          className="text-blue-500 hover:text-blue-700 transition"
                          title="Modifier"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(d.id)}
                          className="text-red-500 hover:text-red-700 transition"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data && data.depenses.last_page > 1 && (
          <div className="px-5 py-4 border-t flex items-center justify-between text-sm">
            <p className="text-gray-500">
              Page {data.depenses.current_page} / {data.depenses.last_page}
            </p>
            <div className="flex gap-2">
              <button
                disabled={data.depenses.current_page === 1}
                onClick={() => charger({
                  start_date: startDate,
                  end_date:   endDate,
                  categorie:  categorieFil || undefined,
                  page:       data.depenses.current_page - 1,
                })}
                className="px-3 py-1.5 border rounded-lg text-gray-600
                           hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Préc.
              </button>
              <button
                disabled={data.depenses.current_page === data.depenses.last_page}
                onClick={() => charger({
                  start_date: startDate,
                  end_date:   endDate,
                  categorie:  categorieFil || undefined,
                  page:       data.depenses.current_page + 1,
                })}
                className="px-3 py-1.5 border rounded-lg text-gray-600
                           hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Suiv. →
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}