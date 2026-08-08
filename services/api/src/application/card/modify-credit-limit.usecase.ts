import type { Card } from "../../domain/card/card";
import type { CardRepository } from "../../domain/card/card.repository";
import { ValidationError } from "../../domain/shared/errors";
import { newId } from "../../domain/shared/ids";
import { money } from "../../domain/shared/money";
import type { ServicingRequest } from "../../domain/servicing/servicing-request";
import type { ServicingRequestRepository } from "../../domain/servicing/servicing-request.repository";
import { loadOwnedCard } from "./get-card.usecase";

export interface ModifyCreditLimitInput {
  readonly customerId: string;
  readonly cardId: string;
  readonly newLimitMinor: number;
}

export interface ModifyCreditLimitReceipt {
  readonly card: Card;
  readonly request: ServicingRequest;
}

/**
 * Executes an (already policy-approved) credit-limit change on a credit card.
 * The policy engine decides *whether* to allow; this just applies the new limit.
 */
export class ModifyCreditLimitUseCase {
  constructor(
    private readonly cards: CardRepository,
    private readonly requests: ServicingRequestRepository,
  ) {}

  async execute(input: ModifyCreditLimitInput): Promise<ModifyCreditLimitReceipt> {
    if (input.newLimitMinor <= 0) throw new ValidationError("Limit must be positive");
    const card = await loadOwnedCard(this.cards, input.customerId, input.cardId);
    if (card.type !== "credit") {
      throw new ValidationError("Credit limit changes apply to credit cards only");
    }

    const updated: Card = { ...card, availableLimit: money(input.newLimitMinor) };
    await this.cards.save(updated);

    const request: ServicingRequest = {
      id: newId("srq"),
      customerId: input.customerId,
      type: "credit_limit_increase",
      priority: "high",
      status: "approved",
      cardId: card.id,
      details: { newLimitMinor: input.newLimitMinor },
      createdAt: new Date().toISOString(),
    };
    await this.requests.create(request);

    return { card: updated, request };
  }
}
