/** Synchronise les produits et clients du serveur vers la base IndexedDB locale. */

import { localDb, type LocalClient, type LocalProduct } from '../db/localDb';
import { fetchWithAuth } from '../lib/fetchWithAuth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

interface ApiListResponse<T> {
  success?: boolean;
  data?: T[];
  products?: T[];
  clients?: T[];
}

interface ApiProduct {
  id: string | number;
  name?: string;
  nom?: string;
  price?: number | string;
  prix?: number | string;
  stock?: number | string;
  unit_reference?: string;
  unite?: string;
  updated_at?: string;
  reference?: string;
  category?: string;
  min_stock?: number | string;
  unit_type?: string;
}

interface ApiClient {
  id: number | string;
  nom: string;
  telephone: string;
  solde?: number | string;
  solde_dette?: number | string;
  updated_at?: string;
}

const toNumber = (value: number | string | undefined, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const extractList = <T>(response: ApiListResponse<T>): T[] => {
  if (Array.isArray(response.data)) return response.data;
  if (Array.isArray(response.products)) return response.products;
  if (Array.isArray(response.clients)) return response.clients;
  return [];
};

const toLocalProduct = (product: ApiProduct): LocalProduct => ({
  id: String(product.id),
  nom: product.nom || product.name || '',
  prix: toNumber(product.prix ?? product.price),
  stock: toNumber(product.stock),
  unite: product.unite || product.unit_reference || '',
  updated_at: product.updated_at || new Date().toISOString(),
  reference: product.reference,
  name: product.name || product.nom,
  price: toNumber(product.price ?? product.prix),
  category: product.category,
  min_stock: toNumber(product.min_stock),
  unit_type: product.unit_type,
  unit_reference: product.unit_reference || product.unite,
});

const toLocalClient = (client: ApiClient): LocalClient => ({
  id: Number(client.id),
  nom: client.nom,
  telephone: client.telephone,
  solde: toNumber(client.solde ?? client.solde_dette),
  updated_at: client.updated_at,
});

export async function syncProductsDown(): Promise<boolean> {
  if (!navigator.onLine) return false;

  try {
    const response = await fetchWithAuth(`${API_URL}/products?full=1`);
    if (!response.ok) return false;

    const payload = await response.json() as ApiListResponse<ApiProduct>;
    if (payload.success === false) return false;

    const products = extractList(payload).map(toLocalProduct);
    if (products.length > 0) await localDb.products.bulkPut(products);
    return true;
  } catch {
    return false;
  }
}

export async function syncClientsDown(): Promise<boolean> {
  if (!navigator.onLine) return false;

  try {
    const response = await fetchWithAuth(`${API_URL}/clients?full=1`);
    if (!response.ok) return false;

    const payload = await response.json() as ApiListResponse<ApiClient>;
    if (payload.success === false) return false;

    const clients = extractList(payload).map(toLocalClient);
    if (clients.length > 0) await localDb.clients.bulkPut(clients);
    return true;
  } catch {
    return false;
  }
}