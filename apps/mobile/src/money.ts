import type { Money } from "./api/types";

/** "1,250.50" or "1250.5" → 125050 paise. Returns null if not a valid amount. */
export function rupeesToMinor(input: string): number | null {
  const cleaned = input.replace(/[₹,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(parseFloat(cleaned) * 100);
}

/** 125050 → "1,250.50" (no symbol). */
export function minorToRupees(amountMinor: number): string {
  return (amountMinor / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function inr(amountMinor: number): string {
  return `₹${minorToRupees(amountMinor)}`;
}

export function moneyStr(m: Money): string {
  const symbol = m.currency === "INR" ? "₹" : `${m.currency} `;
  return `${symbol}${minorToRupees(m.amountMinor)}`;
}
