import { create } from 'zustand'
import { User } from '../types'

interface AuthState {
  user: User | null
  token: string | null
  isAuthLoaded: boolean

  setAuth: (user: User, token: string) => void
  logout: () => void
  loadAuthFromStorage: () => void

  // Permissions
  canViewDashboard: () => boolean
  canViewProducts: () => boolean
  canManageProducts: () => boolean
  canManageEmployees: () => boolean

  // Raccourci pour savoir si c'est un patron
  userType: string | null
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthLoaded: false,
  userType: null,

  setAuth: (user, token) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    set({ user, token, userType: user.user_type || null })
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ user: null, token: null, userType: null })
  },

  loadAuthFromStorage: () => {
    const token = localStorage.getItem('token')
    let user: User | null = null
    
    const userString = localStorage.getItem('user')
    if (userString) {
      try {
        user = JSON.parse(userString)
      } catch {
        localStorage.removeItem('user')
      }
    }

    set({ token, user, userType: user?.user_type || null, isAuthLoaded: true })
  },

  // --- Permissions ---
  canViewDashboard: () => {
    const user = get().user
    return user?.user_type === 'patron' || user?.role === 'admin'
  },

  canViewProducts: () => {
    const user = get().user
    return !!user // tout utilisateur connecté peut voir
  },

  canManageProducts: () => {
    const user = get().user
    return user?.user_type === 'patron' || user?.role === 'admin'
  },

  canManageEmployees: () => {
    const user = get().user
    return user?.user_type === 'patron'
  },
}))
