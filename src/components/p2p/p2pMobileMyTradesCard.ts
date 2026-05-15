/** Solid status pill (white text) — shared by P2P Trading & Trade Listing mobile trade cards. */
export function myTradesMobileStatusPill(statusUpper: string): { bg: string; label: string } {
  switch (statusUpper) {
    case 'COMPLETED':
      return { bg: '#059669', label: 'COMPLETED' };
    case 'PAID_PENDING_RELEASE':
      return { bg: '#ea580c', label: 'PAID' };
    case 'PENDING':
    case 'PENDING_PAYMENT':
      return { bg: '#64748b', label: 'PENDING' };
    case 'DISPUTED':
      return { bg: '#d97706', label: 'DISPUTED' };
    case 'CANCELLED':
      return { bg: '#dc2626', label: 'CANCELLED' };
    default:
      return { bg: '#475569', label: statusUpper || '—' };
  }
}
