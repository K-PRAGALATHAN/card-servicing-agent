import type { Account } from "../../domain/account/account";
import type { AccountRepository } from "../../domain/account/account.repository";

export class ListAccountsUseCase {
  constructor(private readonly accounts: AccountRepository) {}

  async execute(customerId: string): Promise<Account[]> {
    return this.accounts.listByCustomer(customerId);
  }
}
