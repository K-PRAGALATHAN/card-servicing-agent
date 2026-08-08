import { describe, expect, it } from "vitest";

import { InMemoryCardRepository } from "../../adapters/outbound/memory/in-memory-repositories";
import type { Card } from "../../domain/card/card";
import { ForbiddenError, ValidationError } from "../../domain/shared/errors";
import { SetCardFrozenUseCase } from "./set-card-frozen.usecase";

function card(overrides: Partial<Card> = {}): Card {
  return {
    id: "card1",
    customerId: "c1",
    type: "credit",
    network: "visa",
    maskedPan: "**",
    holderName: "A",
    expiry: "12/28",
    status: "active",
    tier: "Classic",
    internationalEnabled: false,
    ...overrides,
  };
}

function repo(c: Card): InMemoryCardRepository {
  return new InMemoryCardRepository(new Map([[c.id, c]]));
}

describe("SetCardFrozenUseCase", () => {
  it("freezes and unfreezes an owned card", async () => {
    const cards = repo(card());
    const useCase = new SetCardFrozenUseCase(cards);

    const frozen = await useCase.execute("c1", "card1", true);
    expect(frozen.status).toBe("frozen");

    const active = await useCase.execute("c1", "card1", false);
    expect(active.status).toBe("active");
  });

  it("refuses a card owned by someone else", async () => {
    const useCase = new SetCardFrozenUseCase(repo(card({ customerId: "other" })));
    await expect(useCase.execute("c1", "card1", true)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("refuses to toggle a blocked card", async () => {
    const useCase = new SetCardFrozenUseCase(repo(card({ status: "blocked" })));
    await expect(useCase.execute("c1", "card1", true)).rejects.toBeInstanceOf(ValidationError);
  });
});
