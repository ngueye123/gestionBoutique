import React, { useEffect, useState } from 'react';
import { BarChart3, Package, AlertTriangle, TrendingUp, Users, Crown } from 'lucide-react';
import { DashboardStats, isEmployeUser } from '../types';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';

function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { token, user, userType } = useAuthStore();

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const response = await fetch('http://localhost:8000/api/dashboard/stats', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        const data = await response.json();
        
        if (response.ok && data) {
          setStats(data);
        } else {
          toast.error(data?.message || 'Erreur lors du chargement des statistiques');
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        toast.error('Erreur de connexion au serveur');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchStats();
    }
  }, [token]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-sm animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-6 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Impossible de charger le dashboard
          </h2>
          <p className="text-gray-600">
            Vérifiez votre connexion et réessayez
          </p>
        </div>
      </div>
    );
  }

  const getRoleInfo = () => {
    if (!user) return null;

    if (userType === 'patron') {
      return {
        icon: <Crown className="w-5 h-5 text-yellow-500" />,
        label: 'Propriétaire',
        color: 'bg-yellow-50 text-yellow-800 border-yellow-200'
      };
    } else if (isEmployeUser(user)) {
      return {
        icon: <Users className="w-5 h-5 text-blue-500" />,
        label: `Employé ${user.role}`,
        color: 'bg-blue-50 text-blue-800 border-blue-200'
      };
    }
    return null;
  };

  const roleInfo = getRoleInfo();

  return (
    <div className="space-y-6">
      {/* Header avec informations utilisateur */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tableau de bord</h1>
          <p className="text-gray-600">Vue d'ensemble de votre boutique</p>
        </div>
        {roleInfo && (
          <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${roleInfo.color}`}>
            {roleInfo.icon}
            <span className="text-sm font-medium">{roleInfo.label}</span>
          </div>
        )}
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Produits</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalProducts}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Stock Faible</p>
              <p className="text-2xl font-bold text-gray-800">{stats.lowStockProducts}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Valeur Stock</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalValue.toFixed(2)} €</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <BarChart3 className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ventes aujourd'hui</p>
              <p className="text-2xl font-bold text-gray-800">{stats.todaySales?.toFixed(2) || '0.00'} €</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Historique des ventes (7 derniers jours) */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-blue-500" />
            Ventes des 7 derniers jours
          </h2>
          <div className="space-y-3">
            {stats.salesHistory && stats.salesHistory.length > 0 ? (
              stats.salesHistory.map((sale, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600 font-medium">
                    {new Date(sale.date).toLocaleDateString('fr-FR', { 
                      weekday: 'short', 
                      day: 'numeric', 
                      month: 'short' 
                    })}
                  </span>
                  <span className={`font-semibold ${sale.amount > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                    {sale.amount.toFixed(2)} €
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <TrendingUp className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Aucune vente enregistrée</p>
              </div>
            )}
          </div>
        </div>

        {/* Alertes de stock */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-orange-500" />
            Alertes de Stock
          </h2>
          <div className="space-y-3">
            {stats.stockAlerts.length > 0 ? (
              stats.stockAlerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                  <div>
                    <p className="font-medium text-gray-800">{alert.name}</p>
                    <p className="text-sm text-gray-600">
                      Stock: {alert.stock} (Min: {alert.minStock})
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                    Stock Faible
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Aucune alerte de stock</p>
                <p className="text-sm">Tous vos produits ont un stock suffisant</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;