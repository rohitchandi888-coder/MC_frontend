import React, { useEffect, useState } from "react";
import { WalletMeta } from "../../walletStorage";
import NetworkModal from "./Modal/NetworkModal";

import { AuthState, Tab } from "../types";
import AddCustomTokenModal from "./Modal/AddCustomTokenModal";

import BNB from "/images/bnb.png";
import BTC from "/images/btc.png";
import ETH from "/images/eth.png";
import Tron from "/images/tron.png";

import Radium from "/images/subpart/ray.png";
import osmo from "/images/subpart/osmo.png";
import hydro from "/images/subpart/hydro.png";
import sunswap from "/images/subpart/sunswap.png";
import pumpswap from "/images/subpart/pumpswap.png";
import pancakeswap from "/images/subpart/pancakeswap.png";

const HomePageImage = [
  { main: BNB, sub: Radium },
  { main: BNB, sub: Radium },
  { main: BNB, sub: Radium },
  { main: BNB, sub: Radium },
  { main: BNB, sub: Radium },
  // five BNB
  { main: ETH, sub: osmo },
  { main: ETH, sub: Radium },
  { main: ETH, sub: hydro },
  { main: ETH, sub: sunswap },
  { main: ETH, sub: pumpswap },
  // five ETH

  { main: BTC, sub: osmo },
  { main: BTC, sub: Radium },
  { main: BTC, sub: sunswap },
  { main: BTC, sub: osmo },
  { main: BTC, sub: osmo },
  // five BTC

  { main: Tron, sub: Radium },
  { main: Tron, sub: pumpswap },
  { main: Tron, sub: Radium },
  { main: Tron, sub: Radium },
  { main: Tron, sub: pancakeswap },
];
const OverlayIcon = ({
  mainIcon,
  subIcon,
  size = 40,
}: {
  mainIcon: string;
  subIcon?: string;
  size?: number;
}) => {
  return (
    <div
      style={{
        width: 70,
        display: "flex",
        position: "relative",
      }}
    >
      <div style={{}}>
        <img
          src={mainIcon}
          alt=""
          style={{
            width: 30,
            height: 30,
            objectFit: "scale-down",
            position: "absolute",
            top: 60,
            right: -10,
            zIndex: 99,
            backgroundColor: "#ffffff",
            maxHeight: 30,
            borderRadius: "50%",
          }}
        />
      </div>
      <div>
        <img
          src={subIcon}
          style={{
            width: "100%",
            objectFit: "contain",
            position: "relative",
            zIndex: 1,
          }}
        />
      </div>
    </div>
  );
};
interface ActionItem {
  label: string;
  icon: string;
  changeTab: () => void;
}

interface MobileDashboardProps {
  auth: AuthState | null;
  price: number | null;
  change: string;
  actions: ActionItem[];
  nativeBalance: string;
  fdaBalance: string;
  allWallets: WalletMeta[];
  indiAction: () => void;
  internalFdaBalance: number | null;
  setActiveTab: (tab) => void;
}

