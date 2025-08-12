import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '../store/authStore';
import { User, Users } from 'lucide-react';
import { User as UserType } from '../types';

const loginSchema = z.object({
  email: z.string().email('Adresse email invalide'),
  mot_de_passe: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
});

type LoginForm = z.infer<typeof loginSchema>;

function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore(state => state.setAuth);
  const [userType, setUserType] = useState<'patron' | 'employe'>('patron');
  const [loading, setLoading] = useState(false);
  
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const endpoint = userType === 'patron' ? '/login' : '/employe/login';
      const response = await fetch(`http://localhost:8000/api${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        localStorage.setItem('token', result.token);
        localStorage.setItem('userType', userType);
        
        // Stocker les informations utilisateur selon le type
        if (userType === 'patron') {
          const patronUser: UserType = {
            id: result.user.id,
            nom: result.user.nom,
            prenom: result.user.prenom,
            email: result.user.email,
            user_type: 'patron'
          };
          setAuth(patronUser, result.token);
        } else {
          // Pour les employés, adapter les données au format User
          const employeUser: UserType = {
            id: result.employe.id,
            nom: result.employe.nom,
            prenom: '', // Les employés n'ont pas de prénom dans votre modèle
            email: result.employe.email,
            role: result.employe.role as 'admin' | 'vendeur' | 'caissier',
            user_type: 'employe',
            utilisateur_id: result.employe.utilisateur_id
          };
          setAuth(employeUser, result.token);
        }
        
        toast.success(`Connexion réussie en tant que ${userType}`);
        navigate('/');
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Erreur de connexion:', error);
      toast.error('Erreur lors de la connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-4">Connexion</h1>
          
          {/* Sélecteur de type d'utilisateur */}
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

          <div>
            <label className="block text-sm font-medium text-gray-700">Mot de passe</label>
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Connexion...' : `Se connecter en tant que ${userType}`}
          </button>
        </form>

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