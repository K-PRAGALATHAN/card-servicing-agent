import type { Card } from "../../domain/card/card";
import type { CardRepository } from "../../domain/card/card.repository";
import { ValidationError } from "../../domain/shared/errors";
import { money } from "../../domain/shared/money";
import { loadOwnedCard } from "./get-card.usecase";

export interface SetCardLimitsInput {
  readonly domesticLimitMinor?: number;
  readonly internationalLimitMinor?: number;
  readonly internationalEnabled?: boolean;
}

/** Updates the per-transaction domestic/international spend limits on a card. */
export class SetCardLimitsUseCase {
  constructor(private readonly cards: CardRepository) {}

  async execute(customerId: string, cardId: string, input: SetCardLimitsInput): Promise<Card> {
    const card = await loadOwnedCard(this.cards, customerId, cardId);

    if (input.domesticLimitMinor != null && input.domesticLimitMinor < 0) {
      throw new ValidationError("Domestic limit cannot be negative");
    }
    if (input.internationalLimitMinor != null && input.internationalLimitMinor < 0) {
      throw new ValidationError("International limit cannot be negative");
    }

    const updated: Card = {
      ...card,
      domesticLimit:
        input.domesticLimitMinor != null ? money(input.domesticLimitMinor) : card.domesticLimit,
      internationalLimit:
        input.internationalLimitMinor != null
          ? money(input.internationalLimitMinor)
          : card.internationalLimit,
      internationalEnabled: input.internationalEnabled ?? card.internationalEnabled,
    };
    await this.cards.save(updated);
    return updated;
  }
}
