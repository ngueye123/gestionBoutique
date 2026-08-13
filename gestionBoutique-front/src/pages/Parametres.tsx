import { useEffect, useState } from 'react';
import { Star, Printer, RefreshCw, Loader2, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { fetchWithAuth } from '../lib/fetchWithAuth';
import type { FideliteConfig, InvoiceFormat } from '../types';
import { connectQzTray, listPrinters } from '../lib/qzTray';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

function FideliteTab() {
  const [config, setConfig] = useState<Partial<FideliteConfig>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchWithAuth(`${API_URL}/fidelite/config`)
      .then(r => r.json())
      .then(d => d.success && setConfig(d.config));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/fidelite/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          montant_tranche: Number(config.montant_tranche),
          points_accordes: Number(config.points_accordes),
        }),
      });
      const data = await res.json();
      data.success ? toast.success(data.message) : toast.error(data.message);
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-md space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700">Montant par tranche (FCFA)</label>
        <input type="number" min={1} step={1}
               value={config.montant_tranche ?? ''}
               onChange={e => setConfig(c => ({ ...c, montant_tranche: Number(e.target.value) }))}
               className="w-full border rounded-lg px-3 py-2 mt-1" />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700">Points accordés par tranche</label>
        <input type="number" min={1} step={1}
               value={config.points_accordes ?? ''}
               onChange={e => setConfig(c => ({ ...c, points_accordes: Number(e.target.value) }))}
               className="w-full border rounded-lg px-3 py-2 mt-1" />
      </div>
      <button onClick={save} disabled={saving}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
        {saving ? 'Enregistrement…' : 'Enregistrer la règle'}
      </button>
    </div>
  );
}

function FacturationTab() {
  const [format, setFormat] = useState<InvoiceFormat>('thermal');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchWithAuth(`${API_URL}/invoice-settings`)
      .then(r => r.json())
      .then(d => d.success && setFormat(d.default_format))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/invoice-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ default_format: format }),
      });
      const data = await res.json();
      data.success ? toast.success(data.message) : toast.error(data.message);
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-md space-y-4">
      <p className="text-sm text-gray-500">
        Format proposé par défaut à la caisse (POS) après une vente. Si aucun choix n'est fait ici,
        le ticket thermique reste utilisé par défaut.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setFormat('thermal')}
          disabled={loading}
          className={`border rounded-xl p-4 text-left transition-colors ${
            format === 'thermal' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
          }`}
        >
          <div className="font-medium text-sm text-gray-900">Ticket Thermique</div>
          <div className="text-xs text-gray-500 mt-1">Format caisse (58mm)</div>
        </button>
        <button
          type="button"
          onClick={() => setFormat('a4')}
          disabled={loading}
          className={`border rounded-xl p-4 text-left transition-colors ${
            format === 'a4' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
          }`}
        >
          <div className="font-medium text-sm text-gray-900">A4 Standard</div>
          <div className="text-xs text-gray-500 mt-1">Format professionnel</div>
        </button>
      </div>

      <button onClick={save} disabled={saving || loading}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
        {saving ? 'Enregistrement…' : 'Enregistrer le format par défaut'}
      </button>
    </div>
  );
}

