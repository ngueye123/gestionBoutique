<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SubscriptionExpiredNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private readonly string $cause)
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
            ->subject('Votre abonnement a expiré')
            ->line('Votre abonnement a expiré et l\'accès à l\'application est désormais suspendu.')
            ->line('Réactivez votre abonnement dès maintenant pour retrouver l\'accès à votre boutique.')
            ->action('Réactiver mon abonnement', $frontendUrl . '/parametres/abonnement')
            ->line('Merci de votre confiance.');
    }
}
