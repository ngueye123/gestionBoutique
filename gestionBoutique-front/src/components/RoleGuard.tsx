import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: ('patron' | 'admin' | 'vendeur' | 'caissier')[];
  requirePatron?: boolean;
  requireEmployeeAdmin?: boolean;
  fallbackPath?: string;
}

export function RoleGuard({
  children,
  allowedRoles,
  requirePatron = false,
  requireEmployeeAdmin = false,
  fallbackPath = '/'
}: RoleGuardProps) {
  const { user, isAuthLoaded } = useAuthStore();

  if (!isAuthLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Chargement...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Déterminer le type d'utilisateur
  const userType: 'patron' | 'employe' = 'prenom' in user ? 'patron' : 'employe';
  
  // Obtenir le rôle de l'employé si applicable
  const employeeRole = userType === 'employe' && 'role' in user ? user.role : null;

  // Vérification pour patron uniquement
  if (requirePatron && userType !== 'patron') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong className="font-bold">Accès refusé!</strong>
          <span className="block sm:inline"> Cette page est réservée aux propriétaires.</span>
        </div>
      </div>
    );
  }

  // Vérification pour employé admin uniquement
  if (requireEmployeeAdmin && !(userType === 'patron' || (userType === 'employe' && employeeRole === 'admin'))) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong className="font-bold">Accès refusé!</strong>
          <span className="block sm:inline"> Cette page nécessite des privilèges d'administration.</span>
        </div>
      </div>
    );
  }

  // Vérification par rôles spécifiques
  if (allowedRoles && allowedRoles.length > 0) {
    const hasAccess = userType === 'patron' 
      ? allowedRoles.includes('patron')
      : employeeRole && allowedRoles.includes(employeeRole as 'admin' | 'vendeur' | 'caissier');

    if (!hasAccess) {
      const displayRole = userType === 'patron' 
        ? 'Propriétaire' 
        : `Employé ${employeeRole}`;

      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-md">
            <strong className="font-bold">Accès refusé!</strong>
            <span className="block sm:inline mt-1">
              Votre rôle ({displayRole}) ne vous permet pas d'accéder à cette page.
            </span>
            <div className="mt-2 text-sm">
              <p>Rôles autorisés : {allowedRoles.join(', ')}</p>
            </div>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}