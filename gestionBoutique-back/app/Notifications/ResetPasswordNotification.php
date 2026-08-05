<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;
use App\Models\Employe;

class ResetPasswordNotification extends Notification
{
    use Queueable;

    protected $token;

    public function __construct($token)
    {
        $this->token = $token;
    }

    public function via($notifiable)
    {
        return ['mail'];
    }

    public function toMail($notifiable)
    {
        $resetUrl = config('app.frontend_url') . '/reset-password?token=' . $this->token . '&email=' . urlencode($notifiable->email);
        if ($notifiable instanceof Employe) {
            $resetUrl .= '&userType=employe';
        }

        $notifiableName = trim((string) ($notifiable->prenom ?? '') . ' ' . (string) ($notifiable->nom ?? ''));
        if (!$notifiableName) {
            $notifiableName = $notifiable->email;
        }

        return (new MailMessage)
            ->subject('Réinitialisation de votre mot de passe')
            ->greeting('Bonjour ' . $notifiableName . ' !')
            ->line('Vous recevez cet email car nous avons reçu une demande de réinitialisation de mot de passe pour votre compte.')
            ->action('Réinitialiser mon mot de passe', $resetUrl)
            ->line('Ce lien expirera dans 60 minutes.')
            ->line('Si vous n\'avez pas demandé de réinitialisation, aucune action n\'est requise.')
            ->salutation('Cordialement, L\'équipe Gestion Boutique');
    }
}