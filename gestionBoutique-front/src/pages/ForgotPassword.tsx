import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { getApiErrorMessage } from '../lib/apiError';
import { Mail, ArrowLeft } from 'lucide-react';

const forgotPasswordSchema = z.object({
  email: z.string().email('Adresse email invalide'),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

function ForgotPassword() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [userType, setUserType] = useState<'patron' | 'employe'>(
    searchParams.get('userType') === 'employe' ? 'employe' : 'patron'
  );

  useEffect(() => {
    const param = searchParams.get('userType');
    if (param === 'employe' || param === 'patron') {
      setUserType(param);
    }
  }, [searchParams]);

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  });
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

  const onSubmit = async (data: ForgotPasswordForm) => {
    setLoading(true);
    try {
      const endpoint = userType === 'employe' ? '/employe/forgot-password' : '/forgot-password';
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        setEmailSent(true);
        toast.success(result.message);
      } else {
        toast.error(getApiErrorMessage(result, 'Impossible d\'envoyer le lien de réinitialisation.'));
      }
    } catch (error) {
      toast.error('Impossible de contacter le serveur pour envoyer l\'email.');
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-96 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Email envoyé !</h1>
          <p className="text-gray-600 mb-6">
            Consultez votre boîte email pour réinitialiser votre mot de passe.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center text-blue-500 hover:text-blue-600"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à la connexion
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-2 text-center">Mot de passe oublié</h1>
        <p className="text-gray-600 mb-4 text-center text-sm">
          Entrez votre email pour recevoir un lien de réinitialisation
        </p>

        <div className="flex gap-2 mb-4 justify-center">
          <button
            type="button"
            onClick={() => setUserType('patron')}
            className={`rounded-full px-4 py-2 text-sm ${userType === 'patron' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Patron
          </button>
          <button
            type="button"
            onClick={() => setUserType('employe')}
            className={`rounded-full px-4 py-2 text-sm ${userType === 'employe' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Employé
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              {...register('email')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200"
              placeholder="email@exemple.com"
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Envoi en cours...' : 'Envoyer le lien'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="inline-flex items-center text-sm text-blue-500 hover:text-blue-600"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;