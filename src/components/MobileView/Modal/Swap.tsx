import React, { useState } from "react";
import { WalletMeta } from "../../../walletStorage";
import BNB from "/images/bnb.png";
import BTC from "/images/btc.png";
import ETH from "/images/eth.png";
import Tron from "/images/tron.png";
// import Solana from "/images/solana.png";
import { AuthState } from "../../types";
import { getApiUrl } from "../../../config";
import { MessageModal } from "../../modals/MessageModal";


const getWalletIcon = (network: string) => {
  if (network === "Bitcoin") return BTC;
  // if (network === "Solana") return Solana; 
  if (network === "Solana") return ETH; 
  if (network === "BNB Chain") return BNB;
  if (network === "Tron") return Tron;
  return BNB;
};
interface Wallet {
  id: string;
  address: string;
  label: string;
  network: string;
}

interface SwapModalProps {
  user: AuthState | null;
  isOpen: boolean;
  onClose: () => void;
  wallets: WalletMeta[];
  onSwitchWallet: (walletId: string) => void;
  storedMeta: { address: string; label?: string } | null;
  internalFdaBalance: number | null;
}

const SwapWalletModal: React.FC<SwapModalProps> = ({
  user,
  isOpen,
  onClose,
  wallets,
  onSwitchWallet,
  storedMeta,
  internalFdaBalance,
}) => {
  const [selectedWallet, setSelectedWallet] = useState<string>("");
  const [sendAmount, setSendAmount] = useState<string>("");

  const [showMessageModal, setShowMessageModal] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  // console.log(JSON.stringify(wallets));

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const showErrorModal = (msg: string) => {
    setMessage(msg);
    setShowMessageModal(true);
  };

  const closeMessageModal = () => {
    setShowMessageModal(false);
  };

  const handleTransfer = async () => {
    try {
      if (!storedMeta?.address) {
        showErrorModal("⚠️ No wallet selected.");
        return;
      }

      if (!selectedWallet) {
        showErrorModal("⚠️ Please select recipient wallet.");
        return;
      }

      if (!sendAmount || Number(sendAmount) <= 0) {
        showErrorModal("⚠️ Enter valid amount.");
        return;
      }

      const recipient = wallets.find((w: any) => w.address === selectedWallet);

      const res = await fetch(getApiUrl("internal/transfer"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({
          fromAddress: storedMeta.address,
          toAddress: selectedWallet,
          amount: Number(sendAmount),
          note: `Internal transfer to ${recipient?.label || "Wallet"}`,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showErrorModal(`⚠️ ${data.error || "Transfer failed"}`);
        return;
      }

      showErrorModal(
        `✅ Sent ${sendAmount} FDA to ${recipient?.label} (Instant & Zero Fee)`,
      );

      setSendAmount("");
      setSelectedWallet("");
    } catch (err) {
      console.error(err);
      showErrorModal("⚠️ Transfer failed. Try again.");
    }
  };
  if (!isOpen) return null;
  console.log(user.token);

  return (
    <>
      <div
        // onClick={onClose}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(0,0,0,0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2000,
        }}
      >
        <div
          style={{
            backgroundColor: "#020617",
            width: "95%",
            maxWidth: 400,
            borderRadius: 12,
            padding: 15,
            color: "#fff",
          }}
        >
          {/* HEADER */}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <h3>Transfer</h3>
            <span style={{ cursor: "pointer", borderRadius: 100, backgroundColor: 'red', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center'}} onClick={onClose}>
              <span style={{backgroundColor: 'red'}}>✕</span>
            </span>
          </div>

          {/* FROM WALLET */}
          <span
            style={{
              marginTop: 10,
              fontSize: 24,
              color: "#ffffff",
              fontWeight: 600,
            }}
          >
            From
          </span>

          <div style={walletBox}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <img
                src={getWalletIcon(storedMeta?.network || "")}
                style={iconStyle}
              />
              <span style={{ fontSize: 14 }}>{storedMeta?.network}</span>
            </div>
            <div>
              <div>{storedMeta?.label || "Current Wallet"}</div>
              <div style={subText}>
                {storedMeta?.address.slice(0, 14)}.........
                {storedMeta?.address.slice(-6)}
              </div>
              <span>FDA Balance: {internalFdaBalance}</span>
            </div>
          </div>

          {/* SWITCH BUTTON */}
          <div style={{ textAlign: "center", margin: 10 }}>
            <i className="fa-solid fa-arrow-down"></i>
          </div>

          {/* TO WALLET */}
          <span
            style={{
              marginTop: 10,
              fontSize: 24,
              color: "#ffffff",
              fontWeight: 600,
            }}
          >
            To
          </span>

          <div style={{ maxHeight: 150, overflowY: "auto" }}>
            {wallets.map((w: any) => (
              <div key={w.id} style={walletBox}>
                <img src={getWalletIcon(w.network)} style={iconStyle} />

                <div style={{ flex: 1 }}>
                  <div>{w.label}</div>
                  <div style={subText}>
                    {w.address.slice(0, 10)}...{w.address?.slice(-5)}
                  </div>
                  <span
                    onClick={() => onSwitchWallet(w.id)}
                    style={{
                      fontSize: 16,
                      backgroundColor: "#ccfea0",
                      paddingInline: 0,
                      paddingBlock: 5,
                      color: "#333",
                      fontWeight: 800,
                      borderRadius: 15,
                      marginTop: 10,
                      display: "block",
                      textAlign: "center",
                    }}
                  >
                    Change Wallet
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 35,
                  }}
                >
                  <input
                    checked={selectedWallet === w.address}
                    onChange={() => setSelectedWallet(w.address)}
                    type="radio"
                    style={{ width: 30, height: 30 }}
                  />
                  <i
                    className="fa-solid fa-copy"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(w.address, w.id);
                    }}
                  />
                </div>
                {copied === w.id && (
                  <span style={{ fontSize: 10, color: "#22c55e" }}>Copied</span>
                )}
              </div>
            ))}
          </div>

          {/* AMOUNT */}
          <div style={{ marginTop: 15 }}>
            <input
              type="number"
              value={sendAmount}
              onChange={(e) => setSendAmount(e.target.value)}
              placeholder="Enter amount"
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 8,
                border: "none",
                background: "#0f172a",
                color: "#fff",
                fontSize: 18
              }}
            />
          </div>

          {/* BUTTON */}
          <button
            onClick={handleTransfer}
            style={{
              width: "100%",
              marginTop: 15,
              padding: 12,
              borderRadius: 8,
              border: "none",
              background: "#22c55e",
              color: "#fff",
              fontWeight: 600,
            }}
          >
            Send
          </button>
        </div>
      </div>
      <MessageModal
        show={showMessageModal}
        message={message}
        onClose={closeMessageModal}
      />
    </>
  );
};

export default SwapWalletModal;

const walletBox = {
  display: "flex",
  alignItems: "center",
  gap: 35,
  padding: 10,
  marginTop: 6,
  borderRadius: 8,
  background: "#0f172a",
  cursor: "pointer",
};

const iconStyle = {
  width: 60,
  height: 60,
  borderRadius: "50%",
  objectFit: "contain",
};

const subText = {
  fontSize: 16,
  color: "#64748b",
};
