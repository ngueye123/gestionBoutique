/** Traite la queue IndexedDB et envoie les actions offline au serveur. */

import { localDb, type PendingAction } from '../db/localDb';
import { fetchWithAuth } from '../lib/fetchWithAuth';

let isSyncing = false;

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const endpointFor = (type: PendingAction['type']): string => {
  switch (type) {
    case 'vente':
      return `${API_URL}/ventes`;
    case 'mouvement_stock':
      return `${API_URL}/stock/mouvements`;
    case 'price_override':
      return `${API_URL}/pos/price-override`;
  }
};

const retryAction = async (action: PendingAction): Promise<void> => {
  if (action.id === undefined) return;
  await localDb.pendingActions.update(action.id, {
    status: 'pending',
    retry_count: action.retry_count + 1,
  });
};

export async function processPendingQueue(): Promise<void> {
  if (isSyncing || !navigator.onLine) return;

  isSyncing = true;
  try {
    const actions = await localDb.pendingActions
      .where('status')
      .equals('pending')
      .sortBy('created_at');

    for (const action of actions) {
      if (action.id === undefined || !navigator.onLine) break;

      await localDb.pendingActions.update(action.id, { status: 'syncing' });

      try {
        const response = await fetchWithAuth(endpointFor(action.type), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.payload),
        });

        if (response.ok) {
          await localDb.pendingActions.delete(action.id);
        } else if (response.status === 409) {
          await localDb.pendingActions.update(action.id, { status: 'failed' });
        } else if (response.status >= 500) {
          await retryAction(action);
        } else {
          await localDb.pendingActions.update(action.id, { status: 'failed' });
        }
      } catch {
        await retryAction(action);
      }
    }
  } finally {
    isSyncing = false;
  }
}