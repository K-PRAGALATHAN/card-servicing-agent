import type { Card } from "../../domain/card/card";
import type { CardRepository } from "../../domain/card/card.repository";

export class ListCardsUseCase {
  constructor(private readonly cards: CardRepository) {}

  async execute(customerId: string): Promise<Card[]> {
    return this.cards.listByCustomer(customerId);
  }
}
