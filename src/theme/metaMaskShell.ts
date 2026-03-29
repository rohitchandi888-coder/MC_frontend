/**
 * MetaMask-like layout tokens — structure matches MM; swap hues here for branding.
 */
export const MM = {
  accent: "#2563eb",
  accentMuted: "#eff6ff",
  text: "#121314",
  textSecondary: "#6a737d",
  textMuted: "#9ca3af",
  surface: "#ffffff",
  pageBg: "#f2f4f6",
  border: "#d6d9dc",
  borderLight: "#e5e7eb",
  overlay: "rgba(0, 0, 0, 0.45)",
  radius: 12,
  radiusLg: 16,
  shadowBar: "0 -2px 12px rgba(0, 0, 0, 0.06)",
  shadowModal: "0 12px 48px rgba(0, 0, 0, 0.12)",
  navInactive: "#6a737d",
  /** Quick actions row (Buy / Swap / …) */
  chipBg: "#ebedf0",
  /** Center FAB in bottom bar */
  navFabSize: 54,
  navFabRise: 28,
  zModal: 12000,
} as const;
