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

        $data = $this->buildFactureData($vente, $format);

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

        $data = $this->buildFactureData($vente, $format);

        $view = $format === 'thermal' ? 'factures.invoice_thermal' : 'factures.invoice';

        $pdf = $format === 'thermal'
            ? $this->buildThermalPdf($view, $data)
            : Pdf::loadView($view, $data)->setPaper('a4', 'portrait');

        return $pdf->stream('Facture_' . $vente->reference . '_' . $format . '.pdf');
    }

    /**
     * Retourne le PDF en base64 pour impression silencieuse via QZ Tray
     * GET /api/ventes/{id}/facture/print-base64?format=a4|thermal
     */
    public function printBase64(int $id, Request $request)
    {
        $ownerId = $this->getOwnerId();
        $format = $request->input('format', 'thermal');

        $vente = Vente::with(['details', 'client', 'utilisateur', 'employe'])
            ->where('id', $id)
            ->where('utilisateur_id', $ownerId)
            ->firstOrFail();

        $data = $this->buildFactureData($vente, $format);

        $view = $format === 'thermal' ? 'factures.invoice_thermal' : 'factures.invoice';

        $pdf = $format === 'thermal'
            ? $this->buildThermalPdf($view, $data)
            : Pdf::loadView($view, $data)->setPaper('a4', 'portrait');

        return response()->json([
            'success' => true,
            'pdfBase64' => base64_encode($pdf->output()),
            'reference' => $vente->reference,
        ]);
    }
    /**
     * Prépare toutes les données pour la vue, y compris les lignes
     * pré-formatées en monospace pour le ticket thermique (voir
     * buildThermalTextLines()).
     */
    private function buildFactureData(Vente $vente, string $format): array
    {
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

        if ($format === 'thermal') {
            $data = array_merge($data, $this->buildThermalTextLines($vente, $ancienSolde, $nouveauSolde));
        }

        return $data;
    }

    /**
     * Construit les lignes de texte alignées en monospace (espaces calculés
     * en PHP) pour le ticket thermique. On évite volontairement le
     * text-align:right CSS combiné au gras sur police CID, qui déclenche un
     * bug de rendu chez dompdf (le dernier caractère du texte aligné à
     * droite disparaît, ou le contenu déborde de la page selon les cas).
     * En pré-formatant le texte nous-mêmes avec des espaces, l'alignement
     * ne dépend plus du moteur de layout de dompdf.
     */
    private function buildThermalTextLines(Vente $vente, ?float $ancienSolde, ?float $nouveauSolde): array
    {
        // Largeurs en caractères, calibrées pour chaque taille de police
        // utilisée (58mm ≈ 54mm de zone imprimable après padding).
        $PRODUCT_WIDTH = 46;   // police 6.5px
        $TOTALS_WIDTH = 42;    // police 7px
        $TOTAL_FINAL_WIDTH = 34; // police 9px (ligne TOTAL, plus grosse)
        $DEBT_WIDTH = 48;      // police 6px

        $productLines = [];
        foreach ($vente->details as $detail) {
            $qty = rtrim(rtrim(number_format($detail->quantite, 3, ',', ' '), '0'), ',');
            $qtyPrice = $qty . $detail->unite_vente . ' x ' . number_format($detail->prix_unitaire, 0, ',', ' ') . ' F/' . $detail->unite_prix;
            $total = number_format($detail->sous_total, 0, ',', ' ') . ' F';

            $productLines[] = $this->padLine(
                $detail->nom_produit . '  ' . $qtyPrice,
                $total,
                $PRODUCT_WIDTH
            );
        }

        $totalsLines = [];
        $totalsLines[] = $this->padLine('Sous-total:', number_format($vente->total, 0, ',', ' ') . ' F', $TOTALS_WIDTH);

        if ($vente->moyen_paiement === 'especes') {
            $totalsLines[] = $this->padLine('Reçu:', number_format($vente->montant_recu, 0, ',', ' ') . ' F', $TOTALS_WIDTH);
            if ($vente->monnaie > 0) {
                $totalsLines[] = $this->padLine('Monnaie:', number_format($vente->monnaie, 0, ',', ' ') . ' F', $TOTALS_WIDTH);
            }
        }

        $totalFinalLine = $this->padLine('TOTAL:', number_format($vente->total, 0, ',', ' ') . ' F', $TOTAL_FINAL_WIDTH);

        $debtLines = [];
        $debtFinalLine = null;

        if ($vente->moyen_paiement === 'dette' && $ancienSolde !== null && $nouveauSolde !== null) {
            $debtLines[] = $this->padLine('Dette avant:', number_format($ancienSolde, 0, ',', ' ') . ' F', $DEBT_WIDTH);
            $debtLines[] = $this->padLine('Cette facture:', number_format($vente->total, 0, ',', ' ') . ' F', $DEBT_WIDTH);
            $debtFinalLine = $this->padLine('NOUVELLE DETTE:', number_format($nouveauSolde, 0, ',', ' ') . ' F', $DEBT_WIDTH);
        }

        return [
            'productLines' => $productLines,
            'totalsLines' => $totalsLines,
            'totalFinalLine' => $totalFinalLine,
            'debtLines' => $debtLines,
            'debtFinalLine' => $debtFinalLine,
        ];
    }

    /**
     * Aligne $right à droite sur une ligne de $width caractères, en
     * remplissant l'espace restant après $left avec des espaces.
     * Garantit au moins 1 espace de séparation même si le contenu dépasse
     * la largeur prévue (cas rare : nom de produit très long).
     */
    private function padLine(string $left, string $right, int $width): string
    {
        $left = trim($left);
        $right = trim($right);

        $spaces = $width - mb_strlen($left) - mb_strlen($right);
        if ($spaces < 1) {
            $spaces = 1;
        }

        return $left . str_repeat(' ', $spaces) . $right;
    }

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

        $heightMm = $this->estimateThermalHeightMm($data);
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

            $heightMm += $incrementMm;
        }

        return $pdf;
    }

    /**
     * Estime, en millimètres, la hauteur qu'occupera le ticket thermique.
     * Sert de point de départ à buildThermalPdf() ; la boucle sur
     * get_page_count() corrige automatiquement toute sous-estimation.
     */
    private function estimateThermalHeightMm(array $data): float
    {
        $vente = $data['vente'];
        $boutique = $data['boutique'];

        $mm = 0;

        $mm += 6;
        if ($boutique->adresse_boutique) {
            $mm += 2.3;
        }
        if ($boutique->telephone_boutique) {
            $mm += 2.3;
        }

        $mm += 8; // titre FACTURE

        $mm += 3;
        $mm += 3 * 2.3;
        if ($vente->employe) {
            $mm += 2.3;
        }

        if ($vente->client) {
            $mm += 3;
            $mm += 2 * 2.3; // nom + téléphone

            if (!empty($data['debtLines'])) {
                $mm += 3; // titre CREDIT
                $mm += count($data['debtLines']) * 2;
                $mm += 2; // ligne NOUVELLE DETTE
            }

            $mm += 2;
        }

        $mm += 3;
        $mm += count($data['productLines'] ?? []) * 2.3; // 1 ligne par produit désormais

        $mm += 2;
        $mm += count($data['totalsLines'] ?? []) * 2.3;
        $mm += 5; // ligne TOTAL

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