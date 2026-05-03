import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { FDA_TOKEN_ADDRESS, type AuthState } from "../types";
import type { CustomToken, WalletMeta } from "../../walletStorage";
import { SendTransferMobile } from "./SendTransferMobile";

interface SendTransferProps {
  storedMeta: WalletMeta | null;
  allWallets: WalletMeta[];
  auth: AuthState | null;
  sendTo: string;
  setSendTo: (address: string) => void;
  sendAmount: string;
  setSendAmount: React.Dispatch<React.SetStateAction<string>>;
  assetType: "native" | "token";
  setAssetType: (type: "native" | "token") => void;
  tokenAddress: string;
  setTokenAddress: (address: string) => void;
  transferType: "internal" | "onchain";
  setTransferType: (type: "internal" | "onchain") => void;
  estimatedGas: string | null;
  estimatingGas: boolean;
  nativeBalance: string | null;
  fdaBalance: string | null;
  internalFdaBalance: number | null;
  recipientFdaWallet: any;
  unlockedPrivateKeyRef: React.MutableRefObject<string | null>;
  handleSend: () => Promise<void>;
  handleMaxAmount: () => Promise<void>;
  registerRecipientWallet: (address: string, label?: string) => Promise<boolean | void>;
  goto: () => void;
  customTokens?: CustomToken[];
  customTokenBalances?: Record<string, string>;
  fdaPrice?: number | null;
  onExit?: () => void;
  requestGasEstimate?: () => void;
  /** Mobile: skip token list when asset was chosen from home holdings. */
  skipAssetPickerStep?: boolean;
}

