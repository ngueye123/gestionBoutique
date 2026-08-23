import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '../store/authStore';
import {
  User, Users, Mail, Store, PlayCircle, Phone, CheckCircle2,
  ShoppingCart, Package, Wallet, Heart, BarChart3,
} from 'lucide-react';
import { PatronUser, EmployeUser } from '../types';
import ResendVerification from '../components/ResendVerification';
import { PasswordInput } from '../components/PasswordInput';
import DemoModal from '../components/landing/DemoModal';
import ContactForm from '../components/landing/ContactForm';

const CONTACT_PHONE = import.meta.env.VITE_CONTACT_PHONE || '+221 77 477 07 40';

const FEATURES = [
  {
    icon: ShoppingCart,
    title: 'Point de vente rapide',
    description: 'Encaissez vos clients en quelques secondes avec calcul automatique du rendu monnaie.',
  },
  {
    icon: Package,
    title: 'Gestion des stocks',
    description: 'Suivez vos quantités en temps réel et évitez les ruptures de stock.',
  },
  {
    icon: Wallet,
    title: 'Suivi de caisse',
    description: 'Ouvertures, clôtures et bilans de caisse automatisés pour chaque employé.',
  },
  {
    icon: Heart,
    title: 'Fidélité clients',
    description: 'Récompensez vos clients réguliers avec un programme de points cumulables.',
  },
  {
    icon: BarChart3,
    title: 'Rapports & statistiques',
    description: 'Visualisez vos ventes, dépenses et performances pour piloter votre activité.',
  },
  {
    icon: Users,
    title: 'Multi-utilisateurs',
    description: 'Gérez plusieurs employés avec des rôles et permissions adaptés à chacun.',
  },
];
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
  const [unverifiedEmployeEmail, setUnverifiedEmployeEmail] = useState<string | null>(null);
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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
        if (!result.success) {
          // Cas email non vérifié pour l'employé
          if (result.email_verified === false && userType === 'employe') {
            setUnverifiedEmployeEmail(data.email);
          }
          // Cas email non vérifié pour le patron 
          if (result.email_verified === false && userType === 'patron') {
            setUnverifiedEmail(data.email);
          }
          toast.error(result.message || 'Identifiants invalides');
        }
      }
    } catch (error: any) {
      console.error('Erreur de connexion:', error);
      toast.error(error.message || 'Erreur lors de la connexion');
    } finally {
      setLoading(false);
    }


  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-white">
      {/* Barre de navigation */}
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <Store className="h-6 w-6 text-blue-600" />
            <span className="text-lg font-bold text-gray-900">Gestion Boutique</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm font-medium text-gray-600 md:flex">
            <button onClick={() => scrollToSection('fonctionnalites')} className="hover:text-blue-600 transition-colors">
              Fonctionnalités
            </button>
            <button onClick={() => scrollToSection('demo')} className="hover:text-blue-600 transition-colors">
              Démo
            </button>
            <button onClick={() => scrollToSection('contact')} className="hover:text-blue-600 transition-colors">
              Contact
            </button>
          </nav>
          <button
            onClick={() => scrollToSection('connexion')}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Se connecter
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
        {/* Section d'accueil : présentation + connexion */}
        <section id="accueil" className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
          <div className="order-2 md:order-1">
            <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
              Solution de gestion pour commerces
            </span>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight text-gray-900 sm:text-4xl">
              Gérez votre boutique simplement, du stock à la caisse
            </h1>
            <p className="mt-4 text-base leading-relaxed text-gray-600">
              Gestion Boutique centralise vos ventes, vos stocks, votre caisse et vos employés
              dans une seule application simple et rapide, pensée pour les commerces au quotidien.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => setIsDemoOpen(true)}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 transition-colors"
              >
                <PlayCircle className="h-5 w-5" />
                Voir la démo
              </button>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-5 py-2.5 font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Créer un compte
              </Link>
            </div>

            <ul className="mt-8 space-y-2">
              {['Point de vente rapide et intuitif', 'Suivi de caisse et des stocks en temps réel', 'Gestion multi-employés avec rôles'].map(item => (
                <li key={item} className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div id="connexion" className="order-1 scroll-mt-24 md:order-2">
            <div className="mx-auto w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 shadow-xl">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-4">Connexion</h2>

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

                <div className="text-right">
                  <Link
                    to={userType === 'employe' ? '/forgot-password?userType=employe' : '/forgot-password'}
                    className="text-sm text-blue-500 hover:text-blue-600"
                  >
                    Mot de passe oublié ?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed"
                >
                  {loading ? 'Connexion...' : `Se connecter en tant que ${userType}`}
                </button>
              </form>

              {unverifiedEmployeEmail && userType === 'employe' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                  <div className="flex items-start">
                    <Mail className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h3 className="text-sm font-medium text-yellow-800">
                        Email non vérifié
                      </h3>
                      <p className="text-sm text-yellow-700 mt-1">
                        Votre compte n'est pas encore activé. Consultez votre boîte mail
                        ({unverifiedEmployeEmail}) et cliquez sur le lien de vérification.
                      </p>
                      <p className="text-xs text-yellow-600 mt-2">
                        Si vous n'avez pas reçu l'email, demandez à votre patron de renvoyer
                        le lien depuis la page Employés.
                      </p>
                    </div>
                  </div>
                </div>
              )}

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
        </section>

        {/* Fonctionnalités */}
        <section id="fonctionnalites" className="scroll-mt-20 py-20">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Tout ce qu'il faut pour piloter votre boutique
            </h2>
            <p className="mt-2 text-gray-600">
              Une application complète, conçue pour les commerçants et leurs équipes.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-gray-900">{title}</h3>
                <p className="mt-1.5 text-sm text-gray-600">{description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Démo */}
        <section id="demo" className="scroll-mt-20 py-10">
          <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 px-6 py-12 text-center text-white sm:px-16">
            <h2 className="text-2xl font-bold sm:text-3xl">Découvrez l'application en images</h2>
            <p className="mx-auto mt-2 max-w-xl text-blue-100">
              Parcourez un aperçu guidé des principales fonctionnalités : point de vente, stocks,
              caisse, fidélité et rapports.
            </p>
            <button
              onClick={() => setIsDemoOpen(true)}
              className="mt-6 inline-flex items-center gap-2 rounded-md bg-white px-6 py-3 font-medium text-blue-700 hover:bg-blue-50 transition-colors"
            >
              <PlayCircle className="h-5 w-5" />
              Lire la démo
            </button>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="scroll-mt-20 py-20">
          <div className="grid gap-10 md:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Une question ? Un problème ?</h2>
              <p className="mt-3 text-gray-600">
                Notre équipe est disponible pour vous accompagner dans l'utilisation de
                l'application ou répondre à vos questions.
              </p>

              <a
                href={`tel:${CONTACT_PHONE.replace(/\s+/g, '')}`}
                className="mt-6 inline-flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <Phone className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-xs uppercase tracking-wide text-gray-500">Appelez-nous</span>
                  <span className="block font-semibold text-gray-900">{CONTACT_PHONE}</span>
                </span>
              </a>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Envoyez-nous un message</h3>
              <ContactForm />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-100 bg-white py-6 text-center text-sm text-gray-500">
        <p>© {new Date().getFullYear()} Gestion Boutique · {CONTACT_PHONE}</p>
      </footer>

      <DemoModal isOpen={isDemoOpen} onClose={() => setIsDemoOpen(false)} />
    </div>
  );
}


export default Login;