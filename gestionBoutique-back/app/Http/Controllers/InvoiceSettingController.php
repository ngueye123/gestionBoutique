<?php

namespace App\Http\Controllers;

use App\Models\Utilisateur;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class InvoiceSettingController extends Controller
{
    use RoleHelper;

    /**
     * GET /api/invoice-settings
     */
    public function show(): JsonResponse
    {
        $ownerId = $this->getOwnerId();
        $owner   = Utilisateur::find($ownerId);

        return response()->json([
            'success' => true,
            'default_format' => $owner->default_invoice_format ?? 'thermal',
        ]);
    }

    /**
     * PUT /api/invoice-settings (patron et admin uniquement)
     */
    public function update(Request $request): JsonResponse
    {
        if (!$this->isPatron() && !$this->isEmployeAdmin()) {
            return $this->accessDeniedResponse('Seul le propriétaire ou un admin peut modifier le format de facture par défaut');
        }

        $validated = $request->validate([
            'default_format' => 'required|in:a4,thermal',
        ]);

        $ownerId = $this->getOwnerId();
        $owner   = Utilisateur::findOrFail($ownerId);
        $owner->update(['default_invoice_format' => $validated['default_format']]);

        return response()->json([
            'success' => true,
            'message' => 'Format de facture par défaut mis à jour avec succès',
            'default_format' => $owner->default_invoice_format,
        ]);
    }
}
