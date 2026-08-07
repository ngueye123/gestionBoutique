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

        $pdf = $format === 'thermal'
            ? $this->buildThermalPdf($view, $data)
            : Pdf::loadView($view, $data)->setPaper('a4', 'portrait');

        $fileName = 'Facture_' . $vente->reference . '_' . $format . '.pdf';

        return $pdf->download($fileName);
    }

    /**
     * Prévisualiser la facture dans le navigateur (optionnel)
     * GET /api/ventes/{id}/facture/preview?format=a4|thermal
     */
    public function previewFacture(int $id, Request $request)
    {
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

        $pdf = $format === 'thermal'
            ? $this->buildThermalPdf($view, $data)
            : Pdf::loadView($view, $data)->setPaper('a4', 'portrait');

        return $pdf->stream('Facture_' . $vente->reference . '_' . $format . '.pdf');
    }

    /**
     * Génère le PDF thermique 58mm avec une hauteur de page calculée
     * à partir du contenu réel de la facture (dompdf ne supporte pas
     * @page { size: auto } et son API interne de mesure varie selon
     * les versions — on estime donc la hauteur nous-mêmes).
     */
    /**
     * Génère le PDF thermique 58mm avec une hauteur de page qui englobe
     * tout le contenu. dompdf ne supporte pas @page { size: auto } ; on
     * part d'une estimation, puis on vérifie le nombre de pages réel via
     * l'API stable du canvas (get_page_count()) et on agrandit si besoin
     * jusqu'à tenir sur une seule page.
     */
    private function buildThermalPdf(string $view, array $data)
    {
        $width = 165; // 58mm ≈ 164.4pt

        $heightMm = $this->estimateThermalHeightMm(
            $data['vente'],
            $data['boutique'],
            $data['ancienSolde'],
            $data['nouveauSolde']
        );

        $heightMm += 6; // marge de sécurité initiale

        $maxAttempts = 4;
        $incrementMm = 10;
        $pdf = null;

        for ($attempt = 0; $attempt < $maxAttempts; $attempt++) {
            $heightPt = $heightMm * 2.83465;

            $pdf = Pdf::loadView($view, $data);
            $pdf->setPaper([0, 0, $width, $heightPt], 'portrait');
            $pdf->render();

            $pageCount = $pdf->getDomPDF()->getCanvas()->get_page_count();

            if ($pageCount <= 1) {
                return $pdf;
            }

            // le contenu déborde sur une 2e page : on agrandit et on relance
            $heightMm += $incrementMm;
        }

        // sécurité : après plusieurs tentatives, on renvoie la dernière version
        // (au pire un peu de marge en trop, jamais de coupure)
        return $pdf;
    }

    /**
     * Estime, en millimètres, la hauteur qu'occupera le ticket thermique
     * en fonction de son contenu réel (nb de lignes, bloc client, dette...).
     * Les constantes reflètent les tailles/marges définies dans
     * factures.invoice_thermal.blade.php — à ajuster si ce template change.
     */
    private function estimateThermalHeightMm(Vente $vente, $boutique, ?float $ancienSolde, ?float $nouveauSolde): float
    {
        $mm = 0;

        // En-tête : nom boutique (+ adresse/tel éventuels)
        $mm += 6;
        if ($boutique->adresse_boutique) {
            $mm += 2.3;
        }
        if ($boutique->telephone_boutique) {
            $mm += 2.3;
        }

        // Titre FACTURE
        $mm += 8;

        // Bloc info (N°, Date, Mode, [Vendeur])
        $mm += 3;
        $mm += 3 * 2.3;
        if ($vente->employe) {
            $mm += 2.3;
        }

        // Bloc client
        if ($vente->client) {
            $mm += 3;
            $mm += 2 * 2.3; // nom + téléphone
            $mm += 2;

            if ($vente->moyen_paiement === 'dette' && $ancienSolde !== null && $nouveauSolde !== null) {
                $mm += 3;
                $mm += 2 * 1.8; // dette avant / cette facture
                $mm += 1.5;     // séparateur
                $mm += 1.8;     // nouvelle dette
            }
        }

        // Produits (format 2 lignes : nom, puis qty/prix + total)
        $mm += 3;
        foreach ($vente->details as $detail) {
            $mm += 2.3; // ligne nom
            $mm += 2.3; // ligne qty/prix + total
            if (mb_strlen($detail->nom_produit) > 22) {
                $mm += 2.3; // nom probablement sur 2 lignes
            }
        }

        // Totaux
        $mm += 2;
        $mm += 2.3; // sous-total
        if ($vente->moyen_paiement === 'especes') {
            $mm += 2.3; // reçu
            if ($vente->monnaie > 0) {
                $mm += 2.3; // monnaie
            }
        }
        $mm += 5; // ligne TOTAL

        // Pied de page
        $mm += 3.5;
        if ($vente->moyen_paiement === 'dette') {
            $mm += 2;
        }

        return $mm;
    }

    /**
     * Rechercher une vente par référence
     * GET /api/ventes/search?reference=VT-20260203-0001
     */
    public function searchByReference(Request $request)
    {
        $request->validate([
            'reference' => 'required|string'
        ]);

        $ownerId = $this->getOwnerId();
        $reference = $request->input('reference');

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
    }

    /**
     * Rechercher des ventes (avec autocomplétion)
     * GET /api/ventes/autocomplete?q=VT-2026
     */
    public function autocomplete(Request $request)
    {
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
    }
}