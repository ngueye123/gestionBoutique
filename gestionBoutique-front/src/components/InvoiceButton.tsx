import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Download, Eye, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { fetchWithAuth } from '../lib/fetchWithAuth';

interface InvoiceButtonProps {
  // Support des deux noms de props pour compatibilité
  saleId?: number;
  saleReference?: string;
  venteId?: number;
  venteReference?: string;
  variant?: 'primary' | 'secondary' | 'icon';
  /** Format par défaut pour la prévisualisation lorsque le bouton principal est utilisé */
  defaultFormat?: 'a4' | 'thermal';
}

export function InvoiceButton({ 
  saleId, 
  saleReference,
  venteId,
  venteReference,
  variant = 'primary',
  defaultFormat = 'a4',
}: InvoiceButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const [menuPos, setMenuPos] = useState<{ left: number; bottom: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

  // Support compatibilité : utiliser venteId si saleId n'est pas défini
  const actualSaleId = saleId || venteId;
  const actualSaleReference = saleReference || venteReference || 'facture';

  // Vérifier que nous avons un ID valide
  if (!actualSaleId) {
    console.error('InvoiceButton: Aucun ID de vente fourni (saleId ou venteId)');
    return (
      <div className="text-red-500 text-sm">
        Erreur: ID de vente manquant
      </div>
    );
  }

  // Calcule la position du menu par rapport au bouton déclencheur (viewport),
  // pour qu'il s'affiche correctement même dans un conteneur avec overflow-hidden
  // (ex: tableau à coins arrondis).
  const openMenu = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const menuWidth = 200; // doit correspondre au min-w-[200px] du menu
      let left = rect.left;
      if (left + menuWidth > window.innerWidth - 8) {
        left = rect.right - menuWidth;
      }
      setMenuPos({ left: Math.max(8, left), bottom: window.innerHeight - rect.top + 8 });
    }
    setShowFormatMenu(true);
  };

  const toggleMenu = () => {
    if (showFormatMenu) {
      setShowFormatMenu(false);
    } else {
      openMenu();
    }
  };

  const downloadInvoice = async (format: 'a4' | 'thermal') => {
    setShowFormatMenu(false);
    setIsDownloading(true);

    try {
      const response = await fetchWithAuth(
        `${API_URL}/ventes/${actualSaleId}/facture?format=${format}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.message || 'Erreur lors de la génération');
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Facture_${actualSaleReference}_${format}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`Facture ${format.toUpperCase()} téléchargée !`);
    } catch (error) {
      console.error('Erreur téléchargement facture:', error);
      toast.error('Erreur lors du téléchargement');
    } finally {
      setIsDownloading(false);
    }
  };

  const previewInvoice = async (format: 'a4' | 'thermal') => {
    setShowFormatMenu(false);

    try {
      const response = await fetchWithAuth(
        `${API_URL}/ventes/${actualSaleId}/facture/preview?format=${format}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.message || 'Erreur lors de la prévisualisation');
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
      
    } catch (error) {
      console.error('Erreur prévisualisation facture:', error);
      toast.error('Erreur lors de la prévisualisation');
    }
  };

  // Menu de sélection de format — rendu dans un portail (document.body), positionné
  // en fixed par rapport au bouton, pour ne jamais être coupé par un ancêtre overflow-hidden.
  const FormatMenu = ({ action }: { action: 'download' | 'preview' }) => {
    if (!menuPos) return null;

    return createPortal(
      <>
        {/* Backdrop invisible pour fermer le menu au clic à l'extérieur */}
        <div className="fixed inset-0 z-40" onClick={() => setShowFormatMenu(false)} />
        <div
          className="fixed bg-white border rounded-lg shadow-lg p-2 min-w-[200px] z-50"
          style={{ left: menuPos.left, bottom: menuPos.bottom }}
        >
          <div className="text-xs font-semibold text-gray-500 mb-2 px-2">
            Choisir le format
          </div>
          <button
            onClick={() => action === 'download' ? downloadInvoice('a4') : previewInvoice('a4')}
            className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded flex items-center space-x-2"
          >
            <FileText className="w-4 h-4" />
            <div>
              <div className="font-medium text-sm">A4 Standard</div>
              <div className="text-xs text-gray-500">Format professionnel</div>
            </div>
          </button>
          <button
            onClick={() => action === 'download' ? downloadInvoice('thermal') : previewInvoice('thermal')}
            className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded flex items-center space-x-2"
          >
            <FileText className="w-4 h-4" />
            <div>
              <div className="font-medium text-sm">Ticket Thermique</div>
              <div className="text-xs text-gray-500">Format caisse (58mm)</div>
            </div>
          </button>
        </div>
      </>,
      document.body
    );
  };

  if (variant === 'icon') {
    return (
      <div ref={triggerRef} className="relative inline-block">
        <button
          onClick={toggleMenu}
          disabled={isDownloading}
          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50"
          title="Télécharger la facture"
        >
          {isDownloading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Download className="w-5 h-5" />
          )}
        </button>
        {showFormatMenu && <FormatMenu action="download" />}
      </div>
    );
  }

  if (variant === 'secondary') {
    return (
      <div ref={triggerRef} className="relative flex space-x-2">
        <button
          onClick={toggleMenu}
          disabled={isDownloading}
          className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          {isDownloading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Télécharger
        </button>
        {showFormatMenu && <FormatMenu action="download" />}
      </div>
    );
  }

  // Variant primary (par défaut) - avec preview et download
  return (
    <div className="flex flex-col space-y-2">
      <button
        onClick={() => previewInvoice(defaultFormat)}
        className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
      >
        <Eye className="w-5 h-5 mr-2" />
        Prévisualiser la facture
      </button>
      
      <div ref={triggerRef} className="relative">
        <button
          onClick={toggleMenu}
          disabled={isDownloading}
          className="w-full inline-flex items-center justify-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
        >
          {isDownloading ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <Download className="w-5 h-5 mr-2" />
          )}
          Télécharger la facture
        </button>
        
        {showFormatMenu && <FormatMenu action="download" />}
      </div>
    </div>
  );
}

// Hook personnalisé pour utilisation programmatique
export function useInvoiceDownload() {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

  const downloadInvoice = async (
    venteId: number, 
    venteReference: string,
    format: 'a4' | 'thermal' = 'a4'
  ) => {
    try {
      const response = await fetchWithAuth(
        `${API_URL}/ventes/${venteId}/facture?format=${format}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        throw new Error('Erreur lors de la génération');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Facture_${venteReference}_${format}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    } catch (error) {
      console.error('Erreur:', error);
      return { success: false, error };
    }
  };

  return { downloadInvoice };
}