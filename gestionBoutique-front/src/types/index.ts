// Types pour la gestion des rôles et utilisateurs
export interface PatronUser {
  id: number
  nom: string
  prenom: string
  email: string
  user_type: 'patron'
  email_verified?: boolean
}

export interface EmployeUser {
  id: number
  nom: string
  prenom?: string
  email: string
  role: 'admin' | 'vendeur' | 'caissier'
  user_type: 'employe'
  utilisateur_id: number
  email_verified?: boolean
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

// Types pour les réponses API d'authentification
export interface AuthResponse {
  success: boolean
  message: string
  token?: string
  user?: PatronUser
  employe?: EmployeUser
  email_verified?: boolean
  user_type?: 'patron' | 'employe'
}

// Types pour les réponses de vérification d'email
export interface VerifyEmailResponse {
  success: boolean
  message: string
}

// Types pour les réponses de réinitialisation de mot de passe
export interface ForgotPasswordResponse {
  success: boolean
  message: string
}

export interface ResetPasswordResponse {
  success: boolean
  message: string
}

// Types pour les notifications d'erreur
export interface ErrorResponse {
  success: false
  message: string
  email_verified?: boolean
}

// Type pour les employes (gestion)
export interface Employe {
  id: number
  nom: string
  email: string
  role: 'admin' | 'vendeur' | 'caissier'
  utilisateur_id?: number
}

// Types pour les formulaires
export interface LoginFormData {
  email: string
  mot_de_passe: string
}

export interface RegisterFormData {
  nom: string
  prenom: string
  email: string
  mot_de_passe: string
}

export interface ForgotPasswordFormData {
  email: string
}

export interface ResetPasswordFormData {
  mot_de_passe: string
  mot_de_passe_confirmation: string
}

export interface ProductFormData {
  reference: string
  name: string
  price: number
  stock: number
  category: string
  min_stock: number
}

export interface EmployeFormData {
  nom: string
  email: string
  mot_de_passe: string
  role: 'admin' | 'vendeur' | 'caissier'
}