// src/hooks/useCaisse.ts
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { fetchWithAuth } from '../lib/fetchWithAuth';

export interface Caisse {
  id: number;
  employe_id: number | null;
  utilisateur_id: number;
  solde_actuel: number;
  plafond: number;
  est_bloquee: boolean;
}

export interface MouvementCaisse {
  id: number;
  caisse_id: number;
  type: 'vente' | 'apport' | 'prelevement';
  montant: number;
  solde_avant: number;
  solde_apres: number;
  note: string | null;
  ticket_reference: string | null;
  created_at: string;
}

export interface StatutCaisse {
  code: 'ok' | 'attention' | 'plafond_atteint' | 'bloquee';
  label: string;
  couleur: 'green' | 'orange' | 'red';
}

export interface CaisseState {
  caisse: Caisse | null;
  mouvements: MouvementCaisse[];
  statut: StatutCaisse | null;
  loading: boolean;
}

export interface BloquageInfo {
  code: 'CAISSE_BLOQUEE';
  raison: 'bloquee_manuellement' | 'plafond_atteint' | 'plafond_depasse_par_vente';
  message: string;
  caisse: {
    id: number;
    solde_actuel: number;
    plafond: number;
    montant_vente: number;
    a_prelever: number;
  };
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export function useCaisse() {
  const [state, setState] = useState<CaisseState>({
    caisse: null,
    mouvements: [],
    statut: null,
    loading: false,
  });

  // ─── Charger ma caisse ───────────────────────────────────────
  const chargerMaCaisse = useCallback(async () => {
    setState(s => ({ ...s, loading: true }));
    try {
      const resp = await fetchWithAuth(`${API_URL}/caisse/moi`);
      const data = await resp.json();
      if (data.success) {
        setState({
          caisse: data.caisse,
          mouvements: data.mouvements,
          statut: data.statut,
          loading: false,
        });
      }
    } catch {
      toast.error('Erreur lors du chargement de la caisse');
      setState(s => ({ ...s, loading: false }));
    }
  }, []);

  // ─── Effectuer un mouvement (apport / prélèvement) ──────────
  const effectuerMouvement = useCallback(async (
    type: 'apport' | 'prelevement',
    montant: number,
    note?: string,
  ): Promise<{ success: boolean; mouvement?: MouvementCaisse }> => {
    try {
      const resp = await fetchWithAuth(`${API_URL}/caisse/mouvement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, montant, note }),
      });

      const data = await resp.json();

      if (data.success) {
        setState(s => ({
          ...s,
          caisse: data.caisse,
          statut: data.statut,
          mouvements: [data.mouvement, ...s.mouvements],
        }));
        toast.success(data.message);
        return { success: true, mouvement: data.mouvement };
      } else {
        toast.error(data.message);
        return { success: false };
      }
    } catch {
      toast.error('Erreur lors du mouvement de caisse');
      return { success: false };
    }
  }, []);

  // ─── Télécharger le ticket de prélèvement ────────────────────
  const telechargerTicket = useCallback(async (mouvementId: number, reference: string) => {
    try {
      const resp = await fetchWithAuth(`${API_URL}/caisse/ticket/${mouvementId}`);
      if (!resp.ok) { toast.error('Erreur lors de la génération du ticket'); return; }

      const blob = await resp.blob();
      const url  = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href     = url;
      link.download = `Ticket_${reference}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Ticket téléchargé !');
    } catch {
      toast.error('Erreur lors du téléchargement du ticket');
    }
  }, []);

  // ─── Calculer le pourcentage du plafond ────────────────────
  const getPourcentage = useCallback((): number => {
    if (!state.caisse || state.caisse.plafond === 0) return 0;
    return Math.min(100, (state.caisse.solde_actuel / state.caisse.plafond) * 100);
  }, [state.caisse]);

  return {
    ...state,
    chargerMaCaisse,
    effectuerMouvement,
    telechargerTicket,
    getPourcentage,
  };
}