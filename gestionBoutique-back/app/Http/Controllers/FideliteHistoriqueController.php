<?php

namespace App\Http\Controllers;

use App\Models\FideliteHistorique;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class FideliteHistoriqueController extends Controller
{
    use RoleHelper;

    /**
     * GET /api/clients/{client}/fidelite-historique
     */
    public function index(int $clientId): JsonResponse
    {
        $ownerId = $this->getOwnerId();

        $historiques = FideliteHistorique::where('utilisateur_id', $ownerId)
            ->where('client_id', $clientId)
            ->orderByDesc('annee')->orderByDesc('mois')
            ->get();

        return response()->json(['success' => true, 'historiques' => $historiques]);
    }

    /**
     * PATCH /api/fidelite/historique/{id}
     * Règle métier : patron, admin OU vendeur (pas caissier)
     */
    public function toggleConsomme(Request $request, int $id): JsonResponse
    {
        if (!($this->isPatron() || $this->isEmployeAdmin() || $this->isEmployeVendeur())) {
            return $this->accessDeniedResponse('Action réservée au patron, à un admin ou à un vendeur');
        }

        $validated = $request->validate(['est_consomme' => 'required|boolean']);
        $ownerId   = $this->getOwnerId();
        $actor     = $this->getAuthenticatedUser();

        $historique = FideliteHistorique::where('utilisateur_id', $ownerId)->findOrFail($id);

        $historique->update([
            'est_consomme' => $validated['est_consomme'],
            'consomme_par' => $validated['est_consomme'] ? $actor->id : null,
            'consomme_at'  => $validated['est_consomme'] ? now() : null,
        ]);

        return response()->json(['success' => true, 'message' => 'Statut mis à jour', 'historique' => $historique]);
    }
}