import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Printer, Eye, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { fetchWithAuth } from '../lib/fetchWithAuth';
import { getApiErrorMessage } from '../lib/apiError';
import { connectQzTray, printFacturePdf } from '../lib/qzTray';

interface InvoiceButtonProps {
  saleId?: number;
  saleReference?: string;
  venteId?: number;
  venteReference?: string;
  variant?: 'primary' | 'secondary' | 'icon';
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
  const [isPrinting, setIsPrinting] = useState(false);
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const [menuPos, setMenuPos] = useState<{ left: number; bottom: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

  const actualSaleId = saleId || venteId;
  const actualSaleReference = saleReference || venteReference || 'facture';

  if (!actualSaleId) {
    console.error('InvoiceButton: Aucun ID de vente fourni (saleId ou venteId)');
    return (
      <div className="text-red-500 text-sm">
        Erreur: ID de vente manquant
      </div>
    );
  }

  const openMenu = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const menuWidth = 200;
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

  const previewInvoice = async (format: 'a4' | 'thermal') => {
    setShowFormatMenu(false);

    try {
      const response = await fetchWithAuth(
        `${API_URL}/ventes/${actualSaleId}/facture/preview?format=${format}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(getApiErrorMessage(errorData, 'Impossible de prévisualiser la facture.'));
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');

      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } catch (error) {
      console.error('Erreur prévisualisation facture:', error);
      toast.error('Impossible de prévisualiser la facture. Vérifiez votre connexion.');
    }
  };

  const printInvoice = async (format: 'a4' | 'thermal') => {
    setShowFormatMenu(false);
    setIsPrinting(true);

    try {
      const connected = await connectQzTray();

      if (!connected) {
        toast.error("Imprimante non connectée (QZ Tray). Ouverture de l'aperçu pour impression manuelle.");
        await previewInvoice(format);
        return;
      }

      const response = await fetchWithAuth(
        `${API_URL}/ventes/${actualSaleId}/facture/print-base64?format=${format}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(getApiErrorMessage(errorData, 'Impossible de générer la facture.'));
        return;
      }

      const { pdfBase64 } = await response.json();

      const settingsRes = await fetchWithAuth(`${API_URL}/settings/printers`);
      const settings = await settingsRes.json();
      const printerName = format === 'thermal' ? settings.thermal_printer_name : settings.a4_printer_name;

      if (!printerName) {
        toast.error("Aucune imprimante configurée. Rendez-vous dans Paramètres > Imprimantes.");
        return;
      }

      await printFacturePdf(pdfBase64, format, printerName);
     
      toast.success('Ticket envoyé à l\'imprimante.');
    } catch (error) {
      console.error('Erreur impression facture:', error);
      toast.error("Échec de l'impression. Ouverture de l'aperçu pour impression manuelle.");
      await previewInvoice(format);
    } finally {
      setIsPrinting(false);
    }
  };

  const FormatMenu = ({ action }: { action: 'print' | 'preview' }) => {
    if (!menuPos) return null;

    return createPortal(
      <>
        <div className="fixed inset-0 z-40" onClick={() => setShowFormatMenu(false)} />
        <div
          className="fixed bg-white border rounded-lg shadow-lg p-2 min-w-[200px] z-50"
          style={{ left: menuPos.left, bottom: menuPos.bottom }}
        >
          <div className="text-xs font-semibold text-gray-500 mb-2 px-2">
            Choisir le format
          </div>
          <button
            onClick={() => action === 'print' ? printInvoice('a4') : previewInvoice('a4')}
            className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded flex items-center space-x-2"
          >
            <FileText className="w-4 h-4" />
            <div>
              <div className="font-medium text-sm">A4 Standard</div>
              <div className="text-xs text-gray-500">Format professionnel</div>
            </div>
          </button>
          <button
            onClick={() => action === 'print' ? printInvoice('thermal') : previewInvoice('thermal')}
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
          disabled={isPrinting}
          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50"
          title="Imprimer la facture"
        >
          {isPrinting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Printer className="w-5 h-5" />
          )}
        </button>
        {showFormatMenu && <FormatMenu action="print" />}
      </div>
    );
  }

  if (variant === 'secondary') {
    return (
      <div ref={triggerRef} className="relative flex space-x-2">
        <button
          onClick={toggleMenu}
          disabled={isPrinting}
          className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          {isPrinting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Printer className="w-4 h-4 mr-2" />
          )}
          Imprimer
        </button>
        {showFormatMenu && <FormatMenu action="print" />}
      </div>
    );
  }

  // Variant primary (par défaut) — aperçu + impression
  return (
    <div className="flex flex-col space-y-2">
      <button
        onClick={() => previewInvoice(defaultFormat)}
        className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        title={`Prévisualiser la facture ${actualSaleReference}`}
      >
        <Eye className="w-5 h-5 mr-2" />
        Prévisualiser la facture
      </button>

      <div ref={triggerRef} className="relative">
        <button
          onClick={() => printInvoice(defaultFormat)}
          disabled={isPrinting}
          className="w-full inline-flex items-center justify-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
          title={`Imprimer le ticket ${actualSaleReference}`}
        >
          {isPrinting ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <Printer className="w-5 h-5 mr-2" />
          )}
          Imprimer le ticket
        </button>
      </div>
    </div>
  );
}

export function useInvoicePrint() {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

  const printInvoice = async (
    venteId: number,
    format: 'a4' | 'thermal' = 'thermal'
  ) => {
    try {
      const connected = await connectQzTray();
      if (!connected) return { success: false, error: 'QZ Tray non connecté' };

      const response = await fetchWithAuth(
        `${API_URL}/ventes/${venteId}/facture/print-base64?format=${format}`,
        { method: 'GET' }
      );

      if (!response.ok) throw new Error('Erreur lors de la génération');

      const { pdfBase64 } = await response.json();

      const settingsRes = await fetchWithAuth(`${API_URL}/settings/printers`);
      const settings = await settingsRes.json();
      const printerName = format === 'thermal' ? settings.thermal_printer_name : settings.a4_printer_name;

      if (!printerName) {
        return { success: false, error: 'Aucune imprimante configurée. Rendez-vous dans Paramètres > Imprimantes.' };
      }

      await printFacturePdf(pdfBase64, format, printerName);

      return { success: true };
    } catch (error) {
      console.error('Erreur:', error);
      return { success: false, error };
    }
  };

  return { printInvoice };
}