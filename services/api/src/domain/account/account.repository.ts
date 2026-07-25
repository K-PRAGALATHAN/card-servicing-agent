import type { Account } from "./account";

export interface AccountRepository {
  listByCustomer(customerId: string): Promise<Account[]>;
  findById(id: string): Promise<Account | null>;
  save(account: Account): Promise<void>;
}
