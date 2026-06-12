<?php
// app/Notifications/VerifyEmployeEmailNotification.php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;

class VerifyEmployeEmailNotification extends Notification
{
    use Queueable;

    protected string $token;
    protected string $nomPatron; // Pour personnaliser le message

    public function __construct(string $token, string $nomPatron = '')
    {
        $this->token     = $token;
        $this->nomPatron = $nomPatron;
    }

    public function via($notifiable): array
    {
        return ['mail'];
    }

    public function toMail($notifiable): MailMessage
    {
        // Construction de l'URL de vérification pointant vers le frontend
        $verificationUrl = config('app.frontend_url')
            . '/employe/verify-email?token=' . $this->token
            . '&email=' . urlencode($notifiable->email);

        return (new MailMessage)
            ->subject('Vérification de votre adresse email — ' . config('app.name'))
            ->greeting('Bonjour ' . $notifiable->nom . ' !')
            ->line(
                $this->nomPatron
                    ? "Votre patron ({$this->nomPatron}) vous a créé un compte employé."
                    : 'Un compte employé vient d\'être créé pour vous.'
            )
            ->line('Veuillez cliquer sur le bouton ci-dessous pour vérifier votre adresse email et activer votre compte.')
            ->action('Vérifier mon email', $verificationUrl)
            ->line('Ce lien expirera dans 48 heures.')
            ->line('Si vous n\'attendiez pas ce message, ignorez cet email.')
            ->salutation('Cordialement, L\'équipe ' . config('app.name'));
    }
}