<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;

class ContactController extends Controller
{
    /**
     * Reçoit un message du formulaire de contact de la page vitrine et le transmet par email.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'nom' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'telephone' => 'nullable|string|max:30',
            'message' => 'required|string|max:2000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Données invalides.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();
        $to = config('mail.contact_to') ?: config('mail.from.address');

        try {
            Mail::raw(
                "Nouveau message depuis la page de contact\n\n" .
                "Nom : {$data['nom']}\n" .
                "Email : {$data['email']}\n" .
                (!empty($data['telephone']) ? "Téléphone : {$data['telephone']}\n" : '') .
                "\nMessage :\n{$data['message']}",
                function ($mail) use ($to, $data) {
                    $mail->to($to)
                        ->subject('Nouveau message de contact - Gestion Boutique')
                        ->replyTo($data['email'], $data['nom']);
                }
            );
        } catch (\Throwable $e) {
            report($e);
            return response()->json([
                'success' => false,
                'message' => "Impossible d'envoyer le message pour le moment. Merci de réessayer plus tard.",
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Votre message a bien été envoyé. Nous vous répondrons rapidement.',
        ]);
    }
}
