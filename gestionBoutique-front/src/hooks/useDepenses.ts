// src/hooks/useDepenses.ts

import { useState, useCallback } from 'react';
import { fetchWithAuth } from '../lib/fetchWithAuth';
import type {
  Depense,
  DepenseFormData,
  DepensesResponse,
  DepenseResponse,
  DepenseDeleteResponse,
  StatsAnnuellesResponse,
  FiltresDepenses,
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const DEPENSE_FORM_VIDE: DepenseFormData = {
  montant:      '',
  date_depense: (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  })(),
  description:  '',
  categorie:    'autre',
};

export function useDepenses() {
  const [data, setData]             = useState<DepensesResponse | null>(null);
  const [loading, setLoading]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  // ── Chargement liste ──────────────────────────────────────────────────────
  // Supporte les deux modes : plage de dates OU mois/année

  const charger = useCallback(async (
    filtres: FiltresDepenses
  ): Promise<DepensesResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      // Mode plage prioritaire sur mode mois
      if (filtres.start_date) params.set('start_date', filtres.start_date);
      if (filtres.end_date)   params.set('end_date',   filtres.end_date);

      // Mode mois (seulement si pas de plage)
      if (!filtres.start_date && !filtres.end_date) {
        if (filtres.mois)  params.set('mois',  String(filtres.mois));
        if (filtres.annee) params.set('annee', String(filtres.annee));
      }

      // Filtres communs
      if (filtres.categorie) params.set('categorie', filtres.categorie);
      if (filtres.page)      params.set('page',      String(filtres.page));

      const res  = await fetchWithAuth(`${API_URL}/depenses?${params}`);
      const json: DepensesResponse = await res.json();

      if (json.success) {
        setData(json);
      } else {
        setError('Erreur de chargement des dépenses');
      }

      return json;
    } catch {
      setError('Erreur réseau');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Création ──────────────────────────────────────────────────────────────

  const creer = useCallback(async (form: DepenseFormData): Promise<DepenseResponse> => {
    setSubmitting(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/depenses`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          montant:      parseFloat(form.montant),
          date_depense: form.date_depense,
          description:  form.description.trim(),
          categorie:    form.categorie,
        }),
      });
      return await res.json();
    } finally {
      setSubmitting(false);
    }
  }, []);

  // ── Mise à jour ───────────────────────────────────────────────────────────

  const modifier = useCallback(async (
    id: number,
    form: DepenseFormData
  ): Promise<DepenseResponse> => {
    setSubmitting(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/depenses/${id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          montant:      parseFloat(form.montant),
          date_depense: form.date_depense,
          description:  form.description.trim(),
          categorie:    form.categorie,
        }),
      });
      return await res.json();
    } finally {
      setSubmitting(false);
    }
  }, []);

  // ── Suppression ───────────────────────────────────────────────────────────

  const supprimer = useCallback(async (id: number): Promise<DepenseDeleteResponse> => {
    const res = await fetchWithAuth(`${API_URL}/depenses/${id}`, {
      method: 'DELETE',
    });
    return await res.json();
  }, []);

  // ── Stats annuelles ───────────────────────────────────────────────────────

  const chargerStatsAnnuelles = useCallback(async (
    annee: number
  ): Promise<StatsAnnuellesResponse> => {
    const res = await fetchWithAuth(
      `${API_URL}/depenses/stats-annuelles?annee=${annee}`
    );
    return await res.json();
  }, []);

  // ── Mise à jour locale après édition (évite un rechargement réseau) ───────

  const mettreAJourLocal = useCallback((depenseMaj: Depense) => {
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        depenses: {
          ...prev.depenses,
          data: prev.depenses.data.map(d =>
            d.id === depenseMaj.id ? depenseMaj : d
          ),
        },
      };
    });
  }, []);

  // ── Suppression locale (optimistic update) ────────────────────────────────

  const supprimerLocal = useCallback((id: number) => {
    setData(prev => {
      if (!prev) return prev;
      const supprimee     = prev.depenses.data.find(d => d.id === id);
      const montantRetire = supprimee ? Number(supprimee.montant) : 0;
      return {
        ...prev,
        total_mensuel: prev.total_mensuel - montantRetire,
        total_periode: prev.total_periode - montantRetire,
        depenses: {
          ...prev.depenses,
          data:  prev.depenses.data.filter(d => d.id !== id),
          total: prev.depenses.total - 1,
        },
      };
    });
  }, []);

  return {
    data,
    loading,
    submitting,
    error,
    charger,
    creer,
    modifier,
    supprimer,
    chargerStatsAnnuelles,
    mettreAJourLocal,
    supprimerLocal,
  };
}