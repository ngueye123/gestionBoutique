/** Affiche l'état réseau et les actions offline qui nécessitent une attention. */

import { AlertTriangle, WifiOff } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDb } from '../db/localDb';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const pendingCount = useLiveQuery(
    () => localDb.pendingActions
      .where('status')
      .anyOf('pending', 'syncing')
      .count(),
    [],
    0,
  );
  const failedCount = useLiveQuery(
    () => localDb.pendingActions.where('status').equals('failed').count(),
    [],
    0,
  );

  if (isOnline && failedCount === 0 && pendingCount === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-white px-4 py-2 text-xs md:px-8">
      {!isOnline && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-800">
          <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
          Hors ligne{pendingCount > 0 ? ` · ${pendingCount} action${pendingCount > 1 ? 's' : ''} en attente` : ''}
        </span>
      )}
      {isOnline && pendingCount > 0 && (
        <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 font-medium text-blue-800">
          Synchronisation en attente : {pendingCount} action{pendingCount > 1 ? 's' : ''}
        </span>
      )}
      {failedCount > 0 && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 font-medium text-red-800">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          {failedCount} conflit{failedCount > 1 ? 's' : ''} à vérifier manuellement
        </span>
      )}
    </div>
  );
}