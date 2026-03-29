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

 const allTokens = customTokens ?? [];

  const tableCustomStyles = {
    table: {
      style: {
        minWidth: "100%",
      },
    },
    headCells: {
      style: {
        fontSize: "0.75rem",
        fontWeight: 700,
        wordBreak: "normal" as const,
        whiteSpace: "nowrap" as const,
      },
    },
    cells: {
      style: {
        wordBreak: "normal" as const,
        overflowWrap: "break-word" as const,
        whiteSpace: "normal" as const,
        verticalAlign: "middle" as const,
      },
    },
    rows: {
      style: {
        minHeight: "56px",
      },
    },
  };

  const columns = [
    {
      name: "Token",
      selector: (row: any) => row.symbol,
      sortable: true,
      minWidth: "200px",
      grow: 2,
      cell: (row: any) => (
        <div
          className="token-table-token-row"
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            minWidth: 0,
            width: "100%",
          }}
        >
          <div className="token-icon-placeholder" style={{ flexShrink: 0 }}>
            {row.symbol.charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p
              className="token-symbol"
              style={{ wordBreak: "normal", overflowWrap: "break-word" }}
            >
              {row.symbol}
            </p>
            {row.name && (
              <p
                className="token-name"
                style={{ wordBreak: "normal", overflowWrap: "break-word" }}
              >
                {row.name}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      name: "Balance",
      minWidth: "120px",
      grow: 1,
      cell: (row: any) => {
        const balance =
          customTokenBalances[row.address.toLowerCase()];
        const balanceNum = balance ? parseFloat(balance) : 0;

        return (
          <div style={{ wordBreak: "normal", minWidth: 0 }}>
            <p style={{ margin: 0, wordBreak: "normal", overflowWrap: "break-word" }}>
              {balanceNum.toFixed(4)} {row.symbol}
            </p>
          </div>
        );
      },
    },
{
  name: "Status",
  minWidth: "88px",
  grow: 0,
  cell: (row: any) => {

    const status = (row.status || "").toUpperCase();
    const isGlobal = status === "GLOBAL";
    const isEnabled = status === "ON";

    if (isGlobal) {
      return (
        <span style={{ fontSize: "12px", color: "#888" }}>
          GLOBAL
        </span>
      );
    }

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

      {allTokens.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-300 mb-2">Your Custom Tokens</p>
          <div className="token-list-metamask">
            <DataTable
              columns={columns}
              data={allTokens}
              customStyles={tableCustomStyles}
              responsive
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



