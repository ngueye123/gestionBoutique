import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Eye } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Product } from '../types';
import { useAuthStore } from '../store/authStore';
import { fetchWithAuth } from '../lib/fetchWithAuth';

const productSchema = z.object({
  reference: z.string().min(1, 'La référence est obligatoire'),
  name: z.string().min(1, 'Le nom est obligatoire'),
  price: z.number().min(0, 'Le prix doit être positif'),
  stock: z.number().min(0, 'Le stock doit être positif'),
  category: z.string().min(1, 'La catégorie est obligatoire'),
  min_stock: z.number().min(0, 'Le stock minimum doit être positif'),
});

type ProductForm = z.infer<typeof productSchema>;

function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewMode, setViewMode] = useState<'view' | 'edit'>('view');

  const { user } = useAuthStore();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
  });

  // Permissions
  const canManageProducts = (): boolean => {
    if (!user) return false;
    if ('prenom' in user) return true; // patron
    if ('role' in user) return user.role === 'admin' || user.role === 'vendeur';
    return false;
  };

  const getUserType = (): 'patron' | 'employe' => {
    if (!user) return 'employe';
    return 'prenom' in user ? 'patron' : 'employe';
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const resp = await fetchWithAuth(`${API_URL}/products`, {
        method: 'GET'
      });
      const data = await resp.json();
      if (resp.ok && data?.success) {
        setProducts(data.products as Product[]);
      } else {
        toast.error(data?.message || 'Erreur de chargement des produits');
      }
    } catch {
      toast.error('Erreur de chargement des produits');
    }
  };

  const onSubmit = async (form: ProductForm) => {
    if (!canManageProducts()) {
      toast.error('Vous n\'avez pas les permissions pour modifier les produits');
      return;
    }

    try {
      const url = editingProduct
        ? `${API_URL}/products/${editingProduct.id}`
        : `${API_URL}/products`;

      const method = editingProduct ? 'PUT' : 'POST';

      const resp = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const result = await resp.json();

      if (resp.ok && result?.success) {
        toast.success(editingProduct ? 'Produit mis à jour avec succès' : 'Produit ajouté avec succès');
        await fetchProducts();
        setIsModalOpen(false);
        reset();
        setEditingProduct(null);
      } else {
        toast.error(result?.message || 'Erreur lors de la sauvegarde');
      }
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (id: string) => {
    if (!canManageProducts()) {
      toast.error('Vous n\'avez pas les permissions pour supprimer les produits');
      return;
    }

    if (!confirm('Voulez-vous vraiment supprimer ce produit ?')) return;

    try {
      const resp = await fetchWithAuth(`${API_URL}/products/${id}`, {
        method: 'DELETE'
      });
      const result = await resp.json();
      if (resp.ok && result?.success) {
        toast.success('Produit supprimé !');
        await fetchProducts();
      } else {
        toast.error(result?.message || 'Erreur lors de la suppression');
      }
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const openModal = (mode: 'view' | 'edit', product?: Product) => {
    setViewMode(mode);
    if (product) {
      setEditingProduct(product);
      reset(product);
    } else {
      setEditingProduct(null);
      reset();
    }
    setIsModalOpen(true);
  };

  const getPermissionBadge = () => {
    if (!user || getUserType() === 'patron') return null;

    const roleColors = {
      admin: 'bg-green-100 text-green-800',
      vendeur: 'bg-blue-100 text-blue-800',
      caissier: 'bg-purple-100 text-purple-800'
    };

    const userRole = ('role' in user) ? (user.role as keyof typeof roleColors) : 'caissier';

    return (
      <div className="mb-4 p-3 rounded-lg bg-gray-50">
        <p className="text-sm text-gray-600">
          Connecté en tant qu'employé{' '}
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColors[userRole]}`}>
            {userRole}
          </span>
        </p>
        {!canManageProducts() && (
          <p className="text-xs text-orange-600 mt-1">
            ⚠️ Vous êtes en mode lecture seule
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {getPermissionBadge()}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Produits</h1>
          <p className="text-gray-600">
            {products.length} produit{products.length > 1 ? 's' : ''}
          </p>
        </div>

        {canManageProducts() && (
          <button
            onClick={() => openModal('edit')}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un produit
          </button>
        )}
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Référence</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Catégorie</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prix</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">{product.reference}</td>
                <td className="px-6 py-4 whitespace-nowrap font-medium">{product.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{product.category}</td>
                <td className="px-6 py-4 whitespace-nowrap font-semibold">{product.price.toFixed(2)} F</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    product.stock <= product.min_stock
                      ? 'bg-red-100 text-red-800'
                      : product.stock <= product.min_stock * 2
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {product.stock} unités
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openModal('view', product)}
                      className="text-gray-600 hover:text-gray-900"
                      title="Voir les détails"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {canManageProducts() && (
                      <>
                        <button
                          onClick={() => openModal('edit', product)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Modifier"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {products.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Aucun produit trouvé
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {viewMode === 'view'
                ? 'Détails du produit'
                : editingProduct
                ? 'Modifier le produit'
                : 'Ajouter un produit'
              }
            </h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Référence</label>
                <input
                  type="text"
                  {...register('reference')}
                  disabled={viewMode === 'view'}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 disabled:bg-gray-100"
                />
                {errors.reference && (
                  <p className="text-red-500 text-sm mt-1">{errors.reference.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Nom</label>
                <input
                  type="text"
                  {...register('name')}
                  disabled={viewMode === 'view'}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 disabled:bg-gray-100"
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Catégorie</label>
                <input
                  type="text"
                  {...register('category')}
                  disabled={viewMode === 'view'}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 disabled:bg-gray-100"
                />
                {errors.category && (
                  <p className="text-red-500 text-sm mt-1">{errors.category.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Prix (FCFA)</label>
                <input
                  type="number"
                  step="0.01"
                  {...register('price', { valueAsNumber: true })}
                  disabled={viewMode === 'view'}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 disabled:bg-gray-100"
                />
                {errors.price && (
                  <p className="text-red-500 text-sm mt-1">{errors.price.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Stock</label>
                <input
                  type="number"
                  {...register('stock', { valueAsNumber: true })}
                  disabled={viewMode === 'view'}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 disabled:bg-gray-100"
                />
                {errors.stock && (
                  <p className="text-red-500 text-sm mt-1">{errors.stock.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Stock minimum</label>
                <input
                  type="number"
                  {...register('min_stock', { valueAsNumber: true })}
                  disabled={viewMode === 'view'}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 disabled:bg-gray-100"
                />
                {errors.min_stock && (
                  <p className="text-red-500 text-sm mt-1">{errors.min_stock.message}</p>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingProduct(null);
                    reset();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  {viewMode === 'view' ? 'Fermer' : 'Annuler'}
                </button>

                {viewMode === 'edit' && canManageProducts() && (
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                  >
                    {editingProduct ? 'Mettre à jour' : 'Ajouter'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Products;
