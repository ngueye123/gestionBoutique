// src/pages/Products.tsx

import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Edit2, Trash2, Eye, Search, Package,
  AlertTriangle, TrendingDown, TrendingUp, Wallet, X, Check,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Product } from '../types';
import { useAuthStore } from '../store/authStore';
import { fetchWithAuth } from '../lib/fetchWithAuth';
import { getApiErrorMessage } from '../lib/apiError';
import {
  UNIT_CONFIG, UNIT_TYPE_LABELS, compatibleUnits, toBase, fromBase, type UnitType,
} from '../lib/unitConverter';

// ─── Validation Zod ─────────────────────────────────────────────────────────

const productSchema = z.object({
  reference: z.string().optional(),
  name:      z.string().min(1, 'Le nom est obligatoire'),
  price:     z.number().min(0, 'Le prix doit être positif'),
  prix_achat: z.number().min(0, "Le prix d'achat doit être positif").optional().nullable(),
  stock:     z.number().min(0, 'Le stock doit être positif'),
  category:  z.string().min(1, 'La catégorie est obligatoire'),
  min_stock: z.number().min(0, 'Le stock minimum doit être positif'),
  unit_type: z.enum(['piece', 'masse', 'volume', 'longueur']),
  unit_reference: z.string().min(1, "L'unité est obligatoire"),
});

type ProductForm = z.infer<typeof productSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Formatte un montant sans arrondi, préservant les décimales telles qu'en base */
const fmt = (n: number | null | undefined) => {
  if (n === null || n === undefined || !isFinite(n as number)) return '0 F';
  const s = String(n);
  if (s.toLowerCase().includes('e')) {
    return (n as number).toLocaleString('fr-FR', { maximumFractionDigits: 6 }) + ' F';
  }
  const [intPart, fracPart] = s.split('.');
  const intNumber = Number(intPart);
  const intFormatted = intNumber.toLocaleString('fr-FR');
  if (!fracPart || /^0+$/.test(fracPart)) return `${intFormatted} F`;
  const fracTrimmed = fracPart.replace(/0+$/u, '');
  return `${intFormatted},${fracTrimmed} F`;
};

// Arrondit à 3 décimales et retire les zéros inutiles (250, 0.5, 1.25…)
const formatQty = (n: number) => Number(n.toFixed(3)).toString();

const unitLabel = (type: UnitType, unit: string) => UNIT_CONFIG[type].labels[unit] ?? unit;

const generateProductReference = (name: string): string => {
  const cleaned = name
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}+/gu, '')
    .replace(/[^A-Z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '') || 'PRODUIT';

  return `${cleaned}-${Math.floor(1000 + Math.random() * 9000)}`;
};

// Quantité affichable dans l'unité de référence du produit (le stock est stocké en unité de base)
const displayQty = (product: Product, baseQty: number) =>
  `${formatQty(fromBase(product.unit_type, product.unit_reference, baseQty))} ${unitLabel(product.unit_type, product.unit_reference)}`;

// Retourne la config visuelle du badge stock
const stockConfig = (product: Product): {
  label: string;
  className: string;
  icon: React.ReactNode;
} => {
  if (product.stock === 0) return {
    label: 'Rupture',
    className: 'bg-red-100 text-red-700',
    icon: <X className="w-3 h-3" />,
  };
  if (product.stock <= product.min_stock) return {
    label: displayQty(product, product.stock),
    className: 'bg-orange-100 text-orange-700',
    icon: <AlertTriangle className="w-3 h-3" />,
  };
  if (product.stock <= product.min_stock * 2) return {
    label: displayQty(product, product.stock),
    className: 'bg-yellow-100 text-yellow-700',
    icon: <AlertTriangle className="w-3 h-3" />,
  };
  return {
    label: displayQty(product, product.stock),
    className: 'bg-green-100 text-green-700',
    icon: <Check className="w-3 h-3" />,
  };
};

// ─── Composant champ de formulaire ────────────────────────────────────────────

interface FieldProps {
  label: string
  error?: string
  children: React.ReactNode
}

