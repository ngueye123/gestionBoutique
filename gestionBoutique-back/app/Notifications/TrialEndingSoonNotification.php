<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TrialEndingSoonNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private readonly int $joursRestants)
    {
    }

    public function via($notifiable): array
    {
        return ['mail'];
    }

    public function toMail($notifiable): MailMessage
    {
        $frontendUrl = config('app.frontend_url');

        return (new MailMessage)
            ->subject('Votre période d\'essai se termine bientôt')
            ->line("Votre période d'essai gratuite se termine dans {$this->joursRestants} jour(s).")
            ->line('Pour continuer à utiliser l\'application sans interruption, activez votre abonnement.')
            ->action('Gérer mon abonnement', $frontendUrl . '/parametres/abonnement')
            ->line('Merci de votre confiance.');
    }
}
