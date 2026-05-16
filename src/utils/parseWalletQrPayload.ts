import { ethers } from 'ethers';

/** Extract a BSC/ETH wallet address from QR text (plain, URI, or JSON). */
export function parseWalletAddressFromQrPayload(raw: string): string | null {
  const text = String(raw || '').trim();
  if (!text) return null;

  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const candidates = [
      parsed.address,
      parsed.wallet,
      parsed.walletAddress,
      parsed.to,
      parsed.account,
      parsed.publicAddress,
    ];
    for (const c of candidates) {
      if (typeof c === 'string' && ethers.isAddress(c)) {
        return ethers.getAddress(c);
      }
    }
  } catch {
    /* not JSON */
  }

  const uriMatch = text.match(/ethereum:(0x[a-fA-F0-9]{40})/i);
  if (uriMatch?.[1] && ethers.isAddress(uriMatch[1])) {
    return ethers.getAddress(uriMatch[1]);
  }

  const embedded = text.match(/0x[a-fA-F0-9]{40}/);
  if (embedded?.[0] && ethers.isAddress(embedded[0])) {
    return ethers.getAddress(embedded[0]);
  }

  return null;
}
