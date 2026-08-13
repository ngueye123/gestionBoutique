<?php

namespace App\Console\Commands;

use App\Services\SubscriptionService;
use Illuminate\Console\Command;

class SendTrialEndingReminders extends Command
{
    protected $signature = 'subscriptions:send-trial-reminders';

    protected $description = 'Envoie les rappels J-3 et J-1 avant la fin de l\'essai gratuit.';

    public function __construct(private readonly SubscriptionService $subscriptionService)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $count = $this->subscriptionService->sendTrialReminders();

        $this->info("{$count} rappel(s) d'essai envoyé(s).");

        return self::SUCCESS;
    }
}
