import React, { useState } from 'react';
import { toast } from 'sonner';
import { Mail, RefreshCw } from 'lucide-react';

interface ResendVerificationProps {
  email: string;
}

function ResendVerification({ email }: ResendVerificationProps) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

  const handleResend = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (result.success) {
        setSent(true);
        toast.success('Email de vérification renvoyé !');
        setTimeout(() => setSent(false), 60000); // Réactiver après 1 minute
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Erreur lors de l\'envoi de l\'email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
      <div className="flex items-start">
        <Mail className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-800">
            Email non vérifié
          </h3>
          <p className="text-sm text-yellow-700 mt-1">
            Vous devez vérifier votre email avant de continuer.
          </p>
          <button
            onClick={handleResend}
            disabled={loading || sent}
            className="mt-3 inline-flex items-center text-sm font-medium text-yellow-800 hover:text-yellow-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {sent ? 'Email envoyé' : 'Renvoyer l\'email'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResendVerification;