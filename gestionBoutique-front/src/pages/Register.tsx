import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { PasswordInput } from '../components/PasswordInput';
import { CheckCircle, Mail, Store } from 'lucide-react';

const registerSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis'),
  prenom: z.string().min(1, 'Le prénom est requis'),
  email: z.string().email('Adresse email invalide'),
  mot_de_passe: z.string()
    .min(6, 'Le mot de passe doit contenir au moins 6 caractères')
    .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
    .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre'),
  mot_de_passe_confirmation: z.string(),
  nom_boutique: z.string().min(1, 'Le nom de la boutique est requis'),
  adresse_boutique: z.string().min(1, 'L\'adresse de la boutique est requise'),
  telephone_boutique: z.string().min(1, 'Le téléphone de la boutique est requis'),
}).refine((data) => data.mot_de_passe === data.mot_de_passe_confirmation, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['mot_de_passe_confirmation'],
});

type RegisterForm = z.infer<typeof registerSchema>;

function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  
  const { register, handleSubmit, formState: { errors }, watch } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
  const password = watch('mot_de_passe', '');

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: data.nom,
          prenom: data.prenom,
          email: data.email,
          mot_de_passe: data.mot_de_passe,
          nom_boutique: data.nom_boutique,
          adresse_boutique: data.adresse_boutique,
          telephone_boutique: data.telephone_boutique,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setRegistered(true);
        toast.success('Inscription réussie !');
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Une erreur est survenue lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  // Affichage après inscription réussie
  if (registered) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-96 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2 text-green-600">Inscription réussie !</h1>
          <div className="mb-6">
            <Mail className="w-12 h-12 text-blue-500 mx-auto mb-2" />
            <p className="text-gray-600 mb-4">
              Un email de vérification a été envoyé à votre adresse.
            </p>
            <p className="text-sm text-gray-500">
              Veuillez consulter votre boîte mail et cliquer sur le lien de vérification pour activer votre compte.
            </p>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
          >
            Aller à la connexion
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-8">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-2xl">
        <div className="text-center mb-6">
          <Store className="w-12 h-12 text-blue-600 mx-auto mb-3" />
          <h1 className="text-2xl font-bold mb-2">Créer un compte</h1>
          <p className="text-gray-600 text-sm">
            Inscrivez-vous pour gérer votre boutique
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Section Informations personnelles */}
          <div className="border-b pb-4">
            <h2 className="text-lg font-semibold text-gray-700 mb-3">Informations personnelles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Prénom */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prénom *
                </label>
                <input
                  type="text"
                  {...register('prenom')}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200"
                  placeholder="Jean"
                />
                {errors.prenom && (
                  <p className="text-red-500 text-sm mt-1">{errors.prenom.message}</p>
                )}
              </div>

              {/* Nom */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom *
                </label>
                <input
                  type="text"
                  {...register('nom')}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200"
                  placeholder="Dupont"
                />
                {errors.nom && (
                  <p className="text-red-500 text-sm mt-1">{errors.nom.message}</p>
                )}
              </div>

              {/* Email */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  {...register('email')}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200"
                  placeholder="jean.dupont@exemple.com"
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section Informations boutique */}
          <div className="border-b pb-4">
            <h2 className="text-lg font-semibold text-gray-700 mb-3 flex items-center">
              <Store className="w-5 h-5 mr-2 text-blue-600" />
              Informations de la boutique
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {/* Nom de la boutique */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de la boutique *
                </label>
                <input
                  type="text"
                  {...register('nom_boutique')}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200"
                  placeholder="Ma Boutique"
                />
                {errors.nom_boutique && (
                  <p className="text-red-500 text-sm mt-1">{errors.nom_boutique.message}</p>
                )}
              </div>

              {/* Adresse */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse de la boutique *
                </label>
                <input
                  type="text"
                  {...register('adresse_boutique')}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200"
                  placeholder="123 Rue Principale, Ville, Pays"
                />
                {errors.adresse_boutique && (
                  <p className="text-red-500 text-sm mt-1">{errors.adresse_boutique.message}</p>
                )}
              </div>

              {/* Téléphone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone de la boutique *
                </label>
                <input
                  type="tel"
                  {...register('telephone_boutique')}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200"
                  placeholder="+221 XX XXX XX XX"
                />
                {errors.telephone_boutique && (
                  <p className="text-red-500 text-sm mt-1">{errors.telephone_boutique.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section Sécurité */}
          <div className="pb-4">
            <h2 className="text-lg font-semibold text-gray-700 mb-3">Sécurité</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Mot de passe */}
              <div>
                <PasswordInput
                  label="Mot de passe *"
                  name="mot_de_passe"
                  register={register('mot_de_passe')}
                  error={errors.mot_de_passe?.message}
                  placeholder="Au moins 6 caractères"
                />

                {/* Force du mot de passe */}
                {password && (
                  <div className="mt-2 space-y-1">
                    <div className="text-xs text-gray-600">Force du mot de passe :</div>
                    <div className="flex space-x-1">
                      <div className={`h-1 flex-1 rounded ${password.length >= 6 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <div className={`h-1 flex-1 rounded ${/[A-Z]/.test(password) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <div className={`h-1 flex-1 rounded ${/[0-9]/.test(password) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirmation */}
              <div>
                <PasswordInput
                  label="Confirmer le mot de passe *"
                  name="mot_de_passe_confirmation"
                  register={register('mot_de_passe_confirmation')}
                  error={errors.mot_de_passe_confirmation?.message}
                  placeholder="Confirmez votre mot de passe"
                />
              </div>
            </div>

            {password && (
              <div className="mt-3 text-xs text-gray-500 space-y-0.5">
                <div className={password.length >= 6 ? 'text-green-600' : ''}>
                  ✓ Au moins 6 caractères
                </div>
                <div className={/[A-Z]/.test(password) ? 'text-green-600' : ''}>
                  ✓ Une lettre majuscule
                </div>
                <div className={/[0-9]/.test(password) ? 'text-green-600' : ''}>
                  ✓ Un chiffre
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-3 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Inscription en cours...' : 'S\'inscrire'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Vous avez déjà un compte ?{' '}
          <Link to="/login" className="text-blue-500 hover:text-blue-600 font-medium">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;