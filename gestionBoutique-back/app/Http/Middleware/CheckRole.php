<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\Employe;

class CheckRole
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next, ...$roles)
    {
        $user = Auth::user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Utilisateur non authentifié'
            ], 401);
        }

        // Si c'est un patron (Utilisateur), il a accès à tout
        if (get_class($user) === 'App\Models\Utilisateur') {
            return $next($request);
        }

        // Si c'est un employé, vérifier son rôle
        if (get_class($user) === 'App\Models\Employe') {
            $userRole = $user->role;
            
            // Vérifier si l'employé a l'un des rôles autorisés
            if (in_array($userRole, $roles)) {
                return $next($request);
            }
            
            return response()->json([
                'success' => false,
                'message' => 'Accès refusé. Rôle insuffisant.'
            ], 403);
        }

        return response()->json([
            'success' => false,
            'message' => 'Type d\'utilisateur non reconnu'
        ], 403);
    }
}