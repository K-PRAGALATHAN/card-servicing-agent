import type { CardTier } from "./card";

export interface TierOffer {
  readonly tier: CardTier;
  readonly name: string;
  readonly tagline: string;
  readonly joiningFeeMinor: number;
  readonly domesticLimitMinor: number;
  readonly internationalLimitMinor: number;
  readonly internationalEnabled: boolean;
  readonly perks: readonly string[];
}

/** Upgrade offers shown in the app. Fees debit the customer's account on upgrade. */
export const TIER_CATALOG: Record<Exclude<CardTier, "Classic">, TierOffer> = {
  Platinum: {
    tier: "Platinum",
    name: "Platinum",
    tagline: "Higher limits, airport lounge access",
    joiningFeeMinor: 99_900, // ₹999
    domesticLimitMinor: 30_000_000, // ₹3,00,000
    internationalLimitMinor: 15_000_000, // ₹1,50,000
    internationalEnabled: true,
    perks: ["8 lounge visits / year", "5X reward points", "1% fuel surcharge waiver"],
  },
  Millennia: {
    tier: "Millennia",
    name: "Millennia",
    tagline: "5% cashback on online spends",
    joiningFeeMinor: 100_000, // ₹1,000
    domesticLimitMinor: 20_000_000, // ₹2,00,000
    internationalLimitMinor: 10_000_000, // ₹1,00,000
    internationalEnabled: true,
    perks: ["5% cashback online", "1% everywhere else", "Zero lost-card liability"],
  },
  Business: {
    tier: "Business",
    name: "Business",
    tagline: "For founders — GST invoicing & high limits",
    joiningFeeMinor: 250_000, // ₹2,500
    domesticLimitMinor: 50_000_000, // ₹5,00,000
    internationalLimitMinor: 30_000_000, // ₹3,00,000
    internationalEnabled: true,
    perks: ["GST-ready invoices", "Higher limits", "Dedicated relationship manager"],
  },
};
