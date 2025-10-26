import { useAuthStore } from '../store/authStore';

export async function fetchWithAuth(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const { token, refreshToken } = useAuthStore.getState();

  const doFetch = async (bearer?: string) => {
    const headers = new Headers(init.headers || {});
    if (bearer) headers.set('Authorization', `Bearer ${bearer}`);
    return fetch(input, { ...init, headers });
  };

  let resp = await doFetch(token || undefined);
  if (resp.status !== 401) return resp;

  // Lire code d’erreur pour savoir si expiré
  let payload: any = null;
  try { payload = await resp.clone().json(); } catch {}

  if (payload?.code === 'TOKEN_EXPIRED') {
    const newToken = await refreshToken();
    if (newToken) {
      resp = await doFetch(newToken);
      return resp;
    }
  }

  return resp; // laisser le caller gérer autres 401
}
