export type Currency = "INR";

/** Money is stored in the minor unit (paise) to avoid floating-point drift. */
export interface Money {
  readonly currency: Currency;
  readonly amountMinor: number;
}

export function money(amountMinor: number, currency: Currency = "INR"): Money {
  if (!Number.isInteger(amountMinor)) {
    throw new Error("Money.amountMinor must be an integer (minor units)");
  }
  return { currency, amountMinor };
}

export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amountMinor + b.amountMinor, a.currency);
}

export function subtractMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amountMinor - b.amountMinor, a.currency);
}

export function isGreaterOrEqual(a: Money, b: Money): boolean {
  assertSameCurrency(a, b);
  return a.amountMinor >= b.amountMinor;
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(`Currency mismatch: ${a.currency} vs ${b.currency}`);
  }
}
