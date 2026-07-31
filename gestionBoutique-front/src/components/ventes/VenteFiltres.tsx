import React from 'react';
import { EmployeFiltre } from '../../types';

export interface VenteFiltresState {
  startDate: string;
  endDate: string;
  employeId: string;
  clientId: string;
  moyenPaiement: string;
}

interface VenteFiltresProps {
  filtres: VenteFiltresState;
  onChange: (filtres: VenteFiltresState) => void;
  employes: EmployeFiltre[];
  clients: { id: number; nom: string }[];
  showEmployeFiltre: boolean;
}

export default function VenteFiltres({
  filtres, onChange, employes, clients, showEmployeFiltre,
}: VenteFiltresProps) {
  const update = (patch: Partial<VenteFiltresState>) => onChange({ ...filtres, ...patch });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Du</label>
        <input
          type="date"
          value={filtres.startDate}
          onChange={(e) => update({ startDate: e.target.value })}
          className="w-full p-2 border border-gray-300 rounded-md text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Au</label>
        <input
          type="date"
          value={filtres.endDate}
          onChange={(e) => update({ endDate: e.target.value })}
          className="w-full p-2 border border-gray-300 rounded-md text-sm"
        />
      </div>

      {showEmployeFiltre && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Employé</label>
          <select
            value={filtres.employeId}
            onChange={(e) => update({ employeId: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">Tous</option>
            {employes.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.nom} ({emp.role})</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Paiement</label>
        <select
          value={filtres.moyenPaiement}
          onChange={(e) => update({ moyenPaiement: e.target.value })}
          className="w-full p-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="">Tous</option>
          <option value="especes">Espèces</option>
          <option value="wave">Wave</option>
          <option value="orange_money">Orange Money</option>
          <option value="dette">Dette</option>
          <option value="mixte">Mixte</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Client</label>
        <select
          value={filtres.clientId}
          onChange={(e) => update({ clientId: e.target.value })}
          className="w-full p-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="">Tous</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.nom}</option>
          ))}
        </select>
      </div>
    </div>
  );
}