import { create } from 'zustand';
import { CartItem, Product } from '../types';
import { toBase, fromBase, lineSubtotal, defaultSaleUnit } from '../lib/unitConverter';

interface CartState {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  changeUnite: (productId: string, newUnit: string) => void;
  overridePrice: (productId: string, newPrice: number, justification: string, pin?: string) => void;
  clearCart: () => void;
  total: number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  total: 0,

  addItem: (product) => {
    const items = get().items;
    const existingItem = items.find(item => item.id === product.id);

    if (existingItem) {
      const updatedItems = items.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
      set({ items: updatedItems, total: calculateTotal(updatedItems) });
    } else {
      const uniteVente = defaultSaleUnit(product.unit_type, product.unit_reference);
      const newItem: CartItem = {
        ...product,
        quantity: 1,
        unite_vente: uniteVente,
        originalPrice: product.price,
        isOverridden: false,
      };
      const updatedItems = [...items, newItem];
      set({ items: updatedItems, total: calculateTotal(updatedItems) });
    }
  },

  removeItem: (productId) => {
    const items = get().items.filter(item => item.id !== productId);
    set({ items, total: calculateTotal(items) });
  },

  updateQuantity: (productId, quantity) => {
    const items = get().items.map(item =>
      item.id === productId ? { ...item, quantity: Math.max(0, quantity) } : item
    );
    set({ items, total: calculateTotal(items) });
  },

  changeUnite: (productId, newUnit) => {
    const items = get().items.map(item => {
      if (item.id !== productId) return item;
      // conversion pour préserver la quantité physique (ex : 250 g -> 0.25 kg)
      const qtyBase = toBase(item.unit_type, item.unite_vente, item.quantity);
      return { ...item, unite_vente: newUnit, quantity: fromBase(item.unit_type, newUnit, qtyBase) };
    });
    set({ items, total: calculateTotal(items) });
  },

  overridePrice: (productId, newPrice, justification, pin) => {
    const items = get().items.map(item => {
      if (item.id !== productId) return item;

      const isOverridden = newPrice !== item.originalPrice;

      return {
        ...item,
        price: newPrice,
        isOverridden,
        justification: isOverridden ? justification : undefined,
        pin: isOverridden ? pin : undefined,
      };
    });
    set({ items, total: calculateTotal(items) });
  },

  clearCart: () => set({ items: [], total: 0 }),
}));

const calculateTotal = (items: CartItem[]): number => {
  return items.reduce((sum, item) => sum + lineSubtotal(item), 0);
};