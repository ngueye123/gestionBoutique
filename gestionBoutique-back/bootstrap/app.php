<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {

        // ✅ Enregistrement des alias ici (remplace Kernel.php)
        $middleware->alias([
            'jwt.custom' => \App\Http\Middleware\JWTMiddleware::class,
            'patron.only'     => \App\Http\Middleware\PatronOnly::class,
            'check.role'      => \App\Http\Middleware\CheckRole::class,
            'dashboard.access'=> \App\Http\Middleware\DashboardAccess::class,
            'check.caisse'    => \App\Http\Middleware\CheckCaissePlafond::class,
        ]);

    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();