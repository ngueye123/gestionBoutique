<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Models\PriceOverride;
use App\Models\Product;
use App\Models\Utilisateur;

class PriceOverrideNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private PriceOverride $override,
        private Product $produit,
        private $employe
    ) {}

    public function via($notifiable): array
    {
        return ['mail'];
    }

    public function toMail($notifiable): MailMessage
    {
        $employeNom = trim((string) ($this->employe->prenom ?? '') . ' ' . (string) ($this->employe->nom ?? $this->employe->name ?? ''));
        $employeNom = $employeNom !== '' ? $employeNom : ($this->employe->name ?? '');

        $description = trim((string) ($this->override->justification ?? $this->override->description ?? ''));

        $mail = (new MailMessage)
            ->subject('Alerte : surcharge de prix sur une vente')
            ->line('Une surcharge de prix a été appliquée sur une vente.')
            ->line('Employé : ' . $employeNom)
            ->line('Produit : ' . ($this->produit->name ?? $this->produit->nom ?? ''))
            ->line('Prix normal : ' . ($this->override->prix_normal ?? $this->override->prixOriginal ?? '') . ' FCFA')
            ->line('Prix appliqué : ' . ($this->override->prix_applique ?? $this->override->prix_applique ?? '') . ' FCFA')
            ->line('Date : ' . ($this->override->created_at?->format('d/m/Y H:i') ?? ''));

        if ($description !== '') {
            $mail->line('Description : ' . $description);
        }

        return $mail;
    }
}