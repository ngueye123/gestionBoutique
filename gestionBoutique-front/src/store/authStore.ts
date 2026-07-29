import create from 'zustand';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  userType: 'patron' | 'employe' | null;
  isAuthLoaded: boolean;
  isRefreshing: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  loadAuthFromStorage: () => void;
  refreshToken: () => Promise<string | null>;

  canViewDashboard: () => boolean;
  canViewProducts: () => boolean;
  canManageProducts: () => boolean;
  canManageEmployees: () => boolean;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  userType: null,
  isAuthLoaded: false,
  isRefreshing: false,

  canViewDashboard: () => {
    const user = get().user;
    return user?.user_type === 'patron' || user?.role === 'admin';
  },

  canViewProducts: () => {
    const user = get().user;
    return !!user;
  },

  canManageProducts: () => {
    const user = get().user;
    return user?.user_type === 'patron' || user?.role === 'admin' || user?.role === 'vendeur' ;
  },

  canManageEmployees: () => {
    const user = get().user;
    return user?.user_type === 'patron';
  },

  setAuth: (user, token) => {
    const userType = user.user_type || ('prenom' in user ? 'patron' : 'employe');
    
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('userType', userType);
    localStorage.setItem('tokenTimestamp', Date.now().toString());
    
    set({ user, token, userType });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userType');
    localStorage.removeItem('tokenTimestamp');
    set({ user: null, token: null, userType: null });
  },

  loadAuthFromStorage: () => {
    const token = localStorage.getItem('token');
    const userTypeStored = localStorage.getItem('userType') as 'patron' | 'employe' | null;
    const tokenTimestamp = localStorage.getItem('tokenTimestamp');
    
    let user: User | null = null;
    
    const userString = localStorage.getItem('user');
    if (userString) {
      try { 
        user = JSON.parse(userString) as User;
      } catch { 
        localStorage.removeItem('user');
      }
    }
    
    // Vérifier si le token est expiré (30 jours = 2592000000 ms)
    if (token && tokenTimestamp) {
      const tokenAge = Date.now() - parseInt(tokenTimestamp);
      const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
      
      if (tokenAge > thirtyDaysInMs) {
        // Token expiré, nettoyer tout
        get().logout();
        set({ isAuthLoaded: true });
        return;
      }
    }
    
    let userType = userTypeStored;
    if (user && !userType) {
      userType = user.user_type || ('prenom' in user ? 'patron' : 'employe');
    }
    
    set({ token, user, userType, isAuthLoaded: true });
  },

  refreshToken: async () => {
    const { isRefreshing, token, user } = get();
    if (!token) return null;
    
    if (isRefreshing) {
      await new Promise(res => setTimeout(res, 300));
      return get().token;
    }
    
    try {
      set({ isRefreshing: true });
      const resp = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await resp.json();
      
      if (resp.ok && data?.token) {
        get().setAuth(user as User, data.token);
        return data.token as string;
      } else {
        // Si le refresh échoue, déconnecter
        if (data.code === 'REFRESH_EXPIRED' || data.code === 'TOKEN_INVALID') {
          get().logout();
        }
        return null;
      }
    } catch (error) {
      console.error('Erreur lors du refresh du token:', error);
      get().logout();
      return null;
    } finally {
      set({ isRefreshing: false });
    }
  }
}));