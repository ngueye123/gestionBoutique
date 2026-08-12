import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';
import { getApiErrorMessage } from '../lib/apiError';

const resetPasswordSchema = z.object({
  mot_de_passe: z.string()
    .min(6, 'Le mot de passe doit contenir au moins 6 caractères')
    .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
    .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre'),
  mot_de_passe_confirmation: z.string().min(6, 'Confirmation requise'),
}).refine((data) => data.mot_de_passe === data.mot_de_passe_confirmation, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['mot_de_passe_confirmation'],
});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const userType = searchParams.get('userType') === 'employe' ? 'employe' : 'patron';
  const userTypeLabel = userType === 'employe' ? 'Employé' : 'Patron';

  const onSubmit = async (data: ResetPasswordForm) => {
    const token = searchParams.get('token');
    const email = searchParams.get('email');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
    if (!token || !email) {
      toast.error('Lien invalide');
      return;
    }

    setLoading(true);
    try {
      const endpoint = userType === 'employe' ? '/employe/reset-password' : '/reset-password';
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          token,
          mot_de_passe: data.mot_de_passe,
          mot_de_passe_confirmation: data.mot_de_passe_confirmation,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Mot de passe réinitialisé avec succès !');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        toast.error(getApiErrorMessage(result, 'Impossible de réinitialiser le mot de passe.'));
      }
    } catch (error) {
      toast.error('Impossible de contacter le serveur pour réinitialiser le mot de passe.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold mb-2 text-center">Nouveau mot de passe</h1>
        <p className="text-gray-600 mb-2 text-center text-sm">
          Réinitialisation de mot de passe pour le compte {userTypeLabel.toLowerCase()}.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Nouveau mot de passe
            </label>
            <input
              type="password"
              {...register('mot_de_passe')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200"
              placeholder="••••••••"
            />
            {errors.mot_de_passe && (
              <p className="text-red-500 text-sm mt-1">{errors.mot_de_passe.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              {...register('mot_de_passe_confirmation')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200"
              placeholder="••••••••"
            />
            {errors.mot_de_passe_confirmation && (
              <p className="text-red-500 text-sm mt-1">
                {errors.mot_de_passe_confirmation.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ResetPassword;