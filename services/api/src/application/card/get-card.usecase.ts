import type { Card } from "../../domain/card/card";
import type { CardRepository } from "../../domain/card/card.repository";
import { ForbiddenError, NotFoundError } from "../../domain/shared/errors";

/** Loads a card and enforces that it belongs to the requesting customer. */
export async function loadOwnedCard(
  cards: CardRepository,
  customerId: string,
  cardId: string,
): Promise<Card> {
  const card = await cards.findById(cardId);
  if (!card) throw new NotFoundError("Card", cardId);
  if (card.customerId !== customerId) throw new ForbiddenError("Card does not belong to customer");
  return card;
}

export class GetCardUseCase {
  constructor(private readonly cards: CardRepository) {}

  async execute(customerId: string, cardId: string): Promise<Card> {
    return loadOwnedCard(this.cards, customerId, cardId);
  }
}
