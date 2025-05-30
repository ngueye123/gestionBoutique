import React, { useEffect, useState } from 'react';
import { BarChart3, Package, AlertTriangle, TrendingUp } from 'lucide-react';
import { DashboardStats } from '../types';

function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/dashboard/stats', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      }
    };

    fetchStats();
  }, []);

  if (!stats) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total produit</p>
              <p className="text-2xl font-bold">{stats.totalProducts}</p>
            </div>
            <Package className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Low Stock Items</p>
              <p className="text-2xl font-bold">{stats.lowStockProducts}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Valeur total du stock</p>
              <p className="text-2xl font-bold">${stats.totalValue.toFixed(2)}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Stock Movements</p>
              <p className="text-2xl font-bold">{stats.stockMovements}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Sales History */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Sales History</h2>
        <div className="space-y-4">
          {stats.salesHistory.map((sale, index) => (
            <div key={index} className="flex items-center justify-between border-b pb-2">
              <span className="text-gray-600">{sale.date}</span>
              <span className="font-medium">${sale.amount.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stock Alerts */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Low Stock Alerts</h2>
        <div className="space-y-4">
          {stats.stockAlerts.map((alert) => (
            <div key={alert.id} className="flex items-center justify-between border-b pb-2">
              <div>
                <p className="font-medium">{alert.name}</p>
                <p className="text-sm text-gray-600">Stock: {alert.stock} (Min: {alert.minStock})</p>
              </div>
              <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                Low Stock
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;