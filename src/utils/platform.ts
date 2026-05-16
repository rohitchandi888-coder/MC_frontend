/**
 * DevTools device toolbar: mobile UA with desktop host platform (Win32 + "iPhone" in UA).
 */
export function isMobileUaWithDesktopHost(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';
  const mobileUa = /iPhone|iPod|iPad|Android/i.test(ua);
  if (!mobileUa) return false;

  if (/Win32|Win64|Linux|CrOS/i.test(platform)) return true;

  if (platform === 'MacIntel' && /iPhone|iPod|iPad|Android/i.test(ua)) return true;

  return false;
}

/**
 * Physical iPhone / iPad / iPod — not Chrome DevTools device emulation.
 */
export function isRealIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';

  const looksIos =
    /iPhone|iPad|iPod/i.test(ua) ||
    (/Macintosh/i.test(ua) &&
      typeof navigator.maxTouchPoints === 'number' &&
      navigator.maxTouchPoints > 1);

  if (!looksIos) return false;
  if (isMobileUaWithDesktopHost()) return false;

  return true;
}

export function isAndroidDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (isRealIosDevice()) return false;
  return /Android/i.test(navigator.userAgent || '');
}

/**
 * FDA Authenticator: required on every client except a real iOS device.
 * Covers Android, desktop browser (localhost / responsive testing), and DevTools emulation.
 * This app is mobile-only (>1024px shows “use mobile”), so non‑iOS users always get the gate.
 */
export function requiresFdaAuthenticatorOnDevice(): boolean {
  return !isRealIosDevice();
}
