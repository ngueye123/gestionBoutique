<?php

namespace App\Console\Commands;

use App\Services\SubscriptionRenewalService;
use Illuminate\Console\Command;

class ProcessExpiredSubscriptions extends Command
{
    protected $signature = 'subscriptions:process-renewals';

    protected $description = 'Traite les abonnements expirés, les périodes de grâce et les relances Wave.';

    public function __construct(private readonly SubscriptionRenewalService $renewalService)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $result = $this->renewalService->processExpiredSubscriptions();

        $this->info(sprintf(
            'Renouvellements traités: active->past_due=%d, past_due->expired=%d, trialing->expired=%d',
            $result['active_to_past_due'],
            $result['past_due_to_expired'],
            $result['trialing_to_expired']
        ));

        return self::SUCCESS;
    }
}
