import type { PasswordHasher } from "../../../application/auth/password-hasher";
import type { Account } from "../../../domain/account/account";
import type { Card } from "../../../domain/card/card";
import type { Customer } from "../../../domain/customer/customer";
import type { Notification } from "../../../domain/notification/notification";
import type { Statement } from "../../../domain/statement/statement";
import { money } from "../../../domain/shared/money";
import type { Transaction } from "../../../domain/transaction/transaction";

export interface SeededData {
  readonly customers: Map<string, Customer>;
  readonly accounts: Map<string, Account>;
  readonly cards: Map<string, Card>;
  readonly statements: Map<string, Statement[]>;
  readonly notifications: Notification[];
  readonly transactions: Transaction[];
}

/** Demo credentials (matches the mobile wireframe's Klaus Crawley). */
export const DEMO_CUSTOMER_ID = "NB00482193";
export const DEMO_PASSWORD = "password123";

export async function buildSeed(hasher: PasswordHasher): Promise<SeededData> {
  const passwordHash = await hasher.hash(DEMO_PASSWORD);

  const customer: Customer = {
    id: DEMO_CUSTOMER_ID,
    fullName: "Klaus Crawley",
    email: "klaus.crawley@example.com",
    phone: "+91 98••• ••398",
    address: "San Francisco, United States",
    passwordHash,
    kyc: { panMasked: "•••••1234F", aadhaarMasked: "•••• •••• 8821", status: "verified" },
    creditScore: 782,
  };

  const savings: Account = {
    id: "acc_savings_1",
    customerId: customer.id,
    type: "savings",
    maskedNumber: "••4821",
    balance: money(24_890_560), // ₹2,48,905.60
  };
  const salary: Account = {
    id: "acc_salary_1",
    customerId: customer.id,
    type: "current",
    maskedNumber: "••7702",
    balance: money(5_320_000), // ₹53,200.00
  };

  const creditCard: Card = {
    id: "card_credit_1",
    customerId: customer.id,
    type: "credit",
    network: "visa",
    maskedPan: "4821 •••• •••• 6390",
    holderName: "KLAUS CRAWLEY",
    expiry: "12/28",
    status: "active",
    tier: "Classic",
    availableLimit: money(18_000_000), // ₹1,80,000
    domesticLimit: money(10_000_000), // ₹1,00,000
    internationalLimit: money(0),
    internationalEnabled: false,
  };
  const debitCard: Card = {
    id: "card_debit_1",
    customerId: customer.id,
    type: "debit",
    network: "rupay",
    maskedPan: "5210 •••• •••• 4821",
    holderName: "KLAUS CRAWLEY",
    expiry: "09/27",
    status: "active",
    tier: "Classic",
    availableBalance: money(24_890_560),
    domesticLimit: money(5_000_000), // ₹50,000
    internationalLimit: money(0),
    internationalEnabled: false,
  };

  const creditStatement: Statement = {
    id: "stmt_credit_1",
    cardId: creditCard.id,
    periodStart: "2026-06-01",
    periodEnd: "2026-06-30",
    openingBalance: money(0),
    closingBalance: money(1_250_000),
    lines: [
      { date: "2026-06-04", description: "Amazon India", amount: money(349_900), kind: "debit" },
      { date: "2026-06-12", description: "Late payment fee", amount: money(50_000), kind: "debit" },
      {
        date: "2026-06-20",
        description: "Refund - Flipkart",
        amount: money(120_000),
        kind: "credit",
      },
    ],
  };

  const notifications: Notification[] = [
    {
      id: "ntf_1",
      customerId: customer.id,
      title: "Late fee charged",
      body: "A ₹500 late fee was applied to card ••6390.",
      category: "transaction",
      read: false,
      createdAt: "2026-06-12T09:15:00.000Z",
    },
    {
      id: "ntf_2",
      customerId: customer.id,
      title: "New login detected",
      body: "Your account was accessed from a new device.",
      category: "security",
      read: true,
      createdAt: "2026-06-10T18:02:00.000Z",
    },
    {
      id: "ntf_3",
      customerId: customer.id,
      title: "Statement ready",
      body: "Your June credit card statement is available.",
      category: "servicing",
      read: false,
      createdAt: "2026-07-01T06:00:00.000Z",
    },
  ];

  const transactions: Transaction[] = buildSeedTransactions(savings, salary);

  return {
    customers: new Map([[customer.id, customer]]),
    accounts: new Map([
      [savings.id, savings],
      [salary.id, salary],
    ]),
    cards: new Map([
      [creditCard.id, creditCard],
      [debitCard.id, debitCard],
    ]),
    statements: new Map([[creditCard.id, [creditStatement]]]),
    notifications,
    transactions,
  };
}

/** A believable recent history so the ledger isn't empty on first run. */
function buildSeedTransactions(savings: Account, salary: Account): Transaction[] {
  const c = savings.customerId;
  const rows: Omit<Transaction, "id">[] = [
    {
      customerId: c,
      accountId: salary.id,
      direction: "credit",
      amount: money(15_000_000),
      category: "transfer",
      description: "Salary credit — Acme Corp",
      counterparty: "Acme Corp",
      balanceAfter: money(5_320_000),
      createdAt: "2026-07-31T04:30:00.000Z",
    },
    {
      customerId: c,
      accountId: savings.id,
      direction: "debit",
      amount: money(129_900),
      category: "recharge",
      description: "Mobile recharge · 98•••398",
      counterparty: "Mobile recharge",
      balanceAfter: money(24_890_560),
      createdAt: "2026-07-30T13:12:00.000Z",
    },
    {
      customerId: c,
      accountId: savings.id,
      direction: "debit",
      amount: money(184_500),
      category: "bill",
      description: "Electricity · BESCOM",
      counterparty: "Electricity",
      balanceAfter: money(25_020_460),
      createdAt: "2026-07-28T08:45:00.000Z",
    },
    {
      customerId: c,
      accountId: savings.id,
      direction: "debit",
      amount: money(64_900),
      category: "purchase",
      description: "Swiggy order",
      counterparty: "Swiggy",
      balanceAfter: money(25_204_960),
      createdAt: "2026-07-27T20:03:00.000Z",
    },
    {
      customerId: c,
      accountId: savings.id,
      direction: "credit",
      amount: money(120_000),
      category: "refund",
      description: "Refund — Flipkart",
      counterparty: "Flipkart",
      balanceAfter: money(25_269_860),
      createdAt: "2026-07-25T11:20:00.000Z",
    },
  ];
  return rows.map((r, i) => ({ ...r, id: `txn_seed_${i + 1}` }));
}
