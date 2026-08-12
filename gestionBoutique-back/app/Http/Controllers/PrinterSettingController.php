<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class PrinterSettingController extends Controller
{
    use RoleHelper;

    public function show()
    {
        $ownerId = $this->getOwnerId();
        $utilisateur = \App\Models\Utilisateur::findOrFail($ownerId);

        return response()->json([
            'thermal_printer_name' => $utilisateur->thermal_printer_name,
            'a4_printer_name' => $utilisateur->a4_printer_name,
        ]);
    }

    public function update(Request $request)
    {
        if (!$this->isPatron() && !$this->isEmployeAdmin()) {
            return $this->accessDeniedResponse('Seul le propriétaire ou un admin peut modifier les imprimantes');
        }

        $request->validate([
            'thermal_printer_name' => 'nullable|string|max:255',
            'a4_printer_name' => 'nullable|string|max:255',
        ]);

        $ownerId = $this->getOwnerId();
        $utilisateur = \App\Models\Utilisateur::findOrFail($ownerId);
        $utilisateur->update($request->only(['thermal_printer_name', 'a4_printer_name']));

        return response()->json(['success' => true]);
    }
}