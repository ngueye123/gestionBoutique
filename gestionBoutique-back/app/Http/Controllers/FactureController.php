<?php

namespace App\Http\Controllers;

use App\Models\Vente;
use App\Models\Client;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Barryvdh\DomPDF\Facade\Pdf;

class FactureController extends Controller
{
    use RoleHelper;

    /**
     * Générer et télécharger la facture PDF pour une vente
     * GET /api/ventes/{id}/facture?format=a4|thermal
     */
    public function generateFacture(int $id, Request $request)
    {
        try {
            $ownerId = $this->getOwnerId();
            
            // Récupérer le format (a4 par défaut)
            $format = $request->input('format', 'a4');
            
            // Récupérer la vente avec ses relations
            $vente = Vente::with(['details', 'client', 'utilisateur', 'employe'])
                ->where('id', $id)
                ->where('utilisateur_id', $ownerId)
                ->firstOrFail();

            // Récupérer les informations de la boutique
            $boutique = $vente->utilisateur;
            
            // Calculer l'ancien solde pour les ventes à crédit
            $ancienSolde = null;
            $nouveauSolde = null;
            
            if ($vente->client_id && $vente->moyen_paiement === 'dette') {
                $client = $vente->client;
                // Ancien solde = solde actuel - montant de cette vente
                $ancienSolde = $client->solde_dette - $vente->total;
                $nouveauSolde = $client->solde_dette;
            }

            // Préparer les données pour la vue
            $data = [
                'vente' => $vente,
                'boutique' => $boutique,
                'ancienSolde' => $ancienSolde,
                'nouveauSolde' => $nouveauSolde,
                'format' => $format,
            ];

            // Choisir le template selon le format
            $view = $format === 'thermal' ? 'factures.invoice_thermal' : 'factures.invoice';

            // Générer le PDF
            $pdf = Pdf::loadView($view, $data);
            
            // Configurer le PDF selon le format
            if ($format === 'thermal') {
                // Format ticket thermique 58mm (165 points) de large
                $pdf->setPaper([0, 0, 165, 841], 'portrait'); // Hauteur variable
            } else {
                // Format A4 standard
                $pdf->setPaper('a4', 'portrait');
            }
            
            // Nom du fichier
            $fileName = 'Facture_' . $vente->reference . '_' . $format . '.pdf';
            
            // Retourner le PDF en téléchargement
            return $pdf->download($fileName);

        } catch (\Exception $e) {
            Log::error('Erreur génération facture: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la génération de la facture',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Prévisualiser la facture dans le navigateur (optionnel)
     * GET /api/ventes/{id}/facture/preview?format=a4|thermal
     */
    public function previewFacture(int $id, Request $request)
    {
        try {
            $ownerId = $this->getOwnerId();
            $format = $request->input('format', 'a4');
            
            $vente = Vente::with(['details', 'client', 'utilisateur', 'employe'])
                ->where('id', $id)
                ->where('utilisateur_id', $ownerId)
                ->firstOrFail();

            $boutique = $vente->utilisateur;
            
            $ancienSolde = null;
            $nouveauSolde = null;
            
            if ($vente->client_id && $vente->moyen_paiement === 'dette') {
                $client = $vente->client;
                $ancienSolde = $client->solde_dette - $vente->total;
                $nouveauSolde = $client->solde_dette;
            }

            $data = [
                'vente' => $vente,
                'boutique' => $boutique,
                'ancienSolde' => $ancienSolde,
                'nouveauSolde' => $nouveauSolde,
                'format' => $format,
            ];

            $view = $format === 'thermal' ? 'factures.invoice_thermal' : 'factures.invoice';
            $pdf = Pdf::loadView($view, $data);
            
            if ($format === 'thermal') {
                $pdf->setPaper([0, 0, 165, 841], 'portrait');
            } else {
                $pdf->setPaper('a4', 'portrait');
            }
            
            // Afficher dans le navigateur au lieu de télécharger
            return $pdf->stream('Facture_' . $vente->reference . '_' . $format . '.pdf');

        } catch (\Exception $e) {
            Log::error('Erreur prévisualisation facture: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la prévisualisation',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Rechercher une vente par référence
     * GET /api/ventes/search?reference=VT-20260203-0001
     */
    public function searchByReference(Request $request)
    {
        try {
            $request->validate([
                'reference' => 'required|string'
            ]);

            $ownerId = $this->getOwnerId();
            $reference = $request->input('reference');

            // Rechercher la vente
            $vente = Vente::with(['details', 'client', 'employe'])
                ->where('reference', $reference)
                ->where('utilisateur_id', $ownerId)
                ->first();

            if (!$vente) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucune vente trouvée avec cette référence'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'vente' => $vente
            ]);

        } catch (\Exception $e) {
            Log::error('Erreur recherche vente: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la recherche',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Rechercher des ventes (avec autocomplétion)
     * GET /api/ventes/autocomplete?q=VT-2026
     */
    public function autocomplete(Request $request)
    {
        try {
            $query = $request->input('q', '');
            
            if (strlen($query) < 3) {
                return response()->json([
                    'success' => true,
                    'ventes' => []
                ]);
            }

            $ownerId = $this->getOwnerId();

            $ventes = Vente::where('utilisateur_id', $ownerId)
                ->where('reference', 'LIKE', "%{$query}%")
                ->select('id', 'reference', 'total', 'moyen_paiement', 'created_at')
                ->orderBy('created_at', 'desc')
                ->limit(10)
                ->get();

            return response()->json([
                'success' => true,
                'ventes' => $ventes
            ]);

        } catch (\Exception $e) {
            Log::error('Erreur autocomplétion ventes: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la recherche',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}