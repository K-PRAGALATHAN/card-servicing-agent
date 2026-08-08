import type { Money } from "../shared/money";

export type CardType = "credit" | "debit";
export type CardNetwork = "visa" | "mastercard" | "rupay";
export type CardStatus = "active" | "frozen" | "blocked";

/** Product tier a card can be upgraded to (drives limits + look). */
export type CardTier = "Classic" | "Platinum" | "Millennia" | "Business";

export interface Card {
  readonly id: string;
  readonly customerId: string;
  readonly type: CardType;
  readonly network: CardNetwork;
  readonly maskedPan: string; // e.g. "4821 •••• •••• 6390"
  readonly holderName: string;
  readonly expiry: string; // MM/YY
  readonly status: CardStatus;
  readonly tier: CardTier;
  readonly availableLimit?: Money; // credit cards
  readonly availableBalance?: Money; // debit cards
  /** Per-transaction spend caps the customer can manage. */
  readonly domesticLimit?: Money;
  readonly internationalLimit?: Money;
  readonly internationalEnabled: boolean;
}

/** Only active/frozen toggle here; `blocked` is terminal (fraud) and set elsewhere. */
export function withFrozen(card: Card, frozen: boolean): Card {
  return { ...card, status: frozen ? "frozen" : "active" };
}
