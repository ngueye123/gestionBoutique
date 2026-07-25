<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\SecuritySetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class SecuritySettingController extends Controller
{
    use RoleHelper;

    public function create_pin(Request $request)
    {
        if (!$this->canCreateCodePin()) {
            return response()->json(['message' => 'Non autorisé.'], 403);
        }

        $validated = $request->validate([
            'pin' => ['required', 'digits:4'],
        ]);

        SecuritySetting::updateOrCreate(
            ['id' => 1], // toujours la même ligne : création si absente, mise à jour sinon
            [
                'pin_hash'   => Hash::make($validated['pin']),
                'updated_by' => $request->user()->id,
            ]
        );

        return response()->json(['message' => 'Code PIN mis à jour avec succès.']);
    }
}