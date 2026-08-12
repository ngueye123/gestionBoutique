import { useState, useCallback } from 'react';
import { fetchWithAuth } from '../lib/fetchWithAuth';
import { connectQzTray, printFacturePdf } from '../lib/qzTray';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface StatutAlerte {
  pourcentage: number;
  niveau: 'info' | 'warning' | 'critique' | 'danger' | null;
  label: string;
  attention: boolean;
}

export interface CaisseData {
  id: number;
  solde_actuel: number;
  plafond: number;
  est_bloquee: boolean;
}

export interface MouvementData {
  id: number;
  type: 'apport' | 'prelevement' | 'remboursement_dette' | 'depense' ;
  montant: number;
  solde_avant: number;
  solde_apres: number;
  note: string | null;
  ticket_reference: string | null;
  caissier?: string;
  created_at: string;
}

export interface BilanData {
  bilan_id: number;
  acteur: string;
  caisse_id: number;
  ticket_reference: string;
  solde_debut: number;
  total_entrees: number;
  total_sorties: number;
  solde_theorique: number;
  solde_reel: number;
  ecart: number;
  statut_ecart: 'equilibre' | 'surplus' | 'manquant';
  nombre_ventes: number;
  nombre_remboursements: number;
  nombre_prelevements: number;
}

export interface BilanHistorique extends BilanData {
  id: number;
  bilan_id: number;
  date_debut: string;
  date_fin: string;
  effectue_par: string;
  created_at: string;
}

export interface BloquageInfo {
  success: false;
  code: 'CAISSE_BLOQUEE';
  raison: 'bloquee_manuellement' | 'plafond_atteint' | 'plafond_depasse_par_operation';
  message: string;
  caisse: {
    solde_actuel: number;
    plafond: number;
    pourcentage: number;
    montant_operation: number;
    a_prelever: number;
  };
}

// ─── Helper : normalise une réponse qui peut être un tableau OU un objet paginé Laravel ─
// Avant la correction 6.2.2 : data.mouvements = MouvementData[]
// Après paginate() : data.mouvements = { data: MouvementData[], meta: {...}, links: {...} }
// Cette fonction accepte les deux formats et retourne toujours un tableau.
function extractArray<T>(value: T[] | { data: T[] } | null | undefined): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'object' && 'data' in value && Array.isArray(value.data)) return value.data;
  return [];
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useCaisse() {
  const [caisse, setCaisse]         = useState<CaisseData | null>(null);
  const [statut, setStatut]         = useState<StatutAlerte | null>(null);
  const [mouvements, setMouvements] = useState<MouvementData[]>([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  // ── Charger la caisse ─────────────────────────────────────────────────────

  const chargerMaCaisse = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetchWithAuth(`${API_URL}/caisse/moi`);
      const data = await res.json();
      if (data.success) {
        setCaisse(data.caisse);
        setStatut(data.statut);
        // Correction bug : data.mouvements peut être un objet paginé ou un tableau simple
        setMouvements(extractArray<MouvementData>(data.mouvements));
      }
      return data;
    } catch (e) {
      setError('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Mouvement (apport / prélèvement) ─────────────────────────────────────

  const effectuerMouvement = useCallback(async (
    type: 'apport' | 'prelevement',
    montant: number,
    note?: string
  ) => {
    const res  = await fetchWithAuth(`${API_URL}/caisse/mouvement`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, montant, note }),
    });
    const data = await res.json();
    if (data.success) {
      setCaisse(data.caisse);
      setStatut(data.statut);
      setMouvements(prev => [data.mouvement, ...prev]);
    }
    return data;
  }, []);

  // ── Télécharger ticket prélèvement ────────────────────────────────────────

  const telechargerTicket = useCallback(async (mouvementId: number, reference: string) => {
    const res  = await fetchWithAuth(`${API_URL}/caisse/ticket/${mouvementId}`);
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `Ticket_${reference}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // ── Imprimer ticket prélèvement (QZ Tray) ─────────────────────────────────

  const imprimerTicket = useCallback(async (mouvementId: number): Promise<{ success: boolean; error?: string }> => {
    try {
      const connected = await connectQzTray();
      if (!connected) return { success: false, error: 'QZ Tray non connecté' };

      const response = await fetchWithAuth(`${API_URL}/caisse/ticket/${mouvementId}/print-base64`);
      if (!response.ok) throw new Error('Erreur lors de la génération');
      const { pdfBase64 } = await response.json();

      const settingsRes = await fetchWithAuth(`${API_URL}/settings/printers`);
      const settings = await settingsRes.json();
      const printerName = settings.thermal_printer_name;

      if (!printerName) {
        return { success: false, error: 'Aucune imprimante configurée. Rendez-vous dans Paramètres > Imprimantes.' };
      }

      await printFacturePdf(pdfBase64, 'thermal', printerName);
      return { success: true };
    } catch (error) {
      console.error('Erreur impression ticket:', error);
      return { success: false, error: 'Impossible d\'imprimer le ticket' };
    }
  }, []);

  // ── Calculer bilan ────────────────────────────────────────────────────────

  const calculerBilan = useCallback(async (
    startDate: string,
    endDate: string,
    soldeReel: number
  ): Promise<{ success: boolean; bilans?: BilanData[]; message?: string }> => {
    const res = await fetchWithAuth(`${API_URL}/caisse/bilan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start_date: startDate, end_date: endDate, solde_reel: soldeReel }),
    });
    return res.json();
  }, []);

  // ── Télécharger ticket bilan ──────────────────────────────────────────────

  const telechargerTicketBilan = useCallback(async (bilanId: number, reference: string) => {
    const res  = await fetchWithAuth(`${API_URL}/caisse/bilan/ticket/${bilanId}`);
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `Bilan_${reference}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // ── Historique des bilans ─────────────────────────────────────────────────

  const chargerHistoriqueBilans = useCallback(async (filtres?: {
    caisse_id?: number;
    statut_ecart?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
  }) => {
    const params = new URLSearchParams();
    if (filtres?.caisse_id)    params.set('caisse_id',    String(filtres.caisse_id));
    if (filtres?.statut_ecart) params.set('statut_ecart', filtres.statut_ecart);
    if (filtres?.start_date)   params.set('start_date',   filtres.start_date);
    if (filtres?.end_date)     params.set('end_date',     filtres.end_date);
    if (filtres?.page)         params.set('page',         String(filtres.page));
    const res = await fetchWithAuth(`${API_URL}/caisse/bilans?${params}`);
    return res.json();
  }, []);

  return {
    caisse, statut, mouvements, loading, error,
    chargerMaCaisse,
    effectuerMouvement,
    telechargerTicket,
    imprimerTicket,
    calculerBilan,
    telechargerTicketBilan,
    chargerHistoriqueBilans,
    getPourcentage: () => statut?.pourcentage ?? 0,
  };
}