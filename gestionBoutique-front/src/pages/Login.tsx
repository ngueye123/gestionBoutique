import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '../store/authStore';
import { User, Users } from 'lucide-react';
import { PatronUser, EmployeUser } from '../types';
import ResendVerification from '../components/ResendVerification';
import { PasswordInput } from '../components/PasswordInput';

const loginSchema = z.object({
  email: z.string().email('Adresse email invalide'),
  mot_de_passe: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
});

type LoginForm = z.infer<typeof loginSchema>;

// Détermine la route d'accueil selon le rôle
function getRedirectPath(userType: 'patron' | 'employe', role?: string): string {
  if (userType === 'patron') return '/';
  if (role === 'admin') return '/';
  // vendeur et caissier → Point de Vente directement
  return '/pos';
}

function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore(state => state.setAuth);
  const [userType, setUserType] = useState<'patron' | 'employe'>('patron');
  const [loading, setLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const endpoint = userType === 'patron' ? '/login' : '/employe/login';
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      // Vérifier que la réponse est bien du JSON avant de parser
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Réponse inattendue du serveur (${response.status}). Vérifiez la configuration API.`);
      }

      const result = await response.json();

      if (result.success) {
        if (userType === 'patron') {
          const patronUser: PatronUser = {
            id: result.user.id,
            nom: result.user.nom,
            prenom: result.user.prenom,
            email: result.user.email,
            user_type: 'patron',
            email_verified: result.user.email_verified,
          };
          setAuth(patronUser, result.token);
          toast.success('Connexion réussie');
          navigate(getRedirectPath('patron'), { replace: true });
        } else {
          const employeUser: EmployeUser = {
            id: result.employe.id,
            nom: result.employe.nom,
            prenom: result.employe.prenom || '',
            email: result.employe.email,
            role: result.employe.role as 'admin' | 'vendeur' | 'caissier',
            user_type: 'employe',
            utilisateur_id: result.employe.utilisateur_id,
          };
          setAuth(employeUser, result.token);
          toast.success('Connexion réussie');
          navigate(getRedirectPath('employe', result.employe.role), { replace: true });
        }
      } else {
        if (result.email_verified === false) {
          setUnverifiedEmail(data.email);
        }
        toast.error(result.message || 'Identifiants invalides');
      }
    } catch (error: any) {
      console.error('Erreur de connexion:', error);
      toast.error(error.message || 'Erreur lors de la connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-4">Connexion</h1>

          <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
            <button
              type="button"
              onClick={() => setUserType('patron')}
              className={`flex-1 flex items-center justify-center py-2 px-4 rounded-md transition-colors ${
                userType === 'patron'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <User className="w-4 h-4 mr-2" />
              Patron
            </button>
            <button
              type="button"
              onClick={() => setUserType('employe')}
              className={`flex-1 flex items-center justify-center py-2 px-4 rounded-md transition-colors ${
                userType === 'employe'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Users className="w-4 h-4 mr-2" />
              Employé
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              {...register('email')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200"
              placeholder={userType === 'patron' ? 'email@patron.com' : 'email@employe.com'}
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>

          <PasswordInput
            label="Mot de passe"
            name="mot_de_passe"
            register={register('mot_de_passe')}
            placeholder="••••••••"
            error={errors.mot_de_passe?.message}
          />

          {userType === 'patron' && (
            <div className="text-right">
              <Link to="/forgot-password" className="text-sm text-blue-500 hover:text-blue-600">
                Mot de passe oublié ?
              </Link>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Connexion...' : `Se connecter en tant que ${userType}`}
          </button>
        </form>

        {unverifiedEmail && userType === 'patron' && (
          <ResendVerification email={unverifiedEmail} />
        )}

        {userType === 'patron' && (
          <p className="mt-4 text-center text-sm text-gray-600">
            Vous n'avez pas de compte ?{' '}
            <Link to="/register" className="text-blue-500 hover:text-blue-600">
              S'inscrire
            </Link>
          </p>
        )}

        {userType === 'employe' && (
          <p className="mt-4 text-center text-sm text-gray-600">
            Contactez votre patron pour obtenir vos identifiants d'employé
          </p>
        )}
      </div>
    </div>
  );
}

export default Login;