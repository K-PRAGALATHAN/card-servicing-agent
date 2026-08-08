import type { Prisma } from "@prisma/client";
import { type PrismaClient } from "@prisma/client";

import type { Account } from "../../../domain/account/account";
import type { AccountRepository } from "../../../domain/account/account.repository";
import type { Card } from "../../../domain/card/card";
import type { CardRepository } from "../../../domain/card/card.repository";
import type { Customer } from "../../../domain/customer/customer";
import type { CustomerRepository } from "../../../domain/customer/customer.repository";
import type { Notification, NotificationCategory } from "../../../domain/notification/notification";
import type { NotificationRepository } from "../../../domain/notification/notification.repository";
import type {
  ServicingPriority,
  ServicingRequest,
  ServicingType,
} from "../../../domain/servicing/servicing-request";
import type { ServicingRequestRepository } from "../../../domain/servicing/servicing-request.repository";
import type { Statement } from "../../../domain/statement/statement";
import type { StatementProvider } from "../../../domain/statement/statement.provider";
import { type Currency, type Money, money } from "../../../domain/shared/money";
import type {
  Transaction,
  TransactionCategory,
  TransactionDirection,
} from "../../../domain/transaction/transaction";
import type { TransactionRepository } from "../../../domain/transaction/transaction.repository";

function toMoney(minor: number, currency: string): Money {
  return money(minor, currency as Currency);
}

export class PrismaCustomerRepository implements CustomerRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Customer | null> {
    const row = await this.prisma.customer.findUnique({ where: { id } });
    if (!row) return null;
    return {
      id: row.id,
      fullName: row.fullName,
      email: row.email,
      phone: row.phone,
      address: row.address,
      passwordHash: row.passwordHash,
      kyc: {
        panMasked: row.kycPanMasked,
        aadhaarMasked: row.kycAadhaar,
        status: row.kycStatus,
      },
      creditScore: row.creditScore,
    };
  }
}

export class PrismaAccountRepository implements AccountRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listByCustomer(customerId: string): Promise<Account[]> {
    const rows = await this.prisma.account.findMany({ where: { customerId } });
    return rows.map((r) => this.map(r));
  }

  async findById(id: string): Promise<Account | null> {
    const row = await this.prisma.account.findUnique({ where: { id } });
    return row ? this.map(row) : null;
  }

  async save(account: Account): Promise<void> {
    await this.prisma.account.upsert({
      where: { id: account.id },
      update: { balanceMinor: account.balance.amountMinor, currency: account.balance.currency },
      create: {
        id: account.id,
        customerId: account.customerId,
        type: account.type,
        maskedNumber: account.maskedNumber,
        balanceMinor: account.balance.amountMinor,
        currency: account.balance.currency,
      },
    });
  }

  private map(r: {
    id: string;
    customerId: string;
    type: "savings" | "current";
    maskedNumber: string;
    balanceMinor: number;
    currency: string;
  }): Account {
    return {
      id: r.id,
      customerId: r.customerId,
      type: r.type,
      maskedNumber: r.maskedNumber,
      balance: toMoney(r.balanceMinor, r.currency),
    };
  }
}

export class PrismaCardRepository implements CardRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listByCustomer(customerId: string): Promise<Card[]> {
    const rows = await this.prisma.card.findMany({ where: { customerId } });
    return rows.map((r) => this.map(r));
  }

  async findById(id: string): Promise<Card | null> {
    const row = await this.prisma.card.findUnique({ where: { id } });
    return row ? this.map(row) : null;
  }

  async save(card: Card): Promise<void> {
    const data = {
      status: card.status,
      tier: card.tier,
      availableLimitMinor: card.availableLimit?.amountMinor ?? null,
      availableBalanceMinor: card.availableBalance?.amountMinor ?? null,
      domesticLimitMinor: card.domesticLimit?.amountMinor ?? null,
      internationalLimitMinor: card.internationalLimit?.amountMinor ?? null,
      internationalEnabled: card.internationalEnabled,
    };
    await this.prisma.card.upsert({
      where: { id: card.id },
      update: data,
      create: {
        id: card.id,
        customerId: card.customerId,
        type: card.type,
        network: card.network,
        maskedPan: card.maskedPan,
        holderName: card.holderName,
        expiry: card.expiry,
        currency: card.availableLimit?.currency ?? card.availableBalance?.currency ?? "INR",
        ...data,
      },
    });
  }

  private map(r: {
    id: string;
    customerId: string;
    type: "credit" | "debit";
    network: string;
    maskedPan: string;
    holderName: string;
    expiry: string;
    status: "active" | "frozen" | "blocked";
    tier: string;
    availableLimitMinor: number | null;
    availableBalanceMinor: number | null;
    domesticLimitMinor: number | null;
    internationalLimitMinor: number | null;
    internationalEnabled: boolean;
    currency: string;
  }): Card {
    return {
      id: r.id,
      customerId: r.customerId,
      type: r.type,
      network: r.network as Card["network"],
      maskedPan: r.maskedPan,
      holderName: r.holderName,
      expiry: r.expiry,
      status: r.status,
      tier: r.tier as Card["tier"],
      availableLimit:
        r.availableLimitMinor != null ? toMoney(r.availableLimitMinor, r.currency) : undefined,
      availableBalance:
        r.availableBalanceMinor != null ? toMoney(r.availableBalanceMinor, r.currency) : undefined,
      domesticLimit:
        r.domesticLimitMinor != null ? toMoney(r.domesticLimitMinor, r.currency) : undefined,
      internationalLimit:
        r.internationalLimitMinor != null
          ? toMoney(r.internationalLimitMinor, r.currency)
          : undefined,
      internationalEnabled: r.internationalEnabled,
    };
  }
}

