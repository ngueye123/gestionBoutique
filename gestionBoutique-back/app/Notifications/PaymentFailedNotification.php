<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PaymentFailedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private readonly int $graceDaysRemaining)
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
            ->subject('Échec de paiement de votre abonnement')
            ->line('Le paiement de votre abonnement n\'a pas pu être confirmé.')
            ->line("Vous disposez encore de {$this->graceDaysRemaining} jour(s) pour régulariser votre situation avant suspension de l'accès.")
            ->action('Régulariser mon abonnement', $frontendUrl . '/parametres/abonnement')
            ->line('Merci de votre confiance.');
    }
}
