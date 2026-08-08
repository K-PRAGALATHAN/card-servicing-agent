import { PrismaClient } from "@prisma/client";

import { ScryptPasswordHasher } from "../src/adapters/outbound/security/scrypt-password-hasher";

const prisma = new PrismaClient();

const CUSTOMER_ID = "NB00482193";
const DEMO_PASSWORD = "password123";

async function main(): Promise<void> {
  const passwordHash = await new ScryptPasswordHasher().hash(DEMO_PASSWORD);

  await prisma.customer.upsert({
    where: { id: CUSTOMER_ID },
    update: { passwordHash },
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
      availableLimitMinor: 18_000_000,
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
      availableBalanceMinor: 24_890_560,
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

  console.log(`Seed complete: customer ${CUSTOMER_ID}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
