import type { Account } from "../../domain/account/account";
import type { AccountRepository } from "../../domain/account/account.repository";
import {
  ForbiddenError,
  InsufficientFundsError,
  NotFoundError,
  ValidationError,
} from "../../domain/shared/errors";
import { addMoney, isGreaterOrEqual, money, subtractMoney } from "../../domain/shared/money";

export interface SelfTransferInput {
  readonly customerId: string;
  readonly fromAccountId: string;
  readonly toAccountId: string;
  readonly amountMinor: number;
}

export interface TransferReceipt {
  readonly from: Account;
  readonly to: Account;
  readonly amountMinor: number;
}

/** Moves funds between two accounts owned by the same customer. */
export class SelfTransferUseCase {
  constructor(private readonly accounts: AccountRepository) {}

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

    return { from: updatedFrom, to: updatedTo, amountMinor: input.amountMinor };
  }
}
