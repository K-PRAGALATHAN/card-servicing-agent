import type { Money } from "../shared/money";

export type AccountType = "savings" | "current";

export interface Account {
  readonly id: string;
  readonly customerId: string;
  readonly type: AccountType;
  readonly maskedNumber: string; // e.g. "••4821"
  readonly balance: Money;
}
