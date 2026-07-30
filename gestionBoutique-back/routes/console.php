<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');


use Illuminate\Support\Facades\Schedule;

Schedule::command('fidelite:reset-mensuel')
    ->monthlyOn(1, '00:05')
    ->timezone('Africa/Dakar')
    ->onOneServer();