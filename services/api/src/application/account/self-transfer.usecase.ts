import type { Account } from "../../domain/account/account";
import type { AccountRepository } from "../../domain/account/account.repository";
import {
  ForbiddenError,
  InsufficientFundsError,
  NotFoundError,
  ValidationError,
} from "../../domain/shared/errors";
import { addMoney, isGreaterOrEqual, money, subtractMoney } from "../../domain/shared/money";
import type { Transaction } from "../../domain/transaction/transaction";
import type { TransactionRepository } from "../../domain/transaction/transaction.repository";
import { makeLedgerEntry } from "../shared/ledger";

export interface SelfTransferInput {
  readonly customerId: string;
  readonly fromAccountId: string;
  readonly toAccountId: string;
  readonly amountMinor: number;
  readonly note?: string;
}

export interface TransferReceipt {
  readonly from: Account;
  readonly to: Account;
  readonly amountMinor: number;
  readonly transactions: Transaction[];
}

/** Moves funds between two accounts owned by the same customer, recording the ledger. */
export class SelfTransferUseCase {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly transactions: TransactionRepository,
  ) {}

  async execute(input: SelfTransferInput): Promise<TransferReceipt> {
    if (input.amountMinor <= 0) {
      throw new ValidationError("Transfer amount must be positive");
    }
    if (input.fromAccountId === input.toAccountId) {
      throw new ValidationError("Cannot transfer to the same account");
    }

    const [from, to] = await Promise.all([
      this.accounts.findById(input.fromAccountId),
      this.accounts.findById(input.toAccountId),
    ]);
    if (!from) throw new NotFoundError("Account", input.fromAccountId);
    if (!to) throw new NotFoundError("Account", input.toAccountId);
    if (from.customerId !== input.customerId || to.customerId !== input.customerId) {
      throw new ForbiddenError("Both accounts must belong to the customer");
    }

    const amount = money(input.amountMinor, from.balance.currency);
    if (!isGreaterOrEqual(from.balance, amount)) {
      throw new InsufficientFundsError();
    }

    const updatedFrom: Account = { ...from, balance: subtractMoney(from.balance, amount) };
    const updatedTo: Account = { ...to, balance: addMoney(to.balance, amount) };
    await this.accounts.save(updatedFrom);
    await this.accounts.save(updatedTo);

    const debit = makeLedgerEntry({
      account: updatedFrom,
      direction: "debit",
      amount,
      category: "transfer",
      description: input.note?.trim() || `Transfer to ${to.type} ${to.maskedNumber}`,
      counterparty: to.maskedNumber,
    });
    const credit = makeLedgerEntry({
      account: updatedTo,
      direction: "credit",
      amount,
      category: "transfer",
      description: input.note?.trim() || `Transfer from ${from.type} ${from.maskedNumber}`,
      counterparty: from.maskedNumber,
    });
    await this.transactions.add(debit);
    await this.transactions.add(credit);

    return {
      from: updatedFrom,
      to: updatedTo,
      amountMinor: input.amountMinor,
      transactions: [debit, credit],
    };
  }
}
