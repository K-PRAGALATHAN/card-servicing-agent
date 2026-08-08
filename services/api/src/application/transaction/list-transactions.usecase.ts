import type { Transaction } from "../../domain/transaction/transaction";
import type { TransactionRepository } from "../../domain/transaction/transaction.repository";

/** Lists a customer's recent ledger entries (newest first). */
export class ListTransactionsUseCase {
  constructor(private readonly transactions: TransactionRepository) {}

  async execute(customerId: string, limit = 30): Promise<Transaction[]> {
    return this.transactions.listByCustomer(customerId, limit);
  }
}
