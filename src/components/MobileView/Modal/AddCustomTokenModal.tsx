import React, { useEffect, useState } from "react";
import BNB from "/images/bnb.png";
const BSCSCAN_API_KEY = "FN1WG7QTMN6ZZ3WK9N6VCUR68XPR73RCMI"; 

const AddCustomTokenModal = ({
  isOpen,
  onClose,
  auth,
  userTokens,
  onAdded,
}: any) => {
  const [tokens, setTokens] = useState<any[]>([]);
  const [selected, setSelected] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // ✅ check already added
  const isAlreadyAdded = (addr: string) =>
    userTokens.some(
      (t: any) =>
        t.address?.toLowerCase() === addr?.toLowerCase() &&
        t.status === "ON"
    );

const fetchBnbTokens = async () => {
  try {
    setLoading(true);

    const res = await fetch(
      "https://api.dexscreener.com/latest/dex/search?q=bnb"
    );

    const data = await res.json();

    const unique: any = {};

    data.pairs?.forEach((p: any) => {
      if (
        p.chainId === "bsc" &&
        p.liquidity?.usd > 3000 // 👈 filter junk tokens
      ) {
        const addr = p.baseToken.address;

        if (!unique[addr]) {
          unique[addr] = {
            address: addr,
            symbol: p.baseToken.symbol,
            name: p.baseToken.name,
            logo: p.info?.imageUrl,
          };
        }
      }
    });

    setTokens(Object.values(unique).slice(0, 20));
  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    if (isOpen) fetchBnbTokens();
  }, [isOpen]);

  // ✅ toggle checkbox
  const toggleToken = (t: any) => {
    setSelected((prev) => {
      if (prev.find((x) => x.address === t.address)) {
        return prev.filter((x) => x.address !== t.address);
      }
      return [...prev, t];
    });
  };

  // ✅ bulk add
  const handleAdd = async () => {
    if (!selected.length) return alert("Select tokens");

    try {
      await Promise.all(
        selected.map((t) =>
          fetch("https://merchantcoinwallet.com/api/customTokens", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${auth?.token}`,
            },
            body: JSON.stringify({
              contract_address: t.address,
              token_symbol: t.symbol,
              token_name: t.name,
              status: "ON",
            }),
          })
        )
      );

      alert("✅ Tokens added");

      setSelected([]);
      onAdded();
      onClose();
    } catch (err) {
      console.error(err);
      alert("❌ Failed to add");
    }
  };

  if (!isOpen) return null;

  return (
    <div style={overlay}>
      <div style={modal}>
        <h3 style={{ color: "#fff" }}>Add BSC Tokens</h3>

        {/* LIST */}
        <div style={{ maxHeight: 300, overflowY: "auto" }}>
          {loading ? (
            <p style={{ color: "#fff" }}>Loading tokens...</p>
          ) : (
            tokens.map((t, i) => (
              <div key={i} style={row}>
                <input
                  type="checkbox"
                  disabled={isAlreadyAdded(t.address)}
                  checked={
                    isAlreadyAdded(t.address) ||
                    selected.some((x) => x.address === t.address)
                  }
                  onChange={() => toggleToken(t)}
                />

                {/* TOKEN LOGO */}
                <img
  src={BNB}
  style={{
    width: 24,
    height: 24,
    borderRadius: 12,
    objectFit: "contain",
  }}
/>

                <div style={{ color: "#fff" }}>
                  {t.symbol}
                  <div style={{ fontSize: 10, color: "#64748b" }}>
                    {t.name}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ADD BUTTON */}
        <button onClick={handleAdd} style={btn}>
          Add Selected
        </button>

        <button onClick={onClose} style={btn}>
          Close
        </button>
      </div>
    </div>
  );
};

export default AddCustomTokenModal;

/* styles */
const overlay = {
  position: "fixed" as const,
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 3000,
};

const modal = {
  width: "90%",
  maxWidth: 400,
  background: "#1e293b",
  borderRadius: 10,
  padding: 15,
};

const row = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: 10,
  background: "#020617",
  marginTop: 6,
  borderRadius: 6,
};

const btn = {
  width: "100%",
  padding: 10,
  marginTop: 10,
  background: "#22c55e",
  border: "none",
  borderRadius: 6,
  color: "#fff",
  cursor: "pointer",
};