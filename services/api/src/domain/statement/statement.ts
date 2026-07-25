import type { Money } from "../shared/money";

export interface StatementLine {
  readonly date: string; // ISO date
  readonly description: string;
  readonly amount: Money;
  readonly kind: "debit" | "credit";
}

export interface Statement {
  readonly id: string;
  readonly cardId: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly openingBalance: Money;
  readonly closingBalance: Money;
  readonly lines: readonly StatementLine[];
}
