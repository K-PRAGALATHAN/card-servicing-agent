-- CreateEnum
CREATE TYPE "TransactionDirection" AS ENUM ('debit', 'credit');

-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "domesticLimitMinor" INTEGER,
ADD COLUMN     "internationalEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "internationalLimitMinor" INTEGER,
ADD COLUMN     "tier" TEXT NOT NULL DEFAULT 'Classic';

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "creditScore" INTEGER NOT NULL DEFAULT 750;

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "cardId" TEXT,
    "direction" "TransactionDirection" NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "counterparty" TEXT,
    "balanceAfterMinor" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Transaction_customerId_idx" ON "Transaction"("customerId");

-- CreateIndex
CREATE INDEX "Transaction_accountId_idx" ON "Transaction"("accountId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