const allTabs: Tab[] = [
  "dashboard",
  "create",
  "import",
  "unlock",
  "send",
  "tokens",
  "wallets",
  "fdawallets",
  "metamask",
  "p2p",
  "trade-listing",
  "history",
  "profile",
  "charts",
  "payment-methods",
  "view-phrases",
];
const MobileDashboard: React.FC<MobileDashboardProps> = ({
  auth,
  price,
  change,
  actions,
  indiAction,
  internalFdaBalance,
  setActiveTab
}) => {
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [networkData, setNetworkData] = useState<any>({});
  const [loadingNetworks, setLoadingNetworks] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<
    "All" | "BNB" | "ETH" | "BTC" | "TRON"
  >("All");
  const [search, setSearch] = useState("");
  const [searchBar, setSearchBar] = useState(false);
  const [userTokens, setUserTokens] = useState<any[]>([]);
  const [showAddTokenModal, setShowAddTokenModal] = useState(false);

  const open = () => setSearchBar(true);
  const close = () => setSearchBar(false);
  const filteredTabs = allTabs.filter((tab) =>
    tab.toLowerCase().includes(search.toLowerCase())
  );
  const getIcon = (chain: string) => {
    if (chain === "bsc") return BNB;
    if (chain === "ethereum") return ETH;
    if (chain === "tron") return Tron;
    return ETH;
  };

  const fetchUserTokens = async () => {
    try {
      const res = await fetch(
        "https://merchantcoinwallet.com/api/customTokens",
        {
          headers: {
            Authorization: `Bearer ${auth?.token}`,
          },
        },
      );

      const data = await res.json();
      const filtered = (data.tokens || []).filter(
        (t: any) => t.status !== "GLOBAL",
      );
      setUserTokens(filtered);
    } catch (err) {
      console.error(err);
    }
  };
  const fetchNetworks = async () => {
    try {
      setLoadingNetworks(true);

      const queries = {
        BNB: "bnb",
        ETH: "ethereum",
        BTC: "bitcoin",
        TRON: "tron",
      };

      const results: any = {};

      for (const key in queries) {
        const res = await fetch(
          `https://api.dexscreener.com/latest/dex/search?q=${queries[key]}`,
        );

        const data = await res.json();

        results[key] = data.pairs?.slice(0, 15) || [];
      }

      setNetworkData(results);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingNetworks(false);
    }
  };

  useEffect(() => {
    fetchNetworks();
    fetchUserTokens();
  }, []);

  const getFilteredData = () => {
    if (selectedNetwork === "All") {
      return [
        ...(networkData?.BNB || []).slice(0, 5),
        ...(networkData?.ETH || []).slice(0, 5),
        ...(networkData?.BTC || []).slice(0, 5),
        ...(networkData?.TRON || []).slice(0, 5),
      ];
    }

    const networkPairs = networkData?.[selectedNetwork] || [];

    const userOnly = userTokens.filter((t) => t.status === "ON");

    const matched = networkPairs.filter((pair: any) =>
      userOnly.some(
        (t) =>
          t.address?.toLowerCase() === pair.baseToken?.address?.toLowerCase(),
      ),
    );

    return matched;
  };
  {
    !loadingNetworks && getFilteredData().length === 0 && (
      <p style={{ color: "#64748b", textAlign: "center" }}>
        No tokens added yet
      </p>
    );
  }
  return (
    <>
      <div style={{ padding: "1rem" }}>
        <div style={{ width: "100%", paddingBottom: 100 }}>
          {/* PRICE */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{ color: "#fff", fontSize: 34, fontWeight: 700 }}
            >{`${price * internalFdaBalance} INR`}</span>
            <span style={{ color: "#cecccc", fontWeight: 500 }}>
              {price} Per FDA Price
            </span>
            <span
              style={{
                fontSize: 12,
                color: change.includes("-") ? "#ef4444" : "#22c55e",
              }}
            >
              {change}
            </span>
          </div>

          <div style={{ marginBlock: 20 }}>
            <input
              type="search"
              placeholder="Search Fda Transfer"
              value={search}
              onChange={(e) => {
                const value = e.target.value;
                setSearch(value);
                setSearchBar(value.length > 0);
              }}
              style={{ fontSize: 18, width: "100%", padding: 8 }}
            />
          </div>


          {searchBar && (
            <div
              style={{
                position: "absolute",
                top: 225,
                left: 10,
                right: 10,
                background: "#333",
                borderRadius: 10,
                zIndex: 999,
                maxHeight: 250,
                overflowY: "auto",
                color: '#fff'
              }}
            >
              {filteredTabs.length > 0 ? (
                <ul style={{ listStyle: "none", padding: 10, margin: 0 }}>
                  {filteredTabs.map((tab, i) => (
                    <li
                      key={i}
                      onClick={() => {
                        setSearch("");
                        setSearchBar(false);
                        // 👉 CHANGE TAB HERE
                        setActiveTab(tab)
                        // console.log("Go to:", tab);
                      }}
                      style={{
                        padding: 10,
                        cursor: "pointer",
                        borderBottom: "1px solid #eee",
                        display:'flex',
                        justifyContent: 'space-between'
                      }}
                    >
                     <span style={{textTransform:'capitalize'}}>{tab}</span>
                     <span style={{backgroundColor: '#a7ff77', color: '#333', paddingInline: 10, borderRadius: 10, fontWeight: 500}}>GO</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ padding: 10 }}>No results</p>
              )}
            </div>
          )}


          {/* ACTIONS */}
          <div style={{ display: "flex", gap: 10, marginBlock: 20 }}>
            {actions.map((item, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  minWidth: 80,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  backgroundColor: "#323131",
                  paddingBlock: 10,
                  borderRadius: 10,
                }}
                onClick={item.changeTab}
              >
                <i
                  className={item.icon}
                  style={{ fontSize: 20, color: "#726f6f" }}
                />
                <span style={{ color: "#fff" }}>{item.label}</span>
              </div>
            ))}
          </div>

          {/* TABS */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 18,
              paddingBlock: 10,
              color: "#fff",
            }}
          >
            <span style={{ borderBottom: "3px solid #fff" }}>Token</span>
            <span>Perps</span>
            <span>Prediction</span>
            <span>DeFi</span>
            <span>NFTs</span>
          </div>

          {/* FILTER BAR */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              backgroundColor: "#1e1e1e",
              borderRadius: 10,
              padding: 8,
              marginBlock: 20,
            }}
          >
            <div
              style={{
                padding: 8,
                background: "#020617",
                color: "#fff",
                borderRadius: 6,
                cursor: "pointer",
              }}
              onClick={() => {
                setShowNetworkModal(true);
                if (!networkData?.BNB?.length) {
                  fetchNetworks();
                }
              }}
            >
              Popular Networks
            </div>
            <div style={{ display: "flex", gap: 20 }}>
              <i className="fa-solid fa-filter" style={{ color: "#fff" }} />
              <i
                className="fa-solid fa-plus"
                style={{ color: "#fff" }}
                onClick={() => setShowAddTokenModal(true)}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            {["All", "BNB", "ETH", "BTC", "TRON"].map((net) => (
              <div
                key={net}
                onClick={() => setSelectedNetwork(net as any)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 6,
                  cursor: "pointer",
                  background: selectedNetwork === net ? "#22c55e" : "#020617",
                  color: "#fff",
                  fontSize: 12,
                }}
              >
                {net}
              </div>
            ))}
          </div>
          {/* TOKENS */}
          <div
            style={{
              background: "#0f172a",
              borderRadius: 12,
              padding: 10,
              border: "1px solid #1e293b",
            }}
          >
            {loadingNetworks ? (
              <p style={{ color: "#fff" }}>Loading tokens...</p>
            ) : (
              getFilteredData().map((pair: any, i: number) => {
                const price = parseFloat(pair.priceUsd || 0);
                const change = pair.priceChange?.h24 || 0;
                const isNegative = change < 0;

                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: 12,
                      marginTop: 6,
                      borderRadius: 10,
                      background: "#020617",
                    }}
                  >
                    {/* LEFT */}
                    <div style={{ display: "flex", gap: 40 }}>
                      <div style={{ width: 60 }}>
                        <OverlayIcon
                          mainIcon={
                            HomePageImage[i % HomePageImage.length].main
                          }
                          subIcon={HomePageImage[i % HomePageImage.length].sub}
                        />
                      </div>

                      <div>
                        <div style={{ color: "#64748b", fontWeight: 500, fontSize: 12 }}>
                          {pair.baseToken?.symbol}
                        </div>
                        <div style={{ fontSize: 18, color: "#fff321", textTransform: 'capitalize' }}>
                          {pair.dexId}
                        </div>
                      </div>
                    </div>

                    {/* RIGHT */}
                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: "#fff", fontWeight: 500 }}>
                        ${price.toFixed(2)}
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          color: isNegative ? "#ef4444" : "#22c55e",
                        }}
                      >
                        {isNegative ? "" : "+"}
                        {change.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div style={{ marginTop: 10 }}>
            <button
              style={{
                width: "100%",
                backgroundColor: "#bab5b5",
                padding: 10,
                fontSize: 16,
              }}
            >
              View all tokens
            </button>
          </div>
        </div>
      </div>

      {/* MODAL */}
      <NetworkModal
        auth={auth}
        isOpen={showNetworkModal}
        onClose={() => setShowNetworkModal(false)}
        data={networkData}
        loading={loadingNetworks}
        userTokens={userTokens}
        onAdded={fetchUserTokens}
        indiAction={indiAction}
      />

      <AddCustomTokenModal
        isOpen={showAddTokenModal}
        onClose={() => setShowAddTokenModal(false)}
        auth={auth}
        userTokens={userTokens}
        onAdded={fetchUserTokens}
      />
    </>
  );
};

export default MobileDashboard;