function ImprimantesTab() {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const [thermalPrinter, setThermalPrinter] = useState<string>('');
  const [a4Printer, setA4Printer] = useState<string>('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [qzStatus, setQzStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');

  // Charger les paramètres déjà enregistrés pour cette boutique
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetchWithAuth(`${API_URL}/settings/printers`);
        if (response.ok) {
          const data = await response.json();
          setThermalPrinter(data.thermal_printer_name || '');
          setA4Printer(data.a4_printer_name || '');
        }
      } catch (error) {
        console.error('Erreur chargement paramètres imprimantes:', error);
      } finally {
        setIsLoadingSettings(false);
      }
    };

    loadSettings();
  }, []);

  // Vérifier si QZ Tray tourne sur ce poste, au montage
  useEffect(() => {
    const checkQz = async () => {
      const connected = await connectQzTray();
      setQzStatus(connected ? 'connected' : 'disconnected');
    };
    checkQz();
  }, []);

  const handleDetectPrinters = async () => {
    setIsDetecting(true);
    try {
      const printers = await listPrinters();
      setQzStatus('connected');

      if (printers.length === 0) {
        toast.error("Aucune imprimante détectée. Vérifiez qu'elle est bien installée sur ce PC.");
      } else {
        setAvailablePrinters(printers);
        toast.success(`${printers.length} imprimante(s) détectée(s) sur ce poste.`);
      }
    } catch (error) {
      console.error('Erreur détection imprimantes:', error);
      setQzStatus('disconnected');
      toast.error("QZ Tray n'est pas accessible. Vérifiez qu'il est bien lancé sur ce poste.");
    } finally {
      setIsDetecting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetchWithAuth(`${API_URL}/settings/printers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thermal_printer_name: thermalPrinter || null,
          a4_printer_name: a4Printer || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.message || "Impossible d'enregistrer les paramètres.");
        return;
      }

      toast.success('Paramètres imprimantes enregistrés.');
    } catch (error) {
      console.error('Erreur sauvegarde paramètres imprimantes:', error);
      toast.error('Impossible d\'enregistrer. Vérifiez votre connexion.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingSettings) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <p className="text-sm text-gray-500">
        Configurez les imprimantes utilisées pour les tickets et factures sur ce poste de caisse.
      </p>

      {/* Statut QZ Tray */}
      <div
        className={`flex items-center gap-2 px-4 py-3 rounded-md text-sm ${
          qzStatus === 'connected'
            ? 'bg-green-50 text-green-700'
            : qzStatus === 'disconnected'
            ? 'bg-red-50 text-red-700'
            : 'bg-gray-50 text-gray-600'
        }`}
      >
        {qzStatus === 'connected' ? (
          <CheckCircle2 className="w-4 h-4 shrink-0" />
        ) : (
          <AlertCircle className="w-4 h-4 shrink-0" />
        )}
        <span>
          {qzStatus === 'connected' && 'QZ Tray est actif sur ce poste.'}
          {qzStatus === 'disconnected' &&
            "QZ Tray n'est pas détecté. Installez-le et relancez-le sur ce PC avant de continuer."}
          {qzStatus === 'unknown' && 'Vérification de QZ Tray en cours...'}
        </span>
      </div>

      {/* Détection */}
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-sm">Imprimantes détectées sur ce poste</div>
            <div className="text-xs text-gray-500">
              Cette détection ne concerne que le PC actuellement utilisé — chaque poste de caisse doit être configuré séparément.
            </div>
          </div>
          <button
            onClick={handleDetectPrinters}
            disabled={isDetecting}
            className="inline-flex items-center px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-50 shrink-0"
          >
            {isDetecting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Détecter
          </button>
        </div>

        {availablePrinters.length > 0 && (
          <div className="text-xs text-gray-500">
            Trouvées : {availablePrinters.join(', ')}
          </div>
        )}

        {availablePrinters.length === 1 && (
          <div className="flex items-center justify-between gap-3 bg-blue-50 border border-blue-100 rounded-md px-3 py-2">
            <span className="text-xs text-blue-700">
              Une seule imprimante détectée : <strong>{availablePrinters[0]}</strong>
            </span>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setThermalPrinter(availablePrinters[0])}
                className="px-2.5 py-1 text-xs bg-white border border-blue-200 text-blue-700 rounded-md hover:bg-blue-100"
              >
                Utiliser pour le thermique
              </button>
              <button
                onClick={() => setA4Printer(availablePrinters[0])}
                className="px-2.5 py-1 text-xs bg-white border border-blue-200 text-blue-700 rounded-md hover:bg-blue-100"
              >
                Utiliser pour l'A4
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sélection */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Imprimante ticket thermique (58mm)
          </label>
          {availablePrinters.length > 0 ? (
            <select
              value={thermalPrinter}
              onChange={(e) => setThermalPrinter(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            >
              <option value="">— Non configurée —</option>
              {availablePrinters.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={thermalPrinter}
              onChange={(e) => setThermalPrinter(e.target.value)}
              placeholder="Cliquez sur Détecter, ou saisissez le nom exact"
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Imprimante facture A4 (optionnel)
          </label>
          {availablePrinters.length > 0 ? (
            <select
              value={a4Printer}
              onChange={(e) => setA4Printer(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            >
              <option value="">— Non configurée —</option>
              {availablePrinters.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={a4Printer}
              onChange={(e) => setA4Printer(e.target.value)}
              placeholder="Cliquez sur Détecter, ou saisissez le nom exact"
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          )}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {isSaving ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Save className="w-4 h-4 mr-2" />
        )}
        Enregistrer
      </button>
    </div>
  );
}

type TabKey = 'securite' | 'fidelite' | 'facturation' | 'imprimantes';

export default function Parametres() {
  const tabs: { key: TabKey; label: string; icon: typeof Star }[] = [
    { key: 'fidelite', label: 'Fidélité', icon: Star },
    { key: 'facturation', label: 'Facturation', icon: Printer },
    { key: 'imprimantes', label: 'Imprimantes', icon: Printer },
  ];

  const [activeTab, setActiveTab] = useState<TabKey>(tabs[0].key);

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Paramètres</h1>
      <p className="text-sm text-gray-500 mb-6">
        Réglages de la boutique : fidélité, facturation et imprimantes.
      </p>

      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'fidelite' && <FideliteTab />}
      {activeTab === 'facturation' && <FacturationTab />}
      {activeTab === 'imprimantes' && <ImprimantesTab />}
    </div>
  );
}
