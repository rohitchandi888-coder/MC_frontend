import React from 'react';
import type { CustomToken } from '../../walletStorage';
import DataTable from "react-data-table-component";

interface CustomTokensProps {
  customTokens: CustomToken[];
  newTokenAddress: string;
  newTokenSymbol: string;
  newTokenName: string;
  tokenInfoLoading: boolean;
  customTokenBalances?: Record<string, string>;
  onAddressChange: (address: string) => void;
  onSymbolChange: (symbol: string) => void;
  onNameChange: (name: string) => void;
  onFetchTokenInfo: (address: string) => void;
  onAddToken: () => void;
  onRemoveToken: (address: string) => void;
  onToggleToken: (address: string) => void;
  isValidAddress: (address: string) => boolean;
}

const staticTokens = [
  { address: "0x0555e30da8f98308edb960aa94c0db47230d2b9c", symbol: "WBTC", name: "Wrapped BTC" },
  { address: "0x3ee2200efb3400fabb9aacf31297cbdd1d435d47", symbol: "ADA", name: "Cardano Token" },
  { address: "0xce7de646e7208a4ef112cb6ed5038fa6cc6b12e3", symbol: "TRX", name: "TRON" },
  { address: "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c", symbol: "WBNB", name: "Wrapped BNB" },
  { address: "0x3e14602186dd9de538f729547b3918d24c823546", symbol: "BNB", name: "Thunder Wrapped BNB" },
  { address: "0xb46d67fb63770052a07d5b7c14ed858a8c90f825", symbol: "ANYUSDT", name: "USDT-ERC20" },
  { address: "0x2170ed0880ac9a755fd29b2688956bd959f933f8", symbol: "ETH", name: "Ethereum Token" },
  { address: "0x6f817a0ce8f7640add3bc0c1c2298635043c2423", symbol: "ANYETH", name: "ANY Ethereum" },
  { address: "0x1d2f0da169ceb9fc7b3144628db156f3f6c60dbe", symbol: "XRP", name: "XRP Token" }
];

export const CustomTokens: React.FC<CustomTokensProps> = ({
  customTokens,
  newTokenAddress,
  newTokenSymbol,
  newTokenName,
  tokenInfoLoading,
  customTokenBalances = {},
  onAddressChange,
  onSymbolChange,
  onNameChange,
  onFetchTokenInfo,
  onAddToken,
  onRemoveToken,
  onToggleToken,
  isValidAddress,
}) => {

  const allTokens = [...staticTokens, ...customTokens];
  const columns = [
    {
      name: "Token",
      selector: (row: any) => row.symbol,
      sortable: true,
      cell: (row: any) => (
        <div className="flex items-center gap-2">
          <div className="token-icon-placeholder">
            {row.symbol.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="token-symbol">{row.symbol}</p>
            {row.name && <p className="token-name">{row.name}</p>}
          </div>
        </div>
      ),
    },
    {
      name: "Balance",
      cell: (row: any) => {
        const balance =
          customTokenBalances[row.address.toLowerCase()];
        const balanceNum = balance ? parseFloat(balance) : 0;

        return (
          <div>
            <p>{balanceNum.toFixed(4)} {row.symbol}</p>
          </div>
        );
      },
    },
{
  name: "Status",
  cell: (row: any) => {

    const isStatic = staticTokens.some(
      (token) => token.address === row.address
    );

    if (isStatic) {
      return (
        <span style={{ fontSize: "12px", color: "#888" }}>
          GLOBAL
        </span>
      );
    }

    const isEnabled = row.enabled !== false;

    return (
      <button
        onClick={() => onToggleToken(row.address)}
        style={{
          padding: "4px 12px",
          borderRadius: "6px",
          fontSize: "12px",
          border: "none",
          cursor: "pointer",
          backgroundColor: isEnabled ? "#f7a712" : "#000000",
          color: isEnabled ? "#000000" : "#ffffff",
        }}
      >
        {isEnabled ? "ON" : "OFF"}
      </button>
    );
  },
}
  ];

  return (
    <div>
      <p className="text-sm text-slate-300 mb-3">
        Import and manage custom tokens. Token balances will be displayed in the wallet overview.
      </p>

      <div className="add-token-form">
        <p className="text-xs font-semibold text-slate-300 mb-2">Add Custom Token</p>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            className="form-input-dark flex-1 text-xs"
            placeholder="Token contract address (0x...)"
            value={newTokenAddress}
            onChange={(e) => onAddressChange(e.target.value)}
            onBlur={() => {
              if (newTokenAddress.trim() && isValidAddress(newTokenAddress.trim()) && !newTokenSymbol.trim() && !tokenInfoLoading) {
                onFetchTokenInfo(newTokenAddress);
              }
            }}
          />
          <button
            className={`btn btn-yellow text-xs py-2 px-3 ${tokenInfoLoading || !newTokenAddress.trim() ? 'opacity-60 cursor-not-allowed' : ''}`}
            onClick={() => onFetchTokenInfo(newTokenAddress)}
            disabled={tokenInfoLoading || !newTokenAddress.trim()}
            style={{ whiteSpace: 'nowrap' }}
          >
            {tokenInfoLoading ? 'Loading...' : '🔍 Fetch Info'}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input
            type="text"
            className="form-input-dark text-xs"
            placeholder="Token symbol (e.g. USDT)"
            value={newTokenSymbol}
            onChange={(e) => onSymbolChange(e.target.value)}
          />
          <input
            type="text"
            className="form-input-dark text-xs"
            placeholder="Token name (optional)"
            value={newTokenName}
            onChange={(e) => onNameChange(e.target.value)}
          />
        </div>
        <button className="btn btn-primary w-full" onClick={onAddToken}>
          Add Token
        </button>
      </div>

      {[...staticTokens, ...customTokens].length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-300 mb-2">Your Custom Tokens</p>
          <div className="token-list-metamask">
            <DataTable
              columns={columns}
              data={allTokens}
              pagination
              paginationPerPage={10}
              paginationRowsPerPageOptions={[10, 20, 30, 50, 100]}
              paginationComponentOptions={{
                rowsPerPageText: "Rows:",
                rangeSeparatorText: "of",
              }}
              paginationIconPrevious={<span className="text-lg px-2">‹</span>}
              paginationIconNext={<span className="text-lg px-2">›</span>}
              highlightOnHover
              striped
            />
          </div>
        </div>
      )}

      {allTokens.length === 0 && (
        <p className="text-sm text-slate-400 text-center p-4">
          No custom tokens added yet. Add a token above to get started.
        </p>
      )}
    </div>
  );
};



