import React, { useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, Users, LogOut, User, UserCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { EmployeUser } from '../types';
import { Wallet } from 'lucide-react';
import { CaisseIndicateur } from './CaisseIndicateur';
function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    user, 
    token,
    userType, 
    logout, 
    canManageProducts, 
    canViewProducts, 
    canManageEmployees, 
    canViewDashboard 
  } = useAuthStore();

  // Vérifier si l'utilisateur est toujours authentifié
  useEffect(() => {
    if (!token || !user) {
      navigate('/login', { replace: true });
    }
  }, [token, user, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const isActive = (path: string) => location.pathname === path;

  const linkClass = (path: string) => `
    flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md mx-2
    ${isActive(path) ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600' : ''}
  `;

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">Gestion Boutique</h2>
          {user && (
            <div className="mt-2 flex items-center">
              <div className={`p-2 rounded-full ${userType === 'patron' ? 'bg-green-100' : 'bg-blue-100'}`}>
                {userType === 'patron' ? (
                  <User className="w-4 h-4 text-green-600" />
                ) : (
                  <Users className="w-4 h-4 text-blue-600" />
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">
                  {'prenom' in user && user.prenom ? `${user.prenom} ${user.nom}` : user.nom}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {userType === 'patron'
                    ? 'Propriétaire'
                    : `Employé ${(user as EmployeUser).role ?? ''}`}
                </p>
              </div>
            </div>
          )}
        </div>
        
        <nav className="mt-4 space-y-1">
          {/* Dashboard */}
          {canViewDashboard() && (
            <Link to="/" className={linkClass('/')}>
              <LayoutDashboard className="w-5 h-5 mr-2" />
              Tableau de bord
            </Link>
          )}

          {/* Produits */}
          {canViewProducts() && (
            <Link to="/products" className={linkClass('/products')}>
              <Package className="w-5 h-5 mr-2" />
              Produits
              {!canManageProducts() && (
                <span className="ml-auto text-xs bg-gray-200 px-2 py-1 rounded">
                  Lecture
                </span>
              )}
            </Link>
          )}

          {/* Point de Vente */}
          {canViewProducts() && (
            <Link to="/pos" className={linkClass('/pos')}>
              <ShoppingCart className="w-5 h-5 mr-2" />
              Point de Vente
            </Link>
          )}

          {canViewProducts() && (
            <Link to="/caisse" className={linkClass('/caisse')}>
              <Wallet className="w-5 h-5 mr-2" />
              Ma Caisse
            </Link>
          )}

          {/* Clients */}
          {canViewProducts() && (
            <Link to="/clients" className={linkClass('/clients')}>
              <UserCircle className="w-5 h-5 mr-2" />
              Clients
            </Link>
          )}

          {/* Employés */}
          {canManageEmployees() && (
            <Link to="/employes" className={linkClass('/employes')}>
              <Users className="w-5 h-5 mr-2" />
              Employés
            </Link>
          )}
        </nav>

       {/* <div className="absolute bottom-16 left-4 right-4">
          <CaisseIndicateur />
        </div> */}


        {/* Bouton de déconnexion */}
        <div className="absolute bottom-4 left-4">
          <button
            onClick={handleLogout}
            className="inline-flex items-center px-4 py-2 text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors"
          >
            <LogOut className="w-5 h-5 mr-2" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Contenu principal */}
      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;