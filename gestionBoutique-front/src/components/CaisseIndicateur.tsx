// src/components/CaisseIndicateur.tsx
import React, { useEffect } from 'react';
import { Wallet, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';
import { useCaisse } from '../hooks/useCaisse';

/**
 * Petit widget à afficher dans la sidebar ou en haut du POS
 * pour voir le solde caisse en temps réel.
 */
export function CaisseIndicateur() {
  const { caisse, statut, loading, chargerMaCaisse, getPourcentage } = useCaisse();

  useEffect(() => {
    chargerMaCaisse();
    // Rafraîchir toutes les 60 secondes
    const interval = setInterval(chargerMaCaisse, 60_000);
    return () => clearInterval(interval);
  }, [chargerMaCaisse]);

  if (loading || !caisse) {
    return (
      <div className="bg-gray-100 rounded-lg p-3 animate-pulse h-16" />
    );
  }

  const pct     = getPourcentage();
  const couleur = statut?.couleur ?? 'green';

  const barClass = {
    green:  'bg-green-500',
    orange: 'bg-orange-400',
    red:    'bg-red-500',
  }[couleur];

  const textClass = {
    green:  'text-green-700',
    orange: 'text-orange-700',
    red:    'text-red-700',
  }[couleur];

  const bgClass = {
    green:  'bg-green-50 border-green-200',
    orange: 'bg-orange-50 border-orange-200',
    red:    'bg-red-50 border-red-200',
  }[couleur];

  return (
    <div className={`border rounded-lg p-3 ${bgClass}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Wallet className={`w-4 h-4 ${textClass}`} />
          <span className="text-xs font-semibold text-gray-700">Ma Caisse</span>
        </div>
        {statut && statut.code !== 'ok' && (
          <div className={`flex items-center space-x-1 text-xs font-bold ${textClass}`}>
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{statut.label}</span>
          </div>
        )}
      </div>

      <div className={`text-lg font-bold ${textClass}`}>
        {caisse.solde_actuel.toLocaleString('fr-FR')} F
      </div>

      <div className="mt-1.5">
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-2 rounded-full transition-all ${barClass}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-0.5">
          <span>{pct.toFixed(0)}%</span>
          <span>Plafond : {caisse.plafond.toLocaleString('fr-FR')} F</span>
        </div>
      </div>
    </div>
  );
}