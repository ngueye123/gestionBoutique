import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import POS from './pages/POS'
import Employes from './pages/Employes'
import Layout from './components/Layout'
import { RoleGuard } from './components/RoleGuard'
import { useAuthStore } from './store/authStore'

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

export default function App() {
  const loadAuthFromStorage = useAuthStore(state => state.loadAuthFromStorage)

  useEffect(() => {
    loadAuthFromStorage()
  }, [loadAuthFromStorage])

  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

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
          
          {/* Employés - Seulement pour les patrons */}
          <Route 
            path="employes" 
            element={
              <RoleGuard requirePatron>
                <Employes />
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