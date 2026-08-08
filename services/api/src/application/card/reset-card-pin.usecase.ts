import type { CardRepository } from "../../domain/card/card.repository";
import { ValidationError } from "../../domain/shared/errors";
import { loadOwnedCard } from "./get-card.usecase";

export interface ResetCardPinResult {
  readonly cardId: string;
  readonly message: string;
}

/**
 * Sets a new 4-digit ATM PIN. We never store the PIN in this demo — the HSM/card
 * network would in production — we just validate and acknowledge.
 */
export class ResetCardPinUseCase {
  constructor(private readonly cards: CardRepository) {}

  async execute(customerId: string, cardId: string, pin: string): Promise<ResetCardPinResult> {
    const card = await loadOwnedCard(this.cards, customerId, cardId);
    if (!/^\d{4}$/.test(pin)) {
      throw new ValidationError("PIN must be exactly 4 digits");
    }
    if (/^(\d)\1{3}$/.test(pin) || pin === "1234" || pin === "0000") {
      throw new ValidationError("Choose a less predictable PIN");
    }
    return { cardId: card.id, message: "Your card PIN has been updated." };
  }
}
