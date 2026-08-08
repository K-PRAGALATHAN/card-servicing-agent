import type { Transaction } from "./transaction";

export interface TransactionRepository {
  add(transaction: Transaction): Promise<void>;
  /** Newest first. `limit` caps the result (defaults to a sensible page). */
  listByCustomer(customerId: string, limit?: number): Promise<Transaction[]>;
  listByAccount(accountId: string, limit?: number): Promise<Transaction[]>;
}
