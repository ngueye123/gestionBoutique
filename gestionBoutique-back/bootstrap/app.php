<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Validation\ValidationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Auth\Access\AuthorizationException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;
use Illuminate\Database\QueryException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
          $middleware->alias([
            'jwt.custom' => \App\Http\Middleware\JWTMiddleware::class,
            'patron.only'     => \App\Http\Middleware\PatronOnly::class,
            'check.role'      => \App\Http\Middleware\CheckRole::class,
            'dashboard.access'=> \App\Http\Middleware\DashboardAccess::class,
            'check.caisse'    => \App\Http\Middleware\CheckCaissePlafond::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {

        // ── Modèle non trouvé (findOrFail, firstOrFail...) ──────────────────
        $exceptions->render(function (ModelNotFoundException $e, $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ressource non trouvée.',
                ], 404);
            }
        });

        // ── Route inexistante (mauvaise URL) ─────────────────────────────────
        $exceptions->render(function (NotFoundHttpException $e, $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Endpoint non trouvé.',
                ], 404);
            }
        });

        // ── Méthode HTTP non autorisée (GET sur une route POST, etc.) ────────
        $exceptions->render(function (MethodNotAllowedHttpException $e, $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Méthode HTTP non autorisée pour cette route.',
                ], 405);
            }
        });

        // ── Erreurs de validation ($request->validate()) ─────────────────────
        $exceptions->render(function (ValidationException $e, $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Données invalides. Vérifiez les champs indiqués.',
                    'errors'  => $e->errors(),
                ], 422);
            }
        });

        // ── Non authentifié (token absent/invalide hors JWTMiddleware) ────────
        $exceptions->render(function (AuthenticationException $e, $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Non authentifié.',
                ], 401);
            }
        });

        // ── Accès refusé (abort(403, ...) ou policies) ────────────────────────
        $exceptions->render(function (AuthorizationException $e, $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage() ?: 'Accès refusé.',
                ], 403);
            }
        });

        // ── Erreurs SQL (contrainte unique violée, FK manquante, etc.) ────────
        $exceptions->render(function (QueryException $e, $request) {
            if ($request->is('api/*')) {
                // On ne remonte JAMAIS le message SQL brut au client (sécurité)
                report($e); // log complet côté serveur pour debug

                $sqlErrorCode = $e->errorInfo[1] ?? null;
                $message = 'Erreur lors de l\'accès aux données.';

                if ($sqlErrorCode === 1062) {
                    $message = 'Doublon détecté : une donnée identique existe déjà.';
                } elseif ($sqlErrorCode === 1451) {
                    $message = 'Impossible de supprimer cet élément car il est utilisé par d\'autres données.';
                } elseif ($sqlErrorCode === 1452) {
                    $message = 'Référence invalide : un enregistrement lié est introuvable.';
                }

                return response()->json([
                    'success' => false,
                    'message' => $message,
                ], 500);
            }
        });

        // ── Filet de sécurité final : toute autre exception non gérée ────────
        // Catch-all qui remplace les try/catch génériques dans les controllers
        $exceptions->render(function (\Throwable $e, $request) {
            if ($request->is('api/*')) {
                report($e); // log complet avec stack trace

                return response()->json([
                    'success' => false,
                    'message' => 'Une erreur inattendue est survenue. Veuillez réessayer plus tard.',
                    // 'debug' n'apparaît JAMAIS en production — uniquement en local
                    'debug' => config('app.debug') ? $e->getMessage() : null,
                ], 500);
            }
        });

    })->create();