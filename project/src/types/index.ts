// Types pour la gestion des rôles et utilisateurs

export interface PatronUser {
  id: number
  nom: string
  prenom: string
  email: string
  user_type: 'patron'
}

export interface EmployeUser {
  id: number
  nom: string
  prenom?: string
  email: string
  role: 'admin' | 'vendeur' | 'caissier'
  user_type: 'employe'
  utilisateur_id: number
}

export type User = PatronUser | EmployeUser

export interface Product {
  id: string
  reference: string
  name: string
  price: number
  stock: number
  category: string
  min_stock: number
  utilisateur_id: number
}

export interface CartItem extends Product {
  quantity: number
}

export interface DashboardStats {
  totalProducts: number
  lowStockProducts: number
  totalValue: number
  stockMovements: number
  salesHistory: SaleItem[]
  stockAlerts: StockAlert[]
}

export interface SaleItem {
  date: string
  amount: number
}

export interface StockAlert {
  id: string
  name: string
  stock: number
  minStock: number
}
