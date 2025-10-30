import create from 'zustand';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  userType: 'patron' | 'employe' | null;  // ← AJOUT
  isAuthLoaded: boolean;
  isRefreshing: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  loadAuthFromStorage: () => void;
  refreshToken: () => Promise<string | null>;

  canViewDashboard: () => boolean
  canViewProducts: () => boolean
  canManageProducts: () => boolean
  canManageEmployees: () => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  userType: null,  // ← AJOUT
  isAuthLoaded: false,
  isRefreshing: false,

  
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

  setAuth: (user, token) => {
    // ← MODIFICATION : Détecter le type d'utilisateur
    const userType = user.user_type || ('prenom' in user ? 'patron' : 'employe');
    
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('userType', userType);  // ← AJOUT
    
    set({ user, token, userType });  // ← MODIFICATION
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userType');  // ← AJOUT
    set({ user: null, token: null, userType: null });  // ← MODIFICATION
  },

  loadAuthFromStorage: () => {
    const token = localStorage.getItem('token');
    const userTypeStored = localStorage.getItem('userType') as 'patron' | 'employe' | null;  // ← AJOUT
    let user: User | null = null;
    
    const userString = localStorage.getItem('user');
    if (userString) {
      try { 
        user = JSON.parse(userString) as User;
      } catch { 
        localStorage.removeItem('user');
      }
    }
    
    // ← MODIFICATION : Déterminer le userType si absent
    let userType = userTypeStored;
    if (user && !userType) {
      userType = user.user_type || ('prenom' in user ? 'patron' : 'employe');
    }
    
    set({ token, user, userType, isAuthLoaded: true });  // ← MODIFICATION
  },

  refreshToken: async () => {
    const { isRefreshing, token, user } = get();
    if (!token) return null;
    if (isRefreshing) {
      // Attendre qu'un autre refresh finisse
      await new Promise(res => setTimeout(res, 300));
      return get().token;
    }
    try {
      set({ isRefreshing: true });
      const resp = await fetch('http://localhost:8000/api/auth/refresh', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await resp.json();
      if (resp.ok && data?.token) {
        // conserver l'utilisateur courant
        get().setAuth(user as User, data.token);
        return data.token as string;
      } else {
        get().logout();
        return null;
      }
    } catch {
      get().logout();
      return null;
    } finally {
      set({ isRefreshing: false });
    }
  }
}));