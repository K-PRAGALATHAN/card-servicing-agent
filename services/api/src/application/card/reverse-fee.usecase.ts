import type { Account } from "../../domain/account/account";
import type { AccountRepository } from "../../domain/account/account.repository";
import type { CardRepository } from "../../domain/card/card.repository";
import { NotFoundError, ValidationError } from "../../domain/shared/errors";
import { newId } from "../../domain/shared/ids";
import { addMoney, money } from "../../domain/shared/money";
import type { ServicingRequest } from "../../domain/servicing/servicing-request";
import type { ServicingRequestRepository } from "../../domain/servicing/servicing-request.repository";
import type { Transaction } from "../../domain/transaction/transaction";
import type { TransactionRepository } from "../../domain/transaction/transaction.repository";
import { makeLedgerEntry } from "../shared/ledger";
import { loadOwnedCard } from "./get-card.usecase";

export interface ReverseFeeInput {
  readonly customerId: string;
  readonly cardId: string;
  readonly feeAmountMinor: number;
}

export interface ReverseFeeReceipt {
  readonly account: Account;
  readonly transaction: Transaction;
  readonly request: ServicingRequest;
  readonly amountMinor: number;
}

/**
 * Executes an (already policy-approved) fee reversal: credits the customer's
 * primary account with a refund, writes the ledger entry, and records an
 * approved servicing request. The agent only reaches here after ALLOW + confirm.
 */
export class ReverseFeeUseCase {
  constructor(
    private readonly cards: CardRepository,
    private readonly accounts: AccountRepository,
    private readonly transactions: TransactionRepository,
    private readonly requests: ServicingRequestRepository,
  ) {}

  async execute(input: ReverseFeeInput): Promise<ReverseFeeReceipt> {
    if (input.feeAmountMinor <= 0) throw new ValidationError("Fee amount must be positive");
    const card = await loadOwnedCard(this.cards, input.customerId, input.cardId);

    const accounts = await this.accounts.listByCustomer(input.customerId);
    const target = accounts.find((a) => a.type === "savings") ?? accounts[0];
    if (!target) throw new NotFoundError("Account", `customer:${input.customerId}`);

    const amount = money(input.feeAmountMinor, target.balance.currency);
    const updated: Account = { ...target, balance: addMoney(target.balance, amount) };
    await this.accounts.save(updated);

    const transaction = makeLedgerEntry({
      account: updated,
      direction: "credit",
      amount,
      category: "refund",
      description: `Fee reversal · card ${card.maskedPan.slice(-4)}`,
      counterparty: "Fee reversal",
      cardId: card.id,
    });
    await this.transactions.add(transaction);

    const request: ServicingRequest = {
      id: newId("srq"),
      customerId: input.customerId,
      type: "fee_reversal",
      priority: "high",
      status: "approved",
      cardId: card.id,
      details: { feeAmountMinor: input.feeAmountMinor },
      createdAt: new Date().toISOString(),
    };
    await this.requests.create(request);

    return { account: updated, transaction, request, amountMinor: input.feeAmountMinor };
  }
}
