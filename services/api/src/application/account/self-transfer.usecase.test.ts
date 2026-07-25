import { describe, expect, it } from "vitest";

import { InMemoryAccountRepository } from "../../adapters/outbound/memory/in-memory-repositories";
import type { Account } from "../../domain/account/account";
import {
  ForbiddenError,
  InsufficientFundsError,
  ValidationError,
} from "../../domain/shared/errors";
import { money } from "../../domain/shared/money";
import { SelfTransferUseCase } from "./self-transfer.usecase";

function repo(): InMemoryAccountRepository {
  const accounts: Account[] = [
    { id: "a1", customerId: "c1", type: "savings", maskedNumber: "1", balance: money(100_000) },
    { id: "a2", customerId: "c1", type: "current", maskedNumber: "2", balance: money(0) },
    { id: "a3", customerId: "c2", type: "savings", maskedNumber: "3", balance: money(0) },
  ];
  return new InMemoryAccountRepository(new Map(accounts.map((a) => [a.id, a])));
}

describe("SelfTransferUseCase", () => {
  it("moves funds between the customer's own accounts", async () => {
    const useCase = new SelfTransferUseCase(repo());
    const receipt = await useCase.execute({
      customerId: "c1",
      fromAccountId: "a1",
      toAccountId: "a2",
      amountMinor: 40_000,
    });
    expect(receipt.from.balance.amountMinor).toBe(60_000);
    expect(receipt.to.balance.amountMinor).toBe(40_000);
  });

  it("rejects transferring to the same account", async () => {
    const useCase = new SelfTransferUseCase(repo());
    await expect(
      useCase.execute({ customerId: "c1", fromAccountId: "a1", toAccountId: "a1", amountMinor: 1 }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects an over-balance transfer", async () => {
    const useCase = new SelfTransferUseCase(repo());
    await expect(
      useCase.execute({
        customerId: "c1",
        fromAccountId: "a1",
        toAccountId: "a2",
        amountMinor: 200_000,
      }),
    ).rejects.toBeInstanceOf(InsufficientFundsError);
  });

  it("rejects transferring into another customer's account", async () => {
    const useCase = new SelfTransferUseCase(repo());
    await expect(
      useCase.execute({
        customerId: "c1",
        fromAccountId: "a1",
        toAccountId: "a3",
        amountMinor: 1_000,
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
