<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PatronOnly
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next)
    {
        $user = Auth::user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Utilisateur non authentifié'
            ], 401);
        }

        // Seuls les patrons (Utilisateur) peuvent accéder à ces routes
        if (get_class($user) !== 'App\Models\Utilisateur') {
            return response()->json([
                'success' => false,
                'message' => 'Accès refusé. Seuls les patrons peuvent accéder à cette ressource.'
            ], 403);
        }

        return $next($request);
    }
}