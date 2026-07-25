import type { Statement } from "./statement";

export interface StatementProvider {
  listByCard(cardId: string): Promise<Statement[]>;
  /** Latest statement for a card, or null if none. */
  latestForCard(cardId: string): Promise<Statement | null>;
}
