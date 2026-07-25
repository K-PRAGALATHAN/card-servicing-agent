import type { Card } from "../../domain/card/card";
import { withFrozen } from "../../domain/card/card";
import type { CardRepository } from "../../domain/card/card.repository";
import { ValidationError } from "../../domain/shared/errors";
import { loadOwnedCard } from "./get-card.usecase";

/** Freeze/unfreeze a card. Blocked cards (fraud) cannot be toggled here. */
export class SetCardFrozenUseCase {
  constructor(private readonly cards: CardRepository) {}

  async execute(customerId: string, cardId: string, frozen: boolean): Promise<Card> {
    const card = await loadOwnedCard(this.cards, customerId, cardId);
    if (card.status === "blocked") {
      throw new ValidationError("Blocked cards cannot be frozen or unfrozen");
    }
    const updated = withFrozen(card, frozen);
    await this.cards.save(updated);
    return updated;
  }
}
