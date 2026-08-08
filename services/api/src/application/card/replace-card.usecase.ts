import type { Card } from "../../domain/card/card";
import type { CardRepository } from "../../domain/card/card.repository";
import { newId } from "../../domain/shared/ids";
import type { ServicingRequest } from "../../domain/servicing/servicing-request";
import type { ServicingRequestRepository } from "../../domain/servicing/servicing-request.repository";
import { loadOwnedCard } from "./get-card.usecase";

export interface ReplaceCardInput {
  readonly customerId: string;
  readonly cardId: string;
  readonly reason?: string;
}

export interface ReplaceCardReceipt {
  readonly oldCard: Card;
  readonly newCard: Card;
  readonly request: ServicingRequest;
}

function randomLast4(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/** Expiry MM/YY, `years` ahead of today. */
function futureExpiry(years: number): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String((d.getFullYear() + years) % 100).padStart(2, "0");
  return `${mm}/${yy}`;
}

/**
 * Executes an (already policy-approved) card replacement: blocks the old card
 * and issues a fresh one with the same tier/limits but a new PAN and expiry.
 */
export class ReplaceCardUseCase {
  constructor(
    private readonly cards: CardRepository,
    private readonly requests: ServicingRequestRepository,
  ) {}

  async execute(input: ReplaceCardInput): Promise<ReplaceCardReceipt> {
    const card = await loadOwnedCard(this.cards, input.customerId, input.cardId);

    const blocked: Card = { ...card, status: "blocked" };
    await this.cards.save(blocked);

    const prefix = card.maskedPan.split(" ")[0] ?? "••••";
    const newCard: Card = {
      ...card,
      id: newId("card"),
      status: "active",
      maskedPan: `${prefix} •••• •••• ${randomLast4()}`,
      expiry: futureExpiry(4),
    };
    await this.cards.save(newCard);

    const request: ServicingRequest = {
      id: newId("srq"),
      customerId: input.customerId,
      type: "card_replacement",
      priority: "high",
      status: "approved",
      cardId: card.id,
      details: { reason: input.reason ?? "customer_request", replacementCardId: newCard.id },
      createdAt: new Date().toISOString(),
    };
    await this.requests.create(request);

    return { oldCard: blocked, newCard, request };
  }
}
