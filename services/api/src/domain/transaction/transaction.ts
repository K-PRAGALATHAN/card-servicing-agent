import type { Money } from "../shared/money";

export type TransactionDirection = "debit" | "credit";

/** High-level grouping so the app can show an icon and label per entry. */
export type TransactionCategory =
  "transfer" | "bill" | "recharge" | "card_upgrade" | "fee" | "refund" | "purchase";

/**
 * One movement of money against a single account. A self-transfer produces two
 * entries (a debit on the source, a credit on the destination); a bill payment
 * or a card-upgrade fee produces one debit. `balanceAfterMinor` snapshots the
 * account balance right after the entry so the app can render a running ledger.
 */
export interface Transaction {
  readonly id: string;
  readonly customerId: string;
  readonly accountId: string;
  readonly cardId?: string;
  readonly direction: TransactionDirection;
  readonly amount: Money;
  readonly category: TransactionCategory;
  readonly description: string;
  readonly counterparty?: string;
  readonly balanceAfter: Money;
  readonly createdAt: string; // ISO
}
