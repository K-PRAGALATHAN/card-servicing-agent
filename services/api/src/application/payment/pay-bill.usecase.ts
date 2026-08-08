import type { Account } from "../../domain/account/account";
import type { AccountRepository } from "../../domain/account/account.repository";
import {
  ForbiddenError,
  InsufficientFundsError,
  NotFoundError,
  ValidationError,
} from "../../domain/shared/errors";
import { isGreaterOrEqual, money, subtractMoney } from "../../domain/shared/money";
import type { Transaction, TransactionCategory } from "../../domain/transaction/transaction";
import type { TransactionRepository } from "../../domain/transaction/transaction.repository";
import { makeLedgerEntry } from "../shared/ledger";

export interface PayBillInput {
  readonly customerId: string;
  readonly fromAccountId: string;
  readonly category: Extract<TransactionCategory, "bill" | "recharge">;
  readonly biller: string; // "Electricity", "Mobile recharge", "DTH", ...
  readonly reference?: string; // consumer no / mobile no
  readonly amountMinor: number;
}

export interface PaymentReceipt {
  readonly account: Account;
  readonly transaction: Transaction;
}

/** Pays a bill or recharge from an account, debiting the balance and writing the ledger. */
export class PayBillUseCase {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly transactions: TransactionRepository,
  ) {}

  async execute(input: PayBillInput): Promise<PaymentReceipt> {
    if (input.amountMinor <= 0) throw new ValidationError("Amount must be positive");
    if (!input.biller.trim()) throw new ValidationError("Biller is required");

    const account = await this.accounts.findById(input.fromAccountId);
    if (!account) throw new NotFoundError("Account", input.fromAccountId);
    if (account.customerId !== input.customerId) {
      throw new ForbiddenError("Account does not belong to customer");
    }

    const amount = money(input.amountMinor, account.balance.currency);
    if (!isGreaterOrEqual(account.balance, amount)) throw new InsufficientFundsError();

    const updated: Account = { ...account, balance: subtractMoney(account.balance, amount) };
    await this.accounts.save(updated);

    const description = input.reference ? `${input.biller} · ${input.reference}` : input.biller;
    const transaction = makeLedgerEntry({
      account: updated,
      direction: "debit",
      amount,
      category: input.category,
      description,
      counterparty: input.biller,
    });
    await this.transactions.add(transaction);

    return { account: updated, transaction };
  }
}
