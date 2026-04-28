import React, { useState, useEffect } from "react";
import { decryptPhrase, type EncryptedWalletData } from "../../walletCrypto";
import { getApiUrl } from "../../config";
import type { AuthState } from "../types";

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

  const [error, setError] = useState<string | null>(null);

  /*
  decrypted phrases
  */

  const [decryptedPhrases, setDecryptedPhrases] = useState<
    Record<
      number,
      {
        mnemonic12: string;
        extraWord: string;
      }
    >
  >({});

  /*
  show / hide
  */

  const [showPhrases, setShowPhrases] = useState<Record<number, boolean>>({});

  /*
  password for version 1 wallets
  */

  const [passwords, setPasswords] = useState<Record<number, string>>({});

  /*
  13th word for version 2 wallets
  */

  const [extraWords, setExtraWords] = useState<Record<number, string>>({});

  /*
  LOAD PHRASES
  */

  useEffect(() => {
    if (auth) loadPhrases();
  }, [auth]);

  const loadPhrases = async () => {
    if (!auth) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(getApiUrl("wallets/phrases"), {
        headers: {
          Authorization: `Bearer ${auth.token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setPhrases(data.phrases || []);
    } catch (err: any) {
      console.error(err);

      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /*
  PASSWORD CHANGE
  */

  const handlePasswordChange = (id: number, value: string) => {
    setPasswords((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  /*
  EXTRA WORD CHANGE
  */

  const handleExtraWordChange = (id: number, value: string) => {
    setExtraWords((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  /*
  DECRYPT SINGLE WALLET
  */

const handleDecrypt = async (phraseId: number) => {

  const phrase = phrases.find((p) => p.id === phraseId);
  if (!phrase) return;

  try {

    let decrypted;

    // ✅ VERSION 3 → 13th word ONLY
    if (phrase.encryptedPhrase.version === 3) {

      const extraWord = extraWords[phraseId];

      if (!extraWord) {
        setError("Enter 13th word");
        return;
      }

      decrypted = await decryptPhrase(
        phrase.encryptedPhrase,
        "", // password not needed
        extraWord
      );

    }

    // ✅ VERSION 2 → password + extraWord
    else if (phrase.encryptedPhrase.version === 2) {

      const password = passwords[phraseId];
      const extraWord = extraWords[phraseId];

      if (!password) {
        setError("Enter password");
        return;
      }

      if (!extraWord) {
        setError("Enter 13th word");
        return;
      }

      decrypted = await decryptPhrase(
        phrase.encryptedPhrase,
        password,
        extraWord
      );

    }

    // ✅ VERSION 1 → password only
    else {

      const password = passwords[phraseId];

      if (!password) {
        setError("Enter password");
        return;
      }

      decrypted = await decryptPhrase(
        phrase.encryptedPhrase,
        password
      );

    }

    setDecryptedPhrases(prev => ({
      ...prev,
      [phraseId]: decrypted,
    }));

    setShowPhrases(prev => ({
      ...prev,
      [phraseId]: true,
    }));

    setError(null);

  } catch (err) {

    console.error(err);

    setError("Invalid password or 13th word");

  }

};

  /*
  HIDE PHRASE
  */

  const toggleShowPhrase = (phraseId: number) => {
    setShowPhrases((prev) => ({
      ...prev,
      [phraseId]: !prev[phraseId],
    }));
  };

  /*
  UI
  */

  if (!auth) return <div className="card-dark p-6">Please login</div>;

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2 className="text-white text-xl">Saved Wallet Phrases</h2>

        <button className="btn btn-yellow" onClick={loadPhrases}>
          Refresh
        </button>
      </div>

      {error && <div className="warning-box mb-4">⚠️ {error}</div>}

      {loading && <div className="card-dark p-6">Loading...</div>}

      {!loading && phrases.length === 0 && (
        <div className="card-dark p-6">No wallets found</div>
      )}

      <div className="space-y-4">
        {phrases.map((phrase) => (
          <div key={phrase.id} className="card-dark p-4">
            <div className="mb-2">
              <div className="text-white font-semibold">
                {phrase.label || "Unnamed Wallet"}
              </div>

              <div className="text-xs text-slate-400">
                {phrase.walletAddress}
              </div>

              <div className="text-xs text-slate-500">{phrase.network}</div>
            </div>

            {!showPhrases[phrase.id] && (
              <div>
                {phrase.encryptedPhrase.version === 3 ? (

  <>
    <input
      type="password"
      className="form-input w-full mb-2"
      placeholder="Enter 13th word"
      value={extraWords[phrase.id] || ""}
      onChange={(e) =>
        handleExtraWordChange(phrase.id, e.target.value)
      }
    />
  </>

) : phrase.encryptedPhrase.version === 2 ? (

  <>
    <input
      type="password"
      className="form-input w-full mb-2"
      placeholder="Enter password"
      value={passwords[phrase.id] || ""}
      onChange={(e) =>
        handlePasswordChange(phrase.id, e.target.value)
      }
    />

    <input
      type="password"
      className="form-input w-full mb-2"
      placeholder="Enter 13th word"
      value={extraWords[phrase.id] || ""}
      onChange={(e) =>
        handleExtraWordChange(phrase.id, e.target.value)
      }
    />
  </>

) : (

  <>
    <input
      type="password"
      className="form-input w-full mb-2"
      placeholder="Enter password"
      value={passwords[phrase.id] || ""}
      onChange={(e) =>
        handlePasswordChange(phrase.id, e.target.value)
      }
    />
  </>

)}

                <button
                  className="btn btn-primary w-full"
                  onClick={() => handleDecrypt(phrase.id)}
                >
                  🔓 Unlock Wallet
                </button>
              </div>
            )}

            {showPhrases[phrase.id] && (
              <div>
                <div className="mb-3">
                  <div className="text-white mb-1">12-Word Phrase</div>
                  <div className="grid grid-cols-2 gap-2 bg-slate-800 p-3 rounded">
                    {decryptedPhrases[phrase.id]?.mnemonic12
                      ?.split(" ")
                      .map((word, i) => (
                        <div key={i}>
                          {i + 1}. {word}
                        </div>
                      ))}
                  </div>
                </div>

                <button
                  className="btn btn-secondary w-full"
                  onClick={() => toggleShowPhrase(phrase.id)}
                >
                  Hide
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
