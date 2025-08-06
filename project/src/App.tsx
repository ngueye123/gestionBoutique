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
import { useAuthStore } from './store/authStore'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore(state => state.token)
  const isAuthLoaded = useAuthStore(state => state.isAuthLoaded)

  if (!isAuthLoaded) {
    return <div className="p-8 text-center text-gray-500">Chargement de la session...</div>
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
      <Toaster position="top-right" />
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
          <Route index element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="pos" element={<POS />} />
          <Route path="employes" element={<Employes />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
