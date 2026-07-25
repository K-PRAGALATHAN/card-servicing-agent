import type { CardRepository } from "../../domain/card/card.repository";
import { NotFoundError } from "../../domain/shared/errors";
import type { Statement } from "../../domain/statement/statement";
import type { StatementProvider } from "../../domain/statement/statement.provider";
import { loadOwnedCard } from "../card/get-card.usecase";

/** Latest statement for a card the customer owns. */
export class GetStatementUseCase {
  constructor(
    private readonly cards: CardRepository,
    private readonly statements: StatementProvider,
  ) {}

  async execute(customerId: string, cardId: string): Promise<Statement> {
    await loadOwnedCard(this.cards, customerId, cardId);
    const statement = await this.statements.latestForCard(cardId);
    if (!statement) throw new NotFoundError("Statement", `card:${cardId}`);
    return statement;
  }
}
