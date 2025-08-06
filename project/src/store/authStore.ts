import { create } from 'zustand'
import { User } from '../types'

interface AuthState {
  user: User | null
  token: string | null
  isAuthLoaded: boolean
  setAuth: (user: User, token: string) => void
  logout: () => void
  loadAuthFromStorage: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthLoaded: false,

  setAuth: (user, token) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    set({ user, token })
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ user: null, token: null })
  },

  loadAuthFromStorage: () => {
    const token = localStorage.getItem('token') ?? null
    let user: User | null = null
    const raw = localStorage.getItem('user')
    if (raw) {
      try {
        user = JSON.parse(raw)
      } catch {
        // user corrompu → on nettoie
        localStorage.removeItem('user')
      }
    }
    set({ token, user, isAuthLoaded: true })
  },
}))
