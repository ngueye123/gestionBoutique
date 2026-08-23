import { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, ShoppingCart, Package, Wallet, Heart, BarChart3 } from 'lucide-react';

interface DemoStep {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}

const STEPS: DemoStep[] = [
  {
    title: 'Point de vente rapide',
    description: "Encaissez en quelques secondes : recherche produit instantanée, calcul automatique du rendu monnaie et tickets imprimés en un clic.",
    icon: ShoppingCart,
    accent: 'from-blue-500 to-indigo-500',
  },
  {
    title: 'Gestion des stocks',
    description: "Suivez vos quantités en temps réel, recevez des alertes de rupture et ajustez vos prix produit par produit.",
    icon: Package,
    accent: 'from-emerald-500 to-teal-500',
  },
  {
    title: 'Suivi de caisse',
    description: "Ouverture, clôture et bilans de caisse automatisés pour chaque employé, avec historique complet des mouvements.",
    icon: Wallet,
    accent: 'from-amber-500 to-orange-500',
  },
  {
    title: 'Programme de fidélité',
    description: "Récompensez vos clients réguliers avec des points de fidélité cumulés automatiquement à chaque achat.",
    icon: Heart,
    accent: 'from-pink-500 to-rose-500',
  },
  {
    title: 'Rapports et statistiques',
    description: "Visualisez vos ventes, dépenses et performances par employé pour piloter votre boutique au quotidien.",
    icon: BarChart3,
    accent: 'from-purple-500 to-violet-500',
  },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function DemoModal({ isOpen, onClose }: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    setIndex(0);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => setIndex(i => (i + 1) % STEPS.length), 4000);
    return () => clearInterval(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const step = STEPS[index];
  const Icon = step.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className={`relative flex h-56 items-center justify-center bg-gradient-to-br ${step.accent} sm:h-72`}>
          <button
            onClick={onClose}
            aria-label="Fermer la démo"
            className="absolute right-3 top-3 rounded-full bg-white/20 p-1.5 text-white hover:bg-white/30 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <Icon className="h-24 w-24 text-white/90 sm:h-32 sm:w-32" strokeWidth={1.25} />

          <button
            onClick={() => setIndex(i => (i - 1 + STEPS.length) % STEPS.length)}
            aria-label="Étape précédente"
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white hover:bg-white/30 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => setIndex(i => (i + 1) % STEPS.length)}
            aria-label="Étape suivante"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white hover:bg-white/30 transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            Démo interactive · {index + 1}/{STEPS.length}
          </p>
          <h3 className="mt-1 text-xl font-bold text-gray-900">{step.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">{step.description}</p>

          <div className="mt-6 flex items-center justify-center gap-2">
            {STEPS.map((s, i) => (
              <button
                key={s.title}
                onClick={() => setIndex(i)}
                aria-label={`Aller à l'étape ${i + 1}`}
                className={`h-2 rounded-full transition-all ${i === index ? 'w-6 bg-blue-600' : 'w-2 bg-gray-200 hover:bg-gray-300'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
