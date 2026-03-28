# Component Structure Plan

## Completed Components:
✅ `types.ts` - Shared types and constants
✅ `Sidebar.tsx` - Navigation sidebar
✅ `modals/MessageModal.tsx` - Generic message/error modal
✅ `modals/AcceptOfferModal.tsx` - Accept offer modal
✅ `modals/PaymentModal.tsx` - Payment screenshot upload modal
✅ `modals/CancelOfferModal.tsx` - Cancel offer confirmation modal
✅ `utils/imageCompression.ts` - Image compression utility

## Components to Create:

### Wallet Components (`wallet/`):
1. `DashboardView.tsx` - Main dashboard view (balance display, welcome section)
2. `CreateWallet.tsx` - Create new wallet component
3. `ImportWallet.tsx` - Import wallet component
4. `UnlockWallet.tsx` - Unlock wallet component
5. `SendTransfer.tsx` - Send/transfer component
6. `CustomTokens.tsx` - Custom tokens management
7. `ManageWallets.tsx` - Wallet management
8. `FDAWallets.tsx` - FDA wallets registration
9. `MetaMaskConnect.tsx` - MetaMask integration

### P2P Components (`p2p/`):
1. `P2PTrading.tsx` - P2P trading main component (create offers, my trades)
2. `TradeListing.tsx` - Trade listing page (browse offers, filters, pagination)

### Admin Component (`admin/`):
1. `AdminPanel.tsx` - Admin panel (global settings, monitoring)

## Component Props Pattern:

Each component should receive:
- Required state values as props
- Callback functions for actions
- Shared utilities (auth, etc.)

Example:
```typescript
interface ComponentProps {
  auth: AuthState | null;
  someState: Type;
  onAction: (param: Type) => void;
  // ... other props
}
```
