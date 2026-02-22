import React, { useState, useEffect } from 'react';
import { decryptPhrase, type EncryptedWalletData } from '../../walletCrypto';
import { getApiUrl } from '../../config';
import type { AuthState } from '../types';

interface SavedPhrase {
  id: number;
  walletAddress: string;
  encryptedPhrase: EncryptedWalletData;
  network: string | null;
  label: string | null;
  createdAt: string;
}

interface ViewPhrasesProps {
  auth: AuthState | null;
}

export const ViewPhrases: React.FC<ViewPhrasesProps> = ({ auth }) => {
  const [phrases, setPhrases] = useState<SavedPhrase[]>([]);
  const [loading, setLoading] = useState(false);
  const [decryptedPhrases, setDecryptedPhrases] = useState<Record<number, { mnemonic12: string; extraWord: string }>>({});
  const [passwords, setPasswords] = useState<Record<number, string>>({});
  const [showPhrases, setShowPhrases] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (auth) {
      loadPhrases();
    }
  }, [auth]);

  const loadPhrases = async () => {
    if (!auth) return;
    
    setLoading(true);
    setError(null);
    try {
      const url = getApiUrl('wallets/phrases');
      console.log('[ViewPhrases] Loading phrases from:', url);
      
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${auth.token}`,
          'Content-Type': 'application/json',
        },
      });
      
      // Check if response is JSON
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        console.error('[ViewPhrases] Non-JSON response:', text.substring(0, 200));
        throw new Error(`Server returned non-JSON response. Status: ${res.status}. Please check backend logs.`);
      }
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to load phrases (Status: ${res.status})`);
      }
      
      console.log('[ViewPhrases] Loaded phrases:', data.phrases?.length || 0);
      setPhrases(data.phrases || []);
    } catch (err: any) {
      console.error('[ViewPhrases] Load phrases error:', err);
      if (err.message?.includes('JSON')) {
        setError('Server error: Backend returned invalid response. Please restart the backend server and ensure the database table exists.');
      } else {
        setError(err.message || 'Failed to load phrases');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDecrypt = async (phraseId: number, walletAddress: string) => {
    const password = passwords[phraseId];
    if (!password) {
      setError('Please enter the wallet password');
      return;
    }

    const phrase = phrases.find(p => p.id === phraseId);
    if (!phrase) return;

    setError(null);
    try {
      console.log('[ViewPhrases] Decrypting phrase for wallet:', walletAddress);
      const decrypted = await decryptPhrase(
        phrase.encryptedPhrase,
        password
      );
      
      console.log('[ViewPhrases] ✅ Phrase decrypted successfully');
      setDecryptedPhrases(prev => ({
        ...prev,
        [phraseId]: decrypted,
      }));
      setShowPhrases(prev => ({
        ...prev,
        [phraseId]: true,
      }));
    } catch (err: any) {
      console.error('[ViewPhrases] Decrypt error:', err);
      setError('Failed to decrypt phrase. Please check your password.');
    }
  };

  const handlePasswordChange = (phraseId: number, value: string) => {
    setPasswords(prev => ({
      ...prev,
      [phraseId]: value,
    }));
  };

  const toggleShowPhrase = (phraseId: number) => {
    setShowPhrases(prev => ({
      ...prev,
      [phraseId]: !prev[phraseId],
    }));
  };

  if (!auth) {
    return (
      <div className="card-dark" style={{ padding: '2rem' }}>
        <p className="text-center text-slate-400">Please login to view your saved phrases.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-white">Saved Wallet Phrases</h2>
        <button
          className="btn btn-yellow text-sm"
          onClick={loadPhrases}
          disabled={loading}
        >
          {loading ? 'Loading...' : '🔄 Refresh'}
        </button>
      </div>

      {error && (
        <div className="warning-box mb-4" style={{ padding: '1rem' }}>
          <p className="text-sm text-red-400">⚠️ {error}</p>
        </div>
      )}

      {loading && phrases.length === 0 ? (
        <div className="card-dark" style={{ padding: '2rem' }}>
          <p className="text-center text-slate-400">Loading phrases...</p>
        </div>
      ) : phrases.length === 0 ? (
        <div className="card-dark" style={{ padding: '2rem' }}>
          <p className="text-center text-slate-400">No saved phrases found. Phrases are saved automatically when you create a wallet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {phrases.map((phrase) => (
            <div key={phrase.id} className="card-dark" style={{ padding: '1.5rem' }}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-sm font-semibold text-white mb-1">
                    {phrase.label || 'Unnamed Wallet'}
                  </p>
                  <p className="text-xs text-slate-400 font-mono mb-1">
                    {phrase.walletAddress}
                  </p>
                  {phrase.network && (
                    <p className="text-xs text-slate-500">Network: {phrase.network}</p>
                  )}
                  <p className="text-xs text-slate-500">
                    Created: {new Date(phrase.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {!showPhrases[phrase.id] ? (
                <div className="mt-3">
                  <div className="mb-2">
                    <input
                      type="password"
                      className="form-input w-full mb-2"
                      placeholder="Enter wallet password to decrypt"
                      value={passwords[phrase.id] || ''}
                      onChange={(e) => handlePasswordChange(phrase.id, e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleDecrypt(phrase.id, phrase.walletAddress);
                        }
                      }}
                    />
                  </div>
                  <button
                    className="btn btn-primary w-full"
                    onClick={() => handleDecrypt(phrase.id, phrase.walletAddress)}
                  >
                    🔓 Decrypt and View Phrase
                  </button>
                </div>
              ) : (
                <div className="mt-3">
                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm font-semibold text-white">12-Word Phrase:</p>
                      <button
                        className="text-xs text-slate-400 hover:text-white"
                        onClick={() => toggleShowPhrase(phrase.id)}
                      >
                        {showPhrases[phrase.id] ? '👁️ Hide' : '👁️ Show'}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm bg-slate-800 p-3 rounded">
                      {decryptedPhrases[phrase.id]?.mnemonic12.split(' ').map((word, i) => (
                        <div key={i} className="text-slate-200">
                          {i + 1}. {word}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-white mb-2">13th Word:</p>
                    <div className="bg-slate-800 p-3 rounded">
                      <p className="text-slate-200 font-mono">{decryptedPhrases[phrase.id]?.extraWord}</p>
                    </div>
                  </div>

                  <button
                    className="btn btn-secondary w-full"
                    onClick={() => {
                      setShowPhrases(prev => ({
                        ...prev,
                        [phrase.id]: false,
                      }));
                      setDecryptedPhrases(prev => {
                        const newState = { ...prev };
                        delete newState[phrase.id];
                        return newState;
                      });
                    }}
                  >
                    🔒 Hide Phrase
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
