export type UnitType = 'piece' | 'masse' | 'volume' | 'longueur';

export const UNIT_CONFIG: Record<UnitType, {
  base: string;
  factors: Record<string, number>;
  labels: Record<string, string>;
}> = {
  piece:     { base: 'piece', factors: { piece: 1 },       labels: { piece: 'pièce' } },
  masse:     { base: 'g',     factors: { g: 1, kg: 1000 }, labels: { g: 'g', kg: 'kg' } },
  volume:    { base: 'ml',    factors: { ml: 1, L: 1000 }, labels: { ml: 'ml', L: 'L' } },
  longueur:  { base: 'cm',    factors: { cm: 1, m: 100 },  labels: { cm: 'cm', m: 'm' } },
};

export const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  piece: 'Pièce (pièce, lot, carton)',
  masse: 'Masse (g, kg)',
  volume: 'Volume (ml, L)',
  longueur: 'Longueur (cm, m)',
};

export const compatibleUnits = (type: UnitType): string[] =>
  Object.keys(UNIT_CONFIG[type].factors);

export const toBase = (type: UnitType, unit: string, qty: number): number =>
  qty * UNIT_CONFIG[type].factors[unit];

export const fromBase = (type: UnitType, unit: string, qtyBase: number): number =>
  qtyBase / UNIT_CONFIG[type].factors[unit];

export const defaultSaleUnit = (type: UnitType, unitReference: string): string =>
  type === 'masse' ? 'g' : unitReference;

export const lineSubtotal = (item: {
  unit_type: UnitType;
  unit_reference: string;
  price: number;
  quantity: number;
  unite_vente: string;
}): number => {
  const qtyBase = toBase(item.unit_type, item.unite_vente, item.quantity);
  const pricePerBase = item.price / UNIT_CONFIG[item.unit_type].factors[item.unit_reference];
  return Math.ceil((pricePerBase * qtyBase) - 1e-9);
};