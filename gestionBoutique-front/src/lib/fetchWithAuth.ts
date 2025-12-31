import { useAuthStore } from '../store/authStore';

export async function fetchWithAuth(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const { token, refreshToken, logout } = useAuthStore.getState();

  const doFetch = async (bearer?: string) => {
    const headers = new Headers(init.headers || {});
    if (bearer) headers.set('Authorization', `Bearer ${bearer}`);
    return fetch(input, { ...init, headers });
  };

  let resp = await doFetch(token || undefined);
  
  // Si pas d'erreur 401, retourner la réponse
  if (resp.status !== 401) return resp;

  // Lire le code d'erreur
  let payload: any = null;
  try { 
    payload = await resp.clone().json(); 
  } catch {}

  // Si le token est expiré, tenter un refresh
  if (payload?.code === 'TOKEN_EXPIRED') {
    const newToken = await refreshToken();
    if (newToken) {
      // Réessayer la requête avec le nouveau token
      resp = await doFetch(newToken);
      return resp;
    }
  }

  // Si le refresh a échoué ou erreur irréversible
  if (payload?.code === 'REFRESH_EXPIRED' || payload?.code === 'TOKEN_INVALID' || !payload?.code) {
    // Déconnecter et rediriger
    logout();
    window.location.href = '/login';
  }

  return resp;
}