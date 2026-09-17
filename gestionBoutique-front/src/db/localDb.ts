/** Base IndexedDB locale utilisée comme cache métier et queue offline du POS. */

import Dexie, { type Table } from 'dexie';

export interface LocalProduct {
  id: string;
  nom: string;
  prix: number;
  stock: number;
  unite: string;
  updated_at: string;
  reference?: string;
  name?: string;
  price?: number;
  category?: string;
  min_stock?: number;
  unit_type?: string;
  unit_reference?: string;
}

export interface LocalClient {
  id: number;
  nom: string;
  telephone: string;
  solde: number;
  updated_at?: string;
}

export type PendingActionType = 'vente' | 'mouvement_stock' | 'price_override';
export type PendingActionStatus = 'pending' | 'syncing' | 'failed';

export interface PendingAction {
  id?: number;
  type: PendingActionType;
  payload: Record<string, unknown>;
  created_at: string;
  status: PendingActionStatus;
  retry_count: number;
  local_uuid: string;
}

export class LocalDb extends Dexie {
  products!: Table<LocalProduct, string>;
  clients!: Table<LocalClient, number>;
  pendingActions!: Table<PendingAction, number>;

  constructor() {
    super('gestion-boutique-local');

    this.version(1).stores({
      products: 'id, updated_at',
      clients: 'id, updated_at',
      pendingActions: '++id, status, created_at, &local_uuid',
    });
  }
}

export const localDb = new LocalDb();