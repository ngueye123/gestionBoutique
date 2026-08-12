import qzRaw from 'qz-tray';
import { fetchWithAuth } from './fetchWithAuth';

const qz: any = qzRaw;
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

let isConfigured = false;

function configure() {
  if (isConfigured) return;

  // qz-tray attend un exécuteur (resolve, reject) => void, pas une Promise directe
  qz.security.setCertificatePromise((resolve: (cert: string) => void, reject: (err: unknown) => void) => {
    fetchWithAuth(`${API_URL}/qz/certificate`)
      .then(res => res.text())
      .then(resolve)
      .catch(reject);
  });

  qz.security.setSignaturePromise((toSign: string) => (resolve: (sig: string) => void, reject: (err: unknown) => void) => {
    fetchWithAuth(`${API_URL}/qz/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toSign }),
    })
      .then(res => res.text())
      .then(resolve)
      .catch(reject);
  });

  isConfigured = true;
}

export function isQzConnected(): boolean {
  try {
    return qz.websocket.isActive();
  } catch {
    return false;
  }
}

export async function connectQzTray(): Promise<boolean> {
  configure();
  try {
    if (!qz.websocket.isActive()) {
      const usingSecure = window.location.protocol === 'https:';
      await qz.websocket.connect({ usingSecure });
    }
    return true;
  } catch (err) {
    console.error('QZ Tray non disponible:', err);
    return false;
  }
}

export async function printFacturePdf(
  pdfBase64: string,
  format: 'a4' | 'thermal',
  printerName: string
): Promise<void> {
  const config = format === 'thermal'
    ? qz.configs.create(printerName, { units: 'mm', size: { width: 58 } })
    : qz.configs.create(printerName, { units: 'mm', size: { width: 210, height: 297 } });

  await qz.print(config, [
    { type: 'pixel', format: 'pdf', data: pdfBase64 },
  ]);
}

export async function listPrinters(): Promise<string[]> {
  await connectQzTray();
  const printers = await qz.printers.find();
  return Array.isArray(printers) ? printers : [String(printers)];
}
