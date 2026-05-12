/**
 * After buyer marks paid (`paid_at`), seller should release FDA within this window.
 * Same window as buyer dispute eligibility — must match `backend` dispute logic.
 */
export const P2P_PAID_RESPONSE_DEADLINE_MINUTES = 30;

export function getPaidResponseDeadline(trade: { paid_at?: string | null }): Date | null {
  if (!trade?.paid_at) return null;
  const paidAt = new Date(trade.paid_at);
  if (Number.isNaN(paidAt.getTime())) return null;
  return new Date(paidAt.getTime() + P2P_PAID_RESPONSE_DEADLINE_MINUTES * 60 * 1000);
}

/** Buyer may open dispute only within this window (same rule as server). */
export function buyerCanDisputeAfterPaid(trade: { status?: string; paid_at?: string | null }): boolean {
  if (String(trade.status || '').toUpperCase() !== 'PAID_PENDING_RELEASE') return false;
  const d = getPaidResponseDeadline(trade);
  if (!d) return false;
  return Date.now() <= d.getTime();
}

export type ReleaseTimeline = {
  headline: string;
  detail: string;
  overdue: boolean;
};

const windowWords = `${P2P_PAID_RESPONSE_DEADLINE_MINUTES} minutes`;

export function getReleaseTimeline(
  trade: { paid_at?: string | null },
  nowMs: number,
  role: 'seller' | 'buyer',
): ReleaseTimeline | null {
  const deadline = getPaidResponseDeadline(trade);
  if (!deadline) {
    return {
      headline: 'Release timeline unavailable',
      detail: 'Payment time was not recorded for this trade.',
      overdue: false,
    };
  }

  const msLeft = deadline.getTime() - nowMs;
  const overdue = msLeft < 0;
  const fmt = (d: Date) => d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

  if (overdue) {
    const late = -msLeft;
    const h = Math.floor(late / 3600000);
    const m = Math.floor((late % 3600000) / 60000);
    const lateStr = h > 0 ? `${h}h ${m}m` : `${m} min`;
    if (role === 'seller') {
      return {
        headline: `Release overdue by ${lateStr}`,
        detail: `Release FDA as soon as you confirm payment. Target was ${fmt(deadline)} (${windowWords} after buyer marked paid).`,
        overdue: true,
      };
    }
    return {
      headline: `Seller release overdue by ${lateStr}`,
      detail: `Dispute window ended at ${fmt(deadline)}. Contact support if FDA was not released.`,
      overdue: true,
    };
  }

  const h = Math.floor(msLeft / 3600000);
  const m = Math.floor((msLeft % 3600000) / 60000);
  const leftStr = h > 0 ? `${h}h ${m}m` : `${Math.max(1, m)} min`;

  if (role === 'seller') {
    return {
      headline: `Release FDA within ${leftStr}`,
      detail: `Deadline ${fmt(deadline)} (${windowWords} after payment marked).`,
      overdue: false,
    };
  }

  return {
    headline: `Seller should release within ${leftStr}`,
    detail: `By ${fmt(deadline)} (${windowWords} after you marked paid). Dispute stays available until then.`,
    overdue: false,
  };
}
