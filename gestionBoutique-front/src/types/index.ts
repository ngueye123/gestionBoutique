// ========== TYPES UTILISATEURS ==========
export interface PatronUser {
  id: number
  nom: string
  prenom: string
  email: string
  user_type: 'patron'
  email_verified?: boolean
  role?: never
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

// ========== TYPES PRODUITS ==========
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

// ========== TYPES CLIENTS ET DETTES (NOUVEAUX) ==========

export interface Client {
  id: number
  nom: string
  telephone: string
  utilisateur_id: number
  solde_dette: number
  created_at: string
  updated_at: string
  remboursements?: Remboursement[]
  ventes?: VenteCredit[]
}

export interface Remboursement {
  id: number
  client_id: number
  utilisateur_id: number
  employe_id: number | null
  montant: number
  moyen_paiement: 'especes' | 'wave' | 'orange_money' | 'carte'
  note: string | null
  created_at: string
  client?: Client
  employe?: EmployeUser
}

export interface VenteCredit {
  id: number
  reference: string
  utilisateur_id: number
  employe_id: number | null
  client_id: number
  total: number
  moyen_paiement: 'dette'
  created_at: string
  client?: Client
  details?: VenteDetail[]
}

export interface VenteDetail {
  id: number
  vente_id: number
  product_id: number
  reference_produit: string
  nom_produit: string
  quantite: number
  prix_unitaire: number
  sous_total: number
}

export interface CartItem extends Product {
  quantity: number;
  originalPrice: number;   
  isOverridden: boolean;
  justification?: string;
  pin?: string;             
}

// Type pour le formulaire de création de client
export interface ClientFormData {
  nom: string
  telephone: string
}

// Type pour le formulaire de remboursement
export interface RemboursementFormData {
  client_id: number
  montant: number
  moyen_paiement: 'especes' | 'wave' | 'orange_money' | 'carte'
  note?: string
}

// ========== TYPES RÉPONSES API CLIENTS ==========
export interface ClientsResponse {
  success: boolean
  clients: Client[]
  message?: string
}

export interface ClientResponse {
  success: boolean
  client: Client
  message?: string
}

export interface RemboursementResponse {
  success: boolean
  remboursement: Remboursement
  nouveau_solde: number
  message?: string
}

export interface RemboursementHistoryResponse {
  success: boolean
  client: Client
  remboursements: Remboursement[]
  total_rembourse: number
}

// ========== TYPES DASHBOARD ==========
export interface DashboardStats {
  totalProducts: number
  lowStockProducts: number
  totalValue: number
  stockMovements: number
  salesHistory: SaleItem[]
  stockAlerts: StockAlert[]
  todaySales?: number
  monthSales?: number
  periodTotal?: number
  periodCount?: number
  topProducts?: TopProduct[]
  monthlySales?: MonthlySale[]
  period?: {
    type: string
    start_date: string
    end_date: string
    label: string
  }
}

export interface SaleItem {
  date: string
  amount: number
  count?: number
}

export interface TopProduct {
  nom: string
  quantite: number
  ventes: number
}

export interface MonthlySale {
  mois: string
  nombre_ventes: number
  chiffre_affaires: number
}

export interface StockAlert {
  id: string
  name: string
  stock: number
  minStock: number
}

// ========== TYPES AUTH ==========
export interface AuthResponse {
  success: boolean
  message: string
  token?: string
  user?: PatronUser
  employe?: EmployeUser
  email_verified?: boolean
  user_type?: 'patron' | 'employe'
}

export interface VerifyEmailResponse {
  success: boolean
  message: string
}

export interface ForgotPasswordResponse {
  success: boolean
  message: string
}

export interface ResetPasswordResponse {
  success: boolean
  message: string
}

export interface ErrorResponse {
  success: false
  message: string
  email_verified?: boolean
}

// ========== TYPES EMPLOYÉS ==========
export interface Employe {
  id: number
  nom: string
  email: string
  role: 'admin' | 'vendeur' | 'caissier'
  utilisateur_id?: number
}

// ========== TYPES FORMULAIRES ==========
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



export interface PriceOverrideItem {
  id: number;
  vente_id: number;
  product_id: number;
  prix_normal: number;
  prix_applique: number;
  justification: string;
  pin_utilise: boolean;
  created_at: string;
  product?: { id: number; name: string; reference: string };
  employe?: { id: number; nom: string; role: string } | null;
  vente?: { id: number; reference: string };
}


// ========== TYPES DÉPENSES ==========

export interface Depense {
  id: number
  utilisateur_id: number
  montant: number
  date_depense: string
  description: string
  categorie: string
  created_at: string
  updated_at: string
}

export interface DepenseFormData {
  montant: string
  date_depense: string
  description: string
  categorie: string
}

// Période retournée par l'API — deux formes possibles selon le mode
export type PeriodeDepense =
  | { mode: 'range'; start_date: string; end_date: string; label: string }
  | { mode: 'mois';  mois: number; annee: number; label: string }

export interface DepensesResponse {
  success: boolean
  depenses: {
    data: Depense[]
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
  total_mensuel: number
  total_periode: number
  total_mois_precedent: number
  variation_pct: number | null
  par_categorie: Array<{
    categorie: string
    label: string
    total: number
    nombre: number
  }>
  categories: Record<string, string>
  periode: PeriodeDepense
}

export interface DepenseResponse {
  success: boolean
  message: string
  depense?: Depense
  errors?: Record<string, string[]>
}

export interface DepenseDeleteResponse {
  success: boolean
  message: string
}

export interface StatsAnnuellesResponse {
  success: boolean
  annee: number
  stats_par_mois: Array<{
    mois: number
    label: string
    total: number
    nombre: number
  }>
  total_annuel: number
}

// Filtres — supporte les deux modes
export interface FiltresDepenses {
  // Mode plage (prioritaire si renseigné)
  start_date?: string
  end_date?: string
  // Mode mois/année (legacy)
  mois?: number
  annee?: number
  // Communs
  categorie?: string
  page?: number
}

// Enrichissement DashboardStats avec les champs bénéfice
export interface DashboardStats {
  totalProducts: number
  lowStockProducts: number
  totalValue: number
  stockMovements: number
  salesHistory: SaleItem[]
  stockAlerts: StockAlert[]
  todaySales?: number
  monthSales?: number
  periodTotal?: number
  periodCount?: number
  topProducts?: TopProduct[]
  monthlySales?: MonthlySale[]
  period?: {
    type: string
    start_date: string
    end_date: string
    label: string
  }
  // Champs bénéfice — alimentés par DashboardController::getBeneficePeriode()
  depenses_periode?: number
  benefice_periode?: number
  depenses_history?: Array<{ date: string; montant: number }>


  
}