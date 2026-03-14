import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import Login from './pages/Login'
import Register from './pages/Register'
import VerifyEmail from './pages/VerifyEmail'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import POS from './pages/POS'
import Employes from './pages/Employes'
import Layout from './components/Layout'
import { RoleGuard } from './components/RoleGuard'
import { useAuthStore } from './store/authStore'
import Clients from './pages/Clients'
import ClientDetails from './pages/ClientDetails'
import Caisse from './pages/Caisse';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore(state => state.token)
  const isAuthLoaded = useAuthStore(state => state.isAuthLoaded)

  if (!isAuthLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="text-gray-600">Chargement de la session...</span>
          </div>
        </div>
      </div>
    )
  }

  return token ? <>{children}</> : <Navigate to="/login" replace />
}

// Composant pour vérifier périodiquement le token
function TokenChecker() {
  const navigate = useNavigate();
  const { token, logout } = useAuthStore();

  useEffect(() => {
    if (!token) return;

    // Vérifier l'âge du token toutes les 5 minutes
    const checkTokenAge = () => {
      const tokenTimestamp = localStorage.getItem('tokenTimestamp');
      
      if (tokenTimestamp) {
        const tokenAge = Date.now() - parseInt(tokenTimestamp);
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
        
        if (tokenAge > thirtyDaysInMs) {
          // Token expiré
          logout();
          navigate('/login', { replace: true });
        }
      }
    };

    // Vérifier immédiatement
    checkTokenAge();

    // Vérifier toutes les 5 minutes
    const interval = setInterval(checkTokenAge, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [token, logout, navigate]);

  return null;
}

export default function App() {
  const loadAuthFromStorage = useAuthStore(state => state.loadAuthFromStorage)

  useEffect(() => {
    loadAuthFromStorage();
  }, [loadAuthFromStorage]);

  return (
    <BrowserRouter>
      <TokenChecker />
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          {/* Dashboard - Accessible aux patrons et employés admin */}
          <Route 
            index 
            element={
              <RoleGuard requireEmployeeAdmin>
                <Dashboard />
              </RoleGuard>
            } 
          />
          
          {/* Products - Accessible à tous les utilisateurs connectés */}
          <Route 
            path="products" 
            element={
              <RoleGuard allowedRoles={['patron', 'admin', 'vendeur', 'caissier']}>
                <Products />
              </RoleGuard>
            } 
          />
          
          {/* Point of Sale - Accessible à tous les utilisateurs connectés */}
          <Route 
            path="pos" 
            element={
              <RoleGuard allowedRoles={['patron', 'admin', 'vendeur', 'caissier']}>
                <POS />
              </RoleGuard>
            } 
          />

          <Route
            path="caisse"
            element={
              <RoleGuard allowedRoles={['patron', 'admin', 'vendeur', 'caissier']}>
                <Caisse />
              </RoleGuard>
            }
          />
          
          {/* Employés - Seulement pour les patrons */}
          <Route 
            path="employes" 
            element={
              <RoleGuard requirePatron>
                <Employes />
              </RoleGuard>
            } 
          />

          {/* Route Clients - Accessible à tous les utilisateurs connectés */}
          <Route 
            path="clients" 
            element={
              <RoleGuard allowedRoles={['patron', 'admin', 'vendeur', 'caissier']}>
                <Clients />
              </RoleGuard>
            } 
          />

          {/* Route Détails Client - Accessible à tous les utilisateurs connectés */}
          <Route 
            path="clients/:id" 
            element={
              <RoleGuard allowedRoles={['patron', 'admin', 'vendeur', 'caissier']}>
                <ClientDetails />
              </RoleGuard>
            } 
          />

          {/* Route par défaut pour les utilisateurs non autorisés */}
          <Route 
            path="*" 
            element={
              <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-gray-800 mb-4">Page non trouvée</h1>
                  <p className="text-gray-600 mb-4">La page que vous recherchez n'existe pas.</p>
                  <Navigate to="/" replace />
                </div>
              </div>
            } 
          />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}