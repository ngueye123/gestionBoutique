<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    // Paiement Wave (Sénégal) — abonnement SaaS.
    // Basculement sandbox/production via WAVE_SANDBOX + les clés correspondantes.
    'wave' => [
        'sandbox' => env('WAVE_SANDBOX', true),
        'api_key' => env('WAVE_SANDBOX', true)
            ? env('WAVE_API_KEY_SANDBOX')
            : env('WAVE_API_KEY_PRODUCTION'),
        'webhook_secret' => env('WAVE_SANDBOX', true)
            ? env('WAVE_WEBHOOK_SECRET_SANDBOX')
            : env('WAVE_WEBHOOK_SECRET_PRODUCTION'),
        'base_url' => env('WAVE_API_BASE_URL', 'https://api.wave.com'),
    ],

];
