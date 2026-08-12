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
import Caisse from './pages/Caisse'
import Depenses from './pages/Depenses'
import VerifyEmployeEmail from './pages/VerifyEmployeEmail';
import PriceOverrides from './pages/PriceOverrides';
import Parametres from './pages/Parametres';
import ProfilBoutique from './pages/ProfilBoutique';
import VentesHistorique from './pages/VentesHistorique';

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

// Redirige intelligemment selon le rôle après connexion
// Les vendeurs/caissiers n'ont pas accès au dashboard → /pos
// Les patrons et admins → /
function RoleBasedRedirect() {
  const { user } = useAuthStore()

  if (!user) return <Navigate to="/login" replace />

  const isPatron = user.user_type === 'patron'
  const isAdmin = 'role' in user && user.role === 'admin'

  if (isPatron || isAdmin) {
    return <Navigate to="/" replace />
  }

  // Vendeur ou caissier → Point de Vente
  return <Navigate to="/pos" replace />
}

export default function App() {
  const loadAuthFromStorage = useAuthStore(state => state.loadAuthFromStorage)

  useEffect(() => {
    loadAuthFromStorage()
  }, [loadAuthFromStorage])

  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <Routes>
        {/* Routes publiques */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/employe/verify-email" element={<VerifyEmployeEmail />} />

        {/* Routes privées — Layout commun */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          {/* Dashboard — Patrons et employés admin uniquement */}
          <Route
            index
            element={
              <RoleGuard requireEmployeeAdmin>
                <Dashboard />
              </RoleGuard>
            }
          />

          {/* Produits — Tous les rôles */}
          <Route
            path="products"
            element={
              <RoleGuard allowedRoles={['patron', 'admin', 'vendeur', 'caissier']}>
                <Products />
              </RoleGuard>
            }
          />

          {/* Point de Vente — Tous les rôles */}
          <Route
            path="pos"
            element={
              <RoleGuard allowedRoles={['patron', 'admin', 'vendeur', 'caissier']}>
                <POS />
              </RoleGuard>
            }
          />

          {/* Caisse — Tous les rôles */}
          <Route
            path="caisse"
            element={
              <RoleGuard allowedRoles={['patron', 'admin', 'vendeur', 'caissier']}>
                <Caisse />
              </RoleGuard>
            }
          />

          {/* Employés — Patrons uniquement */}
          <Route
            path="employes"
            element={
              <RoleGuard requirePatron>
                <Employes />
              </RoleGuard>
            }
          />

          {/* Clients — Tous les rôles */}
          <Route
            path="clients"
            element={
              <RoleGuard allowedRoles={['patron', 'admin', 'vendeur', 'caissier']}>
                <Clients />
              </RoleGuard>
            }
          />

          {/* Détails client — Tous les rôles */}
          <Route
            path="clients/:id"
            element={
              <RoleGuard allowedRoles={['patron', 'admin', 'vendeur', 'caissier']}>
                <ClientDetails />
              </RoleGuard>
            }
          />

          <Route
            path="ventes-historique"
            element={
              <RoleGuard allowedRoles={['patron', 'admin', 'vendeur', 'caissier']}>
                <VentesHistorique />
              </RoleGuard>
            }
          />

          {/* Paramètres — Patrons et admin (sécurité, fidélité, facturation) */}
          <Route
            path="parametres"
            element={
              <RoleGuard requireEmployeeAdmin>
                <Parametres />
              </RoleGuard>
            }
          />

          {/* Profil Boutique — Patrons et admin (lecture), édition patron uniquement */}
          <Route
            path="profil-boutique"
            element={
              <RoleGuard requireEmployeeAdmin>
                <ProfilBoutique />
              </RoleGuard>
            }
          />

          {/* Dépenses — Patrons uniquement */}
          <Route
            path="depenses"
            element={
              <RoleGuard allowedRoles={['patron', 'admin', 'vendeur']}>
                <Depenses />
              </RoleGuard>
            }
          />

          <Route
            path="ajustements-prix"
            element={
              <RoleGuard requireEmployeeAdmin>
                <PriceOverrides />
              </RoleGuard>
            }
          />

          {/* Route inconnue — redirection intelligente selon le rôle */}
          <Route path="*" element={<RoleBasedRedirect />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}