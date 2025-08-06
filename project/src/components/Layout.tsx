import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

function Layout() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md">
        <div className="p-4">
          <h2 className="text-xl font-bold">Shop Manager</h2>
          <p className="text-sm text-gray-600">{user?.prenom} {user?.nom}</p>
        </div>
        <nav className="mt-8">
          <Link to="/" className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100">
            <LayoutDashboard className="w-5 h-5 mr-2" />
            Dashboard
          </Link>
          <Link to="/products" className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100">
            <Package className="w-5 h-5 mr-2" />
            Products
          </Link>
          <Link to="/pos" className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100">
            <ShoppingCart className="w-5 h-5 mr-2" />
            Point of Sale
          </Link>

          <Link to="/employes" className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100">
          <Package className="w-5 h-5 mr-2" />
          Employés
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100"
          >
            <LogOut className="w-5 h-5 mr-2" />
            Logout
          </button>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;