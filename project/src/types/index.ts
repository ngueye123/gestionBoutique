export interface User {
  id: string;
  nom: string;
  prenom: string;
  email: string;
}

export interface Product {
  id: string;
  reference: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  min_stock: number;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface DashboardStats {
  totalProducts: number;
  lowStockProducts: number;
  totalValue: number;
  stockMovements: number;
  salesHistory: Array<{
    date: string;
    amount: number;
  }>;
  stockAlerts: Array<{
    id: string;
    name: string;
    stock: number;
    minStock: number;
  }>;
}