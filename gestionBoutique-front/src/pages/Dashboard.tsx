// src/pages/Dashboard.tsx

import React, { useEffect, useState, useRef } from 'react';
import {
  BarChart3, Package, AlertTriangle, TrendingUp, TrendingDown,
  Users, Crown, Calendar, Filter, Percent,
} from 'lucide-react';
import { DashboardStats } from '../types';
import { useAuthStore } from '../store/authStore';
import { fetchWithAuth } from '../lib/fetchWithAuth';
import { toast } from 'sonner';

type PeriodType = '7days' | 'month' | 'last_month' | 'custom';

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

const fmtPct = (n: number) =>
  (n >= 0 ? '+' : '') + Math.round(n) + '%';

// ─── Sous-composants ──────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string
  value: string
  sub?: string
  accentColor: string
  valueColor?: string
  icon: React.ReactNode
}

function MetricCard({ label, value, sub, accentColor, valueColor, icon }: MetricCardProps) {
  return (
    <div style={{ position: 'relative', paddingLeft: '1.25rem' }}
         className="bg-gray-50 rounded-xl p-4 overflow-hidden">
      {/* Barre accent gauche */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: 3, background: accentColor, borderRadius: '3px 0 0 3px',
      }} />
      <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-medium" style={{ color: valueColor ?? 'inherit', lineHeight: 1.1 }}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      {/* Icône fantôme */}
      <div style={{
        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
        opacity: 0.12, fontSize: 32,
      }}>
        {icon}
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

function Dashboard() {
  const [stats, setStats]               = useState<DashboardStats | null>(null);
  const [loading, setLoading]           = useState(true);
  const [resetting, setResetting]       = useState(false);
  const [period, setPeriod]             = useState<PeriodType>('7days');
  const [customDates, setCustomDates]   = useState({ start: '', end: '' });
  const [showCustom, setShowCustom]     = useState(false);
  const chartRef                        = useRef<any>(null);
  const canvasRef                       = useRef<HTMLCanvasElement>(null);

  const { token, user, userType } = useAuthStore();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

  // ── Chargement ───────────────────────────────────────────────────────────

  const fetchStats = async (overridePeriod?: PeriodType) => {
    const p = overridePeriod ?? period;
    if (p === 'custom' && (!customDates.start || !customDates.end)) return;

    setLoading(true);
    try {
      let url = `${API_URL}/dashboard/stats?period=${p}`;
      if (p === 'custom') {
        url += `&start_date=${customDates.start}&end_date=${customDates.end}`;
      }

      const res  = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();

      if (res.ok && data) {
        setStats(data);
      } else {
        toast.error(data?.message || 'Erreur lors du chargement des statistiques');
      }
    } catch {
      toast.error('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (token) fetchStats(); }, [token, period]);

  const handleResetStats = async () => {
    if (!token) return;
    if (!window.confirm('Confirmez-vous la réinitialisation des statistiques ? Cela supprimera toutes les ventes et dépenses.')) {
      return;
    }

    setResetting(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/dashboard/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || 'Statistiques réinitialisées.');
        fetchStats();
      } else {
        toast.error(data?.message || 'Impossible de réinitialiser les statistiques');
      }
    } catch {
      toast.error('Erreur de communication avec le serveur');
    } finally {
      setResetting(false);
    }
  };

  // ── Graphique CA / Dépenses / Bénéfice ───────────────────────────────────

  useEffect(() => {
    if (!stats || !canvasRef.current) return;

    // Détruire l'instance précédente
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    const labels   = stats.salesHistory?.map(s => {
      const d = new Date(s.date);
      return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    }) ?? [];

    const caData   = stats.salesHistory?.map(s => s.amount) ?? [];
    const depData  = stats.depenses_history?.map(d => d.montant) ?? new Array(labels.length).fill(0);
    const benefData = caData.map((v, i) => v - (depData[i] ?? 0));

    // Chargement dynamique de Chart.js si nécessaire
    const buildChart = (ChartJs: any) => {
      chartRef.current = new ChartJs(canvasRef.current!.getContext('2d'), {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'CA',
              data: caData,
              backgroundColor: 'rgba(22,163,74,0.75)',
              borderRadius: 4,
              order: 2,
            },
            {
              label: 'Dépenses',
              data: depData,
              backgroundColor: 'rgba(220,38,38,0.75)',
              borderRadius: 4,
              order: 2,
            },
            {
              label: 'Bénéfice net',
              data: benefData,
              type: 'line',
              borderColor: '#6366f1',
              backgroundColor: 'rgba(99,102,241,0.08)',
              borderWidth: 2,
              pointRadius: 3,
              pointBackgroundColor: '#6366f1',
              fill: false,
              tension: 0.3,
              order: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx: any) => {
                  const v = ctx.parsed.y as number;
                  return ` ${ctx.dataset.label} : ${Math.round(v).toLocaleString('fr-FR')} F`;
                },
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { size: 11 }, autoSkip: false, maxRotation: 45 },
            },
            y: {
              grid: { color: 'rgba(0,0,0,0.06)' },
              ticks: {
                font: { size: 11 },
                callback: (v: number) => (v >= 1000 ? Math.round(v / 1000) + 'k' : v) + ' F',
              },
            },
          },
        },
      });
    };

    if ((window as any).Chart) {
      buildChart((window as any).Chart);
    } else {
      const script   = document.createElement('script');
      script.src     = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
      script.onload  = () => buildChart((window as any).Chart);
      document.head.appendChild(script);
    }

    return () => { chartRef.current?.destroy(); };
  }, [stats]);

  // ── Gestion de la période ─────────────────────────────────────────────────

  const handlePeriod = (p: PeriodType) => {
    setPeriod(p);
    setShowCustom(p === 'custom');
    if (p !== 'custom') fetchStats(p);
  };

  const handleCustomApply = () => {
    if (!customDates.start || !customDates.end) {
      toast.error('Sélectionnez les deux dates'); return;
    }
    if (new Date(customDates.start) > new Date(customDates.end)) {
      toast.error('La date de début doit être avant la date de fin'); return;
    }
    fetchStats('custom');
  };

  // ── Calculs dérivés ───────────────────────────────────────────────────────

  const ca     = stats?.periodTotal    ?? 0;
  const dep    = stats?.depenses_periode ?? 0;
  const benef  = stats?.benefice_periode ?? (ca - dep);
  const marge  = ca > 0 ? Math.round((benef / ca) * 100) : 0;

  const benefPositif = benef >= 0;

  // ── Rôle ─────────────────────────────────────────────────────────────────

  const roleInfo = userType === 'patron'
    ? { icon: <Crown className="w-4 h-4 text-yellow-500" />, label: 'Patron' }
    : { icon: <Users className="w-4 h-4 text-blue-500" />, label: `Employé · ${user?.role}` };

  // ── Période labels ────────────────────────────────────────────────────────

  const PERIOD_LABELS: Record<PeriodType, string> = {
    '7days':      '7 derniers jours',
    'month':      'Ce mois-ci',
    'last_month': 'Mois dernier',
    'custom':     'Personnalisé',
  };

  // ── Skeleton ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-medium text-gray-800">Tableau de bord</h1>
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent" />
        </div>
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 gap-3">
        <AlertTriangle className="w-12 h-12 text-red-400" />
        <p className="text-gray-600 font-medium">Impossible de charger le tableau de bord</p>
        <button onClick={() => fetchStats()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          Réessayer
        </button>
      </div>
    );
  }

  // ─── Rendu ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 max-w-6xl mx-auto">

      {/* ── En-tête ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-medium text-gray-900">Tableau de bord</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {stats.period?.label ?? PERIOD_LABELS[period]}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-full border border-gray-200
                          bg-gray-50 text-sm text-gray-600">
            {roleInfo.icon}
            <span>{roleInfo.label}</span>
          </div>
          {userType === 'patron' && (
            <button
              type="button"
              onClick={handleResetStats}
              disabled={resetting}
              className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-medium
                         hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-400"
            >
              {resetting ? 'Réinitialisation...' : 'Réinitialiser les stats'}
            </button>
          )}
        </div>
      </div>

      {/* ── Sélecteur de période ─────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
        <div className="flex items-center flex-wrap gap-3">
          <span className="flex items-center gap-1.5 text-sm text-gray-500 shrink-0">
            <Filter className="w-4 h-4" />
            Période
          </span>
          <div className="flex gap-2 flex-wrap">
            {(['7days', 'month', 'last_month', 'custom'] as PeriodType[]).map(p => (
              <button key={p}
                onClick={() => handlePeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                  ${period === p
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {p === 'custom' && <Calendar className="w-3 h-3 inline mr-1" />}
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {showCustom && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Du</label>
              <input type="date" value={customDates.start}
                onChange={e => setCustomDates(c => ({ ...c, start: e.target.value }))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Au</label>
              <input type="date" value={customDates.end}
                min={customDates.start}
                onChange={e => setCustomDates(c => ({ ...c, end: e.target.value }))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <button onClick={handleCustomApply}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
              Appliquer
            </button>
          </div>
        )}
      </div>

      {/* ── KPI ligne 1 : métriques boutique ─────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Total produits"
          value={String(stats.totalProducts)}
          sub="en catalogue"
          accentColor="#3b82f6"
          icon={<Package />}
        />
        <MetricCard
          label="Stock faible"
          value={String(stats.lowStockProducts)}
          sub="à réapprovisionner"
          accentColor="#f59e0b"
          valueColor={stats.lowStockProducts > 0 ? '#d97706' : undefined}
          icon={<AlertTriangle />}
        />
        <MetricCard
          label="CA période"
          value={fmt(ca)}
          sub={`${stats.periodCount ?? 0} vente(s)`}
          accentColor="#16a34a"
          icon={<TrendingUp />}
        />
        <MetricCard
          label="Ventes aujourd'hui"
          value={fmt(stats.todaySales ?? 0)}
          sub="journée en cours"
          accentColor="#8b5cf6"
          icon={<BarChart3 />}
        />
      </div>

      {/* ── KPI ligne 2 : finances (patron uniquement) ────────────────────── */}
      {userType === 'patron' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <MetricCard
            label="Dépenses période"
            value={fmt(dep)}
            sub="charges enregistrées"
            accentColor="#dc2626"
            valueColor="#dc2626"
            icon={<TrendingDown />}
          />
          <MetricCard
            label="Bénéfice net"
            value={(benefPositif ? '+' : '') + fmt(benef)}
            sub="CA − dépenses"
            accentColor={benefPositif ? '#16a34a' : '#dc2626'}
            valueColor={benefPositif ? '#16a34a' : '#dc2626'}
            icon={benefPositif ? <TrendingUp /> : <TrendingDown />}
          />
          <MetricCard
            label="Marge nette"
            value={fmtPct(marge)}
            sub="bénéfice / CA"
            accentColor={marge >= 0 ? '#0ea5e9' : '#dc2626'}
            valueColor={marge >= 0 ? '#0369a1' : '#dc2626'}
            icon={<Percent />}
          />
        </div>
      )}

      {/* ── Graphique CA / Dépenses / Bénéfice ───────────────────────────── */}
      {userType === 'patron' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-blue-500" />
            CA vs Dépenses vs Bénéfice — {stats.period?.label}
          </h2>

          {/* Légende custom */}
          <div className="flex gap-5 mb-3 text-xs text-gray-500">
            {[
              { color: '#16a34a', label: 'Chiffre d\'affaires' },
              { color: '#dc2626', label: 'Dépenses' },
              { color: '#6366f1', label: 'Bénéfice net', line: true },
            ].map(({ color, label, line }) => (
              <span key={label} className="flex items-center gap-1.5">
                <span style={{
                  width: 10, height: 10,
                  borderRadius: line ? 0 : 2,
                  background: color,
                  display: 'inline-block',
                  borderBottom: line ? `2px dashed ${color}` : 'none',
                  backgroundColor: line ? 'transparent' : color,
                }} />
                {label}
              </span>
            ))}
          </div>

          <div style={{ position: 'relative', height: 240 }}>
            <canvas ref={canvasRef}
                    role="img"
                    aria-label="Graphique comparatif CA, dépenses et bénéfice net par jour">
              Comparaison journalière du chiffre d'affaires, des dépenses et du bénéfice.
            </canvas>
          </div>
        </div>
      )}

      {/* ── Ventes + Dépenses côte à côte ────────────────────────────────── */}
      <div className={`grid gap-5 ${userType === 'patron' ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>

        {/* Historique ventes */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-green-500" />
            Ventes de la période
          </h2>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {(stats.salesHistory?.length ?? 0) > 0 ? (
              stats.salesHistory!.map((sale, i) => (
                <div key={i}
                     className="flex items-center justify-between px-3 py-2.5
                                bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      {new Date(sale.date).toLocaleDateString('fr-FR', {
                        weekday: 'short', day: 'numeric', month: 'short',
                      })}
                    </span>
                    <span className="text-xs text-gray-400 ml-2">
                      {sale.count ?? 0} vente{(sale.count ?? 0) > 1 ? 's' : ''}
                    </span>
                  </div>
                  <span className={`text-sm font-medium ${sale.amount > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                    {fmt(sale.amount)}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-gray-400">
                <TrendingUp className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                <p className="text-sm">Aucune vente sur cette période</p>
              </div>
            )}
          </div>
        </div>

        {/* Dépenses par jour — patron uniquement */}
        {userType === 'patron' && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-4">
              <TrendingDown className="w-4 h-4 text-red-500" />
              Dépenses de la période
            </h2>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {(stats.depenses_history?.filter(d => d.montant > 0).length ?? 0) > 0 ? (
                <>
                  {stats.depenses_history!
                    .filter(d => d.montant > 0)
                    .map((d, i) => (
                      <div key={i}
                           className="flex items-center justify-between px-3 py-2.5
                                      bg-red-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-700">
                          {new Date(d.date).toLocaleDateString('fr-FR', {
                            weekday: 'short', day: 'numeric', month: 'short',
                          })}
                        </span>
                        <span className="text-sm font-medium text-red-600">
                          {fmt(d.montant)}
                        </span>
                      </div>
                    ))}
                  {/* Ligne total */}
                  <div className="flex items-center justify-between px-3 py-2.5
                                  border-t border-gray-100 mt-1">
                    <span className="text-xs font-medium text-gray-500">Total période</span>
                    <span className="text-sm font-medium text-red-600">{fmt(dep)}</span>
                  </div>
                </>
              ) : (
                <div className="text-center py-10 text-gray-400">
                  <TrendingDown className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                  <p className="text-sm">Aucune dépense sur cette période</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Alertes de stock + Top produits ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Alertes stock */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            Alertes de stock
            {stats.stockAlerts.length > 0 && (
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full
                               bg-orange-100 text-orange-700">
                {stats.stockAlerts.length}
              </span>
            )}
          </h2>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {stats.stockAlerts.length > 0 ? (
              stats.stockAlerts.map(alert => (
                <div key={alert.id}
                     className="flex items-center justify-between px-3 py-2.5
                                bg-orange-50 rounded-lg border border-orange-100">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{alert.name}</p>
                    <p className="text-xs text-gray-500">
                      Stock : {alert.stock} · Min : {alert.minStock}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full
                                   bg-orange-100 text-orange-700 font-medium">
                    Stock faible
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-gray-400">
                <Package className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                <p className="text-sm">Tous les stocks sont suffisants</p>
              </div>
            )}
          </div>
        </div>

        {/* Top produits */}
        {(stats.topProducts?.length ?? 0) > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-yellow-500" />
              Top 5 produits vendus
            </h2>
            <div className="space-y-2">
              {stats.topProducts!.map((p, i) => {
                // Largeur de la barre proportionnelle au max
                const max   = stats.topProducts![0]?.quantite ?? 1;
                const width = Math.round((p.quantite / max) * 100);
                return (
                  <div key={i} className="px-3 py-2.5 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700
                                         flex items-center justify-center text-xs font-medium
                                         shrink-0">
                          {i + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-800 leading-none">{p.nom}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{p.quantite} unités vendues</p>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-green-600 shrink-0">
                        {fmt(p.ventes)}
                      </span>
                    </div>
                    {/* Barre de progression */}
                    <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-1 bg-blue-400 rounded-full transition-all"
                           style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

export default Dashboard;