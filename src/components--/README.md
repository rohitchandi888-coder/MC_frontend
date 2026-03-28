# Components Structure

This directory contains all the separated components from Dashboard.tsx.

## Structure:

```
components/
├── types.ts                 # Shared types and constants
├── Sidebar.tsx             # Navigation sidebar
├── modals/
│   ├── MessageModal.tsx    # Generic message/error modal
│   ├── AcceptOfferModal.tsx # Accept offer modal
│   ├── PaymentModal.tsx    # Payment screenshot upload modal
│   └── CancelOfferModal.tsx # Cancel offer confirmation modal
├── wallet/
│   ├── DashboardView.tsx   # Main dashboard view
│   ├── CreateWallet.tsx    # Create wallet component
│   ├── ImportWallet.tsx    # Import wallet component
│   ├── UnlockWallet.tsx    # Unlock wallet component
│   ├── SendTransfer.tsx    # Send/transfer component
│   ├── CustomTokens.tsx    # Custom tokens management
│   ├── ManageWallets.tsx   # Wallet management
│   ├── FDAWallets.tsx      # FDA wallets registration
│   └── MetaMaskConnect.tsx # MetaMask integration
├── p2p/
│   ├── P2PTrading.tsx      # P2P trading main component
│   └── TradeListing.tsx    # Trade listing page
└── admin/
    └── AdminPanel.tsx      # Admin panel component
```

## Usage:

Import components in Dashboard.tsx:
```typescript
import { Sidebar } from './components/Sidebar';
import { MessageModal } from './components/modals/MessageModal';
// etc.
```