export class PrismaStatementProvider implements StatementProvider {
  constructor(private readonly prisma: PrismaClient) {}

  async listByCard(cardId: string): Promise<Statement[]> {
    const rows = await this.prisma.statement.findMany({
      where: { cardId },
      include: { lines: { orderBy: { position: "asc" } } },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((r) => this.map(r));
  }

  async latestForCard(cardId: string): Promise<Statement | null> {
    const row = await this.prisma.statement.findFirst({
      where: { cardId },
      include: { lines: { orderBy: { position: "asc" } } },
      orderBy: { createdAt: "desc" },
    });
    return row ? this.map(row) : null;
  }

  private map(r: {
    id: string;
    cardId: string;
    periodStart: string;
    periodEnd: string;
    openingBalanceMinor: number;
    closingBalanceMinor: number;
    currency: string;
    lines: {
      date: string;
      description: string;
      amountMinor: number;
      currency: string;
      kind: "debit" | "credit";
    }[];
  }): Statement {
    return {
      id: r.id,
      cardId: r.cardId,
      periodStart: r.periodStart,
      periodEnd: r.periodEnd,
      openingBalance: toMoney(r.openingBalanceMinor, r.currency),
      closingBalance: toMoney(r.closingBalanceMinor, r.currency),
      lines: r.lines.map((l) => ({
        date: l.date,
        description: l.description,
        amount: toMoney(l.amountMinor, l.currency),
        kind: l.kind,
      })),
    };
  }
}

export class PrismaServicingRequestRepository implements ServicingRequestRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(request: ServicingRequest): Promise<void> {
    await this.prisma.servicingRequest.create({
      data: {
        id: request.id,
        customerId: request.customerId,
        type: request.type,
        priority: request.priority,
        status: request.status,
        cardId: request.cardId ?? null,
        details: request.details as Prisma.InputJsonValue,
        createdAt: new Date(request.createdAt),
      },
    });
  }

  async listByCustomer(customerId: string): Promise<ServicingRequest[]> {
    const rows = await this.prisma.servicingRequest.findMany({ where: { customerId } });
    return rows.map((r) => this.map(r));
  }

  async findById(id: string): Promise<ServicingRequest | null> {
    const row = await this.prisma.servicingRequest.findUnique({ where: { id } });
    return row ? this.map(row) : null;
  }

  private map(r: {
    id: string;
    customerId: string;
    type: string;
    priority: string;
    status: "pending" | "in_review" | "approved" | "denied" | "escalated";
    cardId: string | null;
    details: Prisma.JsonValue;
    createdAt: Date;
  }): ServicingRequest {
    return {
      id: r.id,
      customerId: r.customerId,
      type: r.type as ServicingType,
      priority: r.priority as ServicingPriority,
      status: r.status,
      cardId: r.cardId ?? undefined,
      details: (r.details as Record<string, unknown>) ?? {},
      createdAt: r.createdAt.toISOString(),
    };
  }
}

export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listByCustomer(customerId: string): Promise<Notification[]> {
    const rows = await this.prisma.notification.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => this.map(r));
  }

  async search(customerId: string, query: string): Promise<Notification[]> {
    const rows = await this.prisma.notification.findMany({
      where: {
        customerId,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { body: { contains: query, mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => this.map(r));
  }

  private map(r: {
    id: string;
    customerId: string;
    title: string;
    body: string;
    category: string;
    read: boolean;
    createdAt: Date;
  }): Notification {
    return {
      id: r.id,
      customerId: r.customerId,
      title: r.title,
      body: r.body,
      category: r.category as NotificationCategory,
      read: r.read,
      createdAt: r.createdAt.toISOString(),
    };
  }
}

export class PrismaTransactionRepository implements TransactionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async add(t: Transaction): Promise<void> {
    await this.prisma.transaction.create({
      data: {
        id: t.id,
        customerId: t.customerId,
        accountId: t.accountId,
        cardId: t.cardId ?? null,
        direction: t.direction,
        amountMinor: t.amount.amountMinor,
        currency: t.amount.currency,
        category: t.category,
        description: t.description,
        counterparty: t.counterparty ?? null,
        balanceAfterMinor: t.balanceAfter.amountMinor,
        createdAt: new Date(t.createdAt),
      },
    });
  }

  async listByCustomer(customerId: string, limit = 30): Promise<Transaction[]> {
    const rows = await this.prisma.transaction.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map((r) => this.map(r));
  }

  async listByAccount(accountId: string, limit = 30): Promise<Transaction[]> {
    const rows = await this.prisma.transaction.findMany({
      where: { accountId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map((r) => this.map(r));
  }

  private map(r: {
    id: string;
    customerId: string;
    accountId: string;
    cardId: string | null;
    direction: "debit" | "credit";
    amountMinor: number;
    currency: string;
    category: string;
    description: string;
    counterparty: string | null;
    balanceAfterMinor: number;
    createdAt: Date;
  }): Transaction {
    return {
      id: r.id,
      customerId: r.customerId,
      accountId: r.accountId,
      cardId: r.cardId ?? undefined,
      direction: r.direction as TransactionDirection,
      amount: toMoney(r.amountMinor, r.currency),
      category: r.category as TransactionCategory,
      description: r.description,
      counterparty: r.counterparty ?? undefined,
      balanceAfter: toMoney(r.balanceAfterMinor, r.currency),
      createdAt: r.createdAt.toISOString(),
    };
  }
}
