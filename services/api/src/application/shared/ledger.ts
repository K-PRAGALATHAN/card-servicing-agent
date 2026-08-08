import type { Account } from "../../domain/account/account";
import type { Transaction, TransactionCategory } from "../../domain/transaction/transaction";
import { newId } from "../../domain/shared/ids";
import type { Money } from "../../domain/shared/money";

/**
 * Builds a ledger entry against an account. `balanceAfter` is the account's
 * balance immediately after the movement, so the app can show a running total.
 */
export function makeLedgerEntry(params: {
  account: Account;
  direction: "debit" | "credit";
  amount: Money;
  category: TransactionCategory;
  description: string;
  counterparty?: string;
  cardId?: string;
}): Transaction {
  return {
    id: newId("txn"),
    customerId: params.account.customerId,
    accountId: params.account.id,
    cardId: params.cardId,
    direction: params.direction,
    amount: params.amount,
    category: params.category,
    description: params.description,
    counterparty: params.counterparty,
    balanceAfter: params.account.balance, // caller passes the already-updated account
    createdAt: new Date().toISOString(),
  };
}
