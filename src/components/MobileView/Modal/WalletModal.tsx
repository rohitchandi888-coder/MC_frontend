import React, { useState } from "react";
import { WalletMeta } from "../../../walletStorage";

interface Wallet {
    id: string;
    address: string;
    label: string;
    network: string;
}

interface WalletModalProps {
    isOpen: boolean;
    onClose: () => void;
    wallets: WalletMeta[];
    onSwitchWallet: (walletId: string) => void;
    storedMeta: { address: string; label?: string } | null;
}

const WalletModal: React.FC<WalletModalProps> = ({
    isOpen,
    onClose,
    wallets,
    onSwitchWallet,
    storedMeta,
}) => {
    const [copied, setCopied] = useState<string | null>(null);


    const copyToClipboard = (text: string, type: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(type);
            setTimeout(() => setCopied(null), 2000);
        });
    };
    if (!isOpen) return null;

    return (
        <div
            onClick={onClose}
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
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: "90%",
                    maxWidth: 400,
                    background: "#1e293b",
                    borderRadius: 10,
                    padding: 15,
                    maxHeight: "70vh",
                    overflowY: "auto",
                }}
            >
                <h3 style={{ color: "#fff", marginBottom: 10 }}>Select Wallet</h3>

                {wallets.map((wallet) => {
                    const selectedWallet = wallet.id
                    // console.log({selectedWallet});
                    return (
                       <div>
                         <div
                            key={wallet.id}
                            style={{
                                border: '2px solid #333',
                                padding: 10,
                                marginBottom: 8,
                                borderRadius: 8,
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                cursor: "pointer",
                                background:
                                    wallet.address?.toLowerCase() === storedMeta?.address?.toLowerCase()
                                        ? '#1f1d1d'
                                        : 'transparent',
                            }}
                            onClick={() => {
                                onSwitchWallet(wallet.id);
                                onClose();
                            }}
                        >
                            <div>
                                <div style={{ color: "#fff", fontSize: 14 }}>
                                    {wallet.label}
                                </div>
                                <div style={{ color: "#94a3b8", fontSize: 14 }}>
                                    {wallet.address.slice(0, 10)}......{wallet.address.slice(-4)}
                                </div>
                                <div style={{ color: "#64748b", fontSize: 18, marginTop: 5 }}>
                                    {wallet.network}
                                </div>
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard(wallet.address, `wallet-${wallet.id}`);
                                }}
                                style={{
                                    padding: "4px 8px",
                                    border: "1px solid #475569",
                                    borderRadius: 6,
                                    background: "transparent",
                                    color:
                                        copied === `wallet-${wallet.id}` ? "#10b981" : "#94a3b8",
                                    cursor: "pointer",
                                }}
                            >
                                {copied === `wallet-${wallet.id}` ? "✓" : "⧉"}
                            </button>
                        </div>
                       </div>
                    )

                })}
            </div>
        </div>
    );
};

export default WalletModal;