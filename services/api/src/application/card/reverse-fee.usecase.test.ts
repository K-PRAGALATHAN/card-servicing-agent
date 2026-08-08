import { describe, expect, it } from "vitest";

import {
  InMemoryAccountRepository,
  InMemoryCardRepository,
  InMemoryServicingRequestRepository,
  InMemoryTransactionRepository,
} from "../../adapters/outbound/memory/in-memory-repositories";
import type { Account } from "../../domain/account/account";
import type { Card } from "../../domain/card/card";
import { money } from "../../domain/shared/money";
import { ReverseFeeUseCase } from "./reverse-fee.usecase";

function build() {
  const card: Card = {
    id: "card1",
    customerId: "c1",
    type: "credit",
    network: "visa",
    maskedPan: "4821 •••• •••• 6390",
    holderName: "A",
    expiry: "12/28",
    status: "active",
    tier: "Classic",
    availableLimit: money(18_000_000),
    internationalEnabled: false,
  };
  const savings: Account = {
    id: "acc1",
    customerId: "c1",
    type: "savings",
    maskedNumber: "••1",
    balance: money(1_000_000),
  };
  const cards = new InMemoryCardRepository(new Map([[card.id, card]]));
  const accounts = new InMemoryAccountRepository(new Map([[savings.id, savings]]));
  const transactions = new InMemoryTransactionRepository();
  const requests = new InMemoryServicingRequestRepository();
  return {
    useCase: new ReverseFeeUseCase(cards, accounts, transactions, requests),
    transactions,
    requests,
  };
}

describe("ReverseFeeUseCase", () => {
  it("credits the account, writes the ledger and records an approved request", async () => {
    const { useCase, transactions, requests } = build();
    const receipt = await useCase.execute({
      customerId: "c1",
      cardId: "card1",
      feeAmountMinor: 50_000,
    });

    expect(receipt.account.balance.amountMinor).toBe(1_050_000);
    expect(receipt.transaction.direction).toBe("credit");
    expect(receipt.transaction.category).toBe("refund");

    const ledger = await transactions.listByCustomer("c1");
    expect(ledger).toHaveLength(1);
    const filed = await requests.listByCustomer("c1");
    expect(filed[0]?.type).toBe("fee_reversal");
    expect(filed[0]?.status).toBe("approved");
  });
});
