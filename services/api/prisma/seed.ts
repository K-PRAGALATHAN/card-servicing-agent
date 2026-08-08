import { PrismaClient } from "@prisma/client";

import { ScryptPasswordHasher } from "../src/adapters/outbound/security/scrypt-password-hasher";

const prisma = new PrismaClient();

const CUSTOMER_ID = "NB00482193";
const DEMO_PASSWORD = "password123";

async function main(): Promise<void> {
  const passwordHash = await new ScryptPasswordHasher().hash(DEMO_PASSWORD);

  await prisma.customer.upsert({
    where: { id: CUSTOMER_ID },
    update: { passwordHash, creditScore: 782 },
    create: {
      id: CUSTOMER_ID,
      fullName: "Klaus Crawley",
      email: "klaus.crawley@example.com",
      phone: "+91 98••• ••398",
      address: "San Francisco, United States",
      passwordHash,
      kycPanMasked: "•••••1234F",
      kycAadhaar: "•••• •••• 8821",
      kycStatus: "verified",
      creditScore: 782,
    },
  });

  const accounts = [
    { id: "acc_savings_1", type: "savings", maskedNumber: "••4821", balanceMinor: 24_890_560 },
    { id: "acc_salary_1", type: "current", maskedNumber: "••7702", balanceMinor: 5_320_000 },
  ] as const;
  for (const a of accounts) {
    await prisma.account.upsert({
      where: { id: a.id },
      update: { balanceMinor: a.balanceMinor },
      create: { ...a, customerId: CUSTOMER_ID },
    });
  }

  await prisma.card.upsert({
    where: { id: "card_credit_1" },
    update: { status: "active" },
    create: {
      id: "card_credit_1",
      customerId: CUSTOMER_ID,
      type: "credit",
      network: "visa",
      maskedPan: "4821 •••• •••• 6390",
      holderName: "KLAUS CRAWLEY",
      expiry: "12/28",
      status: "active",
      tier: "Classic",
      availableLimitMinor: 18_000_000,
      domesticLimitMinor: 10_000_000,
      internationalLimitMinor: 0,
      internationalEnabled: false,
    },
  });
  await prisma.card.upsert({
    where: { id: "card_debit_1" },
    update: { status: "active" },
    create: {
      id: "card_debit_1",
      customerId: CUSTOMER_ID,
      type: "debit",
      network: "rupay",
      maskedPan: "5210 •••• •••• 4821",
      holderName: "KLAUS CRAWLEY",
      expiry: "09/27",
      status: "active",
      tier: "Classic",
      availableBalanceMinor: 24_890_560,
      domesticLimitMinor: 5_000_000,
      internationalLimitMinor: 0,
      internationalEnabled: false,
    },
  });

  await prisma.statement.upsert({
    where: { id: "stmt_credit_1" },
    update: {},
    create: {
      id: "stmt_credit_1",
      cardId: "card_credit_1",
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
      openingBalanceMinor: 0,
      closingBalanceMinor: 1_250_000,
    },
  });
  await prisma.statementLine.deleteMany({ where: { statementId: "stmt_credit_1" } });
  await prisma.statementLine.createMany({
    data: [
      {
        statementId: "stmt_credit_1",
        date: "2026-06-04",
        description: "Amazon India",
        amountMinor: 349_900,
        kind: "debit",
        position: 0,
      },
      {
        statementId: "stmt_credit_1",
        date: "2026-06-12",
        description: "Late payment fee",
        amountMinor: 50_000,
        kind: "debit",
        position: 1,
      },
      {
        statementId: "stmt_credit_1",
        date: "2026-06-20",
        description: "Refund - Flipkart",
        amountMinor: 120_000,
        kind: "credit",
        position: 2,
      },
    ],
  });

  const notifications = [
    {
      id: "ntf_1",
      title: "Late fee charged",
      body: "A ₹500 late fee was applied to card ••6390.",
      category: "transaction",
      read: false,
    },
    {
      id: "ntf_2",
      title: "New login detected",
      body: "Your account was accessed from a new device.",
      category: "security",
      read: true,
    },
    {
      id: "ntf_3",
      title: "Statement ready",
      body: "Your June credit card statement is available.",
      category: "servicing",
      read: false,
    },
  ];
  for (const n of notifications) {
    await prisma.notification.upsert({
      where: { id: n.id },
      update: {},
      create: { ...n, customerId: CUSTOMER_ID },
    });
  }

  // Recent ledger history so the app isn't empty on first run (idempotent reset).
  await prisma.transaction.deleteMany({ where: { id: { startsWith: "txn_seed_" } } });
  await prisma.transaction.createMany({
    data: [
      {
        id: "txn_seed_1",
        customerId: CUSTOMER_ID,
        accountId: "acc_salary_1",
        direction: "credit",
        amountMinor: 15_000_000,
        category: "transfer",
        description: "Salary credit — Acme Corp",
        counterparty: "Acme Corp",
        balanceAfterMinor: 5_320_000,
        createdAt: new Date("2026-07-31T04:30:00.000Z"),
      },
      {
        id: "txn_seed_2",
        customerId: CUSTOMER_ID,
        accountId: "acc_savings_1",
        direction: "debit",
        amountMinor: 129_900,
        category: "recharge",
        description: "Mobile recharge · 98•••398",
        counterparty: "Mobile recharge",
        balanceAfterMinor: 24_890_560,
        createdAt: new Date("2026-07-30T13:12:00.000Z"),
      },
      {
        id: "txn_seed_3",
        customerId: CUSTOMER_ID,
        accountId: "acc_savings_1",
        direction: "debit",
        amountMinor: 184_500,
        category: "bill",
        description: "Electricity · BESCOM",
        counterparty: "Electricity",
        balanceAfterMinor: 25_020_460,
        createdAt: new Date("2026-07-28T08:45:00.000Z"),
      },
      {
        id: "txn_seed_4",
        customerId: CUSTOMER_ID,
        accountId: "acc_savings_1",
        direction: "debit",
        amountMinor: 64_900,
        category: "purchase",
        description: "Swiggy order",
        counterparty: "Swiggy",
        balanceAfterMinor: 25_204_960,
        createdAt: new Date("2026-07-27T20:03:00.000Z"),
      },
      {
        id: "txn_seed_5",
        customerId: CUSTOMER_ID,
        accountId: "acc_savings_1",
        direction: "credit",
        amountMinor: 120_000,
        category: "refund",
        description: "Refund — Flipkart",
        counterparty: "Flipkart",
        balanceAfterMinor: 25_269_860,
        createdAt: new Date("2026-07-25T11:20:00.000Z"),
      },
    ],
  });

  console.log(`Seed complete: customer ${CUSTOMER_ID}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
