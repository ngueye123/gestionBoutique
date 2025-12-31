import React, { useEffect, useState } from 'react';
import { BarChart3, Package, AlertTriangle, TrendingUp, Users, Crown, Calendar, Filter } from 'lucide-react';
import { DashboardStats } from '../types';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';

type PeriodType = '7days' | 'month' | 'last_month' | 'custom';

function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodType>('7days');
  const [customDates, setCustomDates] = useState({
    start: '',
    end: ''
  });
  const [showCustomDates, setShowCustomDates] = useState(false);
  
  const { token, user, userType } = useAuthStore();

  useEffect(() => {
    if (token) {
      fetchStats();
    }
  }, [token, period]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      let url = `http://localhost:8000/api/dashboard/stats?period=${period}`;
      
      if (period === 'custom' && customDates.start && customDates.end) {
        url += `&start_date=${customDates.start}&end_date=${customDates.end}`;
      }

      const response = await fetch(url, {
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

  const handlePeriodChange = (newPeriod: PeriodType) => {
    setPeriod(newPeriod);
    if (newPeriod === 'custom') {
      setShowCustomDates(true);
    } else {
      setShowCustomDates(false);
    }
  };

  const handleCustomDateApply = () => {
    if (!customDates.start || !customDates.end) {
      toast.error('Veuillez sélectionner les dates de début et fin');
      return;
    }
    if (new Date(customDates.start) > new Date(customDates.end)) {
      toast.error('La date de début doit être antérieure à la date de fin');
      return;
    }
    fetchStats();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Tableau de bord</h1>
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
            Impossible de charger le tableau de bord
          </h2>
          <p className="text-gray-600">Vérifiez votre connexion et réessayez</p>
        </div>
      </div>
    );
  }

  const getRoleInfo = () => {
    if (userType === 'patron') {
      return {
        icon: <Crown className="w-5 h-5 text-yellow-500" />,
        label: 'Propriétaire',
        color: 'bg-yellow-50 text-yellow-800 border-yellow-200'
      };
    } else {
      return {
        icon: <Users className="w-5 h-5 text-blue-500" />,
        label: `Employé ${user?.role}`,
        color: 'bg-blue-50 text-blue-800 border-blue-200'
      };
    }
  };

  const roleInfo = getRoleInfo();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tableau de bord</h1>
          <p className="text-gray-600">Vue d'ensemble de votre boutique</p>
        </div>
        <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${roleInfo.color}`}>
          {roleInfo.icon}
          <span className="text-sm font-medium">{roleInfo.label}</span>
        </div>
      </div>

      {/* Filtres de période */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <span className="font-medium text-gray-700">Période :</span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handlePeriodChange('7days')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                period === '7days'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              7 derniers jours
            </button>
            <button
              onClick={() => handlePeriodChange('month')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                period === 'month'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Ce mois-ci
            </button>
            <button
              onClick={() => handlePeriodChange('last_month')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                period === 'last_month'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Mois dernier
            </button>
            <button
              onClick={() => handlePeriodChange('custom')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                period === 'custom'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Calendar className="w-4 h-4 mr-1" />
              Personnalisé
            </button>
          </div>
        </div>

        {/* Dates personnalisées */}
        {showCustomDates && (
          <div className="mt-4 flex flex-wrap items-end gap-3 pt-4 border-t">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de début
              </label>
              <input
                type="date"
                value={customDates.start}
                onChange={(e) => setCustomDates({ ...customDates, start: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de fin
              </label>
              <input
                type="date"
                value={customDates.end}
                onChange={(e) => setCustomDates({ ...customDates, end: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={handleCustomDateApply}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Appliquer
            </button>
          </div>
        )}

        {/* Label de la période */}
        {stats.period && (
          <div className="mt-3 text-sm text-gray-600">
            <span className="font-medium">Affichage :</span> {stats.period.label}
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
              <p className="text-sm font-medium text-gray-600">Ventes période</p>
              <p className="text-2xl font-bold text-gray-800">{stats.periodTotal?.toFixed(2) || '0.00'} F</p>
              <p className="text-xs text-gray-500">{stats.periodCount || 0} vente(s)</p>
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
              <p className="text-2xl font-bold text-gray-800">{stats.todaySales?.toFixed(2) || '0.00'} F</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Historique des ventes */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-blue-500" />
            Ventes de la période
          </h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {stats.salesHistory && stats.salesHistory.length > 0 ? (
              stats.salesHistory.map((sale, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div>
                    <span className="text-gray-600 font-medium">
                      {new Date(sale.date).toLocaleDateString('fr-FR', { 
                        weekday: 'short', 
                        day: 'numeric', 
                        month: 'short' 
                      })}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      ({sale.count || 0} vente{(sale.count || 0) > 1 ? 's' : ''})
                    </span>
                  </div>
                  <span className={`font-semibold ${sale.amount > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                    {sale.amount.toFixed(2)} F
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <TrendingUp className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Aucune vente sur cette période</p>
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
          <div className="space-y-3 max-h-96 overflow-y-auto">
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

      {/* Top produits vendus */}
      {stats.topProducts && stats.topProducts.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-green-500" />
            Top 5 des produits vendus
          </h2>
          <div className="space-y-3">
            {stats.topProducts.map((product, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center flex-1">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm mr-3">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium text-gray-800">{product.nom}</p>
                    <p className="text-sm text-gray-600">{product.quantite} unités vendues</p>
                  </div>
                </div>
                <span className="font-semibold text-green-600">
                  {product.ventes.toFixed(2)} €
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;