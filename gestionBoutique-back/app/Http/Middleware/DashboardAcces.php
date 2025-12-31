<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class DashboardAccess
{
    /**
     * Handle an incoming request.
     * Seuls les patrons et employés admin peuvent accéder au dashboard
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

        // Si c'est un patron (Utilisateur), il a accès
        if (get_class($user) === 'App\Models\Utilisateur') {
            return $next($request);
        }

        // Si c'est un employé admin, il a accès
        if (get_class($user) === 'App\Models\Employe' && $user->role === 'admin') {
            return $next($request);
        }

        // Sinon, accès refusé
        return response()->json([
            'success' => false,
            'message' => 'Accès refusé. Seuls les patrons et employés admin peuvent accéder au dashboard.'
        ], 403);
    }
}