export const SendTransfer: React.FC<SendTransferProps> = ({
  storedMeta,
  allWallets,
  auth,
  sendTo,
  setSendTo,
  sendAmount,
  setSendAmount,
  assetType,
  setAssetType,
  tokenAddress,
  setTokenAddress,
  transferType,
  setTransferType,
  estimatedGas,
  estimatingGas,
  nativeBalance,
  fdaBalance,
  internalFdaBalance,
  recipientFdaWallet,
  unlockedPrivateKeyRef,
  handleSend,
  handleMaxAmount,
  registerRecipientWallet,
  goto,
  customTokens = [],
  customTokenBalances = {},
  fdaPrice = null,
  onExit = () => {},
  requestGasEstimate,
  skipAssetPickerStep = false,
}) => {

    const [isMobile, setIsMobile] = useState(false);
    const gasFeeNum = parseFloat(estimatedGas || "0") || 0;
    const nativeBalNum = parseFloat(nativeBalance || "0") || 0;
    const sendAmountNum = parseFloat(sendAmount || "0") || 0;
    const requiredBnbForOnChain =
      transferType === "onchain"
        ? assetType === "native"
          ? sendAmountNum + gasFeeNum
          : gasFeeNum
        : 0;
    const hasInsufficientGasForOnChain =
      transferType === "onchain" &&
      !estimatingGas &&
      !!estimatedGas &&
      nativeBalance !== null &&
      nativeBalNum < requiredBnbForOnChain;
  
    useEffect(() => {
      const checkScreen = () => {
        setIsMobile(window.innerWidth <= 768);
      };
  
      checkScreen();
      window.addEventListener("resize", checkScreen);
  
      return () => window.removeEventListener("resize", checkScreen);
    }, []);

  if (isMobile) {
    return (
      <SendTransferMobile
        storedMeta={storedMeta}
        allWallets={allWallets}
        auth={auth}
        sendTo={sendTo}
        setSendTo={setSendTo}
        sendAmount={sendAmount}
        setSendAmount={setSendAmount}
        assetType={assetType}
        setAssetType={setAssetType}
        tokenAddress={tokenAddress}
        setTokenAddress={setTokenAddress}
        transferType={transferType}
        setTransferType={setTransferType}
        estimatedGas={estimatedGas}
        estimatingGas={estimatingGas}
        nativeBalance={nativeBalance}
        fdaBalance={fdaBalance ?? null}
        internalFdaBalance={internalFdaBalance}
        recipientFdaWallet={recipientFdaWallet}
        customTokens={customTokens}
        customTokenBalances={customTokenBalances}
        fdaPrice={fdaPrice}
        unlockedPrivateKeyRef={unlockedPrivateKeyRef}
        handleSend={handleSend}
        handleMaxAmount={handleMaxAmount}
        registerRecipientWallet={registerRecipientWallet}
        onUnlock={goto}
        onExit={onExit}
        requestGasEstimate={requestGasEstimate}
        skipAssetPickerStep={skipAssetPickerStep}
      />
    );
  }

  if (!unlockedPrivateKeyRef.current) {
  return (
    <>
    <div className="warning-box" style={{marginBlock: 10, marginInline: 10}}>
      <div className="warning-box-content">
        <span className="warning-icon">🔒</span>
        <p className="text-sm font-semibold warn-text" style={{ padding: "0.5rem 1rem" }}>
          Wallet Locked
        </p>
      </div>

      <p
        className="text-xs waring-para"
        style={{ padding: "0.5rem 1rem" }}
      >
        Please unlock your wallet first. You need to enter your
        <strong> Custom 13th word</strong> to send transactions.
      </p>
    </div>
    </>
  );
}
  return (
    <div >
      <p
        className="text-sm text-slate-300 mb-2"
        style={{ padding: "0.5rem 1rem", lineHeight: "1.6" }}
      >
        Send native tokens (BNB) or tokens (USDT, FDA, etc.) using your unlocked
        wallet. On-chain transactions require gas fees paid in BNB. Transactions
        are signed with your wallet's private key and broadcast to the
        blockchain.
      </p>
      <div className="info-box">
        <p
          className="text-xs  mb-2"
          style={{ padding: "0.5rem 1rem", color: "#fff" }}
        >
          📝 Important:
        </p>
        <p
          className="text-xs mb-2"
          style={{ padding: "0.5rem 1rem", lineHeight: "1.6", color: "#fff" }}
        >
          <strong>For Tokens:</strong> You can use{" "}
          <strong>Internal Transfer (zero fee, instant)</strong> if the
          recipient is registered as an MC wallet. Otherwise, use{" "}
          <strong>On-Chain Transfer</strong> which requires gas fees in BNB.
        </p>
        <p
          className="text-xs "
          style={{ padding: "0.5rem 1rem", lineHeight: "1.6", color: "#fff" }}
        >
          <strong>For Native BNB:</strong> All blockchain transactions require{" "}
          <strong>gas fees paid in BNB</strong> (the native token). This is a
          network requirement, not a wallet fee.
        </p>
      </div>
      {storedMeta && (
        <div className="info-box mb-3" style={{ padding: "0.5rem" }}>
          <div className="flex justify-between items-center mb-1">
            <p className="text-xs text-slate-400">Sending from:</p>
            <div className="flex gap-3 items-center">
              {internalFdaBalance !== null &&
                assetType === "token" &&
                tokenAddress.toLowerCase() ===
                  FDA_TOKEN_ADDRESS.toLowerCase() && (
                  <p className="text-xs text-slate-50 font-semibold">
                    Internal: {internalFdaBalance.toFixed(2)} FDA
                  </p>
                )}
              {nativeBalance !== null && (
                <p className="text-xs text-slate-50 font-semibold">
                  {parseFloat(nativeBalance).toFixed(6)} BNB
                </p>
              )}
            </div>
          </div>
          <p className="text-xs font-mono text-slate-50">
            {storedMeta.label || "Wallet"} - {storedMeta.address}
          </p>
        </div>
      )}
      <div className="mb-2">
        <select
          className="form-select-dark w-full"
          value={assetType}
          onChange={(e) => {
            setAssetType(e.target.value as "native" | "token");
            if (e.target.value === "native") {
              setTransferType("onchain");
            }
          }}
        >
          <option value="native">Native coin (e.g. BNB)</option>
          <option value="token">Token (USDT, FDA, etc.)</option>
        </select>
      </div>
      {assetType === "token" && (
        <>
          <div className="mb-2">
            <input
              type="text"
              className="form-input w-full mb-2"
              placeholder="Token contract address (e.g. USDT: 0x55d398326f99059fF775485246999027B3197955)"
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value)}
            />
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                className={`btn btn-yellow text-xs py-1 px-3 ${
                  tokenAddress.toLowerCase() ===
                  "0x55d398326f99059fF775485246999027B3197955".toLowerCase()
                    ? "active-token"
                    : ""
                }`}
                onClick={() =>
                  setTokenAddress("0x55d398326f99059fF775485246999027B3197955")
                }
              >
                USDT (BSC)
              </button>
              <button
                type="button"
                className={`btn btn-yellow text-xs py-1 px-3 ${
                  tokenAddress.toLowerCase() === FDA_TOKEN_ADDRESS.toLowerCase()
                    ? "active-token"
                    : ""
                }`}
                onClick={() => setTokenAddress(FDA_TOKEN_ADDRESS)}
              >
                FDA Token
              </button>
            </div>
          </div>
          {tokenAddress.toLowerCase() === FDA_TOKEN_ADDRESS.toLowerCase() &&
          auth ? (
            <div className="card-dark mb-2" style={{ padding: "0.5rem" }}>
              <label
                className="block text-sm text-white mb-1 font-semibold"
                style={{ color: "#f1f5f9" }}
              >
                Transfer Type:
              </label>
              <select
                className="form-select-dark text-xs py-1"
                value={transferType}
                onChange={(e) =>
                  setTransferType(e.target.value as "internal" | "onchain")
                }
              >
                <option value="internal">
                  🔄 Internal Transfer (Zero Fee, Instant)
                </option>
                <option value="onchain">
                  ⛓️ On-Chain Transfer (Gas Fee Required)
                </option>
              </select>
              {transferType === "internal" && (
                <p className="text-xs text-slate-400 mt-1">
                  ✅ Fast internal transfer between MC wallets with zero fees
                </p>
              )}
            </div>
          ) : tokenAddress.trim() && ethers.isAddress(tokenAddress.trim()) ? (
            <div className="card-dark mb-2" style={{ padding: "0.5rem" }}>
              <label
                className="block text-sm text-white mb-1 font-semibold"
                style={{ color: "#f1f5f9" }}
              >
                Transfer Type:
              </label>
              <select
                className="form-select-dark text-xs py-1"
                value={transferType}
                onChange={(e) =>
                  setTransferType(e.target.value as "internal" | "onchain")
                }
                disabled={true}
              >
                <option value="onchain">
                  ⛓️ On-Chain Transfer (Gas Fee Required)
                </option>
              </select>
              <p className="text-xs text-slate-400 mt-1">
                ⚠️ On-chain transfer required. Gas fees will be paid in BNB.
              </p>
            </div>
          ) : null}
        </>
      )}

      {/* Recipient Address Section */}
      <div className="mb-4">
        <label
          className="block text-sm text-white mb-2 font-semibold"
          style={{ color: "rgb(88 119 149)" }}
        >
          📍 Destination Address (Recipient Wallet)
        </label>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            className="form-input flex-1"
            placeholder="Enter recipient wallet address (e.g. 0xF7c070D5A8C399b97738E301a3FD744B54248154)"
            value={sendTo}
            onChange={(e) => setSendTo(e.target.value.toLowerCase())}
          />
          {allWallets.length > 1 && (
            <select
              className="form-select-dark text-xs py-2"
              onChange={(e) => {
                if (e.target.value) {
                  const wallet = allWallets.find(
                    (w) => w.id === e.target.value,
                  );
                  if (wallet) {
                    setSendTo(wallet.address);
                  }
                }
              }}
              value=""
            >
              <option value="">Select wallet...</option>
              {allWallets
                .filter((w) => w.id !== storedMeta?.id)
                .map((wallet) => (
                  <option key={wallet.id} value={wallet.id}>
                    {wallet.label || `Wallet ${wallet.id.slice(-6)}`}
                  </option>
                ))}
            </select>
          )}
        </div>
      </div>

      {/* MC Wallet Detection */}
      {assetType === "token" &&
        tokenAddress.toLowerCase() === FDA_TOKEN_ADDRESS.toLowerCase() &&
        sendTo.trim() &&
        ethers.isAddress(sendTo.trim()) && (
          <>
            {recipientFdaWallet ? (
              <div
                className="success-box-dark mb-2"
                style={{ padding: "0.5rem" }}
              >
                <p className="text-xs text-slate-50 font-semibold mb-1">
                  ✅ MC Wallet Detected
                </p>
                <p className="text-xs text-slate-200">
                  {recipientFdaWallet.walletLabel ||
                    recipientFdaWallet.fullName ||
                    recipientFdaWallet.email ||
                    "MC Wallet"}
                </p>
                <p className="text-xs text-slate-300 mt-1">
                  You can use Internal Transfer (zero fee) for this recipient
                </p>
              </div>
            ) : (
              <div className="warning-box mb-2" style={{ padding: "0.5rem" }}>
                <p className="text-xs text-slate-50 font-semibold mb-1">
                  ⚠️ Not Registered as MC Wallet
                </p>
                <p className="text-xs text-slate-200 mb-2">
                  This address is not registered in the MC system. Register it
                  to enable zero-fee internal transfers.
                </p>
                {auth && (
                  <button
                    className="btn btn-yellow w-full text-xs py-1 px-3"
                    onClick={() => registerRecipientWallet(sendTo.trim())}
                  >
                    📝 Register This Address as MC Wallet
                  </button>
                )}
                {!auth && (
                  <p className="text-xs text-slate-300">
                    Please login to register wallet addresses
                  </p>
                )}
              </div>
            )}
          </>
        )}

      {/* Amount Section */}
      <div className="mb-4">
        <label
          className="block text-sm text-white mb-2 font-semibold"
          style={{ color: "rgb(88 119 149)" }}
        >
          💰 Amount
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            step="any"
            className="form-input flex-1"
            placeholder="Enter amount to send"
            value={sendAmount}
            onChange={(e) => setSendAmount(e.target.value)}
          />
          {transferType === "onchain" && (
            <button
              className={`btn btn-yellow text-xs py-2 px-3 ${!unlockedPrivateKeyRef.current || !sendTo.trim() || estimatingGas ? "opacity-60 cursor-not-allowed" : ""}`}
              onClick={handleMaxAmount}
              disabled={
                !unlockedPrivateKeyRef.current ||
                !sendTo.trim() ||
                estimatingGas
              }
              style={{ whiteSpace: "nowrap" }}
            >
              {estimatingGas ? "..." : "MAX"}
            </button>
          )}
          {transferType === "internal" && internalFdaBalance !== null && (
            <button
              className="btn btn-yellow text-xs py-2 px-3"
              onClick={() => setSendAmount(internalFdaBalance.toFixed(2))}
              style={{ whiteSpace: "nowrap" }}
            >
              MAX
            </button>
          )}
        </div>
      </div>

      {/* Gas Fee Information (only for on-chain) */}
      {transferType === "onchain" &&
        estimatedGas &&
        unlockedPrivateKeyRef.current && (
          <div className="card-dark mb-3" style={{ padding: "0.5rem" }}>
            <div className="flex justify-between items-center">
              <p className="text-xs text-slate-400">Estimated Gas Fee:</p>
              <p className="text-xs text-slate-50 font-semibold">
                ~{estimatedGas} BNB
              </p>
            </div>
            <p
              className="text-xs text-slate-500 mt-1"
              style={{ fontSize: "0.7rem" }}
            >
              ⚠️ Gas fees are required for all blockchain transactions and must
              be paid in BNB (native token).
              {assetType === "native" && nativeBalance !== null && (
                <span className="block mt-1">
                  You have {parseFloat(nativeBalance).toFixed(6)} BNB.
                  {parseFloat(sendAmount || "0") > 0 && (
                    <span>
                      {" "}
                      Total needed:{" "}
                      {(
                        parseFloat(sendAmount) + parseFloat(estimatedGas)
                      ).toFixed(6)}{" "}
                      BNB
                    </span>
                  )}
                </span>
              )}
            </p>
          </div>
        )}

      <button
        className="btn btn-primary w-full"
        onClick={handleSend}
        disabled={
          (transferType === "onchain" && !unlockedPrivateKeyRef.current) ||
          hasInsufficientGasForOnChain
        }
      >
        {transferType === "internal"
          ? "🔄 Send Internal Transfer (Zero Fee)"
          : "⛓️ Send On-Chain Transaction"}
      </button>
      {hasInsufficientGasForOnChain && (
        <p className="text-xs mt-2" style={{ color: "#fca5a5" }}>
          ⚠️ You do not have required BNB for gas fee.
          {` Available: ${nativeBalNum.toFixed(6)} BNB · Required: ${requiredBnbForOnChain.toFixed(6)} BNB`}
        </p>
      )}
      {transferType === "onchain" && !unlockedPrivateKeyRef.current && (
        <p className="text-xs text-slate-400 mt-2">
          ⚠️ Please unlock your wallet first to send on-chain transactions.
          Transactions are signed with your wallet's private key.
        </p>
      )}
      {transferType === "internal" && !auth && (
        <p className="text-xs text-slate-400 mt-2">
          ⚠️ Please login to use internal transfers.
        </p>
      )}
    </div>
  );
};
