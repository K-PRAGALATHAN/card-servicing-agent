import { describe, expect, it } from "vitest";

import {
  InMemoryAccountRepository,
  InMemoryTransactionRepository,
} from "../../adapters/outbound/memory/in-memory-repositories";
import type { Account } from "../../domain/account/account";
import {
  ForbiddenError,
  InsufficientFundsError,
  ValidationError,
} from "../../domain/shared/errors";
import { money } from "../../domain/shared/money";
import { SelfTransferUseCase } from "./self-transfer.usecase";

function build(): { useCase: SelfTransferUseCase; ledger: InMemoryTransactionRepository } {
  const accounts: Account[] = [
    { id: "a1", customerId: "c1", type: "savings", maskedNumber: "1", balance: money(100_000) },
    { id: "a2", customerId: "c1", type: "current", maskedNumber: "2", balance: money(0) },
    { id: "a3", customerId: "c2", type: "savings", maskedNumber: "3", balance: money(0) },
  ];
  const ledger = new InMemoryTransactionRepository();
  const useCase = new SelfTransferUseCase(
    new InMemoryAccountRepository(new Map(accounts.map((a) => [a.id, a]))),
    ledger,
  );
  return { useCase, ledger };
}

describe("SelfTransferUseCase", () => {
  it("moves funds between the customer's own accounts and records the ledger", async () => {
    const { useCase, ledger } = build();
    const receipt = await useCase.execute({
      customerId: "c1",
      fromAccountId: "a1",
      toAccountId: "a2",
      amountMinor: 40_000,
    });
    expect(receipt.from.balance.amountMinor).toBe(60_000);
    expect(receipt.to.balance.amountMinor).toBe(40_000);
    const entries = await ledger.listByCustomer("c1");
    expect(entries).toHaveLength(2);
    expect(entries.some((t) => t.direction === "debit" && t.amount.amountMinor === 40_000)).toBe(
      true,
    );
    expect(entries.some((t) => t.direction === "credit" && t.amount.amountMinor === 40_000)).toBe(
      true,
    );
  });

  it("rejects transferring to the same account", async () => {
    const { useCase } = build();
    await expect(
      useCase.execute({ customerId: "c1", fromAccountId: "a1", toAccountId: "a1", amountMinor: 1 }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects an over-balance transfer", async () => {
    const { useCase } = build();
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
    const { useCase } = build();
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