function Field({ label, error, children }: FieldProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 uppercase
                         tracking-wide mb-1.5">
        {label}
      </label>
      {children}
      {error && (
        <p className="text-red-500 text-xs mt-1">{error}</p>
      )}
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

type StockFilter = 'all' | 'low' | 'rupture';
type ViewMode    = 'view' | 'edit';

function Products() {
  const [products, setProducts]           = useState<Product[]>([]);
  const [loading, setLoading]             = useState(true);
  const [submitting, setSubmitting]       = useState(false);
  const [isModalOpen, setIsModalOpen]     = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewMode, setViewMode]           = useState<ViewMode>('view');

  // Pagination
  const PAGE_SIZE = 15;
  const [currentPage, setCurrentPage] = useState(1);

  // Filtres
  const [searchTerm, setSearchTerm]       = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter]     = useState<StockFilter>('all');

  const { user } = useAuthStore();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
  });

  const referenceValue = watch('reference');
  const productNameValue = watch('name');
  const selectedUnitType = (watch('unit_type') || 'piece') as UnitType;
  const selectedUnitReference = watch('unit_reference') || compatibleUnits(selectedUnitType)[0];

  // ── Permissions (logique identique à l'original) ──────────────────────────

  const canManageProducts = (): boolean => {
    if (!user) return false;
    if ('prenom' in user) return true;
    if ('role' in user) return user.role === 'admin' || user.role === 'vendeur';
    return false;
  };

  const getUserType = (): 'patron' | 'employe' => {
    if (!user) return 'employe';
    return 'prenom' in user ? 'patron' : 'employe';
  };

  // ── Chargement ────────────────────────────────────────────────────────────

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res  = await fetchWithAuth(`${API_URL}/products`);
      const data = await res.json();
      if (res.ok && data?.success) {
        setProducts(data.products as Product[]);
      } else {
        toast.error(getApiErrorMessage(data, 'Impossible de charger les produits.'));
      }
    } catch {
      toast.error('Impossible de charger les produits. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  };

  // ── Soumission formulaire ─────────────────────────────────────────────────

  const onSubmit = async (form: ProductForm) => {
    if (!canManageProducts()) {
      toast.error('Permissions insuffisantes'); return;
    }

    setSubmitting(true);
    try {
      const url    = editingProduct
        ? `${API_URL}/products/${editingProduct.id}`
        : `${API_URL}/products`;
      const method = editingProduct ? 'PUT' : 'POST';

      // Le formulaire saisit stock/min_stock dans unit_reference (plus intuitif),
      // on convertit vers l'unité de base attendue par l'API avant l'envoi.
      const payload = {
        ...form,
        stock: toBase(form.unit_type, form.unit_reference, form.stock),
        min_stock: toBase(form.unit_type, form.unit_reference, form.min_stock),
      };

      const res    = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (res.ok && result?.success) {
        toast.success(editingProduct ? 'Produit mis à jour' : 'Produit ajouté');
        await fetchProducts();
        closeModal();
      } else {
        toast.error(getApiErrorMessage(result, editingProduct ? 'Impossible de mettre à jour le produit.' : 'Impossible d\'ajouter le produit.'));
      }
    } catch {
      toast.error(editingProduct ? 'Impossible de mettre à jour le produit. Vérifiez votre connexion.' : 'Impossible d\'ajouter le produit. Vérifiez votre connexion.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Suppression ───────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    if (!canManageProducts()) {
      toast.error('Permissions insuffisantes'); return;
    }
    if (!confirm('Voulez-vous vraiment supprimer ce produit ?')) return;

    try {
      const res    = await fetchWithAuth(`${API_URL}/products/${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (res.ok && result?.success) {
        toast.success('Produit supprimé');
        await fetchProducts();
      } else {
        toast.error(getApiErrorMessage(result, 'Impossible de supprimer le produit.'));
      }
    } catch {
      toast.error('Impossible de supprimer le produit. Vérifiez votre connexion.');
    }
  };

  // ── Gestion modal ─────────────────────────────────────────────────────────

  const openModal = (mode: ViewMode, product?: Product) => {
    setViewMode(mode);
    if (product) {
      setEditingProduct(product);
      reset({
        ...product,
        // le formulaire affiche/édite le stock dans unit_reference, pas en unité de base
        stock: fromBase(product.unit_type, product.unit_reference, product.stock),
        min_stock: fromBase(product.unit_type, product.unit_reference, product.min_stock),
      });
    } else {
      setEditingProduct(null);
      reset({ reference: '', name: '', price: 0, prix_achat: undefined, stock: 0, category: '', min_stock: 0, unit_type: 'piece', unit_reference: 'piece' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    reset();
  };

  React.useEffect(() => {
    if (productNameValue && !referenceValue) {
      setValue('reference', generateProductReference(productNameValue));
    }
  }, [productNameValue, referenceValue, setValue]);

  // ── Données dérivées ──────────────────────────────────────────────────────

  // Liste des catégories uniques pour le filtre
  const categories = useMemo(() =>
    [...new Set(products.map(p => p.category).filter(Boolean))].sort(),
    [products]
  );

  // Produits filtrés (recherche + catégorie + stock)
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = !searchTerm ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.reference.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCategory = !categoryFilter || p.category === categoryFilter;

      const matchStock =
        stockFilter === 'all'     ? true :
        stockFilter === 'rupture' ? p.stock === 0 :
        /* low */                   p.stock > 0 && p.stock <= p.min_stock;

      return matchSearch && matchCategory && matchStock;
    });
  }, [products, searchTerm, categoryFilter, stockFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, stockFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredProducts.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredProducts, currentPage]);

  // KPIs
  const kpis = useMemo(() => {
      const avecPrixAchat = products.filter(p => p.prix_achat != null && p.prix_achat > 0);

      // Somme des marges totales (FCFA), sur les produits où prix_achat est renseigné
      const margeTotale = avecPrixAchat.length > 0
    ? avecPrixAchat.reduce((s, p) => {
        const conversionFactor = UNIT_CONFIG[p.unit_type].factors[p.unit_reference];
        const margeUnitaire = p.price - (p.prix_achat as number);
        
        return s + (margeUnitaire / conversionFactor) * p.stock;
      }, 0)
    : null;

      return {
        total:    products.length,
        low:      products.filter(p => p.stock > 0 && p.stock <= p.min_stock).length,
        rupture:  products.filter(p => p.stock === 0).length,
        valeur:   products.reduce(
          (s, p) => s + (p.prix_achat as number / UNIT_CONFIG[p.unit_type].factors[p.unit_reference]) * p.stock,
          0
        ),
        margeTotale,
        nbSansPrixAchat: products.length - avecPrixAchat.length,
      };
    }, [products]);

  // ─── Rendu ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 max-w-6xl mx-auto">

      {/* ── Badge rôle employé ────────────────────────────────────────────── */}
      {getUserType() === 'employe' && user && 'role' in user && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50
                        border border-gray-200 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Connecté en tant qu'employé</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium
              ${user.role === 'admin'   ? 'bg-green-100 text-green-700' :
                user.role === 'vendeur' ? 'bg-blue-100 text-blue-700' :
                                          'bg-purple-100 text-purple-700'}`}>
              {user.role}
            </span>
          </div>
          {!canManageProducts() && (
            <span className="text-xs text-orange-600 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Mode lecture seule
            </span>
          )}
        </div>
      )}

      {/* ── KPIs ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          {
            label: 'Total produits',
            value: kpis.total,
            sub:   'en catalogue',
            icon:  <Package className="w-5 h-5" />,
            color: '#3b82f6',
            valueColor: undefined,
          },
          {
            label: 'Stock faible',
            value: kpis.low,
            sub:   'en dessous du min',
            icon:  <AlertTriangle className="w-5 h-5" />,
            color: '#f59e0b',
            valueColor: kpis.low > 0 ? '#d97706' : undefined,
          },
          {
            label: 'En rupture',
            value: kpis.rupture,
            sub:   'stock à zéro',
            icon:  <TrendingDown className="w-5 h-5" />,
            color: '#ef4444',
            valueColor: kpis.rupture > 0 ? '#dc2626' : undefined,
          },
          {
            label: 'Valeur du stock',
            value: fmt(kpis.valeur),
            sub:   'prix × quantité',
            icon:  <Wallet className="w-5 h-5" />,
            color: '#8b5cf6',
            valueColor: undefined,
          },
          {
            label: 'Marge totale',
            value: kpis.margeTotale != null ? fmt(kpis.margeTotale) : '—',
            sub:   kpis.nbSansPrixAchat > 0
              ? `${kpis.nbSansPrixAchat} produit${kpis.nbSansPrixAchat > 1 ? 's' : ''} sans prix d'achat`
              : 'cumul prix vente − prix achat',
            icon:  <TrendingUp className="w-5 h-5" />,
            color: kpis.margeTotale != null && kpis.margeTotale < 0 ? '#ef4444' : '#16a34a',
            valueColor: kpis.margeTotale != null && kpis.margeTotale < 0 ? '#dc2626' : undefined,
          },
        ].map(kpi => (
          <div key={kpi.label}
               style={{ paddingLeft: '1.25rem', position: 'relative' }}
               className="bg-gray-50 rounded-xl p-4 overflow-hidden">
            {/* Barre accent */}
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0,
              width: 3, background: kpi.color, borderRadius: '3px 0 0 3px',
            }} />
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{kpi.label}</p>
            <p className="text-2xl font-medium"
               style={{ color: kpi.valueColor ?? 'inherit' }}>
              {kpi.value}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{kpi.sub}</p>
            {/* Icône fantôme */}
            <div style={{
              position: 'absolute', right: 10, top: '50%',
              transform: 'translateY(-50%)', opacity: 0.1,
            }}>
              {kpi.icon}
            </div>
          </div>
        ))}
      </div>

      {/* ── En-tête + bouton ajout ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-medium text-gray-900">Produits</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {filteredProducts.length} / {products.length} produit{products.length > 1 ? 's' : ''}
            {categories.length > 0 && ` · ${categories.length} catégories`}
          </p>
        </div>
        {canManageProducts() && (
          <button
            onClick={() => openModal('edit')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white
                       rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Ajouter un produit
          </button>
        )}
      </div>

      {/* ── Barre de filtres ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">

        {/* Recherche */}
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom ou référence..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg
                       text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300
                         hover:text-gray-500 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filtre catégorie */}
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm
                     text-gray-600 focus:ring-2 focus:ring-blue-500 transition"
        >
          <option value="">Toutes les catégories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        {/* Filtre stock */}
        <div className="flex gap-1.5">
          {([
            { value: 'all',     label: 'Tous' },
            { value: 'low',     label: 'Stock faible' },
            { value: 'rupture', label: 'Rupture' },
          ] as const).map(f => (
            <button
              key={f.value}
              onClick={() => setStockFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                ${stockFilter === f.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
            >
              {f.label}
              {/* Badge compteur */}
              {f.value === 'low' && kpis.low > 0 && (
                <span className="ml-1.5 bg-orange-200 text-orange-800
                                 text-xs px-1.5 rounded-full">
                  {kpis.low}
                </span>
              )}
              {f.value === 'rupture' && kpis.rupture > 0 && (
                <span className="ml-1.5 bg-red-200 text-red-800
                                 text-xs px-1.5 rounded-full">
                  {kpis.rupture}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tableau ───────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="space-y-0">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-4 px-5 py-4 border-b border-gray-100
                                      last:border-b-0 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-24" />
                <div className="h-4 bg-gray-100 rounded flex-1" />
                <div className="h-4 bg-gray-100 rounded w-20" />
                <div className="h-4 bg-gray-100 rounded w-16" />
                <div className="h-5 bg-gray-100 rounded-full w-24" />
                <div className="h-4 bg-gray-100 rounded w-16" />
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-3 text-gray-200" />
            <p className="font-medium text-gray-500">Aucun produit trouvé</p>
            <p className="text-sm mt-1">
              {searchTerm || categoryFilter || stockFilter !== 'all'
                ? 'Essayez de modifier vos filtres'
                : 'Ajoutez votre premier produit'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-400
                                   uppercase tracking-wider">
                      Référence
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-400
                                   uppercase tracking-wider">
                      Nom
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-400
                                   uppercase tracking-wider">
                      Catégorie
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-400
                                   uppercase tracking-wider">
                      Prix d'achat
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-400
                                   uppercase tracking-wider">
                      Prix de vente
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-400
                                   uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-400
                                   uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginatedProducts.map(product => {
                    const stock = stockConfig(product);
                    return (
                      <tr key={product.id}
                          className="hover:bg-gray-50 transition-colors group">

                      {/* Référence */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="font-mono text-xs text-gray-400
                                         bg-gray-100 px-2 py-0.5 rounded">
                          {product.reference}
                        </span>
                      </td>

                      {/* Nom */}
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-medium text-gray-900">{product.name}</p>
                      </td>

                      {/* Catégorie */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100
                                         text-gray-600 border border-gray-200">
                          {product.category}
                        </span>
                      </td>
                      {/* Prix d'achat */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {product.prix_achat != null ? (
                          <span className="text-sm font-medium text-gray-900">
                            {fmt(product.prix_achat)}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      {/* Prix de vente */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {fmt(product.price)}
                        </span>
                        <span className="text-xs text-gray-400">
                          {' '}/ {unitLabel(product.unit_type, product.unit_reference)}
                        </span>
                      </td>

                      {/* Stock */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1
                                          rounded-full text-xs font-medium ${stock.className}`}>
                          {stock.icon}
                          {stock.label}
                        </span>
                        {/* Min stock en sous-texte */}
                        <p className="text-xs text-gray-300 mt-0.5">
                          min : {displayQty(product, product.min_stock)}
                        </p>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openModal('view', product)}
                            title="Voir les détails"
                            className="w-7 h-7 rounded-lg border border-gray-200 flex items-center
                                       justify-center text-gray-400 hover:border-gray-300
                                       hover:bg-gray-100 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {canManageProducts() && (
                            <>
                              <button
                                onClick={() => openModal('edit', product)}
                                title="Modifier"
                                className="w-7 h-7 rounded-lg border border-gray-200 flex items-center
                                           justify-center text-gray-400 hover:border-blue-400
                                           hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(product.id)}
                                title="Supprimer"
                                className="w-7 h-7 rounded-lg border border-gray-200 flex items-center
                                           justify-center text-gray-400 hover:border-red-400
                                           hover:text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-4 border-t border-gray-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500">
              Affichage {filteredProducts.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}
              {' '}–{' '}{Math.min(currentPage * PAGE_SIZE, filteredProducts.length)} sur {filteredProducts.length} produit{filteredProducts.length > 1 ? 's' : ''}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded-lg text-sm font-medium border transition-colors
                  disabled:opacity-40 disabled:cursor-not-allowed
                  bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              >
                Précédent
              </button>
              <div className="flex items-center gap-1 overflow-x-auto">
                {Array.from({ length: totalPages }, (_, index) => {
                  const page = index + 1;
                  return (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${currentPage === page ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 rounded-lg text-sm font-medium border transition-colors
                  disabled:opacity-40 disabled:cursor-not-allowed
                  bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              >
                Suivant
              </button>
            </div>
          </div>
        </>
      )}
      </div>

      {/* ── Modal vue / édition ───────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">

            {/* Header modal */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-medium text-gray-900">
                  {viewMode === 'view'
                    ? 'Détails du produit'
                    : editingProduct
                      ? 'Modifier le produit'
                      : 'Nouveau produit'}
                </h2>
                {editingProduct && (
                  <p className="text-xs text-gray-400 mt-0.5 font-mono">
                    {editingProduct.reference}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Basculer vers édition depuis la vue */}
                {viewMode === 'view' && canManageProducts() && editingProduct && (
                  <button
                    onClick={() => setViewMode('edit')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-600
                               border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <Edit2 className="w-3 h-3" />
                    Modifier
                  </button>
                )}
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Corps modal */}
            <form onSubmit={handleSubmit(onSubmit)}
                  className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">

              {/* Mode vue : affichage en lecture seule stylisé */}
              {viewMode === 'view' && editingProduct ? (
                <div className="space-y-3">
                  {[
                    { label: 'Référence',      value: editingProduct.reference, mono: true },
                    { label: 'Nom',             value: editingProduct.name },
                    { label: 'Catégorie',       value: editingProduct.category },
                    { label: "Type d'unité",    value: UNIT_TYPE_LABELS[editingProduct.unit_type] },
                    { label: 'Prix',            value: `${fmt(editingProduct.price)} / ${unitLabel(editingProduct.unit_type, editingProduct.unit_reference)}` },
                    { label: "Prix d'achat",    value: editingProduct.prix_achat != null ? fmt(editingProduct.prix_achat) : 'Non renseigné' },
                    { label: 'Stock actuel',    value: displayQty(editingProduct, editingProduct.stock) },
                    { label: 'Stock minimum',   value: displayQty(editingProduct, editingProduct.min_stock) },
                  ].map(row => (
                    <div key={row.label}
                         className="flex items-center justify-between py-2.5 px-3
                                    bg-gray-50 rounded-lg">
                      <span className="text-xs text-gray-400 uppercase tracking-wide font-medium">
                        {row.label}
                      </span>
                      <span className={`text-sm font-medium text-gray-900
                                        ${row.mono ? 'font-mono text-xs text-gray-500' : ''}`}>
                        {row.value}
                      </span>
                    </div>
                  ))}

                  {/* Badge stock en vue */}
                  <div className="flex items-center justify-between py-2.5 px-3
                                  bg-gray-50 rounded-lg">
                    <span className="text-xs text-gray-400 uppercase tracking-wide font-medium">
                      État du stock
                    </span>
                    {(() => {
                      const sc = stockConfig(editingProduct);
                      return (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1
                                          rounded-full text-xs font-medium ${sc.className}`}>
                          {sc.icon}
                          {sc.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>

              ) : (
                /* Mode édition : formulaire complet */
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {editingProduct ? (
                      <Field label="Référence" error={errors.reference?.message}>
                        <input
                          type="text"
                          {...register('reference')}
                          placeholder="REF-001"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm
                                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                                     placeholder-gray-300 font-mono transition"
                        />
                      </Field>
                    ) : (
                      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
                        Référence générée automatiquement après enregistrement.
                      </div>
                    )}

                    <Field label="Categorie" error={errors.category?.message}>
                      <input
                        type="text"
                        {...register('category')}
                        placeholder="Alimentation"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm
                                   focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                                   placeholder-gray-300 transition"
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Type d'unité" error={errors.unit_type?.message}>
                      <select
                        {...register('unit_type')}
                        onChange={e => {
                          const type = e.target.value as UnitType;
                          setValue('unit_type', type);
                          setValue('unit_reference', compatibleUnits(type)[0]);
                        }}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm
                                   focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                      >
                        {(Object.keys(UNIT_TYPE_LABELS) as UnitType[]).map(t => (
                          <option key={t} value={t}>{UNIT_TYPE_LABELS[t]}</option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Unité de référence" error={errors.unit_reference?.message}>
                      <select
                        {...register('unit_reference')}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm
                                   focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                      >
                        {compatibleUnits(selectedUnitType).map(u => (
                          <option key={u} value={u}>{unitLabel(selectedUnitType, u)}</option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <Field label="Nom du produit" error={errors.name?.message}>
                    <input
                      type="text"
                      {...register('name')}
                      placeholder="Ex : Riz parfumé 5kg"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm
                                 focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                                 placeholder-gray-300 transition"
                    />
                  </Field>

                  <Field label="Prix d'achat (FCFA, optionnel)" error={errors.prix_achat?.message}>
                    <div className="relative">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        {...register('prix_achat', { setValueAs: (v) => (v === '' || isNaN(Number(v)) ? null : Number(v)) })}
                        placeholder="Non renseigné"
                        className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm
                                   focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                                   placeholder-gray-300 transition"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                        F
                      </span>
                    </div>
                  </Field>

                  <Field label={`Prix (FCFA / ${unitLabel(selectedUnitType, selectedUnitReference)})`} error={errors.price?.message}>
                    <div className="relative">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        {...register('price', { valueAsNumber: true })}
                        placeholder="0"
                        className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm
                                   focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                                   placeholder-gray-300 transition"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                        F
                      </span>
                    </div>
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label={`Stock actuel (${unitLabel(selectedUnitType, selectedUnitReference)})`} error={errors.stock?.message}>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        {...register('stock', { valueAsNumber: true })}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm
                                   focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                                   placeholder-gray-300 transition"
                      />
                    </Field>

                    <Field label={`Stock minimum (${unitLabel(selectedUnitType, selectedUnitReference)})`} error={errors.min_stock?.message}>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        {...register('min_stock', { valueAsNumber: true })}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm
                                   focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                                   placeholder-gray-300 transition"
                      />
                    </Field>
                  </div>
                </>
              )}
            </form>

            {/* Footer modal */}
            <div className="px-5 py-4 border-t border-gray-100 flex gap-2 justify-end">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm
                           text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {viewMode === 'view' ? 'Fermer' : 'Annuler'}
              </button>

              {viewMode === 'edit' && canManageProducts() && (
                <button
                  onClick={handleSubmit(onSubmit)}
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm
                             font-medium flex items-center gap-2 hover:bg-blue-700
                             transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30
                                       border-t-white rounded-full animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>{editingProduct ? 'Mettre à jour' : 'Ajouter'}</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Products;