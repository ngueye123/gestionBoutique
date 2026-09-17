/** Crée une vente localement et la place dans la queue de synchronisation. */

import { v4 as uuidv4 } from 'uuid';
import { localDb, type PendingAction } from '../db/localDb';
import { toBase, type UnitType } from '../lib/unitConverter';

export interface VenteOfflineItem {
  id: number;
  quantity: number;
  unite?: string;
  prix_override?: number;
  justification?: string;
}

export interface VenteOfflinePayment {
  mode: 'especes' | 'wave' | 'orange_money' | 'dette' | 'acompte';
  montant?: number;
  montant_recu?: number;
  reference_transaction?: string;
}

export interface VenteOfflineData {
  client_id?: number;
  items: VenteOfflineItem[];
  paiements: VenteOfflinePayment[];
}

const UNIT_TYPES: UnitType[] = ['piece', 'masse', 'volume', 'longueur'];

const getUnitType = (unitType: string | undefined): UnitType =>
  UNIT_TYPES.includes(unitType as UnitType) ? unitType as UnitType : 'piece';

export async function creerVenteOffline(venteData: VenteOfflineData): Promise<string> {
  const localUuid = uuidv4();
  const createdAt = new Date().toISOString();

  await localDb.transaction('rw', localDb.products, localDb.pendingActions, async () => {
    for (const item of venteData.items) {
      const product = await localDb.products.get(String(item.id));
      if (!product) {
        throw new Error(`Produit absent du cache local : ${item.id}`);
      }

      const unitType = getUnitType(product.unit_type);
      const quantityBase = toBase(unitType, item.unite || product.unit_reference || product.unite, item.quantity);

      if (!Number.isFinite(quantityBase) || quantityBase <= 0) {
        throw new Error(`Quantité invalide pour le produit ${product.nom}`);
      }

      if (product.stock < quantityBase) {
        throw new Error(`Stock local insuffisant pour ${product.nom}`);
      }

      await localDb.products.put({
        ...product,
        stock: product.stock - quantityBase,
        updated_at: createdAt,
      });
    }

    const action: PendingAction = {
      type: 'vente',
      payload: { ...venteData, local_uuid: localUuid } as Record<string, unknown>,
      created_at: createdAt,
      status: 'pending',
      retry_count: 0,
      local_uuid: localUuid,
    };

    await localDb.pendingActions.add(action);
  });

  return localUuid;
}