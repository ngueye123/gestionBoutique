<?php

namespace App\Http\Controllers;

use App\Models\SecuritySetting;
use Illuminate\Http\Request;

class PinVerificationController extends Controller
{
    public function verify(Request $request)
    {
        $validated = $request->validate([
            'pin' => ['required', 'digits:4'],
        ]);

        $securitySetting = SecuritySetting::find(1);

        if (!$securitySetting || !$securitySetting->verifyPin($validated['pin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Code PIN incorrect.',
            ], 200); 
        }

        return response()->json([
            'success' => true,
            'message' => 'Code PIN valide.',
        ]);
    }
}
