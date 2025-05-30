<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class Cors
{
    public function handle(Request $request, Closure $next)
    {
        // Vérifie l'environnement pour autoriser uniquement certaines origines
        $allowedOrigins = [
            'http://localhost:8000',  // Frontend en développement local
            // Ajoute ici d'autres origines autorisées pour la production
        ];

        $origin = $request->header('Origin');
        
        // Vérifie si l'origine de la requête est dans la liste autorisée
        if (in_array($origin, $allowedOrigins)) {
            return $next($request)
                ->header('Access-Control-Allow-Origin', $origin)  // Accepte l'origine spécifique
                ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
                ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
                ->header('Access-Control-Allow-Credentials', 'true');  // Si tu utilises des cookies ou une authentification
        }

        return $next($request); // Refuse si l'origine n'est pas autorisée
    }
}
