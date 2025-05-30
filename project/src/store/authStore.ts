import { create } from 'zustand';
import { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthLoaded: boolean; // ⬅️ nouveau
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  loadAuthFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthLoaded: false,

  setAuth: (user, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null });
  },

  loadAuthFromStorage: () => {
    const token = localStorage.getItem('token');
    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;

    set({
      token: token || null,
      user: user || null,
      isAuthLoaded: true, // ⬅️ on marque le chargement comme terminé
    });
  },
}));
